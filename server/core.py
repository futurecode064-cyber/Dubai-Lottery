"""Dubai Lottery development server. Integer tokens; transactionally settled draws."""
import contextlib
import datetime as dt
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
from zoneinfo import ZoneInfo

MM = ZoneInfo('Asia/Yangon')
MULTIPLIERS = {'2D': 80, '3D': 650, '4D': 6000}
MAX_BALANCE = 10**12
MAX_STAKE = 100000

class Error(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

def now():
    return dt.datetime.now(dt.timezone.utc)

def password_hash(password, salt=None):
    if not isinstance(password, str) or not 12 <= len(password) <= 128:
        raise Error('Password must have 12–128 characters.')
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return salt + ':' + digest

def valid_password(password, saved):
    try:
        return hmac.compare_digest(password_hash(password, saved.split(':')[0]), saved)
    except (Error, ValueError, AttributeError):
        return False

def integer(value, lo, hi):
    if type(value) is not int or not lo <= value <= hi:
        raise Error(f'Use a whole number between {lo} and {hi}.')
    return value

SCHEMA = '''
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','player')), balance INTEGER NOT NULL DEFAULT 0
 CHECK(balance BETWEEN 0 AND 1000000000000), active INTEGER NOT NULL DEFAULT 1,
 daily_limit INTEGER NOT NULL DEFAULT 100000 CHECK(daily_limit BETWEEN 1 AND 1000000),
 excluded_until TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(
 digest TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS draws(
 id INTEGER PRIMARY KEY, day TEXT NOT NULL, market TEXT NOT NULL,
 cutoff TEXT NOT NULL, multiplier INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open'
 CHECK(status IN ('open','closed','settled')), result TEXT, source TEXT,
 settled_at TEXT, UNIQUE(day,market));
CREATE TABLE IF NOT EXISTS bets(
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 draw_id INTEGER NOT NULL REFERENCES draws(id), number TEXT NOT NULL,
 stake INTEGER NOT NULL CHECK(stake BETWEEN 1 AND 100000), multiplier INTEGER NOT NULL,
 payout INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
 request_key TEXT NOT NULL, UNIQUE(user_id,request_key));
CREATE TABLE IF NOT EXISTS ledger(
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
 delta INTEGER NOT NULL, balance_after INTEGER NOT NULL, kind TEXT NOT NULL,
 ref TEXT NOT NULL UNIQUE, note TEXT NOT NULL, actor INTEGER NOT NULL REFERENCES users(id),
 created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit(
 id INTEGER PRIMARY KEY, actor INTEGER NOT NULL REFERENCES users(id),
 action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS ledger_no_update BEFORE UPDATE ON ledger
 BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS ledger_no_delete BEFORE DELETE ON ledger
 BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit
 BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit
 BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
'''

class Store:
    def __init__(self, path):
        self.path = str(path)
        with self.connection() as c:
            c.executescript(SCHEMA)

    @contextlib.contextmanager
    def connection(self):
        c = sqlite3.connect(self.path, timeout=20, isolation_level=None)
        c.row_factory = sqlite3.Row
        c.execute('PRAGMA foreign_keys=ON')
        c.execute('PRAGMA busy_timeout=20000')
        try:
            yield c
        finally:
            c.close()

    @contextlib.contextmanager
    def transaction(self):
        with self.connection() as c:
            c.execute('BEGIN IMMEDIATE')
            try:
                yield c
                c.commit()
            except Exception:
                c.rollback()
                raise

    def audit(self, c, actor, action, detail):
        c.execute('INSERT INTO audit(actor,action,detail,created_at) VALUES(?,?,?,?)',
                  (actor, action, json.dumps(detail, ensure_ascii=False), now().isoformat()))

    def create_user(self, username, password, role='player', actor=None):
        if not isinstance(username, str) or not re.fullmatch(r'[a-zA-Z0-9_.-]{3,32}', username):
            raise Error('Username: use 3–32 letters, digits, dot, dash or underscore.')
        if role not in ('admin','player'):
            raise Error('Invalid role.')
        hashed = password_hash(password)
        with self.transaction() as c:
            if actor is not None:
                self.require_admin(c, actor)
                if role != 'player':
                    raise Error('Create administrators from the server CLI only.', 403)
            elif role != 'admin':
                raise Error('Players must be created by an administrator.', 403)
            try:
                uid = c.execute('INSERT INTO users(username,password,role,created_at) VALUES(?,?,?,?)',
                                (username.lower(), hashed, role, now().isoformat())).lastrowid
            except sqlite3.IntegrityError:
                raise Error('This username is already in use.', 409)
            self.audit(c, actor or uid, 'create_user', {'user_id':uid, 'username':username.lower(), 'role':role})
            return uid

    def login(self, username, password):
        with self.transaction() as c:
            u = c.execute('SELECT * FROM users WHERE username=?', (str(username).lower(),)).fetchone()
            if not u:
                # Consume comparable password work for unknown accounts.
                try: password_hash(password)
                except Error: pass
            if not u or not u['active'] or not valid_password(password, u['password']):
                raise Error('Username or password is incorrect.', 401)
            token = secrets.token_urlsafe(32)
            c.execute('DELETE FROM sessions WHERE expires<?', (int(time.time()),))
            c.execute('INSERT INTO sessions VALUES(?,?,?)',
                      (hashlib.sha256(token.encode()).hexdigest(), u['id'], int(time.time())+43200))
            return token

    def authenticate(self, token):
        with self.connection() as c:
            row = c.execute('SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id '
                            'WHERE digest=? AND expires>? AND u.active=1',
                            (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
            if not row: raise Error('Please sign in again.', 401)
            return row['id']

    def logout(self, token):
        with self.transaction() as c:
            c.execute('DELETE FROM sessions WHERE digest=?', (hashlib.sha256(token.encode()).hexdigest(),))

    def user(self, c, uid):
        u = c.execute('SELECT * FROM users WHERE id=?', (uid,)).fetchone()
        if not u or not u['active']: raise Error('Account is unavailable.', 403)
        return u

    def require_admin(self, c, uid):
        if self.user(c, uid)['role'] != 'admin': raise Error('Administrator permission required.', 403)

    def ensure_day(self, at=None):
        at = at or now()
        local = at.astimezone(MM)
        day = local.date().isoformat()
        cutoff = dt.datetime.combine(local.date(), dt.time(18), MM).astimezone(dt.timezone.utc).isoformat()
        with self.transaction() as c:
            for market, multiplier in MULTIPLIERS.items():
                c.execute('INSERT OR IGNORE INTO draws(day,market,cutoff,multiplier) VALUES(?,?,?,?)',
                          (day,market,cutoff,multiplier))
            c.execute("UPDATE draws SET status='closed' WHERE status='open' AND cutoff<=?", (at.isoformat(),))

    def move(self, c, uid, delta, kind, ref, note, actor):
        balance = self.user(c,uid)['balance'] + delta
        if not 0 <= balance <= MAX_BALANCE: raise Error('Insufficient balance or account limit exceeded.')
        c.execute('UPDATE users SET balance=? WHERE id=?', (balance,uid))
        c.execute('INSERT INTO ledger(user_id,delta,balance_after,kind,ref,note,actor,created_at) '
                  'VALUES(?,?,?,?,?,?,?,?)', (uid,delta,balance,kind,ref,note,actor,now().isoformat()))

    def request_key(self, key):
        if not isinstance(key,str) or not re.fullmatch(r'[a-zA-Z0-9_-]{16,80}',key):
            raise Error('Invalid request identifier.')
        return key

    def adjust(self, actor, uid, delta, note, key):
        integer(uid,1,2**31)
        integer(delta,-10**9,10**9)
        if not delta or not isinstance(note,str) or not 5 <= len(note.strip()) <= 240:
            raise Error('Enter a nonzero amount and a reason of 5–240 characters.')
        ref = 'adjust:'+str(actor)+':'+self.request_key(key)
        with self.transaction() as c:
            self.require_admin(c,actor)
            if self.user(c,uid)['role'] != 'player': raise Error('Only player balances can be adjusted.')
            old = c.execute('SELECT * FROM ledger WHERE ref=?',(ref,)).fetchone()
            if old:
                if old['user_id'] != uid or old['delta'] != delta or old['note'] != note:
                    raise Error('Request identifier was already used with different data.',409)
                return {'duplicate':True}
            self.move(c,uid,delta,'admin',ref,note,actor)
            self.audit(c,actor,'adjust',{'user_id':uid,'delta':delta,'reason':note,'ref':ref})
            return {'duplicate':False}

    def place(self, uid, draw_id, number, stake, key, at=None):
        at = at or now()
        integer(draw_id,1,2**31)
        integer(stake,1,MAX_STAKE)
        self.request_key(key)
        with self.transaction() as c:
            u = self.user(c,uid)
            if u['role'] != 'player': raise Error('Use a player account to enter.',403)
            old = c.execute('SELECT * FROM bets WHERE user_id=? AND request_key=?',(uid,key)).fetchone()
            if old:
                if (old['draw_id'],old['number'],old['stake']) != (draw_id,number,stake):
                    raise Error('Request identifier was already used with different data.',409)
                return {'bet_id':old['id'],'duplicate':True}
            if u['excluded_until'] and u['excluded_until'] > at.isoformat():
                raise Error('Your account is on a voluntary break.',403)
            d = c.execute('SELECT * FROM draws WHERE id=?',(draw_id,)).fetchone()
            if not d: raise Error('Draw does not exist.',404)
            if d['status'] != 'open' or at.isoformat() >= d['cutoff']:
                raise Error('Entry for this draw is closed.',409)
            digits = int(d['market'][0])
            if not isinstance(number,str) or not re.fullmatch('[0-9]{'+str(digits)+'}',number):
                raise Error(f'Enter exactly {digits} digits, keeping leading zeroes.')
            spent = c.execute('SELECT COALESCE(SUM(b.stake),0) FROM bets b JOIN draws d ON d.id=b.draw_id '
                              'WHERE b.user_id=? AND d.day=?',(uid,d['day'])).fetchone()[0]
            if spent + stake > u['daily_limit']: raise Error('Your daily entry limit would be exceeded.')
            bet = c.execute('INSERT INTO bets(user_id,draw_id,number,stake,multiplier,created_at,request_key) '
                            'VALUES(?,?,?,?,?,?,?)',(uid,draw_id,number,stake,d['multiplier'],at.isoformat(),key)).lastrowid
            self.move(c,uid,-stake,'entry','bet:'+str(bet),d['market']+' '+number,uid)
            return {'bet_id':bet,'duplicate':False}

    def settle(self, actor, draw_id, result, source, at=None):
        at = at or now()
        integer(draw_id,1,2**31)
        if not isinstance(source,str) or not 5 <= len(source.strip()) <= 240:
            raise Error('Enter the result source/reference (5–240 characters).')
        with self.transaction() as c:
            self.require_admin(c,actor)
            d = c.execute('SELECT * FROM draws WHERE id=?',(draw_id,)).fetchone()
            if not d: raise Error('Draw does not exist.',404)
            if not isinstance(result,str) or not re.fullmatch('[0-9]{'+d['market'][0]+'}',result):
                raise Error('Result must have the exact number of digits.')
            if d['status'] == 'settled':
                if d['result'] != result or d['source'] != source:
                    raise Error('Published results cannot be changed.',409)
                return {'duplicate':True}
            if at.isoformat() < d['cutoff']: raise Error('Results cannot be published before the cutoff.',409)
            winners = c.execute('SELECT * FROM bets WHERE draw_id=? AND number=?',(draw_id,result)).fetchall()
            total = 0
            for b in winners:
                payout = b['stake']*b['multiplier']
                self.move(c,b['user_id'],payout,'win','win:'+str(b['id']),d['market']+' '+result,actor)
                c.execute('UPDATE bets SET payout=? WHERE id=?',(payout,b['id']))
                total += payout
            c.execute("UPDATE draws SET status='settled',result=?,source=?,settled_at=? WHERE id=?",
                      (result,source,at.isoformat(),draw_id))
            self.audit(c,actor,'settle',{'draw_id':draw_id,'result':result,'source':source,
                                       'winners':len(winners),'total_payout':total})
            return {'winners':len(winners),'payout':total,'duplicate':False}

    def preferences(self, uid, daily_limit, break_days):
        integer(daily_limit,1,1000000)
        integer(break_days,0,365)
        with self.transaction() as c:
            u = self.user(c,uid)
            if daily_limit > u['daily_limit']:
                raise Error('Daily limits can only be reduced in this prototype.')
            existing = u['excluded_until']
            expiry = (now()+dt.timedelta(days=break_days)).isoformat() if break_days else None
            expiry = max(filter(None,[existing,expiry]), default=None)
            c.execute('UPDATE users SET daily_limit=?,excluded_until=? WHERE id=?',(daily_limit,expiry,uid))
            self.audit(c,uid,'preferences',{'daily_limit':daily_limit,'excluded_until':expiry})

    def state(self, uid, at=None):
        at = at or now()
        self.ensure_day(at)
        with self.connection() as c:
            u = self.user(c,uid)
            account = {k:u[k] for k in ('id','username','role','balance','daily_limit','excluded_until')}
            day = at.astimezone(MM).date().isoformat()
            data = {'account':account,'server_time':at.isoformat(),'day':day,
                    'draws':[dict(x) for x in c.execute('SELECT * FROM draws ORDER BY day DESC,id LIMIT 90')],
                    'bets':[dict(x) for x in c.execute('SELECT b.*,d.day,d.market,d.status,d.result '
                            'FROM bets b JOIN draws d ON d.id=b.draw_id WHERE user_id=? '
                            'ORDER BY b.id DESC LIMIT 500',(uid,))],
                    'ledger':[dict(x) for x in c.execute('SELECT * FROM ledger WHERE user_id=? ORDER BY id DESC LIMIT 500',(uid,))]}
            if u['role']=='admin':
                data['users']=[dict(x) for x in c.execute('SELECT id,username,role,balance,active,daily_limit FROM users ORDER BY id')]
                data['audit']=[dict(x) for x in c.execute('SELECT * FROM audit ORDER BY id DESC LIMIT 200')]
            return data

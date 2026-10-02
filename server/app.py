import argparse
from collections import defaultdict, deque
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import getpass
import json
import os
from pathlib import Path
import threading
import time
from urllib.parse import urlsplit
from core import Store, Error

ROOT = Path(__file__).resolve().parent
store = None
attempts = defaultdict(deque)
rate_lock = threading.Lock()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Do not print query strings, cookies, credentials, or request bodies.
        print(self.address_string(), args[1] if len(args)>1 else 'request')

    def send(self, status, value, cookie=None):
        raw = json.dumps(value,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        if cookie: self.send_header('Set-Cookie',cookie)
        self.end_headers()
        self.wfile.write(raw)

    def token(self):
        cookie = SimpleCookie()
        try: cookie.load(self.headers.get('Cookie',''))
        except Exception: raise Error('Invalid session.',401)
        return cookie['session'].value if 'session' in cookie else ''

    def session_cookie(self, token, expire=False):
        secure = '; Secure' if os.environ.get('SECURE_COOKIES')=='1' else ''
        return f'session={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={0 if expire else 43200}{secure}'

    def do_GET(self):
        path = urlsplit(self.path).path
        try:
            if path=='/api/state':
                return self.send(200,store.state(store.authenticate(self.token())))
            if path=='/health': return self.send(200,{'status':'ok','mode':'development'})
            if path != '/': raise Error('Not found.',404)
            content = (ROOT/'index.html').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type','text/html; charset=utf-8')
            self.send_header('Content-Length',str(len(content)))
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Frame-Options','DENY')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Referrer-Policy','no-referrer')
            self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            self.end_headers()
            self.wfile.write(content)
        except Error as e: self.send(e.status,{'error':e.message})
        except Exception: self.send(500,{'error':'Server error.'})

    def do_POST(self):
        try:
            # Cross-site forms cannot set this header; no CORS headers are exposed.
            if self.headers.get('X-Requested-With')!='DubaiLottery': raise Error('Invalid request origin.',403)
            if self.headers.get('Content-Type','').split(';')[0]!='application/json': raise Error('JSON required.',415)
            length = int(self.headers.get('Content-Length','0'))
            if not 1 <= length <= 16384: raise Error('Invalid request size.',413)
            data = json.loads(self.rfile.read(length))
            if not isinstance(data,dict): raise Error('JSON object required.')
            path = urlsplit(self.path).path
            if path=='/api/login':
                with rate_lock:
                    key = self.client_address[0]
                    q = attempts[key]
                    t = time.monotonic()
                    while q and q[0] < t-60: q.popleft()
                    if len(q)>=10: raise Error('Too many attempts. Wait one minute.',429)
                    q.append(t)
                token = store.login(data.get('username'),data.get('password'))
                return self.send(200,{'ok':True},self.session_cookie(token))
            token = self.token()
            uid = store.authenticate(token)
            result = {'ok':True}
            if path=='/api/logout':
                store.logout(token)
                return self.send(200,result,self.session_cookie('',True))
            elif path=='/api/bet':
                result = store.place(uid,data['draw_id'],data['number'],data['stake'],data['key'])
            elif path=='/api/admin/users':
                result = {'id':store.create_user(data['username'],data['password'],actor=uid)}
            elif path=='/api/admin/adjust':
                result = store.adjust(uid,data['user_id'],data['delta'],data['note'],data['key'])
            elif path=='/api/admin/settle':
                result = store.settle(uid,data['draw_id'],data['result'],data['source'])
            elif path=='/api/preferences':
                store.preferences(uid,data['daily_limit'],data['break_days'])
            else: raise Error('Not found.',404)
            self.send(200,result)
        except Error as e: self.send(e.status,{'error':e.message})
        except (ValueError,KeyError,TypeError): self.send(400,{'error':'Invalid request data.'})
        except Exception: self.send(500,{'error':'Server error. No partial balance change was committed.'})

def main():
    global store
    p = argparse.ArgumentParser()
    p.add_argument('--db',default=os.environ.get('LOTTERY_DB',str(ROOT/'lottery.sqlite3')))
    p.add_argument('--host',default='127.0.0.1')
    p.add_argument('--port',type=int,default=8080)
    p.add_argument('--create-admin',metavar='USERNAME')
    args = p.parse_args()
    store = Store(args.db)
    if args.create_admin:
        pw = getpass.getpass('New administrator password (12+ characters): ')
        if pw != getpass.getpass('Confirm password: '): raise SystemExit('Passwords do not match.')
        store.create_user(args.create_admin,pw,role='admin')
        print('Administrator created.')
        return
    print(f'Development server: http://{args.host}:{args.port}. Do not expose directly to the internet.')
    ThreadingHTTPServer((args.host,args.port),Handler).serve_forever()

if __name__=='__main__': main()

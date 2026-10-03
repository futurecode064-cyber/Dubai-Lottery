import {createHash, randomBytes, scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import pg from 'pg';
import {attachDatabasePool} from '@neon/functions';
import {playerPage} from './ui-player.mjs';
import {adminPage} from './ui-admin.mjs';
import {cutoffFor} from './schedule.mjs';
import {adminService} from './admin-service.mjs';

pg.types.setTypeParser(20, Number);
const derive=promisify(scrypt);
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:15000,idleTimeoutMillis:30000});
attachDatabasePool(pool);
const MM_OFFSET=6.5*60*60*1000;
const MULT={"2D":80,"3D":650,"4D":6000};
const MAX_BAL=1_000_000_000_000;
const MAX_STAKE=100_000;
class APIError extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(s,m)=>{throw new APIError(s,m)};
const now=()=>new Date();
const iso=d=>d.toISOString();
const sha=s=>createHash('sha256').update(s).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const q=(c,sql,args=[])=>c.query(sql,args);
const one=async(c,sql,args=[])=>(await q(c,sql,args)).rows[0];
const localDay=(d=now())=>new Date(d.getTime()+MM_OFFSET).toISOString().slice(0,10);
const strongUser=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]{3,32}$/.test(x);
const reqKey=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{16,80}$/.test(x);
const int=(x,lo,hi)=>Number.isInteger(x)&&x>=lo&&x<=hi;
const passOk=x=>typeof x==='string'&&Array.from(x).length>=12&&Array.from(x).length<=128;
async function passwordHash(password,salt=randomBytes(16).toString('hex')){
  if(!passOk(password)) fail(400,'Password ကို ၁၂–၁၂၈ လုံး သတ်မှတ်ပါ။');
  const out=await derive(password,Buffer.from(salt,'hex'),64,{N:16384,r:8,p:1,maxmem:64*1024*1024});
  return salt+':'+out.toString('hex');
}
async function passwordValid(password,saved){
  try{const [salt,digest]=String(saved).split(':');const made=(await passwordHash(password,salt)).split(':')[1];return timingSafeEqual(Buffer.from(made,'hex'),Buffer.from(digest,'hex'));}catch{return false;}
}
const schema=[
`CREATE TABLE IF NOT EXISTS users(
 id BIGSERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','player')), balance BIGINT NOT NULL DEFAULT 0 CHECK(balance BETWEEN 0 AND 1000000000000),
 active BOOLEAN NOT NULL DEFAULT TRUE, daily_limit BIGINT NOT NULL DEFAULT 100000 CHECK(daily_limit BETWEEN 1 AND 1000000),
 excluded_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS sessions(
 digest TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('player','admin')), expires BIGINT NOT NULL)`,
`CREATE TABLE IF NOT EXISTS draws(
 id BIGSERIAL PRIMARY KEY, day DATE NOT NULL, market TEXT NOT NULL CHECK(market IN ('2D','3D','4D')),
 cutoff TIMESTAMPTZ NOT NULL, multiplier BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','settled')),
 result TEXT, source TEXT, settled_at TIMESTAMPTZ, UNIQUE(day,market))`,
`CREATE TABLE IF NOT EXISTS bets(
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), draw_id BIGINT NOT NULL REFERENCES draws(id),
 number TEXT NOT NULL, stake BIGINT NOT NULL CHECK(stake BETWEEN 1 AND 100000), multiplier BIGINT NOT NULL,
 payout BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL, request_key TEXT NOT NULL, UNIQUE(user_id,request_key))`,
`CREATE TABLE IF NOT EXISTS ledger(
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), delta BIGINT NOT NULL,
 balance_after BIGINT NOT NULL, kind TEXT NOT NULL, ref TEXT NOT NULL UNIQUE, note TEXT NOT NULL,
 actor BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS audit(
 id BIGSERIAL PRIMARY KEY, actor BIGINT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
 detail JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
`CREATE TABLE IF NOT EXISTS login_rate(
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, started BIGINT NOT NULL)`
];
let initPromise;
async function initialize(){
 if(!initPromise)initPromise=(async()=>{
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
  const c=await pool.connect();try{
   await q(c,'BEGIN');await q(c,'SELECT pg_advisory_xact_lock(907240611)');
   for(const s of schema)await q(c,s);
   // Additive migration preserves existing accounts, balances and sessions.
   await q(c,"ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level TEXT");
   await q(c,"ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES users(id)");
   await q(c,"UPDATE users SET admin_level='root' WHERE role='admin' AND admin_level IS NULL");
   await q(c,"CREATE INDEX IF NOT EXISTS users_parent ON users(parent_id)");
   await q(c,"CREATE INDEX IF NOT EXISTS bets_draw_user ON bets(draw_id,user_id)");
   await q(c,"CREATE TABLE IF NOT EXISTS scheduled_results(draw_id BIGINT PRIMARY KEY REFERENCES draws(id),result TEXT NOT NULL,actor BIGINT NOT NULL REFERENCES users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
   const n=process.env.LOTTERY_ADMIN_NAME,p=process.env.LOTTERY_ADMIN_PASSWORD;
   if(!!n!==!!p)throw new Error('Both LOTTERY_ADMIN_NAME and LOTTERY_ADMIN_PASSWORD are required together');
   if(n){
    const exists=await one(c,"SELECT id FROM users WHERE role='admin' LIMIT 1");
    if(!exists){if(!strongUser(n))throw new Error('Invalid admin username');const h=await passwordHash(p);await q(c,"INSERT INTO users(username,password,role,admin_level) VALUES($1,$2,'admin','root')",[n.toLowerCase(),h]);}
   }
   await q(c,"UPDATE users SET parent_id=(SELECT id FROM users WHERE role='admin' AND admin_level='root' ORDER BY id LIMIT 1) WHERE role='player' AND parent_id IS NULL");
   await q(c,'COMMIT');
  }catch(e){await q(c,'ROLLBACK');throw e;}finally{c.release();}
 })().catch(e=>{initPromise=undefined;throw e});return initPromise;
}
async function ensureDay(c,d=now()){
 const day=localDay(d);
 for(const [market,mult] of Object.entries(MULT)){
  const cut=cutoffFor(day,market);
  // Update only today's still-open draws. Never reopen or edit published history.
  await q(c,`INSERT INTO draws(day,market,cutoff,multiplier) VALUES($1,$2,$3,$4)
   ON CONFLICT(day,market) DO UPDATE SET cutoff=EXCLUDED.cutoff
   WHERE draws.status='open' AND draws.cutoff IS DISTINCT FROM EXCLUDED.cutoff`,[day,market,cut,mult]);
 }
 await q(c,"UPDATE draws SET status='closed' WHERE status='open' AND cutoff<=$1",[d]);
 return day;
}
async function rate(c,key,max=12){
 const t=Math.floor(Date.now()/1000),r=await one(c,'SELECT * FROM login_rate WHERE key=$1 FOR UPDATE',[key]);
 if(r&&t-r.started<900&&r.count>=max)fail(429,'ကြိုးစားမှုများနေပါသည်။ ၁၅ မိနစ်အကြာ ပြန်စမ်းပါ။');
 await q(c,`INSERT INTO login_rate(key,count,started) VALUES($1,1,$2)
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN $2-login_rate.started>=900 THEN 1 ELSE login_rate.count+1 END,
 started=CASE WHEN $2-login_rate.started>=900 THEN $2 ELSE login_rate.started END`,[key,t]);
}
async function login(c,username,password,role,ip){
 const name=String(username??'').toLowerCase();await rate(c,'ip:'+ip,100);await rate(c,'login:'+role+':'+name,15);
 const u=await one(c,'SELECT * FROM users WHERE username=$1 AND role=$2',[name,role]);
 const valid=u&&u.active&&await passwordValid(password,u.password);if(!valid)return {invalid:true};
 await q(c,'DELETE FROM login_rate WHERE key=$1',['login:'+role+':'+name]);
 const raw=token();await q(c,'DELETE FROM sessions WHERE user_id=$1 OR expires<$2',[u.id,Math.floor(Date.now()/1000)]);
 await q(c,'INSERT INTO sessions(digest,user_id,kind,expires) VALUES($1,$2,$3,$4)',[sha(raw),u.id,role,Math.floor(Date.now()/1000)+43200]);return raw;
}
async function auth(c,raw,role){
 if(!raw)fail(401,'ပြန်လည် အကောင့်ဝင်ပါ။');
 const u=await one(c,`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
 WHERE s.digest=$1 AND s.expires>$2 AND s.kind=$3 AND u.active=TRUE AND u.role=$3`,[sha(raw),Math.floor(Date.now()/1000),role]);
 if(!u)fail(401,'ပြန်လည် အကောင့်ဝင်ပါ။');return u;
}
function cookies(req){return Object.fromEntries((req.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return i<0?[x,'']:[x.slice(0,i),x.slice(i+1)]}));}
const playerCookie=(v,del=false)=>`lottery_session=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${del?0:43200}; Secure`;
const adminCookie=(v,del=false)=>`lottery_admin=${v}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${del?0:43200}; Secure`;
async function move(c,uid,delta,kind,ref,note,actor){
 const u=await one(c,'SELECT * FROM users WHERE id=$1 FOR UPDATE',[uid]);if(!u||!u.active)fail(403,'Account အသုံးမပြုနိုင်ပါ။');const b=Number(u.balance)+delta;
 if(b<0||b>MAX_BAL)fail(409,'Token လက်ကျန် မလုံလောက်ပါ သို့မဟုတ် account limit ကျော်သွားပါသည်။');
 await q(c,'UPDATE users SET balance=$1 WHERE id=$2',[b,uid]);await q(c,'INSERT INTO ledger(user_id,delta,balance_after,kind,ref,note,actor) VALUES($1,$2,$3,$4,$5,$6,$7)',[uid,delta,b,kind,ref,note,actor]);
}
async function playerState(c,u){
 const day=await ensureDay(c);await admins.publishDue(c);return {account:{id:u.id,username:u.username,balance:Number((await one(c,'SELECT balance FROM users WHERE id=$1',[u.id])).balance),daily_limit:Number(u.daily_limit),excluded_until:u.excluded_until},server_time:iso(now()),day,
 draws:(await q(c,'SELECT id,day::text,market,cutoff,multiplier,status,result,source,settled_at FROM draws ORDER BY day DESC,id LIMIT 90')).rows,
 bets:(await q(c,`SELECT b.id,b.number,b.stake,b.payout,b.created_at,d.day::text,d.market,d.status,d.result FROM bets b JOIN draws d ON d.id=b.draw_id WHERE b.user_id=$1 ORDER BY b.id DESC LIMIT 500`,[u.id])).rows,
 ledger:(await q(c,'SELECT id,delta,balance_after,kind,note,created_at FROM ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 500',[u.id])).rows};
}
async function place(c,u,data){
 const {draw_id,number,stake,key}=data;if(!int(draw_id,1,2**31)||!int(stake,1,MAX_STAKE)||!reqKey(key))fail(400,'ကံစမ်းမှုအချက်အလက် မမှန်ပါ။');
 const old=await one(c,'SELECT * FROM bets WHERE user_id=$1 AND request_key=$2',[u.id,key]);if(old){if(Number(old.draw_id)!==draw_id||old.number!==number||Number(old.stake)!==stake)fail(409,'Request key ကို အခြား data နဲ့ သုံးပြီးသားပါ။');return {bet_id:old.id,duplicate:true};}
 const locked=await one(c,'SELECT * FROM users WHERE id=$1 FOR UPDATE',[u.id]);if(locked.excluded_until&&new Date(locked.excluded_until)>now())fail(403,'သင့် account သည် ယာယီနားချိန်တွင် ရှိပါသည်။');
 const d=await one(c,'SELECT * FROM draws WHERE id=$1 FOR UPDATE',[draw_id]);if(!d)fail(404,'Draw မတွေ့ပါ။');if(d.status!=='open'||now()>=new Date(d.cutoff))fail(409,'ဒီ Draw ပိတ်ပြီးပါပြီ။');
 const digits=Number(d.market[0]);if(typeof number!=='string'||!(new RegExp('^[0-9]{'+digits+'}$')).test(number))fail(400,digits+' လုံးတိတိ ဂဏန်းထည့်ပါ။');
 const spent=Number((await one(c,`SELECT COALESCE(SUM(b.stake),0) total FROM bets b JOIN draws d ON d.id=b.draw_id WHERE b.user_id=$1 AND d.day=$2`,[u.id,d.day])).total);
 if(spent+stake>Number(locked.daily_limit))fail(409,'နေ့စဉ် token limit ကျော်သွားပါသည်။');
 const ins=await one(c,'INSERT INTO bets(user_id,draw_id,number,stake,multiplier,created_at,request_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[u.id,draw_id,number,stake,d.multiplier,now(),key]);
 await move(c,u.id,-stake,'entry','bet:'+ins.id,d.market+' '+number,u.id);return {bet_id:ins.id,duplicate:false};
}
async function settle(c,admin,data){
 const {draw_id,result,source}=data;if(!int(draw_id,1,2**31)||typeof source!=='string'||source.trim().length<5||source.length>240)fail(400,'ရလဒ်အချက်အလက် မမှန်ပါ။');const d=await one(c,'SELECT * FROM draws WHERE id=$1 FOR UPDATE',[draw_id]);if(!d)fail(404,'Draw မတွေ့ပါ။');if(typeof result!=='string'||!(new RegExp('^[0-9]{'+d.market[0]+'}$')).test(result))fail(400,'အနိုင်ရဂဏန်းအရေအတွက် မမှန်ပါ။');if(d.status==='settled'){if(d.result!==result||d.source!==source)fail(409,'ထုတ်ပြန်ပြီးသားရလဒ်ကို ပြန်ပြင်လို့မရပါ။');return {duplicate:true};}if(now()<new Date(d.cutoff))fail(409,'ပိတ်ချိန်မတိုင်ခင် ရလဒ်ထုတ်ပြန်လို့မရပါ။');const ws=(await q(c,'SELECT * FROM bets WHERE draw_id=$1 AND number=$2 ORDER BY id FOR UPDATE',[draw_id,result])).rows;let total=0;for(const b of ws){const payout=Number(b.stake)*Number(b.multiplier);await move(c,Number(b.user_id),payout,'win','win:'+b.id,d.market+' '+result,admin.id);await q(c,'UPDATE bets SET payout=$1 WHERE id=$2',[payout,b.id]);total+=payout;}await q(c,"UPDATE draws SET status='settled',result=$1,source=$2,settled_at=$3 WHERE id=$4",[result,source,now(),draw_id]);await q(c,'INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)',[admin.id,'settle',JSON.stringify({draw_id,result,source,winners:ws.length,total_payout:total})]);return {winners:ws.length,payout:total,duplicate:false};
}
const admins=adminService({q,one,fail,int,reqKey,strongUser,passOk,passwordHash,move,ensureDay,settle,now,localDay});
async function preferences(c,u,data){if(!int(data.daily_limit,1,1_000_000)||!int(data.break_days,0,365))fail(400,'Limit အချက်အလက် မမှန်ပါ။');const cur=await one(c,'SELECT * FROM users WHERE id=$1 FOR UPDATE',[u.id]);if(data.daily_limit>Number(cur.daily_limit))fail(409,'ဒီဗားရှင်းမှာ daily limit ကို လျှော့ချနိုင်တာပဲ ဖြစ်ပါတယ်။');let exp=cur.excluded_until?new Date(cur.excluded_until):null;if(data.break_days){const n=new Date(Date.now()+data.break_days*86400000);if(!exp||n>exp)exp=n;}await q(c,'UPDATE users SET daily_limit=$1,excluded_until=$2 WHERE id=$3',[data.daily_limit,exp,u.id]);await q(c,'INSERT INTO audit(actor,action,detail) VALUES($1,$2,$3)',[u.id,'preferences',JSON.stringify({daily_limit:data.daily_limit,excluded_until:exp})]);return {ok:true};}
async function body(req){if(req.headers.get('content-type')?.split(';')[0]!=='application/json')fail(415,'JSON လိုအပ်ပါသည်။');const text=await req.text();if(!text||Buffer.byteLength(text)>20000)fail(413,'Request size မမှန်ပါ။');try{const x=JSON.parse(text);if(!x||typeof x!=='object'||Array.isArray(x))throw 0;return x;}catch{fail(400,'Request data မမှန်ပါ။')}}
const ip=req=>(req.headers.get('x-forwarded-for')??'unknown').split(',')[0].trim().slice(0,100);
async function transaction(fn){const c=await pool.connect();try{await q(c,'BEGIN');await q(c,'SELECT pg_advisory_xact_lock(907240612)');const r=await fn(c);await q(c,'COMMIT');return r;}catch(e){await q(c,'ROLLBACK');throw e;}finally{c.release();}}
function headers(type='application/json; charset=utf-8'){return new Headers({'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Strict-Transport-Security':'max-age=31536000','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});}
export default{async fetch(request){await initialize();const url=new URL(request.url),path=url.pathname,h=headers();let status=200,out;try{
 if(request.method==='GET'&&path==='/'){h.set('Content-Type','text/html; charset=utf-8');out=playerPage();}
 else if(request.method==='GET'&&(path==='/admin'||path==='/admin/')){h.set('Content-Type','text/html; charset=utf-8');out=adminPage();}
 else if(request.method==='GET'&&path==='/health')out=JSON.stringify({ok:true,service:'dubai-lottery'});
 else if(request.method==='GET'&&path==='/ready'){await pool.query('SELECT 1');out=JSON.stringify({ok:true});}
 else if(request.method==='GET'&&path==='/api/state')out=JSON.stringify(await transaction(async c=>playerState(c,await auth(c,cookies(request).lottery_session,'player'))));
 else if(request.method==='GET'&&path==='/admin/api/state')out=JSON.stringify(await transaction(async c=>admins.state(c,await auth(c,cookies(request).lottery_admin,'admin'))));
 else if(request.method==='GET'&&path==='/admin/api/bets')out=JSON.stringify(await transaction(async c=>admins.report(c,await auth(c,cookies(request).lottery_admin,'admin'),url.searchParams)));
 else if(request.method==='POST'){
  const data=await body(request);
  if(path.startsWith('/api/')&&request.headers.get('X-Lottery-Request')!=='1')fail(403,'Request origin မမှန်ပါ။');
  if(path.startsWith('/admin/api/')&&request.headers.get('X-Lottery-Admin')!=='1')fail(403,'Admin request origin မမှန်ပါ။');
  if(path==='/api/login'){const raw=await transaction(c=>login(c,data.username,data.password,'player',ip(request)));if(raw?.invalid)fail(401,'Username သို့မဟုတ် Password မမှန်ပါ။');h.append('Set-Cookie',playerCookie(raw));out=JSON.stringify({ok:true});}
  else if(path==='/admin/api/login'){const raw=await transaction(c=>login(c,data.username,data.password,'admin',ip(request)));if(raw?.invalid)fail(401,'Username သို့မဟုတ် Password မမှန်ပါ။');h.append('Set-Cookie',adminCookie(raw));out=JSON.stringify({ok:true});}
  else if(path==='/api/logout'){const raw=cookies(request).lottery_session;await transaction(c=>q(c,'DELETE FROM sessions WHERE digest=$1',[sha(raw??'')]));h.append('Set-Cookie',playerCookie('',true));out=JSON.stringify({ok:true});}
  else if(path==='/admin/api/logout'){const raw=cookies(request).lottery_admin;await transaction(c=>q(c,'DELETE FROM sessions WHERE digest=$1',[sha(raw??'')]));h.append('Set-Cookie',adminCookie('',true));out=JSON.stringify({ok:true});}
  else out=JSON.stringify(await transaction(async c=>{
   if(path==='/api/bet'){const u=await auth(c,cookies(request).lottery_session,'player');await ensureDay(c);return place(c,u,data);}
   if(path==='/api/preferences'){const u=await auth(c,cookies(request).lottery_session,'player');return preferences(c,u,data);}
   const a=await auth(c,cookies(request).lottery_admin,'admin');if(path==='/admin/api/create')return admins.create(c,a,data);if(path==='/admin/api/adjust')return admins.adjust(c,a,data);if(path==='/admin/api/settle')return admins.schedule(c,a,data);fail(404,'မတွေ့ပါ။');
  }));
 }else fail(404,'မတွေ့ပါ။');
 }catch(e){if(e instanceof APIError){status=e.status;out=JSON.stringify({error:e.message});}else{status=500;out=JSON.stringify({error:'Server error. ပြန်စမ်းပါ။'});console.error('lottery_request_failed',{code:e.code??'internal'});}}
 return new Response(out,{status,headers:h});}};

// Integration tests import the same service; no test HTTP endpoints are exposed.
export {initialize,pool,transaction,admins,playerState,auth,login,place,ensureDay};

export function createDesignEnabledApp({original,pool,transaction,auth,cookies}) {
  const defaults=Object.freeze({
    siteTitle:"Dubai Lottery", subtitle:"DAILY LUCKY DRAW",
    badgeText:"နေ့စဉ် ကံစမ်းမယ်", loginHeading:"အကောင့်ဝင်မယ်",
    loginIntro:"သင့်အကောင့်နဲ့ ကံစမ်းမှုတွေကို စီမံပါ။",
    luckyHeading:"ဒီနေ့ရဲ့ Lucky Numbers", archiveHeading:"ထွက်ရှိပြီး ဂဏန်းများ",
    logoLetter:"D",footerText:"Dubai Lottery · မြန်မာစံတော်ချိန် (UTC +6:30)",
    bgColor:"#080e1c",panelColor:"#111c30",accentColor:"#ffcf77",textColor:"#eef3ff",
    radius:16,fontSize:14,width:"standard"
  });
  const stringKeys=["siteTitle","subtitle","badgeText","loginHeading","loginIntro","luckyHeading","archiveHeading","logoLetter","footerText"];
  const colorKeys=["bgColor","panelColor","accentColor","textColor"];
  const limits={siteTitle:55,subtitle:70,badgeText:60,loginHeading:70,loginIntro:160,luckyHeading:80,archiveHeading:80,logoLetter:3,footerText:130};
  function clean(input){
    const o={...defaults}, d=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
    for(const k of stringKeys) if(typeof d[k]==="string")o[k]=d[k].slice(0,limits[k]).trim()||defaults[k];
    for(const k of colorKeys) if(typeof d[k]==="string"&&/^#[0-9a-f]{6}$/i.test(d[k]))o[k]=d[k];
    if(Number.isInteger(Number(d.radius)))o.radius=Math.max(6,Math.min(30,Number(d.radius)));
    if(Number.isInteger(Number(d.fontSize)))o.fontSize=Math.max(12,Math.min(19,Number(d.fontSize)));
    if(["standard","compact","wide"].includes(d.width))o.width=d.width;
    return o;
  }
  const ddl="CREATE TABLE IF NOT EXISTS public.lottery_design_settings (id INTEGER PRIMARY KEY CHECK(id=1), draft JSONB NOT NULL DEFAULT '{}'::jsonb, published JSONB NOT NULL DEFAULT '{}'::jsonb, version INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), approved_at TIMESTAMPTZ, approved_by BIGINT)";
  let initializing;
  async function ensureTable(){
    if(!initializing)initializing=pool.query(ddl).then(()=>pool.query("INSERT INTO public.lottery_design_settings(id) VALUES(1) ON CONFLICT(id) DO NOTHING")).catch(e=>{initializing=null;throw e});
    await initializing;
  }
  async function row(c){
    const r=await c.query("SELECT draft,published,version,updated_at,approved_at FROM public.lottery_design_settings WHERE id=1");
    return r.rows[0]??{draft:{},published:{},version:0,updated_at:null,approved_at:null};
  }
  function json(data,status=200){
    return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Strict-Transport-Security":"max-age=31536000"}});
  }
  async function rootAdmin(req){
    const u=await transaction(c=>auth(c,cookies(req).lottery_admin,"admin"));
    if(u.admin_level!=="root")throw Object.assign(new Error("Owner Admin သာ ပြင်ဆင်ခွင့်ရှိပါသည်။"),{status:403});
    return u;
  }
  function editorPage(){return `<!doctype html><html lang="my"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dubai Lottery — Design Studio</title>
<style>
:root{color-scheme:dark;--gold:#ffcf77}*{box-sizing:border-box}body{margin:0;background:#07101f;color:#edf3ff;font:14px/1.7 system-ui,"Noto Sans Myanmar",sans-serif}a{color:#ffcf77}button,input,select{font:inherit}button{border:0;cursor:pointer;border-radius:10px;padding:11px 15px;background:#ffcf77;color:#231a0e;font-weight:750}button.secondary{background:#23344e;color:#edf3ff}button:disabled{opacity:.45;cursor:not-allowed}header{padding:18px max(18px,calc((100% - 1320px)/2));display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #29405c}header strong{font-size:20px}.content{max-width:1320px;padding:20px;margin:auto}.note{background:#142740;border:1px solid #365174;border-radius:12px;padding:12px;margin:0 0 18px;color:#b9cbe5}.layout{display:grid;grid-template-columns:minmax(300px,420px) minmax(0,1fr);gap:20px;align-items:start}.panel{background:#111d31;border:1px solid #2a3c57;border-radius:16px;padding:18px}.panel h2{font-size:18px;margin:0 0 14px}.field{display:block;margin:12px 0}.field span{display:block;font-size:12px;color:#b8c9e2;margin-bottom:5px}.field input,.field select{width:100%;background:#091527;color:#f0f6ff;border:1px solid #3d536d;border-radius:9px;padding:9px}.colorRow{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}.colorRow input{height:42px;padding:3px}.presets{display:flex;flex-wrap:wrap;gap:7px}.presets button{padding:8px 12px;background:#1b2c46;color:#f0f6ff;border:1px solid #496080}.btnrow{display:flex;flex-wrap:wrap;gap:9px;margin:15px 0 8px}.live{font-size:12px;color:#aabbd4}.previewShell{background:#091426;border:1px solid #40536e;border-radius:14px;padding:16px;min-height:390px}.preview{background:var(--pb,#080e1c);color:var(--pt,#eef3ff);border-radius:var(--pr,16px);padding:18px;min-height:340px;font-size:var(--pf,14px);max-width:var(--pw,920px);margin:auto}.preview .hero{display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap}.preview .brand{display:flex;align-items:center;gap:12px}.preview .logo{width:48px;height:48px;display:grid;place-items:center;font-size:24px;font-weight:900;color:var(--pa,#ffcf77);border:1px solid var(--pa,#ffcf77);border-radius:12px}.preview h1{font-size:23px;line-height:1.3;margin:0}.preview small{opacity:.75}.preview .tag{color:var(--pa,#ffcf77)}.preview .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:20px}.preview .result{background:var(--pp,#111c30);border:1px solid color-mix(in srgb,var(--pa) 25%,transparent);padding:14px;border-radius:var(--pr,16px);text-align:center}.preview .number{color:var(--pa,#ffcf77);font-size:30px;font-weight:900}.preview .cta{background:var(--pa,#ffcf77);color:#241a0b;padding:10px 15px;border-radius:12px;text-align:center;font-weight:800;margin-top:14px}.preview .mini{background:var(--pp,#111c30);border-radius:var(--pr,16px);padding:13px;margin-top:15px}#message{min-height:24px;font-size:13px;color:#ffcf77}h3{margin:0 0 8px}@media(max-width:850px){.layout{grid-template-columns:1fr}.preview .cards{gap:6px}.preview .result{padding:8px}.preview .number{font-size:24px}header strong{font-size:16px}}
</style></head><body><header><strong>🎨 Dubai Lottery · Design Studio</strong><a href="/admin">Admin Dashboard သို့ ပြန်ရန်</a></header>
<main class="content"><p class="note">Draft ကို သိမ်းရုံဖြင့် Website မပြောင်းပါ။ <b>Approve & Publish</b> နှိပ်မှသာ Player Website တွင် အသုံးပြုသွားပါမည်။ Account၊ Token၊ Draw Result များ မထိခိုက်ပါ။</p>
<div class="layout"><div class="panel"><h2>Website ဒီဇိုင်း ပြင်ဆင်ရန်</h2><div id="formWrap">
<div class="presets"><button type="button" data-preset="gold">Gold</button><button type="button" data-preset="blue">Ocean</button><button type="button" data-preset="emerald">Emerald</button><button type="button" data-preset="rose">Rose</button><button type="button" data-preset="violet">Violet</button></div>
<label class="field"><span>Website အမည်</span><input data-key="siteTitle" maxlength="55"></label>
<label class="field"><span>အောက်ခံ အမည်/စာတန်း</span><input data-key="subtitle" maxlength="70"></label>
<label class="field"><span>Header ညာဘက်စာတန်း</span><input data-key="badgeText" maxlength="60"></label>
<label class="field"><span>Logo စာလုံး (၁–၃)</span><input data-key="logoLetter" maxlength="3"></label>
<label class="field"><span>Login ခေါင်းစဉ်</span><input data-key="loginHeading" maxlength="70"></label>
<label class="field"><span>Login ဖော်ပြစာ</span><input data-key="loginIntro" maxlength="160"></label>
<label class="field"><span>Lucky Number ခေါင်းစဉ်</span><input data-key="luckyHeading" maxlength="80"></label>
<label class="field"><span>ရလဒ်ဟောင်းများ ခေါင်းစဉ်</span><input data-key="archiveHeading" maxlength="80"></label>
<label class="field"><span>အောက်ဆုံး Footer စာ</span><input data-key="footerText" maxlength="130"></label>
<div class="colorRow"><label class="field"><span>နောက်ခံအရောင်</span><input type="color" data-key="bgColor"></label><label class="field"><span>Card အရောင်</span><input type="color" data-key="panelColor"></label><label class="field"><span>အဓိက Theme အရောင်</span><input type="color" data-key="accentColor"></label><label class="field"><span>စာသားအရောင်</span><input type="color" data-key="textColor"></label></div>
<label class="field"><span>Card အဝိုင်း (Radius)</span><input type="range" min="6" max="30" data-key="radius"></label>
<label class="field"><span>စာလုံးအရွယ်အစား</span><input type="range" min="12" max="19" data-key="fontSize"></label>
<label class="field"><span>Layout အကျယ်</span><select data-key="width"><option value="standard">Standard</option><option value="compact">Compact</option><option value="wide">Wide</option></select></label>
</div><div class="btnrow"><button id="save">Save Draft</button><button id="approve">Approve & Publish</button><button id="reset" class="secondary">Published ပြန်ယူ</button></div><div id="message" role="status"></div><div class="live" id="version"></div></div>
<div class="panel"><h2>Live Preview (မထုတ်ပြန်ရသေး)</h2><div class="previewShell"><div id="preview" class="preview">
<div class="hero"><div class="brand"><div class="logo" id="pvLogo">D</div><div><h1 id="pvTitle"></h1><small id="pvSubtitle"></small></div></div><span class="tag" id="pvBadge"></span></div>
<div class="mini"><h3 id="pvLucky"></h3><div class="cards"><div class="result"><b>2D</b><div class="number">23</div><small>Lucky Number</small></div><div class="result"><b>3D</b><div class="number">456</div><small>Lucky Number</small></div><div class="result"><b>4D</b><div class="number">7890</div><small>Lucky Number</small></div></div></div>
<div class="mini"><h3 id="pvLogin"></h3><p id="pvIntro"></p><div class="cta">အကောင့်ဝင်မယ်</div></div>
<div class="mini" id="pvArchive"></div><small id="pvFooter"></small></div></div><p class="live">Preview ဂဏန်းများသည် အလှပြနမူနာသာဖြစ်ပြီး အမှန်တကယ်ရလဒ် မဟုတ်ပါ။</p><p><a href="/" target="_blank" rel="noopener">လက်ရှိ Live Website ကို ကြည့်ရန်</a></p></div></div></main>
<script>
'use strict';
const presets={gold:["#080e1c","#111c30","#ffcf77","#eef3ff"],blue:["#07182c","#122c47","#53cbff","#eef7ff"],emerald:["#061e1b","#12342e","#69e5b5","#ecfff7"],rose:["#260f22","#391a32","#ff96c7","#fff0f8"],violet:["#170f2b","#2a2049","#c6a0ff","#f8f2ff"]};
let published=null;
const els=Array.from(document.querySelectorAll('[data-key]'));
const $=id=>document.getElementById(id);
const msg=t=>{$('message').textContent=t;};
function form(){const x={};els.forEach(e=>x[e.dataset.key]=e.type==='range'?Number(e.value):e.value);return x;}
function fill(cfg){els.forEach(e=>{if(cfg[e.dataset.key]!==undefined)e.value=cfg[e.dataset.key];});preview();}
function preview(){
 const v=form(),p=$('preview');
 p.style.setProperty('--pb',v.bgColor);p.style.setProperty('--pp',v.panelColor);p.style.setProperty('--pa',v.accentColor);p.style.setProperty('--pt',v.textColor);
 p.style.setProperty('--pr',v.radius+'px');p.style.setProperty('--pf',v.fontSize+'px');p.style.setProperty('--pw',v.width==='compact'?'720px':v.width==='wide'?'1120px':'920px');
 const pairs={pvTitle:'siteTitle',pvSubtitle:'subtitle',pvBadge:'badgeText',pvLogo:'logoLetter',pvLucky:'luckyHeading',pvLogin:'loginHeading',pvIntro:'loginIntro',pvArchive:'archiveHeading',pvFooter:'footerText'};
 for(const id in pairs)$(id).textContent=v[pairs[id]]||'';
}
async function api(path,body){
 const res=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json','X-Lottery-Admin':'1'}:{},body:body?JSON.stringify(body):undefined});
 const data=await res.json();if(!res.ok)throw Error(data.error||'Request failed');return data;
}
async function boot(){
 try{
  const r=await api('/admin/api/designer');published=r.published;fill(r.draft);
  $('version').textContent='Live Version: '+r.version+(r.approved_at?' · Approved '+new Date(r.approved_at).toLocaleString():' · Original Theme');
  msg('Draft ကို ပြင်ပြီး သိမ်းနိုင်ပါပြီ။');
 }catch(e){msg('Admin Login ဝင်ပြီးမှ ဒီစာမျက်နှာကို သုံးနိုင်ပါမယ်။ '+e.message);$('save').disabled=true;$('approve').disabled=true;}
}
els.forEach(e=>e.addEventListener('input',preview));
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const keys=['bgColor','panelColor','accentColor','textColor'],v=presets[b.dataset.preset];keys.forEach((key,i)=>document.querySelector('[data-key="'+key+'"]').value=v[i]);preview();});
$('save').onclick=async()=>{try{await api('/admin/api/designer/save',{design:form()});msg('Draft သိမ်းပြီးပါပြီ။ Live Website မပြောင်းသေးပါ။');}catch(e){msg('Save မအောင်မြင်: '+e.message)}};
$('approve').onclick=async()=>{if(!confirm('ဒီ Design ကို Live Website မှာ ထုတ်ပြန်မလား?'))return;try{await api('/admin/api/designer/save',{design:form()});const r=await api('/admin/api/designer/approve',{});published=form();$('version').textContent='Live Version: '+r.version+' · Just approved';msg('✓ Approve & Publish အောင်မြင်ပါပြီ။ Website ကို Refresh လုပ်ပြီးကြည့်နိုင်ပါပြီ။');}catch(e){msg('Publish မအောင်မြင်: '+e.message)}};
$('reset').onclick=()=>{if(published){fill(published);msg('Published ဒီဇိုင်းကို Preview ထဲ ပြန်ယူထားပါပြီ။ Save မနှိပ်ရသေးပါ။')}};
boot();
</script></body></html>`;}
  const publicInjector=String.raw`<script>
(function(){
 const allowed=['siteTitle','subtitle','badgeText','loginHeading','loginIntro','luckyHeading','archiveHeading','logoLetter','footerText'];
 function apply(x){
  if(!x||typeof x!=='object')return;
  const style=document.getElementById('lottery-design-runtime')||document.createElement('style');style.id='lottery-design-runtime';
  style.textContent=':root{--bg:'+x.bgColor+';--panel:'+x.panelColor+';--gold:'+x.accentColor+';--text:'+x.textColor+'}body{font-size:'+x.fontSize+'px!important}main{max-width:'+(x.width==='compact'?720:x.width==='wide'?1120:920)+'px!important}.card,.lucky,.result-day{background:var(--panel)!important;border-radius:'+x.radius+'px!important}.brand-icon{color:var(--gold)!important;border-color:var(--gold)!important}.lucky-number{color:var(--gold)!important}.online{color:var(--gold)!important}';
  document.head.appendChild(style);
  const targets={siteTitle:'header .brand h1',subtitle:'header .brand small',badgeText:'header .online',loginHeading:'#login h2',loginIntro:'#login .muted',luckyHeading:'.section-heading h2',archiveHeading:'.archive-head h2',logoLetter:'header .brand-icon',footerText:'.footer'};
  for(const k of allowed){const node=document.querySelector(targets[k]);if(node&&typeof x[k]==='string')node.textContent=x[k]}
  if(typeof x.siteTitle==='string')document.title=x.siteTitle;
 }
 async function sync(){
  try{const res=await fetch('/api/public-design',{cache:'no-store'});if(res.ok){const o=await res.json();apply(o.design)}}catch(_){}
 }
 sync();setInterval(sync,30000);
})();
</script>`;
  async function handler(req){
    const path=new URL(req.url).pathname, method=req.method;
    if(method==="GET"&&path==="/admin/designer")
      return new Response(editorPage(),{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Frame-Options":"DENY","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"}});
    if(path==="/api/public-design"&&method==="GET"){
      try{await ensureTable();const v=await transaction(c=>row(c));return json({design:clean(v.published),version:v.version,approved_at:v.approved_at});}
      catch(e){console.error('lottery_design_public_error',String(e?.code||'unknown'));return json({error:"Design settings temporarily unavailable"},503);}
    }
    if(path.startsWith("/admin/api/designer")){
      try{
        const u=await rootAdmin(req);await ensureTable();
        if(method==="GET"&&path==="/admin/api/designer"){
          const r=await transaction(c=>row(c));return json({draft:clean(r.draft),published:clean(r.published),version:r.version,approved_at:r.approved_at});
        }
        if(method!=="POST"||req.headers.get("X-Lottery-Admin")!=="1")return json({error:"Request not allowed"},403);
        const origin=req.headers.get("Origin");if(origin&&origin!==new URL(req.url).origin)return json({error:"Origin not allowed"},403);
        if(path==="/admin/api/designer/save"){
          const raw=await req.text();if(raw.length>6000)return json({error:"Too much text"},413);
          const body=JSON.parse(raw);const design=clean(body.design);
          await transaction(async c=>{await c.query("UPDATE public.lottery_design_settings SET draft=$1::jsonb,updated_at=now() WHERE id=1",[JSON.stringify(design)]);});
          return json({ok:true});
        }
        if(path==="/admin/api/designer/approve"){
          const r=await transaction(async c=>{
            const updated=await c.query("UPDATE public.lottery_design_settings SET published=draft,version=version+1,approved_at=now(),approved_by=$1 WHERE id=1 RETURNING version,approved_at",[u.id]);
            return updated.rows[0];
          });return json({ok:true,version:r.version,approved_at:r.approved_at});
        }
        return json({error:"Not found"},404);
      }catch(e){const status=e.status||((e instanceof SyntaxError)?400:500);if(status===500)console.error('lottery_design_admin_error',String(e?.code||'unknown'));return json({error:status===500?"Server error":e.message},status);}
    }
    const response=await original.fetch(req);
    if(method==="GET"&&path==="/"&&response.ok){
      const html=await response.text();if(html.includes("</body>")){
        const headers=new Headers(response.headers);headers.delete("content-length");
        return new Response(html.replace("</body>",publicInjector+"</body>"),{status:response.status,headers});
      }
    }
    if(method==="GET"&&(path==="/admin"||path==="/admin/")&&response.ok){
      const html=await response.text();if(html.includes("</body>")){
        const headers=new Headers(response.headers);headers.delete("content-length");
        return new Response(html.replace("</body>",'<a href="/admin/designer" style="position:fixed;right:14px;bottom:14px;z-index:100;background:#ffcf77;color:#231a0e;border-radius:12px;padding:10px 16px;font-weight:800;text-decoration:none;box-shadow:0 4px 22px #0009">🎨 Design Studio</a></body>'),{status:response.status,headers});
      }
    }
    return response;
  }
  return {fetch:handler};
}

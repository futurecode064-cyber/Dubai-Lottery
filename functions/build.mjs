import {build} from 'esbuild';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const out=resolve(dir,'dist');
const outfile=resolve(out,'index.mjs');
await mkdir(out,{recursive:true});

const oldHint='Lucky Number များသည် ရလဒ်မထွက်မီ random ပြောင်းနေမည်ဖြစ်ပြီး သတ်မှတ်ထွက်ချိန်တွင် Admin အတည်ပြုထားသော ရလဒ်ကို ပြသမည်ဖြစ်ပါသည်။ ပြောင်းနေသောဂဏန်းများက အနိုင်ရရလဒ်ကို မဆုံးဖြတ်ပါ။ ရလဒ်ထွက်ရှိပြီးနောက် ၈ နာရီကြာ ပြထားပေးမည်ဖြစ်သလို ထွက်ရှိပြီးသမျှ နေ့စဉ် result များကိုလည်း ရလဒ်များစာရင်းတွင် ဝင်ရောက်ကြည့်ရှုနိုင်ပါသည်။';
const newHint='Lucky Number များသည် random ပြောင်းနေမည် ဖြစ်ပြီး Lucky Number ထွက်ချိန်တွင် ကွက်တိကျရောက်သည့် Number သည် Lucky Number ဖြစ်ပါသည်။ Lucky Number ထွက်ရှိပြီးသည့်အခါ ရလဒ်ကို ၈ နာရီကြာထိ ပြထားပေးမည်ဖြစ်သလို ထွက်ရှိပြီးသမျှ နေ့စဉ် result များကိုလည်း ရလဒ်များစာရင်းတွင် ဝင်ရောက်ကြည့်ရှုနိုင်ပါသည်။';
const sourceCss='.result-source{font-size:10px;color:var(--muted);word-break:break-word}';
const sourceMarkup='<div class="result-source">'+"${d?esc(d.source):'မထုတ်ပြန်ရသေး'}"+'</div>';
const sourceMarkupActual='<div class="result-source">'+"'+(d?esc(d.source):'မထုတ်ပြန်ရသေး')+'"+'</div>';

const finalPlayerUi={
  name:'final-player-ui',
  setup(b){
    b.onLoad({filter:/ui-player\.mjs$/},async args=>{
      let s=await readFile(args.path,'utf8');
      const markup=s.includes(sourceMarkupActual)?sourceMarkupActual:sourceMarkup;
      for(const [name,value] of [['result hint',oldHint],['result source CSS',sourceCss],['result source markup',markup]]){
        if(!s.includes(value)) throw new Error(`Expected ${name} was not found in player UI source`);
      }
      s=s.replace(oldHint,newHint).replace(sourceCss,'').replace(markup,'').replaceAll('အလှပြဂဏန်း','random ဂဏန်း');
      return {contents:s,loader:'js'};
    });
  }
};

await build({
  entryPoints:[resolve(dir,'index.mjs')],
  bundle:true,
  minify:true,
  platform:'node',
  target:'node24',
  format:'esm',
  outfile,
  plugins:[finalPlayerUi],
  banner:{js:"import{createRequire as ___cr}from'node:module';const __filename='/tmp/dubai-lottery/index.mjs';const __dirname='/tmp/dubai-lottery';const require=___cr(__filename);"}
});
console.log('Built minified Dubai Lottery Neon Function bundle with finalized player result UI.');

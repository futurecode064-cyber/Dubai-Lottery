import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const out=resolve(dir,'dist');
await mkdir(out,{recursive:true});
await build({
  entryPoints:[resolve(dir,'index.mjs')],
  bundle:true,
  platform:'node',
  target:'node24',
  format:'esm',
  outfile:resolve(out,'index.mjs'),
  banner:{js:"import{createRequire as ___cr}from'node:module';const __filename='/tmp/dubai-lottery/index.mjs';const __dirname='/tmp/dubai-lottery';const require=___cr(__filename);"}
});
console.log('Built Dubai Lottery Neon Function bundle.');

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
  banner:{js:"import{createRequire as ___cr}from'node:module';import{fileURLToPath as ___f}from'node:url';import{dirname as ___d}from'node:path';const require=___cr(import.meta.url);const __filename=___f(import.meta.url);const __dirname=___d(__filename);"}
});
console.log('Built Dubai Lottery Neon Function bundle.');

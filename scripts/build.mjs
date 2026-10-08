import fs from 'node:fs/promises';
import {build} from 'esbuild';
import allMetadata from 'libphonenumber-js/metadata.max.json';
const metadata={version:allMetadata.version,country_calling_codes:{81:['JP']},countries:{JP:allMetadata.countries.JP}};
await fs.writeFile('src/phone-metadata.json',JSON.stringify(metadata));
await build({entryPoints:['src/app.mjs'],bundle:true,minify:true,format:'esm',target:['es2020'],outfile:'assets/app.js',legalComments:'eof'});
const template=await fs.readFile('src/page.html','utf8');
for(const [file,tool,title] of [['index.html','productivity','生産性・時給'],['seisansei.html','productivity','生産性・時給'],['taikadou2025.html','progress','対稼働'],['bangou_henkan.htm','phone','電話番号整形']]){
 const html=template.replaceAll('{{TITLE}}',title).replaceAll('{{TOOL}}',tool).replace(/{{HIDDEN_(\w+)}}/g,(_,name)=>name===tool?'':'hidden').replace(/{{CURRENT_(\w+)}}/g,(_,name)=>name===tool?'aria-current="page"':'');
 await fs.writeFile(file,html);
}
await fs.copyFile('node_modules/libphonenumber-js/LICENSE','assets/libphonenumber-LICENSE');
await fs.copyFile('node_modules/libphonenumber-js/LICENSE.Apache','assets/metadata-LICENSE');

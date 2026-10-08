import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await fs.readFile('index.html','utf8'),script=await fs.readFile('assets/app.js','utf8');
function setup(path='index.html'){
 const dom=new JSDOM(html,{url:`https://e-axe.github.io/gmo-tools/${path}`,runScripts:'outside-only'});
 const w=dom.window,OriginalDate=w.Date;
 w.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-10-09T02:00:00+09:00']));}};
 let clipboard='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{clipboard=text;}}});
 w.eval(script);const $=id=>w.document.getElementById(id);
 const fill=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {dom,w,$,fill,clipboard:()=>clipboard};
}
test('auto-calculation, invalid input clears stale results, copying and reset',async()=>{
 const {dom,$,fill,clipboard}=setup();
 fill('sales','100');fill('cools','100');assert.equal($('wage-value').textContent,'2,700');assert.equal($('gap-value').textContent,'あと 5 万円');
 $('copy-productivity').click();await new Promise(resolve=>setImmediate(resolve));assert.match(clipboard(),/次月時給（現行設定）：2,700円/);
 fill('cools','0');assert.equal($('productivity-results').hidden,true);assert.equal($('copy-productivity').disabled,true);assert.match($('productivity-error').textContent,/0より大きい/);
 fill('cools','100');fill('sales','0');assert.equal($('wage-value').textContent,'1,500');
 $('clear-productivity').click();assert.equal($('sales').value,'');assert.equal($('productivity-results').hidden,true);dom.window.close();
});
test('tool switching retains input and changes URL, back navigation updates panels',()=>{
 const {dom,w,$,fill}=setup();fill('sales','100');fill('cools','100');
 w.document.querySelector('[data-tool="phone"][href]').click();assert.equal($('phone').hidden,false);assert.ok(w.location.pathname.endsWith('bangou_henkan.htm'));
 w.document.querySelector('[data-tool="productivity"][href]').click();assert.equal($('sales').value,'100');assert.equal($('productivity').hidden,false);
 w.history.replaceState(null,'','taikadou2025.html');w.dispatchEvent(new w.PopStateEvent('popstate'));assert.equal($('progress').hidden,false);dom.window.close();
});
test('calendar defaults in Japan time, holiday correction, month switching and validation',()=>{
 const {dom,$,fill}=setup();assert.equal($('cutoff').value,'2026-10-08');fill('target','100');fill('actual','60');
 assert.equal($('days-value').textContent,'6 / 21 日');assert.equal($('difference-value').textContent,'31.43 万円');
 fill('closed','2026-10-15');assert.equal($('days-value').textContent,'6 / 20 日');
 $('next-month').click();assert.equal($('cutoff').value,'2026-10-31');assert.equal($('closed').value,'');assert.equal($('days-value').textContent,'0 / 19 日');
 $('previous-month').click();assert.equal($('closed').value,'2026-10-15');assert.equal($('cutoff').value,'2026-10-08');
 fill('opened','2026-10-15');assert.equal($('progress-results').hidden,true);assert.match($('progress-error').textContent,/両方/);
 fill('opened','');fill('closed','invalid');assert.equal($('copy-progress').disabled,true);
 $('clear-progress').click();assert.equal($('closed').value,'');assert.equal($('target').value,'');dom.window.close();
});
test('phone conversion, unresolved row notices, clipboard and stale output invalidation',async()=>{
 const {dom,$,fill,clipboard}=setup();fill('phone-input','09012345678\n123\nabc\n');$('convert-phone').click();
 assert.equal($('phone-output').value,'090-1234-5678\n123\nabc\n');assert.equal($('phone-review-list').children.length,2);assert.match($('phone-review-list').textContent,/2行目/);
 $('copy-phone').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(clipboard(),$('phone-output').value);
 fill('phone-input','0312345678');assert.equal($('copy-phone').disabled,true);assert.equal($('phone-output').value,'');
 $('convert-phone').click();assert.equal($('phone-output').value,'03-1234-5678');assert.equal($('phone-review').hidden,true);
 fill('phone-input','<img src=x onerror=alert(1)>');$('convert-phone').click();assert.equal($('phone-review-list').querySelector('img'),null);
 $('clear-phone').click();assert.equal($('phone-input').value,'');assert.equal($('copy-phone').disabled,true);dom.window.close();
});
test('generated legacy entry pages and no external rendering dependencies',async()=>{
 for(const [path,tool]of [['index.html','productivity'],['seisansei.html','productivity'],['taikadou2025.html','progress'],['bangou_henkan.htm','phone']]){
  const text=await fs.readFile(path,'utf8');assert.ok(!text.includes('{{'));const dom=new JSDOM(text);
  assert.equal(dom.window.document.body.dataset.tool,tool);assert.equal(dom.window.document.getElementById(tool).hidden,false);
  assert.equal(dom.window.document.querySelectorAll('nav a[aria-current]').length,1);assert.equal(dom.window.document.querySelectorAll('script[src^="https:"]').length,0);
  assert.ok(dom.window.document.querySelector('meta[name="viewport"]'));dom.window.close();
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await fs.readFile('index.html','utf8'),script=await fs.readFile('assets/app.js','utf8');
function setup(path='index.html',now='2026-10-09T02:00:00+09:00'){
 const dom=new JSDOM(html,{url:`https://e-axe.github.io/gmo-tools/${path}`,runScripts:'outside-only'});
 const w=dom.window,OriginalDate=w.Date;
 w.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[now]));}};
 let clipboard='';Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{clipboard=text;}}});
 w.scrollTo=()=>{};w.eval(script);const $=id=>w.document.getElementById(id);
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
 $('next-month').click();assert.equal($('cutoff').value,'2026-10-31');assert.equal($('closed').value,'');assert.equal($('target').value,'');assert.equal($('actual').value,'');assert.equal($('progress-results').hidden,true);fill('target','100');fill('actual','0');assert.equal($('days-value').textContent,'0 / 19 日');
 $('previous-month').click();assert.equal($('closed').value,'2026-10-15');assert.equal($('cutoff').value,'2026-10-08');
 fill('opened','2026-10-15');assert.equal($('progress-results').hidden,true);assert.match($('progress-error').textContent,/両方/);
 fill('opened','');fill('closed','invalid');assert.equal($('copy-progress').disabled,true);
 $('clear-progress').click();assert.equal($('closed').value,'');assert.equal($('target').value,'');dom.window.close();
});
test('phone conversion, unresolved row notices, clipboard and stale output invalidation',async()=>{
 const {dom,$,fill,clipboard}=setup();fill('phone-input','09012345678\n123\nabc\n');$('convert-phone').click();
 assert.equal($('phone-output').value,'090-1234-5678\n123\nabc\n');assert.equal($('phone-review-list').children.length,2);assert.match($('phone-review-list').textContent,/2行目/);
 $('copy-phone').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(clipboard(),$('phone-output').value);
 fill('phone-input','0312345678');assert.equal($('copy-phone').disabled,true);assert.equal($('phone-output').value,'090-1234-5678\n123\nabc\n');assert.equal($('phone-stale').hidden,false);
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

test('month records preserve cutoff, actuals and adjustments without mixing months',()=>{
 const {dom,w,$,fill}=setup();fill('target','100');fill('actual','60');fill('cutoff','2026-10-05');fill('closed','2026-10-15');
 $('next-month').click();assert.equal($('target').value,'');assert.equal($('actual').value,'');assert.equal($('copy-progress').disabled,true);
 fill('target','200');fill('actual','10');fill('cutoff','2026-11-04');
 $('previous-month').click();assert.equal($('cutoff').value,'2026-10-05');assert.equal($('actual').value,'60');assert.equal($('target').value,'100');assert.equal($('closed').value,'2026-10-15');
 $('next-month').click();assert.equal($('cutoff').value,'2026-11-04');assert.equal($('actual').value,'10');assert.equal($('target').value,'200');
 $('clear-progress').click();assert.equal($('target').value,'');assert.equal($('actual').value,'');$('previous-month').click();assert.equal($('actual').value,'60');assert.equal($('cutoff').value,'2026-10-05');dom.window.close();
});
test('missing current-year holiday data stops calculation instead of silently using previous year',()=>{
 const {dom,w,$,fill}=setup('index.html','2028-01-03T03:00:00+09:00');fill('target','100');fill('actual','60');
 assert.equal($('year').value,'');assert.equal($('cutoff').disabled,true);assert.equal($('progress-results').hidden,true);assert.equal($('copy-progress').disabled,true);assert.match($('progress-error').textContent,/2028年.*未収録/);
 $('year').value='2027';$('year').dispatchEvent(new w.Event('change'));assert.equal($('cutoff').disabled,false);assert.equal($('target').value,'');fill('target','100');fill('actual','60');assert.equal($('progress-results').hidden,false);
 $('current-month').click();assert.equal($('year').value,'');assert.equal($('copy-progress').disabled,true);dom.window.close();
});
test('visible arrow buttons and keyboard steps preserve decimals and clamp at zero',()=>{
 const {dom,w,$,fill}=setup();fill('sales','100.5');fill('cools','166.13');
 w.document.querySelector('[data-number="sales"][data-direction="1"]').click();assert.equal($('sales').value,'101.5');
 $('cools').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));assert.equal($('cools').value,'167.13');
 $('cools').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',shiftKey:true,bubbles:true,cancelable:true}));assert.equal($('cools').value,'157.13');
 fill('sales','0.1');w.document.querySelector('[data-number="sales"][data-direction="-1"]').click();assert.equal($('sales').value,'0');
 fill('sales','104.99999');fill('cools','100');assert.equal($('productivity-value').textContent,'10,499.99');assert.equal($('wage-value').textContent,'2,700');assert.match($('goal-caption').textContent,/104.99999万円/);
 fill('sales','0');fill('cools','0.000000000000001');assert.equal($('wage-value').textContent,'1,500');
 dom.window.close();
});
test('remaining daily requirement handles month end and achieved targets',()=>{
 const {dom,$,fill}=setup();fill('target','100');fill('actual','60');assert.match($('remaining-plan').textContent,/あと 40万円.*残り 15営業日.*2.6667万円/);
 fill('cutoff','2026-10-31');assert.match($('remaining-plan').textContent,/基準日以降の営業日はありません/);assert.ok(!$('remaining-plan').textContent.includes('Infinity'));
 fill('actual','100');assert.match($('remaining-plan').textContent,/達成/);dom.window.close();
});
test('unresolved phone rows can be located and stale output cannot be copied',()=>{
 const {dom,w,$,fill}=setup();fill('phone-input','09012345678\n\nabc\n123');$('convert-phone').click();
 assert.match($('phone-copy-note').textContent,/2件.*含まれます/);const jump=$('phone-review-list').querySelector('button');jump.click();
 assert.equal(w.document.activeElement,$('phone-input'));assert.equal($('phone-input').value.slice($('phone-input').selectionStart,$('phone-input').selectionEnd),'abc');
 const previous=$('phone-output').value;fill('phone-input','0312345678');assert.equal($('phone-output').value,previous);assert.equal($('copy-phone').disabled,true);assert.equal($('phone-stale').hidden,false);
 $('convert-phone').click();assert.equal($('phone-stale').hidden,true);assert.equal($('phone-copy-note').hidden,true);assert.equal($('phone-output').value,'03-1234-5678');dom.window.close();
});
test('tool navigation focuses the heading and invisible submit buttons are not tab stops',()=>{
 const {dom,w,$}=setup();w.document.querySelector('[data-tool="phone"][href]').click();assert.equal(w.document.activeElement,$('phone-title'));
 for(const button of w.document.querySelectorAll('button.sr-only'))assert.equal(button.tabIndex,-1);dom.window.close();
});
test('clipboard denial exposes the exact result for manual copying',async()=>{
 const {dom,w,$,fill}=setup();w.navigator.clipboard.writeText=async()=>{throw new Error('denied');};w.document.execCommand=()=>false;
 fill('sales','100');fill('cools','100');$('copy-productivity').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal($('copy-dialog').open,true);assert.match($('copy-preview').value,/次月時給（現行設定）：2,700円/);assert.equal(w.document.activeElement,$('copy-preview'));
 assert.equal($('copy-preview').selectionEnd,$('copy-preview').value.length);dom.window.close();
});

test('clipboard fallback succeeds when Clipboard API is unavailable',async()=>{
 const {dom,w,$,fill}=setup();w.navigator.clipboard.writeText=async()=>{throw new Error('unavailable');};let selected='';w.document.execCommand=command=>{assert.equal(command,'copy');selected=w.document.activeElement.value;return true;};
 fill('phone-input','09012345678');$('convert-phone').click();$('copy-phone').click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(selected,'090-1234-5678');assert.match($('copy-phone').textContent,/コピーしました/);assert.equal($('copy-dialog').open,false);dom.window.close();
});
test('generated structure keeps primary conversion before output and labels are unique',()=>{
 const dom=new JSDOM(html),d=dom.window.document,ids=[...d.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
 assert.ok(d.getElementById('convert-phone').compareDocumentPosition(d.getElementById('phone-output'))&dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
 for(const label of d.querySelectorAll('label[for]'))assert.ok(d.getElementById(label.htmlFor));
 assert.equal(d.querySelector('#productivity-results').closest('.result-stage').parentElement.className,'calculator');dom.window.close();
});

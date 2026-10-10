import test from 'node:test';
import assert from 'node:assert/strict';
import {businessDays} from '../src/calculations.mjs';
import {formatPhoneLine} from '../src/phone.mjs';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';

test('business days work without Object.hasOwn and ignore inherited holidays',()=>{
  const original=Object.getOwnPropertyDescriptor(Object,'hasOwn');
  Object.defineProperty(Object,'hasOwn',{value:undefined,configurable:true});
  try {
    const holidays=Object.create({'2026-10-01':'inherited'});
    holidays['2026-10-12']='holiday';
    holidays.hasOwnProperty=null;
    assert.deepEqual(businessDays(2026,10,'2026-10-08',holidays),{total:21,elapsed:6,remaining:15});
  } finally {
    if(original)Object.defineProperty(Object,'hasOwn',original);
    else delete Object.hasOwn;
  }
});

test('international phone numbers accept explicitly optional trunk zero',()=>{
  for(const [input,output] of [
    ['+81 (0)90 1234 5678','090-1234-5678'],
    ['+81(0)80-1234-5678','080-1234-5678'],
    ['+81-(0)70-1234-5678','070-1234-5678'],
    ['+81 (0)3 1234 5678','03-1234-5678'],
    ['＋８１ （０）９０ １２３４ ５６７８','090-1234-5678']
  ]) {
    const result=formatPhoneLine(input);
    assert.equal(result.status,'ok',input);
    assert.equal(result.output,output,input);
    assert.equal(result.original,input);
  }
  for(const input of ['+81 (0)90 1234 567','+81 (0)90 1234 56789','+81 (00)90 1234 5678','+81 (0)90 1234 5678 ext 1','+44 (0)90 1234 5678']) {
    const result=formatPhoneLine(input);
    assert.notEqual(result.status,'ok',input);
    assert.equal(result.output,input);
  }
});

test('built UI calculates without Object.hasOwn and converts optional trunk zero',async()=>{
  const html=await fs.readFile('index.html','utf8');
  const script=await fs.readFile('assets/app.js','utf8');
  const dom=new JSDOM(html,{url:'https://e-axe.github.io/gmo-tools/',runScripts:'outside-only'});
  const w=dom.window;
  try {
    w.Object.hasOwn=undefined;
    w.scrollTo=()=>{};
    w.eval(script);
    const $=id=>w.document.getElementById(id);
    const fill=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));};
    $('year').value='2026';$('year').dispatchEvent(new w.Event('change'));
    $('month').value='10';$('month').dispatchEvent(new w.Event('change'));
    fill('cutoff','2026-10-08');fill('target','100');fill('actual','60');
    assert.equal($('progress-results').hidden,false);
    assert.equal($('days-value').textContent,'6 / 21 日');
    fill('phone-input','+81 (0)90 1234 5678');$('convert-phone').click();
    assert.equal($('phone-output').value,'090-1234-5678');
    assert.equal($('phone-review').hidden,true);
  } finally {w.close();}
});

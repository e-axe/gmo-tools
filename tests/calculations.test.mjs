import test from 'node:test';
import assert from 'node:assert/strict';
import {productivity,displayProductivity,WAGES,businessDays,progress,readDateLines,monthBounds} from '../src/calculations.mjs';
import holidays from '../src/holidays.json' with {type:'json'};
import {formatPhoneLine,formatPhoneText} from '../src/phone.mjs';
test('productivity example, zero revenue and highest rank',()=>{
 const r=productivity(100,100);assert.equal(r.value,10000);assert.equal(r.wage,2700);assert.equal(r.gap,5);assert.equal(r.required,105);
 assert.equal(productivity(0,100).wage,1500);assert.equal(productivity(150,100).wage,3900);assert.equal(productivity(150,100).next,undefined);
 for(const values of [[-1,100],[100,0],[100,-1],[Infinity,100],[100,NaN]])assert.equal(productivity(...values),null);
});
test('each wage boundary including decimal cools',()=>{
 for(const item of WAGES.slice(1))for(const cools of [100,166.13]){
  const required=item.threshold*cools/10000;
  assert.equal(productivity(required,cools).wage,item.wage);
  assert.ok(productivity(required-0.0001,cools).wage<item.wage);
 }
});
test('2026 holidays, month start, month end and company overrides',()=>{
 const full=businessDays(2026,10,'2026-10-31',holidays.dates);assert.deepEqual(full,{total:21,elapsed:21,remaining:0});
 assert.equal(businessDays(2026,10,'2026-10-08',holidays.dates).elapsed,6);
 assert.equal(businessDays(2026,10,'2026-09-30',holidays.dates).elapsed,0);
 assert.equal(businessDays(2026,10,'2026-10-12',holidays.dates).elapsed,7);
 assert.equal(businessDays(2026,10,'2026-10-31',holidays.dates,['2026-10-15']).total,20);
 assert.equal(businessDays(2026,10,'2026-10-31',holidays.dates,[],['2026-10-17']).total,22);
 assert.equal(businessDays(2026,9,'2026-09-30',holidays.dates).total,19);
 assert.equal(businessDays(2027,3,'2027-03-31',holidays.dates).total,22);
 assert.equal(businessDays(2026,10,'2026-11-01',holidays.dates),null);
 assert.equal(businessDays(2026,2,'2026-02-30',holidays.dates),null);
 assert.equal(monthBounds(2024,2).last,'2024-02-29');
});
test('progress arithmetic and invalid values',()=>{
 const r=progress(100,60,businessDays(2026,10,'2026-10-08',holidays.dates));
 assert.ok(Math.abs(r.expected-100*6/21)<1e-10);assert.ok(Math.abs(r.difference-(60-100*6/21))<1e-10);
 assert.equal(r.achievement,60);assert.equal(progress(0,60,{total:21,elapsed:6}),null);
 assert.equal(progress(100,-1,{total:21,elapsed:6}),null);assert.equal(progress(100,60,{total:0,elapsed:0}),null);
 assert.deepEqual(readDateLines('2026-10-15\n\n2026-10-15'),['2026-10-15']);assert.equal(readDateLines('2026-02-30'),null);
});
test('telephone formatting respects Japanese variable area codes and service numbers',()=>{
 for(const [input,output]of [['0312345678','03-1234-5678'],['0612345678','06-1234-5678'],['0422223456','0422-22-3456'],['0499223456','04992-2-3456'],['09012345678','090-1234-5678'],['０９０１２３４５６７８','090-1234-5678'],['+819012345678','090-1234-5678'],['0120123456','0120-123-456'],['08001234567','0800-123-4567'],['0570123456','0570-123-456'],['05012345678','050-1234-5678']]){
  assert.equal(formatPhoneLine(input).output,output,input);assert.equal(formatPhoneLine(input).status,'ok',input);
 }
});
test('telephone preserves row order, blank lines and unresolved originals',()=>{
 const r=formatPhoneText('09012345678\r\n\r\n123\r\nabc\r\n03-1234-5678 内線99\r\n');
 assert.equal(r.map(x=>x.output).join('\n'),'090-1234-5678\n\n123\nabc\n03-1234-5678 内線99\n');
 assert.equal(r[2].status,'review');assert.equal(r[3].status,'invalid');assert.equal(r[4].status,'invalid');
 assert.equal(formatPhoneLine('11111111111').status,'review');
 assert.equal(formatPhoneLine('<script>alert(1)</script>').output,'<script>alert(1)</script>');
});

test('relative boundary tolerance never awards a higher wage for zero sales',()=>{
 for(const cools of [1e-15,1e-20,1e-100,0.01,166.13])assert.equal(productivity(0,cools).wage,1500);
 assert.equal(displayProductivity(productivity(104.99999,100).value),10499.99);
 assert.equal(displayProductivity(productivity(105,100).value),10500);
 assert.equal(productivity(1e300,1e300).wage,2700);
 assert.ok(Number.isFinite(displayProductivity(1e308)));
});

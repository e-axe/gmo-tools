export const WAGES = [
  {threshold:0,wage:1500},{threshold:3000,wage:1650},
  {threshold:4500,wage:1850},{threshold:6000,wage:2100},
  {threshold:7500,wage:2400},{threshold:9000,wage:2700},
  {threshold:10500,wage:3000},{threshold:12000,wage:3300},
  {threshold:13500,wage:3600},{threshold:15000,wage:3900}
];
export function productivity(sales,cools) {
  if(!Number.isFinite(sales)||sales<0||!Number.isFinite(cools)||cools<=0) return null;
  const value=(sales/cools)*10000;
  if(!Number.isFinite(value))return null;
  // Compare total sales to avoid boundary errors from dividing decimals.
  let index=0;
  WAGES.forEach((item,i)=>{const required=(item.threshold/10000)*cools;const tolerance=Number.EPSILON*Math.max(Math.abs(sales),Math.abs(required))*8;if(Number.isFinite(required)&&(sales>=required || Math.abs(sales-required)<=tolerance)) index=i;});
  const next=WAGES[index+1], second=WAGES[index+2];
  const gap=item=>item?Math.max(0,(item.threshold/10000)*cools-sales):null;
  return {value,index,wage:WAGES[index].wage,next,second,gap:gap(next),secondGap:gap(second),required:next?(next.threshold/10000)*cools:null};
}
// Never display a rounded-up value that appears to cross a wage threshold.
export function displayProductivity(value){const scaled=value*100;return Number.isFinite(scaled)?Math.floor(scaled+Number.EPSILON*Math.abs(scaled)*4)/100:value;}
export function isoDate(date) {return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;}
export function parseDate(value) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime())&&isoDate(date)===value?date:null;
}
export function monthBounds(year,month){return {first:isoDate(new Date(Date.UTC(year,month-1,1))),last:isoDate(new Date(Date.UTC(year,month,0))),before:isoDate(new Date(Date.UTC(year,month-1,0)))};}
export function businessDays(year,month,cutoff,holidays,closed=[],opened=[]) {
  const bounds=monthBounds(year,month), date=parseDate(cutoff);
  if(!date||cutoff<bounds.before||cutoff>bounds.last)return null;
  let total=0,elapsed=0;
  const closedSet=new Set(closed), openedSet=new Set(opened);
  for(let day=1;day<=Number(bounds.last.slice(-2));day++) {
    const date=new Date(Date.UTC(year,month-1,day)), iso=isoDate(date), weekday=date.getUTCDay();
    const business=openedSet.has(iso)||(!closedSet.has(iso)&&weekday!==0&&weekday!==6&&!Object.prototype.hasOwnProperty.call(holidays,iso));
    if(business){total++;if(iso<=cutoff)elapsed++;}
  }
  return {total,elapsed,remaining:total-elapsed};
}
export function progress(target,sales,days){
  if(!Number.isFinite(target)||target<=0||!Number.isFinite(sales)||sales<0||!days||days.total<=0)return null;
  const daily=target/days.total, expected=daily*days.elapsed, difference=sales-expected;
  return {daily,expected,difference,achievement:sales/target*100,remainingTarget:Math.max(0,target-sales),...days};
}
export function readDateLines(text) {
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.some(line=>!parseDate(line)))return null;
  return [...new Set(lines)];
}

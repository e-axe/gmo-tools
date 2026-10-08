import {WAGES,productivity,businessDays,progress,monthBounds,parseDate,isoDate,readDateLines} from './calculations.mjs';
import holidayData from './holidays.json' with {type:'json'};
import {formatPhoneText} from './phone.mjs';
const $=id=>document.getElementById(id);
const fmt=(value,max=2)=>value.toLocaleString('ja-JP',{maximumFractionDigits:max});
// Required sales are rounded upward to the nearest yen, never below the threshold.
const money=value=>fmt(Math.ceil((value*10000)-1e-7)/10000,4);
const dateLabel=iso=>iso.replaceAll('-','/');
const cleanNumber=id=>$(id).value===''?null:Number($(id).value);
let productivityText='',progressText='',phoneText='',toastTimer;
function notify(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
async function copy(text,button){
  if(!text)return;
  try{await navigator.clipboard.writeText(text);notify('コピーしました');}
  catch{
    const active=document.activeElement,area=document.createElement('textarea');
    area.value=text;area.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(area);area.select();
    let copied=false;try{copied=document.execCommand('copy');}catch{}area.remove();active?.focus();
    if(copied)notify('コピーしました');else{if(button===$('copy-phone')){$('phone-output').focus();$('phone-output').select();}notify('コピーできませんでした。結果を選択して手動でコピーしてください。');}
  }
}
function displayTool(tool){
  if(!['productivity','progress','phone'].includes(tool))tool='productivity';
  document.querySelectorAll('main>.tool').forEach(panel=>panel.hidden=panel.id!==tool);
  document.querySelectorAll('.tool-nav a').forEach(link=>{if(link.dataset.tool===tool)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  document.body.dataset.tool=tool;
  document.title=`${{productivity:'生産性・時給',progress:'対稼働',phone:'電話番号整形'}[tool]}｜GMO TOOLS`;
}
function toolFromPath(){return location.pathname.endsWith('bangou_henkan.htm')?'phone':location.pathname.endsWith('taikadou2025.html')?'progress':'productivity';}
document.querySelectorAll('.tool-nav a,.brand').forEach(link=>link.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();history.pushState(null,'',link.href);displayTool(link.dataset.tool||'productivity');
}));
window.addEventListener('popstate',()=>displayTool(toolFromPath()));
displayTool(document.body.dataset.tool);
function renderWages(cools,result){
  const tbody=$('wage-rows');tbody.replaceChildren();
  WAGES.forEach((item,index)=>{
    const tr=document.createElement('tr');
    if(result?.index===index)tr.className='current';else if(result?.index+1===index)tr.className='next';
    const range=index===0?'3,000未満':index===WAGES.length-1?`${fmt(item.threshold)}以上`:`${fmt(item.threshold)}〜${fmt(WAGES[index+1].threshold)}未満`;
    for(const text of [range,fmt(item.wage),cools&&cools>0?money(item.threshold*cools/10000):'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}
    if(tr.className){const badge=document.createElement('span');badge.className='rank-tag';badge.textContent=tr.className==='current'?'現在':'次';tr.children[1].append(badge);}
    tbody.append(tr);
  });
}
function updateProductivity(){
  const sales=cleanNumber('sales'),cools=cleanNumber('cools');
  let error='';
  $('sales').setAttribute('aria-invalid',String(sales!==null&&(!Number.isFinite(sales)||sales<0)));
  $('cools').setAttribute('aria-invalid',String(cools!==null&&(!Number.isFinite(cools)||cools<=0)));
  if(sales!==null&&(!Number.isFinite(sales)||sales<0))error='営業実績は0以上の数値で入力してください。';
  else if(cools!==null&&(!Number.isFinite(cools)||cools<=0))error='クール数は0より大きい数値で入力してください。';
  const result=sales!==null&&cools!==null?productivity(sales,cools):null;
  if(!result&&!error&&sales!==null&&cools!==null)error='計算できる範囲の数値で入力してください。';
  $('productivity-error').textContent=error;
  $('productivity-empty').hidden=!!result;$('productivity-results').hidden=!result;$('copy-productivity').disabled=!result;
  productivityText='';renderWages(cools,result);
  if(!result)return;
  $('productivity-value').textContent=fmt(result.value,2);$('wage-value').textContent=fmt(result.wage);
  if(result.next){
    $('next-title').textContent=`次の時給 ${fmt(result.next.wage)}円まで`;
    $('gap-value').replaceChildren(document.createTextNode('あと '));const strong=document.createElement('strong');strong.textContent=money(result.gap);$('gap-value').append(strong,document.createTextNode(' 万円'));
    $('goal-caption').replaceChildren();
    const required=document.createElement('strong');required.textContent=`${money(result.required)}万円`;
    const current=document.createElement('strong');current.textContent=`${fmt(sales,4)}万円`;
    const separator=document.createElement('span');separator.className='separator';separator.textContent='｜';
    $('goal-caption').append('必要実績 ',required,separator,'現在 ',current);
  }else{
    $('next-title').textContent='時給テーブルの最高ランクに到達';$('gap-value').textContent=`${fmt(result.wage)} 円`;
    $('goal-caption').textContent='現在のテーブルに、これより上の時給設定はありません。';
  }
  $('second-goal').textContent=result.second?`さらに次の時給 ${fmt(result.second.wage)}円まで、あと ${money(result.secondGap)}万円`:'';
  productivityText=`【生産性・時給】\n営業実績：${fmt(sales,4)}万円\nクール数：${fmt(cools,4)}c\n生産性：${fmt(result.value)}円/c\n次月時給（現行設定）：${fmt(result.wage)}円\n${result.next?`次の時給 ${fmt(result.next.wage)}円まで：あと ${money(result.gap)}万円\n必要実績：${money(result.required)}万円`:'時給テーブルの最高ランクに到達'}\n※既存サイトの時給テーブル使用。制度の適用開始日は未確認。`;
}
['sales','cools'].forEach(id=>$(id).addEventListener('input',updateProductivity));
$('productivity-form').addEventListener('submit',e=>{e.preventDefault();updateProductivity();});
$('productivity-example').addEventListener('click',()=>{$('sales').value='100';$('cools').value='100';updateProductivity();$('sales').focus();});
$('clear-productivity').addEventListener('click',()=>{$('productivity-form').reset();updateProductivity();$('sales').focus();notify('入力をクリアしました');});
$('copy-productivity').addEventListener('click',e=>copy(productivityText,e.currentTarget));
updateProductivity();
// Calendar calculations use date-only UTC values; today's default is always Japan time.
const japanToday=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const todayParts=japanToday.split('-').map(Number);
const monthAdjustments=new Map();
let displayedMonth='';
for(let y=holidayData.firstYear;y<=holidayData.lastYear;y++){const option=document.createElement('option');option.value=y;option.textContent=`${y}年`;$('year').append(option);}
for(let m=1;m<=12;m++){const option=document.createElement('option');option.value=m;option.textContent=`${m}月`;$('month').append(option);}
function defaultCutoff(year,month){
  const bounds=monthBounds(year,month),target=`${year}-${String(month).padStart(2,'0')}`;
  if(target<japanToday.slice(0,7))return bounds.last;
  if(target>japanToday.slice(0,7))return bounds.before;
  const yesterday=parseDate(japanToday);yesterday.setUTCDate(yesterday.getUTCDate()-1);return isoDate(yesterday);
}
function refreshMonth(reset=true){
  const year=Number($('year').value),month=Number($('month').value),bounds=monthBounds(year,month);
  const key=`${year}-${String(month).padStart(2,'0')}`;
  if(displayedMonth&&displayedMonth!==key){
    monthAdjustments.set(displayedMonth,{closed:$('closed').value,opened:$('opened').value});
    const adjustment=monthAdjustments.get(key);
    $('closed').value=adjustment?.closed||'';$('opened').value=adjustment?.opened||'';
  }
  displayedMonth=key;
  $('cutoff').min=bounds.before;$('cutoff').max=bounds.last;
  if(reset)$('cutoff').value=defaultCutoff(year,month);
  $('previous-month').disabled=year===holidayData.firstYear&&month===1;
  $('next-month').disabled=year===holidayData.lastYear&&month===12;
  updateProgress();
}
function updateProgress(){
  const year=Number($('year').value),month=Number($('month').value),cutoff=$('cutoff').value;
  const target=cleanNumber('target'),actual=cleanNumber('actual');
  const closed=readDateLines($('closed').value),opened=readDateLines($('opened').value);
  let error='';
  const targetBad=target!==null&&(!Number.isFinite(target)||target<=0), actualBad=actual!==null&&(!Number.isFinite(actual)||actual<0);
  $('target').setAttribute('aria-invalid',String(targetBad));$('actual').setAttribute('aria-invalid',String(actualBad));
  $('closed').setAttribute('aria-invalid',String(!closed));$('opened').setAttribute('aria-invalid',String(!opened));
  if(year<holidayData.firstYear||year>holidayData.lastYear)error='対象年の祝日データがありません。';
  else if(targetBad)error='月間目標は0より大きい数値で入力してください。';
  else if(actualBad)error='営業実績は0以上の数値で入力してください。';
  else if(!closed||!opened)error='調整日は1行に1日、YYYY-MM-DD形式で入力してください。';
  else if(closed.some(date=>opened.includes(date)))error='同じ日を休業日と稼働日の両方に指定できません。';
  else if([...closed,...opened].some(date=>date.slice(0,7)!==`${year}-${String(month).padStart(2,'0')}`))error='休日・稼働日の調整には、対象月の日付を指定してください。';
  const days=!error?businessDays(year,month,cutoff,holidayData.dates,closed,opened):null;
  $('cutoff').setAttribute('aria-invalid',String(!days&&!error));
  if(!days&&!error)error='基準日は対象月の前月末〜当月末から選んでください。';
  if(days&&days.total===0)error='営業日が0日のため計算できません。休日の設定を確認してください。';
  const result=!error&&target!==null&&actual!==null?progress(target,actual,days):null;
  if(result&&!Object.values(result).every(value=>Number.isFinite(value)))error='計算できる範囲の数値で入力してください。';
  const valid=!!result&&!error;
  $('progress-error').textContent=error;$('progress-results').hidden=!valid;$('progress-empty').hidden=valid;$('copy-progress').disabled=!valid;
  progressText='';if(!valid)return;
  const balanced=Math.abs(result.difference)<1e-9;
  $('difference-title').textContent=balanced?'期待進捗と同じペースです':result.difference>0?'期待進捗を上回っています':'期待進捗まで不足しています';
  $('progress-card').classList.toggle('behind',result.difference<0&&!balanced);
  const strong=document.createElement('strong');strong.textContent=fmt(balanced?0:Math.abs(result.difference));$('difference-value').replaceChildren(strong,document.createTextNode(' 万円'));
  $('difference-caption').textContent=`実績 ${fmt(actual)}万円　｜　期待進捗 ${fmt(result.expected)}万円`;
  $('days-value').textContent=`${result.elapsed} / ${result.total} 日`;$('daily-value').textContent=`${fmt(result.daily)}万円`;$('achievement-value').textContent=`${fmt(result.achievement,1)}%`;
  $('progress-context').textContent=`${year}年${month}月・${dateLabel(cutoff)}までの実績 ｜ 残り ${result.remaining}営業日`;
  progressText=`【対稼働】${year}年${month}月\n基準日：${dateLabel(cutoff)}まで（当日を含む）\n月間目標：${fmt(target)}万円\n営業実績：${fmt(actual)}万円\n営業日数：${result.elapsed}/${result.total}日\n1日あたりの目標：${fmt(result.daily)}万円\n期待進捗：${fmt(result.expected)}万円\n対稼働：${result.difference>=0?'+':''}${fmt(result.difference)}万円\n月間達成率：${fmt(result.achievement,1)}%\n※土日・国民の祝日を除外${closed.length||opened.length?'、会社の休日・稼働日調整あり':''}。`;
}
function setCurrentMonth(){
  const year=Math.max(holidayData.firstYear,Math.min(holidayData.lastYear,todayParts[0]));
  $('year').value=year;$('month').value=todayParts[1];refreshMonth();
  if(year!==todayParts[0])notify('今年の祝日データが未収録のため、対応する年を選択してください。');
}
function moveMonth(delta){
  const date=new Date(Date.UTC(Number($('year').value),Number($('month').value)-1+delta,1));
  if(date.getUTCFullYear()<holidayData.firstYear||date.getUTCFullYear()>holidayData.lastYear)return;
  $('year').value=date.getUTCFullYear();$('month').value=date.getUTCMonth()+1;refreshMonth();
}
['year','month'].forEach(id=>$(id).addEventListener('change',()=>refreshMonth()));
['target','actual','closed','opened','cutoff'].forEach(id=>$(id).addEventListener('input',updateProgress));
$('progress-form').addEventListener('submit',e=>{e.preventDefault();updateProgress();});
$('previous-month').addEventListener('click',()=>moveMonth(-1));$('next-month').addEventListener('click',()=>moveMonth(1));
$('current-month').addEventListener('click',setCurrentMonth);
$('clear-progress').addEventListener('click',()=>{$('target').value='';$('actual').value='';$('closed').value='';$('opened').value='';monthAdjustments.clear();displayedMonth='';setCurrentMonth();$('target').focus();notify('入力をクリアしました');});
$('copy-progress').addEventListener('click',e=>copy(progressText,e.currentTarget));setCurrentMonth();
function resetPhoneResults(){
  phoneText='';$('phone-output').value='';$('copy-phone').disabled=true;$('phone-summary').hidden=true;$('phone-review').hidden=true;
  const count=$('phone-input').value.split(/\r\n|\n|\r/).filter(line=>line.trim()).length;
  $('phone-count').textContent=count?'整形前':'未入力';
}
function convertPhone(){
  if(!$('phone-input').value.trim()){resetPhoneResults();notify('整形する番号を入力してください');$('phone-input').focus();return;}
  const lines=formatPhoneText($('phone-input').value);phoneText=lines.map(line=>line.output).join('\n');$('phone-output').value=phoneText;$('copy-phone').disabled=false;
  const counts={ok:0,review:0,invalid:0};lines.forEach(line=>{if(line.status!=='blank')counts[line.status]++;});
  $('phone-count').textContent=`${counts.ok+counts.review+counts.invalid}件`;
  $('phone-summary').replaceChildren();
  for(const [status,label,icon]of[['ok','整形済み','✓'],['review','要確認','!'],['invalid','変換不可','×']]){const span=document.createElement('span');span.className=status;span.textContent=`${icon} ${label} ${counts[status]}件`;$('phone-summary').append(span);}
  $('phone-summary').hidden=false;$('phone-review-list').replaceChildren();
  lines.forEach((line,index)=>{
    if(!['review','invalid'].includes(line.status))return;
    const li=document.createElement('li'),number=document.createElement('span'),content=document.createElement('div'),original=document.createElement('strong'),reason=document.createElement('em');
    number.className='line-number';number.textContent=`${index+1}行目`;content.className='line-content';original.textContent=line.original;reason.textContent=line.reason;
    content.append(original,reason);li.append(number,content);$('phone-review-list').append(li);
  });
  $('phone-review').hidden=counts.review+counts.invalid===0;$('phone-review-title').textContent=`確認が必要な行（${counts.review+counts.invalid}件・原文を保持）`;
  notify(counts.review+counts.invalid?'整形しました。確認が必要な行があります。':`${counts.ok}件の番号を整形しました`);
}
$('phone-input').addEventListener('input',resetPhoneResults);
$('convert-phone').addEventListener('click',convertPhone);
$('phone-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();convertPhone();}});
$('clear-phone').addEventListener('click',()=>{$('phone-input').value='';resetPhoneResults();$('phone-input').focus();notify('入力をクリアしました');});
$('copy-phone').addEventListener('click',e=>copy(phoneText,e.currentTarget));

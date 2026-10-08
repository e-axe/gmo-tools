import {WAGES,productivity,displayProductivity,businessDays,progress,monthBounds,parseDate,isoDate,readDateLines} from './calculations.mjs';
import holidayData from './holidays.json' with {type:'json'};
import {formatPhoneText} from './phone.mjs';
const $=id=>document.getElementById(id);
const fmt=(value,max=2)=>value.toLocaleString('ja-JP',{maximumFractionDigits:max});
// Required sales are rounded upward to the nearest yen, never below the threshold.
const money=value=>{const yen=value*10000;return fmt(Math.ceil(yen-Number.EPSILON*Math.abs(yen)*4)/10000,4);};
const dateLabel=iso=>iso.replaceAll('-','/');
const cleanNumber=id=>$(id).value===''?null:Number($(id).value);
let productivityText='',progressText='',phoneText='',toastTimer,announcementTimer;
const copyTimers=new WeakMap();
function announce(text,tool){if(tool&&document.body.dataset.tool!==tool)return;clearTimeout(announcementTimer);announcementTimer=setTimeout(()=>{$('result-announcement').textContent=text;},350);}
function copied(button){const label=button.querySelector('[data-copy-label]');if(!label)return;clearTimeout(copyTimers.get(button));label.textContent='コピーしました';button.classList.add('copied');copyTimers.set(button,setTimeout(()=>{label.textContent='結果をコピー';button.classList.remove('copied');},2200));}
function manualCopy(text){$('copy-preview').value=text;const dialog=$('copy-dialog');if(!dialog.open){if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');}$('copy-preview').focus();$('copy-preview').select();}

function notify(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2800);}
async function copy(text,button){
  if(!text)return;
  try{await navigator.clipboard.writeText(text);copied(button);notify('コピーしました');}
  catch{
    const active=document.activeElement,area=document.createElement('textarea');
    area.value=text;area.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(area);area.focus({preventScroll:true});area.select();
    let successful=false;try{successful=document.execCommand('copy');}catch{}area.remove();active?.focus({preventScroll:true});
    if(successful){copied(button);notify('コピーしました');}else{manualCopy(text);notify('自動コピーできませんでした。テキストを選択してコピーしてください。');}
  }
}
function displayTool(tool,navigate=false){
  if(!['productivity','progress','phone'].includes(tool))tool='productivity';
  document.querySelectorAll('main>.tool').forEach(panel=>panel.hidden=panel.id!==tool);
  document.querySelectorAll('.tool-nav a').forEach(link=>{if(link.dataset.tool===tool)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
  document.body.dataset.tool=tool;
  document.title=`${{productivity:'生産性・時給',progress:'対稼働',phone:'電話番号整形'}[tool]}｜GMO TOOLS`;
  if(navigate){clearTimeout(announcementTimer);$('result-announcement').textContent='';$(tool+'-title').focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});}
}
function toolFromPath(){return location.pathname.endsWith('bangou_henkan.htm')?'phone':location.pathname.endsWith('taikadou2025.html')?'progress':'productivity';}
document.querySelectorAll('.tool-nav a,.brand').forEach(link=>link.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();history.pushState(null,'',link.href);displayTool(link.dataset.tool||'productivity',true);
}));
history.scrollRestoration='manual';
window.addEventListener('popstate',()=>displayTool(toolFromPath(),true));
displayTool(document.body.dataset.tool);
function renderWages(cools,result){
  const tbody=$('wage-rows');tbody.replaceChildren();
  WAGES.forEach((item,index)=>{
    const tr=document.createElement('tr');
    if(result?.index===index)tr.className='current';else if(result?.index+1===index)tr.className='next';
    const range=index===0?'3,000未満':index===WAGES.length-1?`${fmt(item.threshold)}以上`:`${fmt(item.threshold)}〜${fmt(WAGES[index+1].threshold)}未満`;
    for(const text of [range,fmt(item.wage),cools&&cools>0?money((item.threshold/10000)*cools):'—']){const td=document.createElement('td');td.textContent=text;tr.append(td);}
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
  if(!result){announce(error||'実績とクール数を入力してください','productivity');return;}
  $('productivity-value').textContent=fmt(displayProductivity(result.value),2);$('wage-value').textContent=fmt(result.wage);
  if(result.next){
    $('next-title').textContent=`次の時給 ${fmt(result.next.wage)}円まで`;
    $('gap-value').replaceChildren(document.createTextNode('あと '));const strong=document.createElement('strong');strong.textContent=money(result.gap);$('gap-value').append(strong,document.createTextNode(' 万円'));
    $('goal-caption').replaceChildren();
    const required=document.createElement('strong');required.textContent=`${money(result.required)}万円`;
    const current=document.createElement('strong');current.textContent=`${fmt(sales,20)}万円`;
    const separator=document.createElement('span');separator.className='separator';separator.textContent='｜';
    $('goal-caption').append('必要実績 ',required,separator,'現在 ',current);
  }else{
    $('next-title').textContent='時給テーブルの最高ランクに到達';$('gap-value').textContent=`${fmt(result.wage)} 円`;
    $('goal-caption').textContent='現在のテーブルに、これより上の時給設定はありません。';
  }
  $('second-goal').textContent=result.second?`さらに次の時給 ${fmt(result.second.wage)}円まで、あと ${money(result.secondGap)}万円`:'';
  productivityText=`【生産性・時給】\n営業実績：${fmt(sales,20)}万円\nクール数：${fmt(cools,20)}c\n生産性：${fmt(displayProductivity(result.value))}円/c\n次月時給（現行設定）：${fmt(result.wage)}円\n${result.next?`次の時給 ${fmt(result.next.wage)}円まで：あと ${money(result.gap)}万円\n必要実績：${money(result.required)}万円`:'時給テーブルの最高ランクに到達'}\n※入力したクール数での試算。既存サイトの時給テーブル使用。制度の適用開始日は未確認。`;
  announce(`生産性 ${fmt(displayProductivity(result.value))}円、次月時給 ${fmt(result.wage)}円。${result.next?`次の時給まで、あと${money(result.gap)}万円。`:'最高ランクに到達。'}`,'productivity');
}
function adjustNumber(id,direction,multiplier=1){
  const input=$(id),value=input.value===''?0:Number(input.value);
  if(!Number.isFinite(value))return;
  const next=Math.max(0,value+direction*multiplier);
  input.value=Number(next.toFixed(8)).toString();
  input.dispatchEvent(new Event('input',{bubbles:true}));
}
['sales','cools'].forEach(id=>{
  $(id).addEventListener('input',updateProductivity);
  $(id).addEventListener('keydown',event=>{if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();adjustNumber(id,event.key==='ArrowUp'?1:-1,event.shiftKey?10:1);}});
});
document.querySelectorAll('[data-number]').forEach(button=>button.addEventListener('click',event=>adjustNumber(button.dataset.number,Number(button.dataset.direction),event.shiftKey?10:1)));
$('productivity-form').addEventListener('submit',e=>{e.preventDefault();updateProductivity();});
$('productivity-example').addEventListener('click',()=>{$('sales').value='100';$('cools').value='100';updateProductivity();$('sales').focus();});
$('clear-productivity').addEventListener('click',()=>{$('productivity-form').reset();updateProductivity();$('sales').focus();notify('入力をクリアしました');});
$('copy-productivity').addEventListener('click',e=>copy(productivityText,e.currentTarget));
updateProductivity();
// Calendar calculations use date-only UTC values; today's default is always Japan time.
const japanParts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(part=>[part.type,part.value]));
const japanToday=`${japanParts.year}-${japanParts.month}-${japanParts.day}`;
const todayParts=japanToday.split('-').map(Number);
const monthRecords=new Map();
const monthFields=['target','actual','cutoff','closed','opened'];
let displayedMonth='';
for(let y=holidayData.firstYear;y<=holidayData.lastYear;y++){const option=document.createElement('option');option.value=y;option.textContent=`${y}年`;$('year').append(option);}
for(let m=1;m<=12;m++){const option=document.createElement('option');option.value=m;option.textContent=`${m}月`;$('month').append(option);}
function defaultCutoff(year,month){
  const bounds=monthBounds(year,month),target=`${year}-${String(month).padStart(2,'0')}`;
  if(target<japanToday.slice(0,7))return bounds.last;
  if(target>japanToday.slice(0,7))return bounds.before;
  const yesterday=parseDate(japanToday);yesterday.setUTCDate(yesterday.getUTCDate()-1);return isoDate(yesterday);
}
function saveMonth(){if(displayedMonth)monthRecords.set(displayedMonth,Object.fromEntries(monthFields.map(id=>[id,$(id).value])));}
function refreshMonth(){
  saveMonth();
  const year=Number($('year').value),month=Number($('month').value);
  const supported=year>=holidayData.firstYear&&year<=holidayData.lastYear;
  const key=supported?`${year}-${String(month).padStart(2,'0')}`:'';
  if(key!==displayedMonth){
    const record=monthRecords.get(key);
    for(const id of monthFields)$(id).value=record?.[id]??(id==='cutoff'&&supported?defaultCutoff(year,month):'');
  }
  displayedMonth=key;$('cutoff').disabled=!supported;
  if(supported){const bounds=monthBounds(year,month);$('cutoff').min=bounds.before;$('cutoff').max=bounds.last;}
  else{$('cutoff').removeAttribute('min');$('cutoff').removeAttribute('max');}
  $('previous-month').disabled=!supported||(year===holidayData.firstYear&&month===1);
  $('next-month').disabled=!supported||(year===holidayData.lastYear&&month===12);
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
  if(year<holidayData.firstYear||year>holidayData.lastYear)error=`${todayParts[0]}年の祝日データは未収録です。今月の計算にはデータ更新が必要です。過去の月は対象年（${holidayData.firstYear}〜${holidayData.lastYear}年）を選択してください。`;
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
  progressText='';if(!valid){announce(error||'月間目標と実績を入力してください','progress');return;}
  const balanced=Math.abs(result.difference)<1e-9;
  $('difference-title').textContent=balanced?'期待進捗と同じペースです':result.difference>0?'期待進捗を上回っています':'期待進捗まで不足しています';
  $('progress-card').classList.toggle('behind',result.difference<0&&!balanced);
  const strong=document.createElement('strong');strong.textContent=fmt(balanced?0:Math.abs(result.difference));$('difference-value').replaceChildren(strong,document.createTextNode(' 万円'));
  $('difference-caption').textContent=`実績 ${fmt(actual)}万円　｜　期待進捗 ${fmt(result.expected)}万円`;
  $('days-value').textContent=`${result.elapsed} / ${result.total} 日`;$('daily-value').textContent=`${fmt(result.daily)}万円`;$('achievement-value').textContent=`${fmt(result.achievement,1)}%`;
  $('progress-context').textContent=`${year}年${month}月・${dateLabel(cutoff)}までの実績 ｜ 残り ${result.remaining}営業日`;
  const remainingPlan=result.remainingTarget===0?'月間目標を達成しています。':result.remaining>0?`目標まであと ${money(result.remainingTarget)}万円。残り ${result.remaining}営業日で、1日あたり ${money(result.remainingTarget/result.remaining)}万円が必要です。`:`月間目標まであと ${money(result.remainingTarget)}万円。基準日以降の営業日はありません。`;
  $('remaining-plan').textContent=remainingPlan;
  announce(`${$('difference-title').textContent}。差額${fmt(Math.abs(result.difference))}万円。${remainingPlan}`,'progress');
  progressText=`【対稼働】${year}年${month}月\n基準日：${dateLabel(cutoff)}まで（当日を含む）\n月間目標：${fmt(target)}万円\n営業実績：${fmt(actual)}万円\n営業日数：${result.elapsed}/${result.total}日\n1日あたりの目標：${fmt(result.daily)}万円\n期待進捗：${fmt(result.expected)}万円\n対稼働：${result.difference>=0?'+':''}${fmt(result.difference)}万円\n月間達成率：${fmt(result.achievement,1)}%\n${remainingPlan}\n※土日・国民の祝日を除外${closed.length||opened.length?'、会社の休日・稼働日調整あり':''}。`;
}
function setCurrentMonth(){
  const supported=todayParts[0]>=holidayData.firstYear&&todayParts[0]<=holidayData.lastYear;
  $('year').value=supported?todayParts[0]:'';$('month').value=todayParts[1];refreshMonth();
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
$('clear-progress').addEventListener('click',()=>{monthRecords.delete(displayedMonth);for(const id of monthFields)$(id).value=id==='cutoff'&&displayedMonth?defaultCutoff(Number($('year').value),Number($('month').value)):'';updateProgress();$('target').focus();notify('この月の入力をクリアしました');});
$('copy-progress').addEventListener('click',e=>copy(progressText,e.currentTarget));setCurrentMonth();
function resetPhoneResults(keepOutput=false){
  const stale=keepOutput&&!!$('phone-output').value&&!!$('phone-input').value.trim();
  phoneText='';if(!stale)$('phone-output').value='';$('copy-phone').disabled=true;$('phone-summary').hidden=true;$('phone-review').hidden=true;
  $('phone-stale').hidden=!stale;$('phone-output').classList.toggle('is-stale',stale);$('phone-copy-note').hidden=true;
  const count=$('phone-input').value.split(/\r\n|\n|\r/).filter(line=>line.trim()).length;
  $('phone-count').textContent=stale?'再整形が必要':count?'整形前':'未入力';
}
function convertPhone(){
  if(!$('phone-input').value.trim()){resetPhoneResults();notify('整形する番号を入力してください');$('phone-input').focus();return;}
  const lines=formatPhoneText($('phone-input').value);phoneText=lines.map(line=>line.output).join('\n');$('phone-output').value=phoneText;$('copy-phone').disabled=false;$('phone-stale').hidden=true;$('phone-output').classList.remove('is-stale');
  const counts={ok:0,review:0,invalid:0};lines.forEach(line=>{if(line.status!=='blank')counts[line.status]++;});
  $('phone-count').textContent=`${counts.ok+counts.review+counts.invalid}件`;
  $('phone-summary').replaceChildren();
  for(const [status,label,icon]of[['ok','整形済み','✓'],['review','要確認','!'],['invalid','変換不可','×']]){const span=document.createElement('span');span.className=status;span.textContent=`${icon} ${label} ${counts[status]}件`;$('phone-summary').append(span);}
  $('phone-summary').hidden=false;$('phone-review-list').replaceChildren();
  lines.forEach((line,index)=>{
    if(!['review','invalid'].includes(line.status))return;
    const li=document.createElement('li'),number=document.createElement('button'),content=document.createElement('div'),original=document.createElement('strong'),reason=document.createElement('em');
    number.type='button';number.className='line-number review-jump';number.textContent=`${index+1}行目`;number.setAttribute('aria-label',`${index+1}行目を入力欄で確認`);
    number.addEventListener('click',()=>{const input=$('phone-input'),rows=input.value.split('\n'),start=rows.slice(0,index).reduce((sum,row)=>sum+row.length+1,0);input.focus();input.setSelectionRange(start,start+rows[index].length);input.scrollTop=Math.max(0,(index-2)*parseFloat(getComputedStyle(input).lineHeight));input.scrollIntoView?.({block:'center',behavior:'auto'});});content.className='line-content';original.textContent=line.original;reason.textContent=line.reason;
    content.append(original,reason);li.append(number,content);$('phone-review-list').append(li);
  });
  $('phone-review').hidden=counts.review+counts.invalid===0;$('phone-review-title').textContent=`確認が必要な行（${counts.review+counts.invalid}件・原文を保持）`;
  const unresolved=counts.review+counts.invalid;$('phone-copy-note').hidden=!unresolved;$('phone-copy-note').textContent=`コピーには、要確認・変換不可の${unresolved}件も原文のまま含まれます。`;
  announce(`整形済み${counts.ok}件、要確認${counts.review}件、変換不可${counts.invalid}件。`,'phone');
  notify(counts.review+counts.invalid?'整形しました。確認が必要な行があります。':`${counts.ok}件の番号を整形しました`);
}
$('phone-input').addEventListener('input',()=>resetPhoneResults(true));
$('convert-phone').addEventListener('click',convertPhone);
$('phone-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();convertPhone();}});
$('clear-phone').addEventListener('click',()=>{$('phone-input').value='';resetPhoneResults();$('phone-input').focus();notify('入力をクリアしました');});
$('copy-phone').addEventListener('click',e=>copy(phoneText,e.currentTarget));

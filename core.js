export const LEVEL_IDS=['A0','A1','A2','B1','B2','C1','C2'];
export const DAY=86400000;
export const freshState=()=>({version:1,level:'A2',completed:{},cards:{},activity:{},speaking:{},goal:20});
export function localDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function normalize(text){return String(text).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N}'\s]/gu,'').replace(/\s+/g,' ').trim();}
export function correctAnswer(input,accepted){return accepted.some(answer=>normalize(input)===normalize(answer));}
export function scheduleCard(card,grade,now=Date.now()){
  if(!['again','hard','good'].includes(grade))throw new Error('Unknown review grade');
  const previous=card?.interval||0;
  const interval=grade==='again'?0:grade==='hard'?1:Math.min(60,previous?Math.max(2,Math.round(previous*2.2)):2);
  return {interval,due:now+(grade==='again'?600000:interval*DAY),reviews:Math.min(100000,(card?.reviews||0)+1)};
}
export function dueCards(cards,now=Date.now()){return Object.entries(cards).filter(([,value])=>value.due<=now).sort((a,b)=>a[1].due-b[1].due).map(([id])=>id);}
export function streak(activity,today=new Date()){
  let count=0;const cursor=new Date(today);cursor.setHours(12,0,0,0);
  if(!activity[localDate(cursor)])cursor.setDate(cursor.getDate()-1);
  while(activity[localDate(cursor)]){count++;cursor.setDate(cursor.getDate()-1);}return count;
}
export function validateState(raw,lessonIds,cardIds){
  if(!raw||raw.version!==1||!LEVEL_IDS.includes(raw.level))throw new Error('Это не резервная копия Say it версии 1.');
  for(const key of ['completed','cards','activity','speaking'])if(!raw[key]||typeof raw[key]!=='object'||Array.isArray(raw[key]))throw new Error('Повреждён раздел '+key);
  const next=freshState();next.level=raw.level;next.goal=[10,20,30].includes(raw.goal)?raw.goal:20;
  const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  for(const [id,entry]of Object.entries(raw.completed))if(lessonIds.has(id)&&entry&&integer(entry.score,0,3)&&integer(entry.at,0,9999999999999))next.completed[id]={score:entry.score,at:entry.at};
  for(const [id,entry]of Object.entries(raw.cards))if(cardIds.has(id)&&entry&&Number.isFinite(entry.due)&&entry.due>=0&&entry.due<=9999999999999&&integer(entry.interval,0,60)&&integer(entry.reviews,0,100000))next.cards[id]={due:entry.due,interval:entry.interval,reviews:entry.reviews};
  for(const [date,n]of Object.entries(raw.activity))if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&integer(n,1,100000))next.activity[date]=n;
  for(const [id,n]of Object.entries(raw.speaking))if(lessonIds.has(id)&&integer(n,1,100000))next.speaking[id]=n;
  return next;
}

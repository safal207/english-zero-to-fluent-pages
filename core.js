export const LEVEL_IDS=['A0','A1','A2','B1','B2','C1','C2'];
export const DAY=86400000;
export const MAX_PERSONAL_PHRASES=2000;
export const freshState=()=>({version:1,level:'A0',completed:{},cards:{},activity:{},speaking:{},goal:20,lessonDraft:null,quickDraft:null,practice:{},personalPhrases:[]});
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
  const timestamp=v=>Number.isFinite(v)&&v>=0&&v<=9999999999999;
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  for(const [id,entry]of Object.entries(raw.completed))if(lessonIds.has(id)&&entry&&integer(entry.score,0,3)&&integer(entry.at,0,9999999999999))next.completed[id]={score:entry.score,at:entry.at};
  for(const [id,entry]of Object.entries(raw.cards))if(cardIds.has(id)&&entry&&Number.isFinite(entry.due)&&entry.due>=0&&entry.due<=9999999999999&&integer(entry.interval,0,60)&&integer(entry.reviews,0,100000))next.cards[id]={due:entry.due,interval:entry.interval,reviews:entry.reviews};
  for(const [date,n]of Object.entries(raw.activity))if(/^\d{4}-\d{2}-\d{2}$/.test(date)&&integer(n,1,100000))next.activity[date]=n;
  for(const [id,n]of Object.entries(raw.speaking))if(lessonIds.has(id)&&integer(n,1,100000))next.speaking[id]=n;
  const draft=raw.lessonDraft;
  if(record(draft)&&lessonIds.has(draft.id)&&integer(draft.step,0,4)&&integer(draft.score,0,3))next.lessonDraft={id:draft.id,step:draft.step,score:draft.score};
  const quickDraft=raw.quickDraft;
  const quickKeys=['id','mode','step','hint','hintUsed','written','reviewFirst','retrievalRating'];
  if(record(quickDraft)&&Object.keys(quickDraft).length===quickKeys.length&&quickKeys.every(key=>Object.hasOwn(quickDraft,key))&&
    lessonIds.has(quickDraft.id)&&[2,5,10].includes(quickDraft.mode)&&
    integer(quickDraft.step,0,quickDraft.mode===2?3:quickDraft.mode===5?4:5)&&
    typeof quickDraft.hint==='boolean'&&typeof quickDraft.hintUsed==='boolean'&&
    typeof quickDraft.written==='string'&&quickDraft.written.length<=1200&&
    typeof quickDraft.reviewFirst==='boolean'&&
    (quickDraft.retrievalRating===null||['independent','assisted','again'].includes(quickDraft.retrievalRating))){
    next.quickDraft={id:quickDraft.id,mode:quickDraft.mode,step:quickDraft.step,hint:quickDraft.hint,hintUsed:quickDraft.hintUsed,written:quickDraft.written,reviewFirst:quickDraft.reviewFirst,retrievalRating:quickDraft.retrievalRating};
  }
  if(record(raw.practice))for(const [id,entry]of Object.entries(raw.practice)){
    if(lessonIds.has(id)&&record(entry)&&timestamp(entry.due)&&integer(entry.interval,0,60)&&integer(entry.reviews,0,100000)&&integer(entry.assisted,0,100000)&&integer(entry.independent,0,100000)&&timestamp(entry.lastAt)&&(entry.firstIndependentAt===null||timestamp(entry.firstIndependentAt))){
      next.practice[id]={due:entry.due,interval:entry.interval,reviews:entry.reviews,assisted:entry.assisted,independent:entry.independent,lastAt:entry.lastAt,firstIndependentAt:entry.firstIndependentAt};
    }
  }
  if(Array.isArray(raw.personalPhrases)){
    const seen=new Set();
    const boundedText=(value,max)=>{
      if(typeof value!=='string')return null;
      const clean=value.trim();
      return clean.length>0&&clean.length<=max?clean:null;
    };
    for(const entry of raw.personalPhrases.slice(0,MAX_PERSONAL_PHRASES)){
      if(!record(entry)||typeof entry.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(entry.id)||['__proto__','constructor','prototype'].includes(entry.id)||seen.has(entry.id))continue;
      const source=boundedText(entry.source,160),en=boundedText(entry.en,120),ru=boundedText(entry.ru,120);
      if(source===null||en===null||ru===null||!timestamp(entry.createdAt)||!timestamp(entry.due)||!integer(entry.interval,0,60)||!integer(entry.reviews,0,100000))continue;
      next.personalPhrases.push({id:entry.id,source,en,ru,createdAt:entry.createdAt,due:entry.due,interval:entry.interval,reviews:entry.reviews});
      seen.add(entry.id);
    }
  }
  return next;
}

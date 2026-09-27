import {levels,lessons,phraseMap} from './curriculum.js';
import {LEVEL_IDS,freshState,localDate,correctAnswer,scheduleCard,dueCards,streak,validateState} from './core.js';
import {QUICK_MODES,quickSteps,resumeQuickSession,selectFocus,recordPractice} from './practice.js';
import {quickMarkup} from './quick-view.js';
import {MAX_PHRASES_PER_ADD,parsePersonalPhrases,markDialogueDone,ratePersonalPhrase} from './personal.js';
import {contextMarkup} from './context-view.js';
const KEY='say-it-progress-v1';
const CONFLICT_MESSAGE='Прогресс изменился в другой вкладке. Эта вкладка не сохраняет новые действия, чтобы не стереть уже сохранённые занятия. При необходимости скачай резервную копию, затем обнови страницу.';
const main=document.querySelector('#main');
const lessonIds=new Set(lessons.map(x=>x.id)),cardIds=new Set(phraseMap.keys());
let state=freshState(),storageWarning='',lastStoredRaw=null,storageConflict=false,lessonSession=null,reviewSession=null,quickSession=null,contextSession={reviewId:null,revealed:false},recorder=null,stream=null,recordedUrls=[],recordTimer=null,recordTick=null,recordPending=false,recordGeneration=0,soundRate=.88;
try{const saved=localStorage.getItem(KEY);lastStoredRaw=saved;if(saved)state=validateState(JSON.parse(saved),lessonIds,cardIds);}catch{storageWarning='Не удалось прочитать сохранение. Занятия доступны, но проверь настройки хранилища браузера и сохрани резервную копию.';}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>lessons.find(l=>l.id===id);
const levelInfo=()=>levels.find(l=>l.id===state.level);
const atLevel=()=>lessons.filter(l=>l.level===state.level);
const nextLesson=()=>atLevel().find(l=>!state.completed[l.id])||atLevel()[0];
const percent=(n,total)=>Math.round(n/total*100);
const ruCount=(count,one,few,many)=>{const tens=count%100,ones=count%10;return tens>=11&&tens<=14?many:ones===1?one:ones>=2&&ones<=4?few:many;};
const shuffle=array=>{const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),5500);}
function warnStorage(message){storageWarning=message;toast(message);if(!document.querySelector('#storage-warning'))main.insertAdjacentHTML('afterbegin',`<p class="feedback wrong" id="storage-warning" role="alert">${esc(message)}</p>`);}
function blockedByConflict(action){
  if(['sound','record','export','quick-speed','context-copy','context-reveal'].includes(action))return false;
  try{if(localStorage.getItem(KEY)!==lastStoredRaw)storageConflict=true;}catch{}
  if(!storageConflict)return false;
  warnStorage(CONFLICT_MESSAGE);return true;
}
function save(){try{
  if(storageConflict||localStorage.getItem(KEY)!==lastStoredRaw){
    storageConflict=true;
    warnStorage(CONFLICT_MESSAGE);updateBadge();return false;
  }
  const next=JSON.stringify(state);localStorage.setItem(KEY,next);lastStoredRaw=next;updateBadge();return true;
}catch{warnStorage('Браузер не сохраняет прогресс. Скачай резервную копию в разделе «Мой прогресс».');updateBadge();return false;}}
function activity(){const key=localDate();state.activity[key]=Math.min(100000,(state.activity[key]||0)+1);}
function updateBadge(){const course=dueCards(state.cards).length,personal=state.personalPhrases.filter(phrase=>phrase.reviews>0&&phrase.due<=Date.now()).length,count=course+personal;const badge=document.querySelector('#review-badge');badge.textContent=count;badge.dataset.empty=String(count===0);badge.closest('a').setAttribute('aria-label',`Повторение: ${course} ${ruCount(course,'учебная фраза','учебные фразы','учебных фраз')}, ${personal} ${ruCount(personal,'своя фраза','свои фразы','своих фраз')}`);}
function seedCards(lesson){for(const phrase of lesson.phrases)if(!state.cards[phrase.id])state.cards[phrase.id]={due:Date.now(),interval:0,reviews:0};}
function addCards(lesson){const previous=JSON.stringify(state);seedCards(lesson);if(!save()){state=JSON.parse(previous);return false;}return true;}
function sound(text){if(!('speechSynthesis' in window)){toast('Озвучка недоступна в этом браузере. Фразы можно читать и повторять вслух.');return;}speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=soundRate;const voices=speechSynthesis.getVoices();const voice=voices.find(v=>/^en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));if(voice)utterance.voice=voice;utterance.onerror=event=>{if(!['interrupted','canceled'].includes(event.error))toast('Озвучка не запустилась. Проверь доступные английские голоса в настройках устройства.');};speechSynthesis.speak(utterance);}
function playButton(text){return `<button class="sound" data-action="sound" data-text="${esc(text)}" aria-label="Прослушать: ${esc(text)}" title="Прослушать">▶</button>`;}
function heading(title,description,withLevel=true){return `<div class="page-heading"><div><p class="eyebrow">ЛИЧНАЯ ПРАКТИКА</p><h1>${title}</h1><p>${description}</p></div>${withLevel?`<label class="level-pill">Мой этап <select id="level-select" aria-label="Мой этап обучения">${LEVEL_IDS.map(id=>`<option ${state.level===id?'selected':''}>${id}</option>`).join('')}</select></label>`:''}</div>`;}
function rows(items){return `<div class="lesson-list">${items.map((l,i)=>`<a class="lesson-row" href="#lesson/${l.id}"><span class="lesson-number ${state.completed[l.id]?'done':''}">${state.completed[l.id]?'✓':String(i+1).padStart(2,'0')}</span><div><h3>${esc(l.title)}</h3><p>${esc(l.goal)}</p></div><span class="row-end">${state.completed[l.id]?'Пройден':l.minutes+' мин'} &nbsp; ↗</span></a>`).join('')}</div>`;}
function renderToday(){
  const focus=selectFocus(state,lessons),lesson=byId(focus.id),done=Object.keys(state.completed).length;
  const due=dueCards(state.cards).length,personalDue=state.personalPhrases.filter(phrase=>phrase.reviews>0&&phrase.due<=Date.now()).length,spoken=Object.values(state.speaking).reduce((a,b)=>a+b,0);
  const lead=focus.reason==='due'?'Время вспомнить знакомый ответ':focus.reason==='start'?'Первый ответ уже сегодня':focus.reason==='repeat'?'Закрепи знакомую ситуацию':'Следующая ситуация для речи';
  const resume=state.lessonDraft&&byId(state.lessonDraft.id)?`<section class="panel quick-due"><p class="eyebrow">НЕЗАКОНЧЕННЫЙ УРОК</p><h2>${esc(byId(state.lessonDraft.id).title)}</h2><p>Шаг ${state.lessonDraft.step+1} из 5 сохранён.</p><a class="btn outline" href="#lesson/${esc(state.lessonDraft.id)}">Продолжить урок →</a></section>`:'';
  const quickResume=state.quickDraft&&byId(state.quickDraft.id)?`<section class="panel quick-due"><p class="eyebrow">НЕЗАКОНЧЕННАЯ ПРАКТИКА</p><h2>${esc(byId(state.quickDraft.id).title)}</h2><p>Шаг ${state.quickDraft.step+1} из ${quickSteps(state.quickDraft.mode,state.quickDraft.reviewFirst).length} сохранён.</p><a class="btn outline" href="#quick/${esc(state.quickDraft.id)}/${state.quickDraft.mode}">Продолжить ответ →</a></section>`:'';
  main.innerHTML=heading('Сегодня — один ответ','Послушай, скажи с опорой, ответь без текста и вернись к фразе позже.')+`
    <div class="dashboard-grid"><section class="feature"><p class="eyebrow">${lead.toUpperCase()}</p>
      <div class="feature-meta"><span class="tag">${lesson.level}</span><span class="tag">${esc(lesson.title)}</span></div>
      <h2>Скажи это своими словами</h2><p>${esc(lesson.goal)} Сначала ответь вслух. Материал подстроится под выбранное время.</p>
      <div class="quick-modes" role="group" aria-label="Выбери длительность практики">
        <a class="btn lime" href="#quick/${lesson.id}/2">Попробовать за 2 мин ↗</a>
        <a class="btn outline" href="#quick/${lesson.id}/5">5 мин</a>
        <a class="btn outline" href="#quick/${lesson.id}/10">10 мин</a>
      </div><p class="note">Без регистрации и без обязательного микрофона. <a href="#context">Добавить фразы из своего видео или текста ↗</a></p></section>
      <section class="practice-card"><div class="big-symbol" aria-hidden="true">◉</div><p class="eyebrow">ПЛАН НА СЕГОДНЯ</p>
      <h2>Вспомни → скажи → закрепи</h2>
      <p class="muted">${due?`Сначала вспомни ${due} ${ruCount(due,'фразу','фразы','фраз')} из прошлых занятий.`:'Начни с одной фразы и личного ответа.'}</p>
      ${due?'<a class="btn outline" href="#review">Повторить по памяти ↗</a>':'<p class="note">После попытки фразы появятся в повторении.</p>'}
      ${personalDue?`<p class="note">Из твоих материалов ждут повторения ${personalDue} ${ruCount(personalDue,'фраза','фразы','фраз')}.</p><a class="text-link" href="#context">Вспомнить свои фразы ↗</a>`:''}
      </section></div>${quickResume}${resume}
      <div class="stats"><div class="stat"><strong>${Object.values(state.practice).filter(x=>x.independent>0).length}</strong><span>Ситуаций с ответом без текста*</span></div>
      <div class="stat"><strong>${due+personalDue}</strong><span>Фраз к повторению</span></div><div class="stat"><strong>${done}<small> / ${lessons.length}</small></strong><span>Уроков пройдено</span></div></div>
      <p class="note">*По твоей самооценке, это не проверка уровня или произношения. Устных практик отмечено: ${spoken}.</p>
      <div class="section-head"><h2>Ближайшие темы · ${state.level}</h2><a class="text-link" href="#path">Вся программа ↗</a></div>
      ${rows(atLevel().filter(l=>!state.completed[l.id]).slice(0,3).length?atLevel().filter(l=>!state.completed[l.id]).slice(0,3):atLevel().slice(0,3))}
      <div class="tip"><strong>Выбирай по удобству.</strong> Первый ответ доступен сразу. Этапы в программе — выбор материала, а не оценка твоего уровня.</div>`;
}

function renderQuick(id,rawMode){
  const focus=selectFocus(state,lessons),lesson=byId(id)||byId(focus.id);
  const mode=QUICK_MODES.includes(Number(rawMode))?Number(rawMode):2;
  const due=Boolean(state.practice[lesson.id]?.due<=Date.now());
  if(!quickSession||quickSession.id!==lesson.id||quickSession.mode!==mode||!quickSession.completed&&due&&!quickSession.reviewFirst){
    const source=quickSession?.id===lesson.id&&!quickSession.completed?quickSession:state.quickDraft?.id===lesson.id?state.quickDraft:null;
    quickSession=resumeQuickSession(lesson.id,mode,source,due);
    if(source&&(!source.reviewFirst&&due||source.mode!==mode))saveQuickDraft();
  }
  main.innerHTML=heading('Говори с первой минуты','Один разговор, несколько попыток и повторение после паузы.',false)
    +quickMarkup(lesson,quickSession,soundRate,state.practice[lesson.id]?.due||Date.now());
  renderRecordedUrls();
  main.querySelector('.quick-panel')?.scrollIntoView({block:'start'});
}
function saveQuickDraft(){
  if(!quickSession)return false;
  const {id,mode,step,hint,hintUsed,written,reviewFirst,retrievalRating}=quickSession;
  state.quickDraft=quickSession.completed?null:{id,mode,step,hint,hintUsed,written,reviewFirst,retrievalRating};
  return save();
}
function renderRecordedUrls(){
  const result=document.querySelector('#record-result');
  if(!result||!recordedUrls.length)return;
  result.innerHTML=`<div class="quick-compare">${recordedUrls.map((item,index)=>`<div class="quick-line"><strong>Попытка ${index+1}</strong><audio class="audio-playback" controls src="${item.url}" aria-label="Запись попытки ${index+1}"></audio><a class="text-link" href="${item.url}" download="my-english-practice-${index+1}.${item.type.includes('mp4')?'m4a':item.type.includes('ogg')?'ogg':'webm'}">Скачать</a></div>`).join('')}</div><p class="note">Сравни с образцом и скажи ещё раз. Это твоя самопроверка, приложение не оценивает звук.</p>`;
}

function renderContext(){
  const due=state.personalPhrases.filter(phrase=>phrase.reviews>0&&phrase.due<=Date.now()).sort((a,b)=>a.due-b.due)[0];
  if(contextSession.reviewId!==due?.id)contextSession={reviewId:due?.id||null,revealed:false};
  main.innerHTML=heading('Фразы из твоего материала','Возьми полезные выражения из видео или текста, используй их в диалоге и вспомни позже.',false)
    +contextMarkup(state.personalPhrases,contextSession);
}
function focusQuickStage(){document.querySelector('.quick-panel')?.focus({preventScroll:true});}
function focusContextStage(selector){const stage=document.querySelector(selector)||document.querySelector('.context-card');stage?.focus({preventScroll:true});stage?.scrollIntoView({block:'start'});}
function renderCapabilities(){
  const entries=Object.entries(state.practice).map(([id,practice])=>({lesson:byId(id),practice})).filter(x=>x.lesson);
  const body=entries.length?entries.map(({lesson,practice})=>`<div class="vocab-row"><div><strong>${esc(lesson.title)}</strong><small>${practice.independent?'Без текста · по самооценке':practice.assisted?'С подсказкой · по самооценке':'Попытка · по самооценке'}</small></div><span class="muted">${practice.due<=Date.now()?'Пора повторить':'Повтор позже'}</span></div>`).join(''):'<p class="muted">После первой короткой практики здесь появятся ситуации, в которых ты пробовал отвечать.</p>';
  main.querySelector('.stats')?.insertAdjacentHTML('afterend',`<section class="panel"><h2>Что я уже пробовал говорить</h2>${body}<p class="note">Это история твоих попыток и самооценки. Она не подтверждает языковой уровень.</p></section>`);
}
function renderPath(){const info=levelInfo(),list=atLevel(),done=list.filter(l=>state.completed[l.id]).length;main.innerHTML=heading('Твой путь к свободной речи','42 опорных урока. Все этапы открыты — выбирай подходящие темы.',false)+`<div class="level-tabs" role="group" aria-label="Этап программы">${levels.map(l=>`<button class="level-tab ${l.id===state.level?'active':''}" data-action="level" data-id="${l.id}" aria-pressed="${l.id===state.level}">${l.id}</button>`).join('')}</div><section class="panel level-summary"><div><p class="eyebrow">ЭТАП ${info.id}</p><h2>${info.title}</h2><p class="muted">${info.description}</p><p><strong>Цель:</strong> ${info.outcome}</p></div><div><strong>${done} из 6 уроков</strong><div class="progress-track" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="6" aria-label="Пройдено уроков"><span style="width:${percent(done,6)}%"></span></div><small>Завершение уроков отражает практику в приложении.</small></div></section>${rows(list)}<section class="panel" style="margin-top:24px"><p class="eyebrow">ПРОВЕРЬ СЕБЯ В ЖИВОЙ РЕЧИ</p><h2>Задание этапа ${info.id}</h2><p>${info.challenge}</p><a class="btn outline" href="#speak">Потренироваться вслух</a></section><details class="panel"><summary>Что входит в путь до C2</summary><p>Эти уроки — опорный тренажёр, который стоит проходить вместе с регулярным чтением, аудированием, письмом и общением. Они не заменяют многолетний языковой опыт и не выдают сертификат уровня. A0 — наш вводный этап; официальная шкала CEFR включает A1–C2. C2 не означает, что человек является носителем языка.</p><p><a href="https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions" target="_blank" rel="noopener noreferrer">Официальное описание CEFR</a></p></details>`;}
function startLesson(id){
  const lesson=byId(id);
  if(!lesson){main.innerHTML='<section class="panel empty"><h1>Урок не найден</h1><a href="#path" class="btn">К программе</a></section>';return;}
  if(!lessonSession||lessonSession.id!==id){
    const draft=state.lessonDraft?.id===id?state.lessonDraft:null;
    lessonSession={id,step:draft?.step??0,score:draft?.score??0,answered:false,selected:null,tokens:[],bank:shuffle(lesson.sentence.split(' ')),options:shuffle(lesson.quiz.options),speechDone:false};
    saveLessonDraft();
  }else if(lessonSession.answered){
    lessonSession.step=Math.min(4,lessonSession.step+1);
    lessonSession.answered=false;
    lessonSession.selected=null;
    saveLessonDraft();
  }
  renderLesson();
}
function saveLessonDraft(){
  if(!lessonSession)return false;
  state.lessonDraft={id:lessonSession.id,step:Math.min(4,lessonSession.step+(lessonSession.answered?1:0)),score:lessonSession.score};
  return save();
}
function renderLesson(){const s=lessonSession,l=byId(s.id);const stepNames=['Разобраться','Выбрать ответ','Дополнить фразу','Собрать предложение','Сказать самому'];main.innerHTML=`<div class="lesson-header"><a class="back" href="#path" aria-label="Вернуться к программе">←</a><p class="eyebrow">${l.level} / УРОК ${l.id.split('-')[1]} / ${l.minutes} МИНУТ</p></div><div class="lesson-layout"><article><h1>${esc(l.title)}</h1><p class="muted">${esc(l.goal)}</p><div class="lesson-mobile-progress"><span>Шаг ${s.step+1} из 5 · ${stepNames[s.step]}</span><div class="step-track" aria-hidden="true">${stepNames.map((_,i)=>`<i class="${i<=s.step?'reached':''}"></i>`).join('')}</div></div><section class="panel" id="lesson-stage" tabindex="-1"></section></article><aside class="panel sticky"><p class="eyebrow">ТВОИ 5 ШАГОВ</p><div class="step-list">${stepNames.map((name,i)=>`<div><span class="step-dot ${i===s.step?'current':''}">${i<s.step?'✓':i+1}</span><span>${name}</span></div>`).join('')}</div><div class="divider"></div><small>Для завершения: минимум 2 верных ответа из 3 и устная практика. Повторять можно сколько нужно.</small></aside></div>`;renderLessonStage();}
function renderLessonStage(){const s=lessonSession,l=byId(s.id),el=document.querySelector('#lesson-stage');if(s.step===0){el.innerHTML=`<p class="eyebrow">ПОНЯТЬ И УСЛЫШАТЬ</p><p class="rule">${esc(l.theory)}</p><div class="example"><div class="btn-row"><strong lang="en">${esc(l.example)}</strong>${playButton(l.example)}</div><small>${esc(l.translation)}</small></div><h3>Фразы, которые пригодятся</h3>${l.phrases.map(p=>`<div class="vocab-row"><div><strong lang="en">${esc(p.en)}</strong><small>${esc(p.ru)}</small></div>${playButton(p.en)}</div>`).join('')}<div class="btn-row" style="margin-top:24px"><button class="btn" data-action="lesson-next">К упражнениям ↗</button><button class="btn quiet" data-action="save-phrases" data-id="${l.id}">В повторение +</button></div>`;return;}
  if(s.step===4){el.innerHTML=`<p class="eyebrow">ТЕПЕРЬ ТВОЙ ГОЛОС</p><h2>Скажи своими словами</h2><p>${esc(l.speaking)}</p><div class="bubble"><small>Собеседник</small><div lang="en">${esc(l.partner)}</div>${playButton(l.partner)}</div><details style="margin:20px 0"><summary>Пример ответа</summary><p lang="en">${esc(l.model)}</p>${playButton(l.model)}</details><div class="checklist"><label><input id="lesson-spoken" type="checkbox"> Я произнёс свой ответ вслух, а затем повторил без чтения.</label></div><p class="note">Верных ответов: ${s.score} из 3. ${s.score<2?'Повтори задания перед завершением.':'Устную часть оцениваешь самостоятельно.'}</p><div class="btn-row"><button class="btn" id="finish-lesson" data-action="lesson-finish" disabled>Завершить урок</button><button class="btn quiet" data-action="lesson-retry">Повторить упражнения</button></div>`;return;}
  const q=s.step===1?l.quiz:s.step===2?l.cloze:null;
  el.innerHTML=`<p class="task-label">Упражнение ${s.step} из 3</p><h2>${s.step===1?'Выбери ответ':s.step===2?'Дополни фразу':'Собери предложение'}</h2>${q?`<p class="question">${esc(q.prompt)}</p>`:`<p class="muted">Расставь слова. Нажми на выбранное слово, чтобы вернуть его.</p><div class="sentence tokens" aria-label="Твой вариант">${s.tokens.map((idx,i)=>`<button class="token" data-action="token-remove" data-index="${i}" ${s.answered?'disabled':''}>${esc(s.bank[idx])}</button>`).join('')||'<small>Выбери первое слово снизу</small>'}</div><div class="tokens" aria-label="Слова для предложения">${s.bank.map((word,i)=>`<button class="token" data-action="token-add" data-index="${i}" ${s.tokens.includes(i)||s.answered?'disabled':''}>${esc(word)}</button>`).join('')}</div>`}${s.step===1?`<div class="options" role="group" aria-label="Варианты ответа">${s.options.map((option,i)=>`<button class="option ${s.selected===i?'selected':''}" data-action="choose" data-index="${i}" aria-pressed="${s.selected===i}" ${s.answered?'disabled':''}>${esc(option)}</button>`).join('')}</div>`:''}${s.step===2?'<label for="answer-input" class="note">Впиши пропущенное слово или выражение</label><input id="answer-input" class="answer-input" placeholder="Твой ответ на английском" type="text" inputmode="text" enterkeyhint="done" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" lang="en">':''}<div id="answer-feedback" role="status" aria-live="polite"></div><div class="btn-row"><button class="btn" data-action="check" id="check-answer" ${(s.step===1&&s.selected===null)||(s.step===3&&s.tokens.length!==s.bank.length)?'disabled':''}>Проверить</button></div>`;
}
function check(){const s=lessonSession;if(!s||s.answered)return;const l=byId(s.id);let input,accepted,explanation;if(s.step===1){if(s.selected===null)return;input=s.options[s.selected];accepted=[l.quiz.answer];explanation=l.quiz.explanation;}else if(s.step===2){input=document.querySelector('#answer-input').value;if(!input.trim()){toast('Сначала напиши свой ответ.');return;}accepted=l.cloze.answers;explanation=l.cloze.explanation;}else if(s.step===3){if(s.tokens.length!==s.bank.length)return;input=s.tokens.map(i=>s.bank[i]).join(' ');accepted=[l.sentence];explanation='Произнеси правильное предложение целиком, затем повтори без текста.';}else return;const ok=correctAnswer(input,accepted),beforeState=JSON.stringify(state),beforeAnswered=s.answered,beforeScore=s.score;s.answered=true;s.score+=ok?1:0;activity();if(!ok)seedCards(l);if(!saveLessonDraft()){state=JSON.parse(beforeState);s.answered=beforeAnswered;s.score=beforeScore;return;}document.querySelectorAll('#lesson-stage .option,#lesson-stage .token,#answer-input').forEach(el=>el.disabled=true);document.querySelector('#answer-feedback').innerHTML=`<div class="feedback ${ok?'':'wrong'}"><strong>${ok?'Верно. Отличный шаг!':'Разберём и попробуем ещё.'}</strong>${!ok?`Подходящий ответ: <b>${esc(accepted[0])}</b><br>`:''}${esc(explanation)}</div>`;const button=document.querySelector('#check-answer');button.textContent='Дальше →';button.dataset.action='lesson-next';button.disabled=false;button.focus({preventScroll:true});document.querySelector('#answer-feedback').scrollIntoView({block:'nearest'});}
function finishLesson(){
  const s=lessonSession;
  if(!s||s.step!==4||s.score<2||!document.querySelector('#lesson-spoken')?.checked)return;
  const lesson=byId(s.id),previous=state.completed[lesson.id],beforeState=JSON.stringify(state);
  state.completed[lesson.id]={score:Math.max(previous?.score||0,s.score),at:Date.now()};
  state.speaking[lesson.id]=Math.min(100000,(state.speaking[lesson.id]||0)+1);
  state.lessonDraft=null;
  activity();seedCards(lesson);if(!save()){state=JSON.parse(beforeState);return;}
  const next=lessons.find(x=>x.level===lesson.level&&!state.completed[x.id]);
  main.innerHTML=`<section class="panel empty"><p class="eyebrow">${next?'УРОК ЗАВЕРШЁН':'МАТЕРИАЛЫ ЭТАПА ЗАВЕРШЕНЫ'}</p>
    <h1>${next?'Ещё одна ситуация освоена в тренажёре.':'Ты прошёл все уроки этого этапа.'}</h1>
    <p>${esc(lesson.title)} · ${s.score} из 3 верно. Четыре фразы добавлены в повторение.</p>
    <p class="note">Это завершение материалов, не подтверждение уровня ${esc(lesson.level)}. Попробуй ответить на вопрос без текста и повторить его позже.</p>
    <div class="btn-row review-controls"><a class="btn" href="#quick/${lesson.id}/2">Ответить без текста</a>
    <a class="btn quiet" href="${next?'#lesson/'+next.id:'#path'}">${next?'Следующий урок':'К программе'}</a></div></section>`;
  lessonSession=null;
}
function renderReview(){if(!reviewSession)reviewSession={ids:dueCards(state.cards),index:0,revealed:false,done:0};const r=reviewSession;const personalDue=state.personalPhrases.filter(phrase=>phrase.reviews>0&&phrase.due<=Date.now()).length;main.innerHTML=heading('Вспомнить, чтобы сказать.','Сначала произнеси английскую фразу по памяти. Затем проверь себя.',false)+(personalDue?`<section class="panel quick-due"><p class="eyebrow">ТВОИ ФРАЗЫ</p><h2>Из своих материалов: ${personalDue} ${ruCount(personalDue,'фраза','фразы','фраз')} к повторению</h2><p>Сначала вспомни выражение из выбранного материала, затем открой ответ.</p><a class="btn outline" href="#context">Вспомнить свои фразы →</a></section>`:'')+'<div class="review-wrap" id="review-stage"></div>';const el=document.querySelector('#review-stage');if(r.index>=r.ids.length){const hasCards=Object.keys(state.cards).length>0;const future=Object.values(state.cards).filter(c=>c.due>Date.now()).sort((a,b)=>a.due-b.due)[0];el.innerHTML=`<section class="panel empty"><p class="eyebrow">${r.done?'ПОВТОРЕНИЕ ЗАВЕРШЕНО':'ВСЁ В СВОЁ ВРЕМЯ'}</p><h2>${r.done?`Повторено фраз: ${r.done}`:hasCards?'На сейчас всё повторено':'Здесь будут твои фразы'}</h2><p class="muted">${future?'Следующее повторение: '+new Date(future.due).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+'.':hasCards?'Можно перейти к следующему уроку.':'Открой урок и добавь выражения в повторение.'}</p><div class="btn-row review-controls"><a href="#path" class="btn">К урокам</a>${hasCards?'':'<button class="btn quiet" data-action="seed-cards">Добавить фразы текущего этапа</button>'}</div></section>`;return;}const p=phraseMap.get(r.ids[r.index]);el.innerHTML=`<div class="section-head"><span class="muted">Фраза ${r.index+1} из ${r.ids.length}</span><span class="level-pill">${p.level}</span></div><section class="panel flashcard"><p class="eyebrow">КАК СКАЗАТЬ ПО-АНГЛИЙСКИ?</p><h2>${esc(p.ru)}</h2>${r.revealed?`<p class="translation" lang="en">${esc(p.en)}</p>${playButton(p.en)}`:'<button class="btn outline" data-action="reveal">Показать ответ</button>'}</section>${r.revealed?`<p class="note" style="text-align:center">Оцени, удалось ли вспомнить без подсказки.</p><div class="btn-row review-controls"><button class="btn quiet" data-action="rate" data-grade="again">Не вспомнил · 10 мин</button><button class="btn quiet" data-action="rate" data-grade="hard">С трудом · 1 день</button><button class="btn" data-action="rate" data-grade="good">Уверенно · ${scheduleCard(state.cards[p.id],'good').interval} дн.</button></div>`:''}`;}
function renderSpeak(id){const l=byId(id)||nextLesson();main.innerHTML=heading('Дай мыслям голос.','Прочитай ситуацию, послушай вопрос и ответь вслух.',false)+`<label for="speak-topic" class="note">Тема разговора</label><select id="speak-topic" class="topic-select">${levels.map(level=>`<optgroup label="${level.id} · ${level.title}">${lessons.filter(x=>x.level===level.id).map(x=>`<option value="${x.id}" ${l.id===x.id?'selected':''}>${x.title}</option>`).join('')}</optgroup>`).join('')}</select><div class="speak-grid"><article class="panel"><p class="eyebrow">${l.level} / ${esc(l.title)}</p><h2>Твоя задача</h2><p>${esc(l.speaking)}</p><div class="dialogue"><div class="bubble"><small>Собеседник</small><p lang="en">${esc(l.partner)}</p>${playButton(l.partner)}</div><div class="bubble you"><small>Твой ответ</small>Ответь своими словами. Если не хватает слова, объясни мысль проще.</div></div><details><summary>Посмотреть пример ответа</summary><p lang="en">${esc(l.model)}</p>${playButton(l.model)}</details><div class="divider"></div><h3>Послушай себя со стороны</h3><p class="note">Микрофон включается только по кнопке. Запись остаётся в этой вкладке, никуда не отправляется и удаляется при уходе из раздела. Автоматической оценки произношения нет.</p><div class="btn-row"><button class="btn outline" data-action="record" id="record-button">● Записать ответ</button><span id="record-status" role="status"></span></div><div id="record-result"></div><p class="note" style="margin-top:14px">Нет микрофона? Просто произнеси ответ вслух и оцени себя ниже.</p></article><aside><section class="panel"><h2>Опора для разговора</h2>${l.phrases.map(p=>`<div class="vocab-row"><div><strong lang="en">${esc(p.en)}</strong><small>${esc(p.ru)}</small></div>${playButton(p.en)}</div>`).join('')}</section><section class="panel"><h2>Проверь себя</h2><div class="checklist"><label><input type="checkbox" class="speak-check"> Я ответил на вопрос своими словами.</label><label><input type="checkbox" class="speak-check"> Я добавил деталь или пример.</label><label><input type="checkbox" class="speak-check"> Я повторил ответ без чтения.</label></div><button class="btn" data-action="speaking-done" data-id="${l.id}" id="speaking-done" disabled>Сохранить практику</button><p class="note" style="margin-top:13px">Это твоя самооценка практики.</p></section></aside></div>`;}
async function toggleRecord(){
  if(recordPending)return;
  if(recorder?.state==='recording'){recorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Запись не поддерживается здесь. Открой приложение в современном браузере через localhost или HTTPS.');return;}
  const button=document.querySelector('#record-button');
  if(!button)return;
  recordPending=true;
  const generation=++recordGeneration;
  button.disabled=true;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(generation!==recordGeneration){stream.getTracks().forEach(track=>track.stop());stream=null;return;}
    const chunks=[];
    recorder=new MediaRecorder(stream);
    recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
    recorder.onstop=()=>{
      clearTimeout(recordTimer);clearInterval(recordTick);
      stream?.getTracks().forEach(track=>track.stop());stream=null;
      if(generation!==recordGeneration)return;
      const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});
      if(!blob.size){toast('Запись оказалась пустой. Попробуй ещё раз.');return;}
      const url=URL.createObjectURL(blob);
      recordedUrls.push({url,type:blob.type});
      if(recordedUrls.length>2)URL.revokeObjectURL(recordedUrls.shift().url);
      renderRecordedUrls();
      const currentButton=document.querySelector('#record-button');
      if(currentButton){currentButton.disabled=false;currentButton.textContent='● Записать ещё раз';}
      const status=document.querySelector('#record-status');
      if(status){status.className='';status.textContent='Запись готова';}
    };
    recorder.onerror=()=>{cleanupRecording();toast('Не удалось записать звук. Можно продолжить без микрофона.');renderRoute();};
    recorder.start();button.disabled=false;button.textContent='■ Остановить запись';
    let seconds=0;
    const update=()=>{const status=document.querySelector('#record-status');if(status){status.className='recording';status.textContent=`Запись ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} / 5:00`;seconds++;}};
    update();recordTick=setInterval(update,1000);
    recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},300000);
  }catch{
    const recordingFailed=Boolean(stream);
    clearTimeout(recordTimer);clearInterval(recordTick);
    try{
      if(recorder){
        recorder.onstop=null;recorder.onerror=null;
        if(recorder.state==='recording')recorder.stop();
      }
    }catch{}finally{
      stream?.getTracks().forEach(track=>track.stop());
      stream=null;recorder=null;
    }
    toast(recordingFailed?'Не удалось начать запись. Микрофон выключен; продолжай практику вслух.':'Нет доступа к микрофону. Разреши его в браузере или продолжай практику вслух.');
    if(document.contains(button)){
      button.disabled=false;
      button.textContent=recordedUrls.length?'● Записать ещё раз':'● Записать ответ';
    }
  }finally{recordPending=false;}
}
function cleanupRecording(){
  recordGeneration++;clearTimeout(recordTimer);clearInterval(recordTick);
  if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}
  stream?.getTracks().forEach(track=>track.stop());stream=null;recorder=null;
  for(const item of recordedUrls)URL.revokeObjectURL(item.url);
  recordedUrls=[];
}
function renderProgress(){const done=Object.keys(state.completed).length,spoke=Object.values(state.speaking).reduce((a,b)=>a+b,0);const days=Array.from({length:28},(_,i)=>{const d=new Date();d.setDate(d.getDate()-27+i);const key=localDate(d);return `<div class="day ${state.activity[key]?'active':''}" title="${key}: ${state.activity[key]||0} действий" aria-label="${key}: ${state.activity[key]||0} действий"></div>`;}).join('');main.innerHTML=heading('Ты уже двигаешься.','Следи за практикой, а не за идеальностью каждого ответа.',false)+`<div class="stats"><div class="stat"><strong>${done}<small> / 42</small></strong><span>Пройдено уроков</span></div><div class="stat"><strong>${Object.keys(state.cards).length}</strong><span>Фраз в повторении</span></div><div class="stat"><strong>${spoke}</strong><span>Устных практик</span></div></div><section class="panel"><div class="section-head"><h2>Последние 28 дней</h2><span class="muted">Серия: ${streak(state.activity)} дн.</span></div><div class="activity-grid">${days}</div><small>Цвет отмечает дни, когда ты отвечал на задания, повторял фразы или сохранял устную практику.</small></section><section class="panel"><h2>По этапам</h2>${levels.map(l=>{const count=lessons.filter(x=>x.level===l.id&&state.completed[x.id]).length;return `<div style="margin:18px 0"><div class="section-head" style="margin-bottom:4px"><span>${l.id} · ${l.title}</span><span class="muted">${count}/6</span></div><div class="progress-track"><span style="width:${percent(count,6)}%"></span></div></div>`;}).join('')}<p class="note">Здесь показано прохождение материала. Оценить владение языком помогут отдельная диагностика и обратная связь преподавателя или собеседника.</p></section><section class="panel"><h2>Заниматься самостоятельно</h2><p>Начни с ${state.goal} минут: повтори фразы, пройди часть урока и обязательно скажи несколько предложений вслух. Добавляй чтение, аудирование и живой разговор в течение недели.</p><label class="form-line">План на день <select id="goal-select">${[10,20,30].map(n=>`<option value="${n}" ${state.goal===n?'selected':''}>${n} минут</option>`).join('')}</select></label><div class="resource-list"><div><a href="https://learnenglish.britishcouncil.org/free-resources/speaking" target="_blank" rel="noopener noreferrer">British Council · разговорная практика ↗</a><small>Бесплатные материалы A1–B2 с видео и заданиями.</small></div><div><a href="https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions" target="_blank" rel="noopener noreferrer">CEFR · ориентиры A1–C2 ↗</a><small>Официальная шкала навыков от Совета Европы.</small></div></div></section><section class="panel"><h2>Твои данные</h2><p class="note">Прогресс хранится в этом браузере. Другой браузер или адрес сайта — отдельное сохранение. Для переноса скачай копию и загрузи её на другом устройстве. Аудиозаписи в копию не входят.</p><div class="btn-row"><button class="btn" data-action="export">Скачать резервную копию</button><button class="btn quiet" data-action="import">Загрузить копию</button><input class="hidden" id="import-file" type="file" accept="application/json,.json"><button class="btn danger" data-action="reset">Сбросить прогресс</button></div></section>`;}
function downloadBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`say-it-backup-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Резервная копия подготовлена.');}
async function importBackup(file){if(!file)return;try{if(file.size>2*1024*1024)throw new Error('Файл слишком большой. Максимум 2 МБ.');const imported=validateState(JSON.parse(await file.text()),lessonIds,cardIds);if(!confirm('Заменить текущий прогресс данными из резервной копии?'))return;const previous=state;state=imported;lessonSession=null;reviewSession=null;quickSession=null;if(!save()){state=previous;renderRoute();return;}renderRoute();toast('Прогресс восстановлен.');}catch(error){toast('Не удалось загрузить копию: '+error.message);}}
function renderRoute(){
  const [route='today',id,mode]=(location.hash.replace(/^#/,'')||'today').split('/');
  cleanupRecording();
  if('speechSynthesis'in window)speechSynthesis.cancel();
  if(route!=='lesson')lessonSession=null;
  if(route!=='review')reviewSession=null;
  if(route!=='quick')quickSession=null;
  const nav=route==='lesson'?'path':route==='quick'||route==='context'?'today':route;
  document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===nav;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  document.querySelector('#breadcrumb').textContent='Практика / '+({today:'Сегодня',path:'Программа',review:'Повторение',speak:'Говорить',progress:'Мой прогресс',lesson:'Урок',quick:'Короткая практика',context:'Мои фразы'}[route]||'Сегодня');
  if(route==='path')renderPath();
  else if(route==='lesson')startLesson(id);
  else if(route==='review')renderReview();
  else if(route==='speak')renderSpeak(id);
  else if(route==='quick')renderQuick(id,mode);
  else if(route==='context')renderContext();
  else if(route==='progress'){renderProgress();renderCapabilities();}
  else renderToday();
  if(storageWarning)main.insertAdjacentHTML('afterbegin',`<p class="feedback wrong" id="storage-warning" role="alert">${esc(storageWarning)}</p>`);
  updateBadge();revealCurrentLevel();main.focus({preventScroll:true});window.scrollTo(0,0);
}
document.addEventListener('click',event=>{if(event.target.closest('.skip')){event.preventDefault();main.focus();return;}const b=event.target.closest('[data-action]');if(!b||b.disabled)return;const action=b.dataset.action;if(blockedByConflict(action))return;switch(action){case 'sound':sound(b.dataset.text);break;case 'level':if(LEVEL_IDS.includes(b.dataset.id)){const previous=state.level;state.level=b.dataset.id;if(!save())state.level=previous;renderRoute();}break;case 'save-phrases':if(addCards(byId(b.dataset.id)))toast('Фразы добавлены в повторение.');break;case 'lesson-next':if(!lessonSession)return;if(lessonSession.step>0&&!lessonSession.answered)return;const beforeStep=lessonSession.step,beforeAnswered=lessonSession.answered,beforeSelected=lessonSession.selected,beforeDraft=state.lessonDraft;lessonSession.step++;lessonSession.answered=false;lessonSession.selected=null;if(!saveLessonDraft()){lessonSession.step=beforeStep;lessonSession.answered=beforeAnswered;lessonSession.selected=beforeSelected;state.lessonDraft=beforeDraft;return;}renderLesson();focusLessonStep();break;case 'choose':lessonSession.selected=Number(b.dataset.index);renderLessonStage();document.querySelector(`[data-action="choose"][data-index="${b.dataset.index}"]`)?.focus();break;case 'token-add':{const idx=Number(b.dataset.index);if(!lessonSession.tokens.includes(idx))lessonSession.tokens.push(idx);renderLessonStage();break;}case 'token-remove':lessonSession.tokens.splice(Number(b.dataset.index),1);renderLessonStage();break;case 'check':check();break;case 'lesson-finish':finishLesson();break;case 'lesson-retry':{const previousSession=lessonSession,previousDraft=state.lessonDraft,id=lessonSession.id,lesson=byId(id);lessonSession={id,step:1,score:0,answered:false,selected:null,tokens:[],bank:shuffle(lesson.sentence.split(' ')),options:shuffle(lesson.quiz.options),speechDone:false};if(!saveLessonDraft()){lessonSession=previousSession;state.lessonDraft=previousDraft;return;}renderLesson();focusLessonStep();break;}case 'reveal':reviewSession.revealed=true;renderReview();break;case 'rate':{const r=reviewSession;if(!r?.revealed)return;const beforeState=JSON.stringify(state),id=r.ids[r.index];state.cards[id]=scheduleCard(state.cards[id],b.dataset.grade);activity();if(!save()){state=JSON.parse(beforeState);return;}r.index++;r.done++;r.revealed=false;renderReview();break;}case 'seed-cards':{const beforeState=JSON.stringify(state);for(const l of atLevel())seedCards(l);if(!save()){state=JSON.parse(beforeState);return;}reviewSession=null;renderReview();break;}case 'record':void toggleRecord();break;case 'speaking-done':{if(![...document.querySelectorAll('.speak-check')].every(c=>c.checked))return;const beforeState=JSON.stringify(state),id=b.dataset.id;state.speaking[id]=Math.min(100000,(state.speaking[id]||0)+1);activity();if(!save()){state=JSON.parse(beforeState);return;}b.disabled=true;b.textContent='Практика сохранена ✓';b.dataset.saved='true';toast('Устная практика сохранена.');break;}case 'export':downloadBackup();break;case 'import':document.querySelector('#import-file').click();break;case 'reset':if(confirm('Удалить все уроки, карточки и историю на этом устройстве? Сначала можно скачать резервную копию.')){const previous=state;state=freshState();reviewSession=null;lessonSession=null;quickSession=null;if(!save()){state=previous;renderRoute();return;}renderRoute();toast('Прогресс сброшен.');}break;}});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(blockedByConflict(action))return;
  if(action==='quick-speed'){
    const rate=Number(button.dataset.rate);
    if(![0.72,0.88,1].includes(rate))return;
    soundRate=rate;
    document.querySelectorAll('[data-action="quick-speed"]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
  }else if(action==='quick-hint'){
    if(!quickSession)return;
    const beforeDraft=state.quickDraft;
    quickSession.hint=true;quickSession.hintUsed=true;if(!saveQuickDraft()){quickSession.hint=false;quickSession.hintUsed=false;state.quickDraft=beforeDraft;return;}button.hidden=true;
    const hint=document.querySelector('#quick-hint');if(hint){hint.hidden=false;hint.focus({preventScroll:true});}
    if(quickSession.retrievalRating)document.querySelectorAll('[data-action="quick-initial-rate"]').forEach(el=>el.disabled=true);
    else document.querySelector('[data-action="quick-initial-rate"][data-rating="independent"]')?.setAttribute('disabled','');
  }else if(action==='quick-initial-rate'){
    if(!quickSession?.reviewFirst||quickSession.steps[quickSession.step]!=='recall')return;
    const rating=button.dataset.rating;
    if(!['independent','assisted','again'].includes(rating)||quickSession.hintUsed&&quickSession.retrievalRating||rating==='independent'&&quickSession.hintUsed)return;
    const beforeDraft=state.quickDraft,previousRating=quickSession.retrievalRating;
    quickSession.retrievalRating=rating;if(!saveQuickDraft()){quickSession.retrievalRating=previousRating;state.quickDraft=beforeDraft;return;}
    document.querySelectorAll('[data-action="quick-initial-rate"]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));
    const next=document.querySelector('[data-action="quick-next"]');if(next)next.disabled=false;
  }else if(action==='quick-next'){
    if(!quickSession||quickSession.completed)return;
    const current=quickSession.steps[quickSession.step];
    if(recorder?.state==='recording'){toast('Останови запись перед переходом к следующему шагу.');return;}
    if(current==='recall'&&quickSession.reviewFirst&&!quickSession.retrievalRating){toast('Сначала оцени первую попытку без образца.');return;}
    if(current==='write'){
      const answer=document.querySelector('#quick-written')?.value.trim()||'';
      if(answer.split(/\s+/).length<3){toast('Напиши хотя бы три слова по-английски или выбери режим на 2 минуты.');return;}
      quickSession.written=answer.slice(0,1200);
    }
    const beforeDraft=state.quickDraft,previousStep=quickSession.step;
    quickSession.step=Math.min(quickSession.step+1,quickSession.steps.length-1);
    if(!saveQuickDraft()){quickSession.step=previousStep;state.quickDraft=beforeDraft;return;}
    renderQuick(quickSession.id,quickSession.mode);focusQuickStage();
  }else if(action==='quick-rate'){
    if(!quickSession||quickSession.completed||quickSession.steps[quickSession.step]!=='rate')return;
    const rating=quickSession.reviewFirst?quickSession.retrievalRating:button.dataset.rating;
    if(!['independent','assisted','again'].includes(rating)||!quickSession.reviewFirst&&rating==='independent'&&quickSession.hintUsed)return;
    const lesson=byId(quickSession.id);
    const previous=JSON.stringify(state);
    state.practice[lesson.id]=recordPractice(state.practice[lesson.id],rating);
    state.speaking[lesson.id]=Math.min(100000,(state.speaking[lesson.id]||0)+1);
    activity();for(const phrase of lesson.phrases)if(!state.cards[phrase.id])state.cards[phrase.id]={due:Date.now(),interval:0,reviews:0};state.quickDraft=null;
    if(!save()){state=JSON.parse(previous);updateBadge();return;}
    quickSession.completed=true;quickSession.rating=rating;
    renderQuick(quickSession.id,quickSession.mode);focusQuickStage();
  }else if(action==='quick-restart'){
    if(!quickSession)return;
    const {id,mode}=quickSession;cleanupRecording();quickSession=null;state.quickDraft=null;renderQuick(id,mode);focusQuickStage();
  }
});
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');
  if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(blockedByConflict(action))return;
  if(action==='context-add'){
    const source=document.querySelector('#context-source')?.value||'';
    const input=document.querySelector('#context-lines')?.value||'';
    const parsed=parsePersonalPhrases(source,input,new Set(state.personalPhrases.map(phrase=>phrase.id)));
    if(parsed.errors.length){toast(parsed.errors[0]);return;}
    const previous=JSON.stringify(state);state.personalPhrases.push(...parsed.phrases);
    if(!save()){state=JSON.parse(previous);return;}renderContext();focusContextStage('.context-dialogue');toast(`Добавлено фраз: ${parsed.phrases.length}.`);
  }else if(action==='context-copy'){
    const prompt=document.querySelector('#context-prompt')?.value;
    if(!prompt)return;
    if(!navigator.clipboard?.writeText){toast('Копирование недоступно. Выдели текст задания вручную.');return;}
    navigator.clipboard.writeText(prompt).then(()=>toast('Задание скопировано.')).catch(()=>toast('Не удалось скопировать. Выдели текст задания вручную.'));
  }else if(action==='context-done'){
    if(!document.querySelector('#context-spoken')?.checked)return;
    const selected=state.personalPhrases.find(phrase=>phrase.id===button.dataset.id);
    if(!selected)return;
    const now=Date.now();
    const groupIds=new Set(state.personalPhrases.filter(phrase=>phrase.reviews===0&&phrase.source===selected.source).slice(0,MAX_PHRASES_PER_ADD).map(phrase=>phrase.id));
    const previous=JSON.stringify(state);state.personalPhrases=state.personalPhrases.map(phrase=>groupIds.has(phrase.id)?markDialogueDone(phrase,now):phrase);
    activity();if(!save()){state=JSON.parse(previous);return;}renderContext();focusContextStage('.context-future');toast('Возвращение к материалу назначено через два дня.');
  }else if(action==='context-reveal'){
    const due=state.personalPhrases.find(phrase=>phrase.id===button.dataset.id&&phrase.due<=Date.now()&&phrase.reviews>0);
    if(!due)return;
    contextSession={reviewId:due.id,revealed:true};renderContext();focusContextStage('.context-practice');
  }else if(action==='context-rate'){
    if(!contextSession.revealed||contextSession.reviewId!==button.dataset.id)return;
    const index=state.personalPhrases.findIndex(phrase=>phrase.id===button.dataset.id);
    if(index<0)return;
    const previous=JSON.stringify(state);state.personalPhrases[index]=ratePersonalPhrase(state.personalPhrases[index],button.dataset.grade);
    activity();if(!save()){state=JSON.parse(previous);return;}contextSession={reviewId:null,revealed:false};renderContext();focusContextStage('.context-practice');
  }else if(action==='context-remove'){
    const selected=state.personalPhrases.find(phrase=>phrase.id===button.dataset.id);
    if(!selected||!confirm(`Удалить фразу «${selected.en}» из этого браузера?`))return;
    const previous=JSON.stringify(state);state.personalPhrases=state.personalPhrases.filter(phrase=>phrase.id!==selected.id);
    if(!save()){state=JSON.parse(previous);return;}renderContext();focusContextStage('.context-form');
  }
});
document.addEventListener('change',event=>{
  if(event.target.id==='context-spoken'){
    const button=document.querySelector('#context-done');
    if(button)button.disabled=!event.target.checked;
  }
});
document.addEventListener('input',event=>{
  if(event.target.id==='quick-written'&&quickSession){
    if(blockedByConflict('quick-written')){event.target.value=quickSession.written;return;}
    quickSession.written=event.target.value.slice(0,1200);saveQuickDraft();
  }
});
document.addEventListener('change',event=>{const el=event.target;if(['level-select','goal-select','import-file'].includes(el.id)&&blockedByConflict(el.id)){if(el.id!=='import-file')renderRoute();return;}if(el.id==='level-select'){const previous=state.level;state.level=el.value;if(!save())state.level=previous;renderRoute();}else if(el.id==='goal-select'){const previous=state.goal;state.goal=Number(el.value);if(!save())state.goal=previous;renderProgress();}else if(el.id==='lesson-spoken'){document.querySelector('#finish-lesson').disabled=!el.checked||lessonSession.score<2;}else if(el.classList.contains('speak-check')){const b=document.querySelector('#speaking-done');b.disabled=b.dataset.saved==='true'||![...document.querySelectorAll('.speak-check')].every(x=>x.checked);}else if(el.id==='speak-topic'){location.hash='speak/'+el.value;}else if(el.id==='import-file'){void importBackup(el.files[0]);}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='answer-input'){e.preventDefault();if(!blockedByConflict('check'))check();}});
window.addEventListener('hashchange',renderRoute);window.addEventListener('pagehide',cleanupRecording);window.addEventListener('storage',event=>{if(event.key===KEY&&event.newValue!==lastStoredRaw){storageConflict=true;warnStorage(CONFLICT_MESSAGE);}});
function revealCurrentLevel(){const tabs=document.querySelector('.level-tabs');const active=tabs?.querySelector('.active');if(active)tabs.scrollLeft=Math.max(0,active.offsetLeft-tabs.offsetLeft-(tabs.clientWidth-active.offsetWidth)/2);}
// Keep the next question visible after advancing from a long lesson on a phone.
function focusLessonStep(){const stage=document.querySelector('#lesson-stage');if(!stage)return;stage.focus({preventScroll:true});const target=matchMedia('(max-width:1080px)').matches?document.querySelector('.lesson-mobile-progress'):stage;(target||stage).scrollIntoView({block:'start'});}
// Hide the bottom bar only while an on-screen keyboard actually reduces the viewport.
function syncKeyboardLayout(){const editing=document.activeElement?.matches('.answer-input,textarea');const height=window.visualViewport?.height??window.innerHeight;document.body.classList.toggle('is-typing',Boolean(editing&&height<window.innerHeight*.75));}
document.addEventListener('focusin',syncKeyboardLayout);
document.addEventListener('focusout',()=>queueMicrotask(syncKeyboardLayout));
window.visualViewport?.addEventListener('resize',syncKeyboardLayout);
window.addEventListener('resize',syncKeyboardLayout);
renderRoute();
// Optional WebMCP bridge, sharing the exact actions and state used by the UI.
const context=document.modelContext;
if(context?.registerTool){const controller=new AbortController();const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:controller.signal})).catch(()=>{});}catch{}};register({name:'get_english_learning_progress',title:'Прогресс английского',description:'Read local learning progress. Does not grade language proficiency.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({level:state.level,completed:Object.keys(state.completed),duePhrases:dueCards(state.cards).length,speakingSessions:Object.values(state.speaking).reduce((a,b)=>a+b,0)})});register({name:'open_english_lesson',title:'Открыть урок',description:'Open a lesson for practice. Does not complete it or award progress.',inputSchema:{type:'object',properties:{lessonId:{type:'string',enum:lessons.map(l=>l.id)}},required:['lessonId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!lessonIds.has(input.lessonId))throw new Error('Unknown lesson ID');history.replaceState(null,'','#lesson/'+input.lessonId);renderRoute();return {openedLesson:input.lessonId};}});window.addEventListener('pagehide',()=>controller.abort(),{once:true});}

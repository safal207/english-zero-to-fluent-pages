import {dialogueFor} from './dialogue.js';
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const play = text => `<button class="sound" data-action="sound" data-text="${esc(text)}" aria-label="Прослушать: ${esc(text)}" title="Прослушать">▶</button>`;
const names = {listen:'Послушай',repeat:'Повтори',recall:'Ответь без текста',write:'Напиши ответ',transfer:'Новая ситуация',followup:'Продолжи диалог',rate:'Оцени попытку'};

export function quickMarkup(lesson, session, rate, dueAt) {
  const {mode,steps,step,id} = session;
  const current = steps[step];
  const dialogue=dialogueFor(lesson);
  const transfer=dialogue?.[1];
  const followup=dialogue?.[2];
  const ratingLocked = session.hintUsed && Boolean(session.retrievalRating);
  const chunks = lesson.model.split(/(?<=[.!?])\s+/).filter(Boolean);
  const speed = [0.72, 0.88, 1].map(value => `<button class="btn quiet" data-action="quick-speed" data-rate="${value}" aria-pressed="${rate===value}">${value===0.72?'Медленно':value===1?'Обычно':'Спокойно'}</button>`).join('');
  const stage = current === 'listen' ? `
    <p class="eyebrow">СЛУШАЙ И ЗАМЕЧАЙ</p><h2>Один разговор. Один полезный ответ.</h2>
    <div class="quick-prompt"><small>Собеседник</small><p lang="en">${esc(lesson.partner)}</p>${play(lesson.partner)}</div>
    <div class="quick-line"><small>Возможный ответ</small><p lang="en">${esc(lesson.model)}</p>${play(lesson.model)}</div>
    <p class="quick-cue">${session.reviewFirst?'Теперь сравни ответ с первой попыткой.':'Прослушай ответ.'} Можно выбрать более медленный темп. Голос зависит от устройства.</p>
    <div class="btn-row quick-modes" role="group" aria-label="Темп озвучки">${speed}</div>
    ${session.reviewFirst?`<div class="divider"></div><h3>Сравни и скажи ещё раз</h3><p class="note">Если записал первый ответ, прослушай его рядом с образцом. Можешь записать вторую попытку.</p><div class="btn-row"><button class="btn outline" data-action="record" id="record-button">● Записать ещё раз</button><span id="record-status" role="status"></span></div><div id="record-result"></div>`:''}`
  : current === 'repeat' ? `
    <p class="eyebrow">ПРОИЗНЕСИ ПО ЧАСТЯМ</p><h2>Скажи сначала с опорой</h2>
    <div class="quick-line" lang="en">${chunks.map((chunk,index)=>`<p><small>${index+1}</small> ${esc(chunk)} ${play(chunk)}</p>`).join('')}</div>
    <p class="quick-cue">Повтори каждую часть, затем скажи ответ целиком. Не нужно звучать идеально.</p>
    <div class="btn-row">${play(lesson.model)} <span class="muted">Прослушать целиком</span></div>`
  : current === 'recall' ? `
    <p class="eyebrow">ИЗВЛЕЧЬ ИЗ ПАМЯТИ</p><h2>Ответь без текста</h2>
    <div class="quick-prompt"><small>Собеседник</small><p lang="en">${esc(lesson.partner)}</p>${play(lesson.partner)}</div>
    <p class="quick-cue">${session.reviewFirst?'Сначала попробуй вспомнить ответ без образца и оцени эту попытку. Затем сравни её с образцом.':'Закрой образец и ответь своими словами.'} Добавь свою деталь, если это подходит к вопросу. Если трудно, открой подсказку.</p>
    <button class="btn quiet" data-action="quick-hint" ${session.hint?'hidden':''}>Показать подсказку</button>
    <div class="quick-line" id="quick-hint" tabindex="-1" ${session.hint?'':'hidden'}><small>Опора, не оценка твоего ответа</small><p lang="en">${esc(lesson.model)}</p></div>
    <div class="divider"></div><h3>Можно записать себя</h3>
    <p class="note">Микрофон необязателен. Запись остаётся только в этой вкладке до ухода с экрана.</p>
    <div class="btn-row"><button class="btn outline" data-action="record" id="record-button">● Записать ответ</button><span id="record-status" role="status"></span></div><div id="record-result"></div>
    ${session.reviewFirst?`<div class="quick-feedback" role="group" aria-label="Оцени первое вспоминание"><button class="btn" data-action="quick-initial-rate" data-rating="independent" aria-pressed="${session.retrievalRating==='independent'}" ${session.hintUsed?'disabled':''}>Вспомнил сам</button><button class="btn quiet" data-action="quick-initial-rate" data-rating="assisted" aria-pressed="${session.retrievalRating==='assisted'}" ${ratingLocked?'disabled':''}>С подсказкой</button><button class="btn quiet" data-action="quick-initial-rate" data-rating="again" aria-pressed="${session.retrievalRating==='again'}" ${ratingLocked?'disabled':''}>Пока не вспомнил</button></div><p class="note">Оцени именно первую попытку до просмотра образца. После этого послушай и повтори.${ratingLocked?' Оценка до подсказки уже сохранена.':''}</p>`:''}`
  : current === 'write' ? `
    <p class="eyebrow">ИСПОЛЬЗУЙ В КОНТЕКСТЕ</p><h2>Напиши свой ответ</h2>
    <div class="quick-prompt"><small>Собеседник</small><p lang="en">${esc(lesson.partner)}</p></div>
    <label for="quick-written" class="note">Короткий ответ по-английски. Возьми одну полезную фразу и добавь свою деталь.</label>
    <textarea id="quick-written" class="quick-answer" rows="4" maxlength="1200" lang="en" autocapitalize="sentences" spellcheck="false">${esc(session.written || '')}</textarea>
    <div class="quick-cue">${lesson.phrases.slice(0,2).map(phrase=>`<span lang="en">${esc(phrase.en)}</span>`).join(' · ')}</div>
    <p class="note">Текст остаётся в текущем занятии. Приложение не проверяет его правильность автоматически.</p>`
  : current === 'transfer' ? `
    <p class="eyebrow">ДИАЛОГ · РЕПЛИКА 2 ИЗ 3</p><h2>Ответь в новой ситуации</h2>
    <div class="quick-prompt"><small>Новая реплика собеседника</small><p lang="en">${esc(transfer?.partner||lesson.partner)}</p>${play(transfer?.partner||lesson.partner)}</div>
    <p class="quick-cue">${esc(transfer?.instruction||lesson.speaking)} Произнеси ответ без чтения. Собеседник затем продолжит разговор.</p>`
  : current === 'followup' ? `
    <p class="eyebrow">ДИАЛОГ · РЕПЛИКА 3 ИЗ 3</p><h2>Продолжи разговор</h2>
    <div class="quick-prompt"><small>Собеседник продолжает</small><p lang="en">${esc(followup?.partner||lesson.partner)}</p>${play(followup?.partner||lesson.partner)}</div>
    <p class="quick-cue">${esc(followup?.instruction||lesson.speaking)} Ответь вслух, опираясь на свои слова, затем оцени обе новые реплики.</p>
    <div class="quick-feedback" role="group" aria-label="Самооценка диалога в новой ситуации">
      <button class="btn" data-action="quick-transfer-rate" data-rating="independent" aria-pressed="${session.transferRating==='independent'}">Обе без подсказки</button>
      <button class="btn quiet" data-action="quick-transfer-rate" data-rating="assisted" aria-pressed="${session.transferRating==='assisted'}">С подсказкой</button>
      <button class="btn quiet" data-action="quick-transfer-rate" data-rating="again" aria-pressed="${session.transferRating==='again'}">Пока не получилось</button>
    </div><p class="note">Оцени ответ в новых условиях отдельно от первого ответа. Это твоя самооценка; сайт не проверяет речь автоматически.</p>`
  : session.reviewFirst ? `<p class="eyebrow">ЗАКРЕПЛЕНИЕ</p><h2>Вернёмся к ответу позже</h2><p>Первая попытка до образца: ${session.retrievalRating==='independent'?'вспомнил сам':session.retrievalRating==='assisted'?'с подсказкой':'пока не вспомнил'}. Повторная практика после подсказки тоже полезна.</p><button class="btn" data-action="quick-rate" data-rating="${esc(session.retrievalRating||'')}" ${session.retrievalRating?'':'disabled'}>Сохранить самопроверку</button><p class="note">Срок следующего повторения рассчитан по первой попытке, а не по количеству прослушиваний образца.</p>`
  : `<p class="eyebrow">ТВОЯ ОЦЕНКА</p><h2>Что получилось?</h2>
    <p>Вспомни свой первый ответ на вопрос <span lang="en">${esc(lesson.partner)}</span>. Оцени его отдельно от новых реплик диалога.</p>
    <div class="quick-feedback" role="group" aria-label="Самооценка ответа">
      <button class="btn" data-action="quick-rate" data-rating="independent" ${session.hintUsed?'disabled':''}>Сказал без текста</button>
      <button class="btn quiet" data-action="quick-rate" data-rating="assisted">Понадобилась подсказка</button>
      <button class="btn quiet" data-action="quick-rate" data-rating="again">Пока не получилось</button>
    </div><p class="note">${session.hintUsed?'Образец был открыт: оцени попытку с подсказкой. Для ответа без текста начни новую попытку.':'Это самооценка, а не автоматическая проверка произношения или уровня.'}</p>`;
  const result = session.completed ? `<section class="panel quick-result"><p class="eyebrow">ПОПЫТКА СОХРАНЕНА</p><h2>${session.rating==='independent'?'Ты ответил без текста.':'Ты сделал попытку.'}</h2>
      <p>${session.rating==='independent'?'Следующий шаг — вспомнить ответ в другой день.':'Мы вернёмся к этой ситуации. Подсказку можно использовать столько раз, сколько нужно.'}</p>
      <p class="quick-due">Следующая самопроверка: ${esc(new Date(dueAt).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))}</p>
      ${session.written?`<details><summary>Мой письменный ответ</summary><p lang="en">${esc(session.written)}</p></details>`:''}
      <div class="btn-row"><a class="btn" href="#review">Повторить фразы</a><a class="btn quiet" href="#lesson/${esc(id)}">Открыть урок</a><button class="btn outline" data-action="quick-restart">Попробовать ещё раз</button></div><div id="record-result"></div>
      <p class="note">Занятие и самооценка сохраняются в этом браузере. Аудио удалится после ухода с экрана.</p></section>` : '';
  return `<div class="quick-grid"><article class="panel quick-panel" tabindex="-1" aria-label="${session.completed?'Практика завершена':`Шаг ${step+1} из ${steps.length}: ${names[current]}`}">
    <div class="quick-steps" aria-label="Шаги практики">${steps.map((name,index)=>`<span class="quick-step ${index<step?'done':''} ${index===step?'current':''}" ${index===step?'aria-current="step"':''}>${index+1}. ${names[name]}</span>`).join('')}</div>
    ${session.completed?result:stage}
    ${!session.completed&&current!=='rate'?`<div class="btn-row" style="margin-top:24px"><button class="btn" data-action="quick-next" ${(session.reviewFirst&&current==='recall'&&!session.retrievalRating)||(current==='followup'&&!session.transferRating)?'disabled':''}>${current==='recall'?(session.reviewFirst?'Сравнить с образцом →':'Я ответил вслух →'):'Дальше →'}</button></div>`:''}
  </article><aside class="panel"><p class="eyebrow">ЛИЧНЫЙ МАРШРУТ</p><h3>${esc(lesson.title)}</h3><p>${esc(lesson.goal)}</p>
    <p class="note">Режим ${mode} мин: ${mode===2?'слушай, повтори, ответь':mode===5?'добавь письменный ответ':'добавь письменный ответ и разговор из трёх реплик'}.</p>
    <div class="quick-modes" role="group" aria-label="Длительность практики">${[2,5,10].map(value=>`<a class="btn quiet" href="#quick/${esc(id)}/${value}" ${value===mode?'aria-current="page"':''}>${value} мин</a>`).join('')}</div>
    <p class="note">Для закрепления вернись к ответу после паузы. При следующем открытии тренажёр покажет, что пора повторить.</p></aside></div>`;
}

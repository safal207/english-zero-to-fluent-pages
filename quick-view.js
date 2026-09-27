const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const play = text => `<button class="sound" data-action="sound" data-text="${esc(text)}" aria-label="Прослушать: ${esc(text)}" title="Прослушать">▶</button>`;
const names = {listen:'Послушай',repeat:'Повтори',recall:'Ответь без текста',write:'Напиши ответ',transfer:'Примени в ситуации',rate:'Оцени попытку'};

export function quickMarkup(lesson, session, rate, dueAt) {
  const {mode,steps,step,id} = session;
  const current = steps[step];
  const chunks = lesson.model.split(/(?<=[.!?])\s+/).filter(Boolean);
  const speed = [0.72, 0.88, 1].map(value => `<button class="btn quiet" data-action="quick-speed" data-rate="${value}" aria-pressed="${rate===value}">${value===0.72?'Медленно':value===1?'Обычно':'Спокойно'}</button>`).join('');
  const stage = current === 'listen' ? `
    <p class="eyebrow">СЛУШАЙ И ЗАМЕЧАЙ</p><h2>Один разговор. Один полезный ответ.</h2>
    <div class="quick-prompt"><small>Собеседник</small><p lang="en">${esc(lesson.partner)}</p>${play(lesson.partner)}</div>
    <div class="quick-line"><small>Возможный ответ</small><p lang="en">${esc(lesson.model)}</p>${play(lesson.model)}</div>
    <p class="quick-cue">Прослушай ответ. Можно выбрать более медленный темп. Голос зависит от устройства.</p>
    <div class="btn-row quick-modes" role="group" aria-label="Темп озвучки">${speed}</div>`
  : current === 'repeat' ? `
    <p class="eyebrow">ПРОИЗНЕСИ ПО ЧАСТЯМ</p><h2>Скажи сначала с опорой</h2>
    <div class="quick-line" lang="en">${chunks.map((chunk,index)=>`<p><small>${index+1}</small> ${esc(chunk)} ${play(chunk)}</p>`).join('')}</div>
    <p class="quick-cue">Повтори каждую часть, затем скажи ответ целиком. Не нужно звучать идеально.</p>
    <div class="btn-row">${play(lesson.model)} <span class="muted">Прослушать целиком</span></div>`
  : current === 'recall' ? `
    <p class="eyebrow">ИЗВЛЕЧЬ ИЗ ПАМЯТИ</p><h2>Ответь без текста</h2>
    <div class="quick-prompt"><small>Собеседник</small><p lang="en">${esc(lesson.partner)}</p>${play(lesson.partner)}</div>
    <p class="quick-cue">Закрой образец и ответь своими словами. Замени хотя бы одну деталь на свою. Если трудно, открой подсказку и попробуй ещё раз.</p>
    <button class="btn quiet" data-action="quick-hint" ${session.hint?'hidden':''}>Показать подсказку</button>
    <div class="quick-line" id="quick-hint" tabindex="-1" ${session.hint?'':'hidden'}><small>Опора, не оценка твоего ответа</small><p lang="en">${esc(lesson.model)}</p></div>
    <div class="divider"></div><h3>Можно записать себя</h3>
    <p class="note">Микрофон необязателен. Запись остаётся только в этой вкладке до ухода с экрана.</p>
    <div class="btn-row"><button class="btn outline" data-action="record" id="record-button">● Записать ответ</button><span id="record-status" role="status"></span></div><div id="record-result"></div>`
  : current === 'write' ? `
    <p class="eyebrow">ИСПОЛЬЗУЙ В КОНТЕКСТЕ</p><h2>Напиши свой ответ</h2>
    <div class="quick-prompt"><small>Собеседник</small><p lang="en">${esc(lesson.partner)}</p></div>
    <label for="quick-written" class="note">Короткий ответ по-английски. Возьми одну полезную фразу и добавь свою деталь.</label>
    <textarea id="quick-written" class="quick-answer" rows="4" lang="en" autocapitalize="sentences" spellcheck="false">${esc(session.written || '')}</textarea>
    <div class="quick-cue">${lesson.phrases.slice(0,2).map(phrase=>`<span lang="en">${esc(phrase.en)}</span>`).join(' · ')}</div>
    <p class="note">Текст остаётся в текущем занятии. Приложение не проверяет его правильность автоматически.</p>`
  : current === 'transfer' ? `
    <p class="eyebrow">ПРИМЕНИ В НОВОЙ СИТУАЦИИ</p><h2>Скажи иначе</h2>
    <div class="quick-prompt"><small>Задача</small><p>${esc(lesson.speaking)}</p></div>
    <p class="quick-cue">Произнеси новый ответ без чтения. Используй одну знакомую фразу и измени детали под себя.</p>
    ${session.written?`<details><summary>Мой письменный ответ</summary><p lang="en">${esc(session.written)}</p></details>`:''}`
  : `<p class="eyebrow">ТВОЯ ОЦЕНКА</p><h2>Что получилось?</h2>
    <p>Вспомни ответ на вопрос <span lang="en">${esc(lesson.partner)}</span>. Оцени именно последнюю устную попытку.</p>
    <div class="quick-feedback" role="group" aria-label="Самооценка ответа">
      <button class="btn" data-action="quick-rate" data-rating="independent">Сказал без текста</button>
      <button class="btn quiet" data-action="quick-rate" data-rating="assisted">Понадобилась подсказка</button>
      <button class="btn quiet" data-action="quick-rate" data-rating="again">Пока не получилось</button>
    </div><p class="note">Это самооценка, а не автоматическая проверка произношения или уровня.</p>`;
  const result = session.completed ? `<section class="panel quick-result"><p class="eyebrow">ПОПЫТКА СОХРАНЕНА</p><h2>${session.rating==='independent'?'Ты ответил без текста.':'Ты сделал попытку.'}</h2>
      <p>${session.rating==='independent'?'Следующий шаг — вспомнить ответ в другой день.':'Мы вернёмся к этой ситуации. Подсказку можно использовать столько раз, сколько нужно.'}</p>
      <p class="quick-due">Следующая самопроверка: ${esc(new Date(dueAt).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))}</p>
      ${session.written?`<details><summary>Мой письменный ответ</summary><p lang="en">${esc(session.written)}</p></details>`:''}
      <div class="btn-row"><a class="btn" href="#review">Повторить фразы</a><a class="btn quiet" href="#lesson/${esc(id)}">Открыть урок</a><button class="btn outline" data-action="quick-restart">Попробовать ещё раз</button></div>
      <p class="note">Занятие и самооценка сохраняются в этом браузере. Аудио удалится после ухода с экрана.</p></section>` : '';
  return `<div class="quick-grid"><article class="panel quick-panel" tabindex="-1" aria-label="${session.completed?'Практика завершена':`Шаг ${step+1} из ${steps.length}: ${names[current]}`}">
    <div class="quick-steps" aria-label="Шаги практики">${steps.map((name,index)=>`<span class="quick-step ${index<step?'done':''} ${index===step?'current':''}" ${index===step?'aria-current="step"':''}>${index+1}. ${names[name]}</span>`).join('')}</div>
    ${session.completed?result:stage}
    ${!session.completed&&current!=='rate'?`<div class="btn-row" style="margin-top:24px"><button class="btn" data-action="quick-next">${current==='recall'?'Я ответил вслух →':'Дальше →'}</button></div>`:''}
  </article><aside class="panel"><p class="eyebrow">ЛИЧНЫЙ МАРШРУТ</p><h3>${esc(lesson.title)}</h3><p>${esc(lesson.goal)}</p>
    <p class="note">Режим ${mode} мин: ${mode===2?'слушай, повтори, ответь':mode===5?'добавь письменный ответ':'добавь письменный ответ и новую ситуацию'}.</p>
    <div class="quick-modes" role="group" aria-label="Длительность практики">${[2,5,10].map(value=>`<a class="btn quiet" href="#quick/${esc(id)}/${value}" ${value===mode?'aria-current="page"':''}>${value} мин</a>`).join('')}</div>
    <p class="note">Для закрепления вернись к ответу после паузы. При следующем открытии тренажёр покажет, что пора повторить.</p></aside></div>`;
}

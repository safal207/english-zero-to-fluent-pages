import {dialoguePrompt,MAX_PHRASES_PER_ADD,normalizeSourceUrl,personalDialogueDue} from './personal.js';
import {DAY,MAX_PERSONAL_PHRASES} from './core.js';

const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const expressionCount = count => count % 100 >= 11 && count % 100 <= 14 ? 'выражений' : count % 10 === 1 ? 'выражение' : count % 10 >= 2 && count % 10 <= 4 ? 'выражения' : 'выражений';
const sourceLink=phrase=>{const url=normalizeSourceUrl(phrase?.sourceUrl);return url?`<a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Открыть исходный материал ↗</a>`:'';};

export function contextMarkup(phrases, session, now = Date.now()) {
  const fresh = phrases.filter(phrase => phrase.reviews === 0).sort((a,b)=>Number(personalDialogueDue(b,now))-Number(personalDialogueDue(a,now))||a.createdAt-b.createdAt);
  const first=fresh[0];
  const source = first?.source;
  const group = fresh.filter(phrase => phrase.createdAt===first?.createdAt&&phrase.source===source&&phrase.sourceUrl===first?.sourceUrl).slice(0,MAX_PHRASES_PER_ADD);
  const dialogueDue=Boolean(first&&personalDialogueDue(first,now));
  const due = phrases.filter(phrase => phrase.reviews > 0 && phrase.due <= now).sort((a,b)=>a.due-b.due)[0];
  const future = phrases.filter(phrase => phrase.reviews > 0 && phrase.due > now).sort((a,b)=>a.due-b.due)[0];
  const prompt = dialoguePrompt(group);
  const practice = due ? `<section class="panel context-card context-practice" tabindex="-1" aria-label="Повторение своей фразы"><p class="eyebrow">ВСПОМНИ ПОСЛЕ ПАУЗЫ</p><h2>Вспомни фразу из своего материала</h2>
    <p class="muted">${esc(due.source)} · вернись к исходному фрагменту после ответа.</p>
    <div class="quick-prompt"><small>Как сказать по-английски?</small><p>${esc(due.ru)}</p></div>
    <div class="quick-line" id="context-answer" ${session.reviewId===due.id&&session.revealed?'':'hidden'}><strong lang="en">${esc(due.en)}</strong></div>
    ${session.reviewId===due.id&&session.revealed?`<div class="quick-feedback" role="group" aria-label="Оцени, удалось ли вспомнить"><button class="btn quiet" data-action="context-rate" data-grade="again" data-id="${esc(due.id)}">Не вспомнил</button><button class="btn quiet" data-action="context-rate" data-grade="hard" data-id="${esc(due.id)}">С подсказкой</button><button class="btn" data-action="context-rate" data-grade="good" data-id="${esc(due.id)}">Вспомнил сам</button></div>`:`<button class="btn outline" data-action="context-reveal" data-id="${esc(due.id)}">Показать ответ</button>`}
    <p class="note">Оцени воспроизведение по памяти. Затем произнеси слово или фразу в своём предложении.</p>${session.reviewId===due.id&&session.revealed?sourceLink(due):''}</section>` : future ? `<section class="panel context-card context-future" tabindex="-1" aria-label="Следующее повторение"><h2>Следующее возвращение к материалу</h2><p>${esc(new Date(future.due).toLocaleString('ru-RU',{day:'numeric',month:'long'}))}: попробуй вспомнить фразы и пересмотреть исходный фрагмент.</p></section>` : '';
  const dialogue = group.length ? `<section class="panel context-card context-dialogue" tabindex="-1" aria-label="Диалог с личными фразами"><p class="eyebrow">${dialogueDue?'ДИАЛОГ ПОСЛЕ ПАУЗЫ':'ЗАДАНИЕ НА ЗАВТРА'}</p><h2>${dialogueDue?'Используй слова в диалоге':'Подготовь диалог на завтра'}</h2>
    <p>Выбрано ${group.length} ${expressionCount(group.length)} из «${esc(source)}». ${dialogueDue?'Вспомни их перед разговором. Проведи короткий диалог самостоятельно или с ChatGPT и проговори ответы вслух.':'Задание уже можно посмотреть и потренироваться. Завершённым диалог станет после паузы в один день.'}</p>
    ${sourceLink(group[0])}
    <label for="context-prompt" class="note">Готовое задание для внешнего чата</label><textarea id="context-prompt" class="context-prompt" rows="6" readonly>${esc(prompt)}</textarea>
    <div class="btn-row"><button class="btn outline" data-action="context-copy">Скопировать задание</button><a class="btn quiet" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Открыть ChatGPT ↗</a></div>
    <p class="note">Сайт сам ничего не отправляет в ChatGPT. Текст попадёт туда только если ты его вставишь. Ответы ИИ могут ошибаться.</p>
    ${dialogueDue?'':`<p class="note">Отметка откроется ${esc(new Date(group[0].createdAt+DAY).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}))}.</p>`}
    <div class="checklist"><label><input id="context-spoken" type="checkbox"${dialogueDue?'':' disabled'}> Я использовал(а) фразы в диалоге и проговорил(а) ответы вслух.</label></div>
    <button class="btn" data-action="context-done" data-id="${esc(group[0].id)}" id="context-done" disabled>Назначить повторение через 2 дня</button></section>` : '';
  const form = `<section class="panel context-card context-form" tabindex="-1" aria-label="Добавить свои фразы"><p class="eyebrow">ИЗ ИНТЕРЕСНОГО МАТЕРИАЛА</p><h2>Добавь свои фразы</h2>
    <p>Возьми слова или короткие выражения из видео, подкаста или текста. Запиши перевод своими словами. Можно начать с трёх; добавляй до ${MAX_PHRASES_PER_ADD} за раз.</p>
    <label class="context-label" for="context-source">Название материала<input id="context-source" type="text" maxlength="160" placeholder="Например: видео о поездке"></label>
    <label class="context-label" for="context-source-url">Ссылка на материал (необязательно)<input id="context-source-url" type="url" maxlength="500" inputmode="url" placeholder="https://example.com/video"></label>
    <label class="context-label" for="context-lines">Каждая строка: English | перевод<textarea id="context-lines" rows="5" maxlength="5000" placeholder="take a break | сделать перерыв&#10;make a plan | составить план"></textarea></label>
    <button class="btn" data-action="context-add">Сохранить фразы</button><p class="note">Фразы хранятся в этом браузере и входят в резервную копию. Не вставляй полный чужой текст.</p></section>`;
  const list = phrases.length ? `<details class="panel context-card"><summary>Мои фразы · ${phrases.length}</summary><div class="context-list">${phrases.map(phrase=>`<div class="vocab-row"><div><strong>${esc(phrase.ru)}</strong><small>${esc(phrase.source)} · ${phrase.reviews?'в повторении':personalDialogueDue(phrase,now)?'диалог сегодня':'диалог после паузы'}</small></div><button class="btn quiet small" data-action="context-remove" data-id="${esc(phrase.id)}" aria-label="Удалить фразу ${esc(phrase.ru)}">Удалить</button></div>`).join('')}</div></details>` : '';
  return `<div class="context-layout"><div>${practice}${dialogue}${form}${list}</div><aside class="panel"><p class="eyebrow">ЦИКЛ ЗАКРЕПЛЕНИЯ</p><h3>Источник → пауза → диалог → воспоминание</h3>
    <p class="note">Сегодня выбери короткие фразы из интересного материала. На следующий день используй их в диалоге вслух. Через 2–3 дня попробуй вспомнить без подсказки и вернись к исходному материалу.</p>
    <p class="note">Сохранено фраз: ${phrases.length}/${MAX_PERSONAL_PHRASES}. Сегодня к диалогу: ${phrases.filter(phrase=>personalDialogueDue(phrase,now)).length}; к самопроверке: ${phrases.filter(phrase=>phrase.reviews>0&&phrase.due<=now).length}.</p>
    <a class="text-link" href="#today">К плану на сегодня ↗</a></aside></div>`;
}

import {DAY, MAX_PERSONAL_PHRASES, normalizeSourceUrl, scheduleCard} from './core.js';
export const MAX_PHRASES_PER_ADD=20;
export {normalizeSourceUrl};

export function parsePersonalPhrases(sourceInput, linesInput, existingIds, now = Date.now(), sourceUrlInput = '') {
  const source = String(sourceInput).trim();
  const sourceUrl=normalizeSourceUrl(sourceUrlInput);
  const lines = String(linesInput).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const errors = [];
  if (!source || source.length > 160) errors.push('Укажи название материала длиной до 160 символов.');
  if (sourceUrl===null) errors.push('Укажи ссылку на материал с http:// или https://, длиной до 500 символов, без логина и пароля.');
  if (!lines.length) errors.push('Добавь хотя бы одну фразу.');
  if (lines.length > MAX_PHRASES_PER_ADD) errors.push('Добавляй до 20 фраз из одного материала за раз.');
  if (existingIds.size + lines.length > MAX_PERSONAL_PHRASES) errors.push('Хранилище личных фраз заполнено. Скачай резервную копию и удали ненужные фразы.');
  if (errors.length) return {phrases: [], errors};
  const phrases = [];
  const newIds=new Set(existingIds);
  for (const [index, line] of lines.entries()) {
    const divider = line.indexOf('|');
    const en = divider < 0 ? '' : line.slice(0, divider).trim();
    const ru = divider < 0 ? '' : line.slice(divider + 1).trim();
    if (!en || !ru || en.length > 120 || ru.length > 120) {
      errors.push(`Строка ${index + 1}: напиши English | перевод, до 120 символов в каждой части.`);
      continue;
    }
    let suffix = 0;
    let id;
    do { id = `personal-${now.toString(36)}-${index.toString(36)}-${suffix.toString(36)}`; suffix++; }
    while (newIds.has(id));
    newIds.add(id);
    phrases.push({id, source, sourceUrl, en, ru, createdAt:now, due:now+DAY, interval:0, reviews:0});
  }
  if(errors.length)return {phrases: [], errors};
  for(const phrase of phrases)existingIds.add(phrase.id);
  return {phrases, errors: []};
}

export function personalDialogueDue(phrase, now = Date.now()) {
  return phrase?.reviews===0&&Number.isFinite(phrase.createdAt)&&now>=phrase.createdAt+DAY;
}

export function dialoguePrompt(phrases) {
  if (!phrases.length) return '';
  const source = phrases[0].source;
  return `Я изучаю английский. Я выбрал(а) эти слова и фразы из материала «${source}»: ${phrases.map(phrase => phrase.en).join('; ')}. Веди со мной короткий диалог на английском об этом материале. Используй фразы естественно, задавай по одному вопросу за раз и дай мне ответить. После 4–5 реплик покажи одну самую полезную правку, попроси меня сказать исправленный ответ своими словами и предложи вернуться к материалу через 2–3 дня.`;
}

export function markDialogueDone(phrase, now = Date.now()) {
  if(!personalDialogueDue(phrase,now))throw new Error('Диалог можно отметить со следующего дня.');
  return {...phrase, due:now + 2 * DAY, interval:2, reviews:Math.min(100000, phrase.reviews + 1)};
}

export function ratePersonalPhrase(phrase, grade, now = Date.now()) {
  return {...phrase, ...scheduleCard(phrase, grade, now)};
}

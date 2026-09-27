import {scheduleCard} from './core.js';

export const QUICK_MODES = [2, 5, 10];

export function quickSteps(mode, reviewFirst = false) {
  const minutes = QUICK_MODES.includes(Number(mode)) ? Number(mode) : 2;
  return reviewFirst
    ? ['recall', 'listen', 'repeat', ...(minutes >= 5 ? ['write'] : []), ...(minutes >= 10 ? ['transfer', 'followup'] : []), 'rate']
    : ['listen', 'repeat', 'recall', ...(minutes >= 5 ? ['write'] : []), ...(minutes >= 10 ? ['transfer', 'followup'] : []), 'rate'];
}

export function resumeQuickSession(id, mode, source = null, due = false) {
  const reviewFirst = Boolean(source?.reviewFirst || due);
  const steps = quickSteps(mode, reviewFirst);
  const sameOrder = Boolean(source && source.reviewFirst === reviewFirst);
  let step = 0;
  if (sameOrder) {
    const oldSteps = source.steps || quickSteps(source.mode, source.reviewFirst);
    if (oldSteps[source.step] === 'rate' && steps.length > oldSteps.length) {
      step = steps.findIndex(name => !oldSteps.includes(name));
    } else {
      for (let index = source.step; index >= 0; index--) {
        const match = steps.indexOf(oldSteps[index]);
        if (match >= 0) { step = match; break; }
      }
    }
  }
  return {
    id, mode, steps,
    step,
    hint: sameOrder ? source.hint : false,
    hintUsed: sameOrder ? source.hintUsed : false,
    written: source?.written ?? '',
    reviewFirst,
    retrievalRating: sameOrder ? source.retrievalRating : null,
    retrievalRatedAt: sameOrder ? source.retrievalRatedAt ?? null : null,
    transferRating: sameOrder ? source.transferRating ?? null : null,
    completed: false,
    rating: null
  };
}

export function selectFocus(state, lessons, now = Date.now()) {
  const known = new Set(lessons.map(lesson => lesson.id));
  const practice = state.practice || {};
  const completed = state.completed || {};
  const due = Object.entries(practice)
    .filter(([id, attempt]) => known.has(id) && attempt.due <= now)
    .sort((a, b) => a[1].due - b[1].due)[0];
  if (due) return {id: due[0], reason: 'due'};
  const current = lessons.filter(lesson => lesson.level === state.level);
  const selected = current.length ? current : lessons;
  const next = selected.find(lesson => !completed[lesson.id] && !practice[lesson.id]?.independent);
  if (next) {
    const firstAttempt = !Object.keys(completed).length && !Object.keys(practice).length;
    return {id: next.id, reason: firstAttempt ? 'start' : practice[next.id] ? 'repeat' : 'next'};
  }
  const repeat = selected.filter(lesson => practice[lesson.id])
    .sort((a, b) => practice[a.id].due - practice[b.id].due)[0];
  return {id: repeat?.id || selected[0]?.id, reason: 'repeat'};
}

export function recordPractice(previous, rating, now = Date.now()) {
  const grade = {independent: 'good', assisted: 'hard', again: 'again'}[rating];
  if (!grade) throw new Error('Unknown practice rating');
  const scheduled = scheduleCard(previous, grade, now);
  return {
    ...scheduled,
    assisted: Math.min(100000, (previous?.assisted || 0) + Number(rating === 'assisted')),
    independent: Math.min(100000, (previous?.independent || 0) + Number(rating === 'independent')),
    lastAt: now,
    firstIndependentAt: previous?.firstIndependentAt ?? (rating === 'independent' ? now : null)
  };
}

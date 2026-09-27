import {scheduleCard} from './core.js';

export const QUICK_MODES = [2, 5, 10];

export function quickSteps(mode) {
  const minutes = QUICK_MODES.includes(Number(mode)) ? Number(mode) : 2;
  return ['listen', 'repeat', 'recall', ...(minutes >= 5 ? ['write'] : []), ...(minutes >= 10 ? ['transfer'] : []), 'rate'];
}

export function selectFocus(state, lessons, now = Date.now()) {
  const known = new Set(lessons.map(lesson => lesson.id));
  const due = Object.entries(state.practice || {})
    .filter(([id, attempt]) => known.has(id) && attempt.due <= now)
    .sort((a, b) => a[1].due - b[1].due)[0];
  if (due) return {id: due[0], reason: 'due'};
  if (!Object.keys(state.completed || {}).length && !Object.keys(state.practice || {}).length && known.has('a0-1')) {
    return {id: 'a0-1', reason: 'start'};
  }
  const current = lessons.filter(lesson => lesson.level === state.level);
  const next = current.find(lesson => !state.completed?.[lesson.id]);
  return next ? {id: next.id, reason: 'next'} : {id: current[0]?.id || lessons[0]?.id, reason: 'repeat'};
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

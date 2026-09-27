export const MAX_ATTEMPTS = 300;

const ATTEMPT_KEYS = ['id', 'at', 'kind', 'rating', 'elapsedSeconds', 'delayHours'];
const KINDS = new Set(['new', 'review', 'transfer', 'dialogue']);
const RATINGS = new Set(['independent', 'assisted', 'again']);
const LESSON_ID = /^(?:a0|a1|a2|b1|b2|c1|c2)-[1-6]$/;
const integerBetween = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

/** Return the allowed, text-free event shape or null for an invalid event. */
export function validAttempt(event, lessonIds = null) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return null;
  if (Object.keys(event).length !== ATTEMPT_KEYS.length || !ATTEMPT_KEYS.every(key => Object.hasOwn(event, key))) return null;
  if (typeof event.id !== 'string' || !LESSON_ID.test(event.id) || (lessonIds && !lessonIds.has(event.id))) return null;
  if (!integerBetween(event.at, 0, 9999999999999) || !KINDS.has(event.kind) || !RATINGS.has(event.rating)) return null;
  if (event.elapsedSeconds !== null && !integerBetween(event.elapsedSeconds, 1, 300)) return null;
  if (event.delayHours !== null && !integerBetween(event.delayHours, 0, 87600)) return null;
  return {
    id: event.id, at: event.at, kind: event.kind, rating: event.rating,
    elapsedSeconds: event.elapsedSeconds, delayHours: event.delayHours
  };
}

/** Keep the newest 300 attempts. The stored event cannot contain spoken text or source material. */
export function appendAttempt(attempts, event) {
  const clean = validAttempt(event);
  if (!clean) throw new Error('Invalid learning attempt');
  const previous = (Array.isArray(attempts) ? attempts : []).map(item => validAttempt(item)).filter(Boolean);
  return [...previous.slice(-(MAX_ATTEMPTS - 1)), clean];
}

function fraction(events) {
  const total = events.length;
  const independent = events.filter(event => event.rating === 'independent').length;
  return {independent, total, rate: total ? independent / total : null};
}

/** Counts are self-reported local practice, not a measured learning effect. */
export function summarizeAttempts(attempts, practice, now = Date.now()) {
  const clean = (Array.isArray(attempts) ? attempts : []).map(event => validAttempt(event)).filter(Boolean).slice(-MAX_ATTEMPTS);
  const delayedRecall = fraction(clean.filter(event => event.kind === 'review' && event.delayHours !== null && event.delayHours >= 48));
  const transfer = fraction(clean.filter(event => event.kind === 'transfer'));
  const times = clean.filter(event => ['new', 'review'].includes(event.kind) && event.rating !== 'again' && event.elapsedSeconds !== null)
    .map(event => event.elapsedSeconds).sort((a, b) => a - b);
  const middle = Math.floor(times.length / 2);
  const medianResponseSeconds = !times.length ? null : times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
  const overdueCount = Object.values(practice && typeof practice === 'object' && !Array.isArray(practice) ? practice : {})
    .filter(entry => entry && Number.isFinite(entry.due) && entry.due <= now).length;
  return {delayedRecall, transfer, medianResponseSeconds, overdueCount};
}

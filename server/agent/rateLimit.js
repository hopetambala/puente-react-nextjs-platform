/**
 * In-memory sliding-window rate limiter (cost control for the agent).
 * Suitable for a single-process deployment; swap for a shared store if the
 * app is ever horizontally scaled.
 */
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

let requestLog = new Map();

const checkRateLimit = (userId, now = Date.now()) => {
  const cutoff = now - WINDOW_MS;

  // Sweep every user's expired timestamps and drop those with none left, so
  // the map is bounded by users active within the window — not everyone ever.
  requestLog.forEach((stamps, id) => {
    const live = stamps.filter((t) => t > cutoff);
    if (live.length === 0) requestLog.delete(id);
    else requestLog.set(id, live);
  });

  const timestamps = requestLog.get(userId) || [];
  if (timestamps.length >= MAX_REQUESTS) {
    return false;
  }
  timestamps.push(now);
  requestLog.set(userId, timestamps);
  return true;
};

const resetRateLimits = () => {
  requestLog = new Map();
};

// Number of users currently held in memory (inspection / monitoring).
const trackedUsers = () => requestLog.size;

export { checkRateLimit, resetRateLimits, trackedUsers };
export default checkRateLimit;

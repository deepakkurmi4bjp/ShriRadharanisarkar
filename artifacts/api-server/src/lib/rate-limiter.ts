interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const attempts = new Map<string, AttemptRecord>();

export function checkRateLimit(key: string): { allowed: boolean; remainingMs?: number; attemptsLeft?: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record) {
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
  }

  if (record.lockedUntil && now < record.lockedUntil) {
    return { allowed: false, remainingMs: record.lockedUntil - now };
  }

  if (record.lockedUntil && now >= record.lockedUntil) {
    attempts.delete(key);
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(key);
    return { allowed: true, attemptsLeft: MAX_ATTEMPTS };
  }

  return { allowed: true, attemptsLeft: MAX_ATTEMPTS - record.count };
}

export function recordFailedAttempt(key: string): { locked: boolean; attemptsLeft: number } {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - 1 };
  }

  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { locked: false, attemptsLeft: MAX_ATTEMPTS - 1 };
  }

  const newCount = record.count + 1;

  if (newCount >= MAX_ATTEMPTS) {
    attempts.set(key, { ...record, count: newCount, lockedUntil: now + LOCKOUT_MS });
    return { locked: true, attemptsLeft: 0 };
  }

  attempts.set(key, { ...record, count: newCount });
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - newCount };
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

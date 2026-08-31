/**
 * 로그인 시도 제한.
 *
 * 이 ERP 는 erp.kuda.synology.me 로 인터넷에 열려 있는데
 * 로그인 실패 횟수에 아무 제한이 없어 비밀번호를 무한히 시도할 수 있었다.
 *
 * 컨테이너 한 대만 돌아가므로 메모리에 둔다.
 * (여러 대로 늘리면 Redis 로 옮겨야 한다 — REDIS_URL 이 이미 있다)
 */

const WINDOW_MS = 15 * 60 * 1000; // 15분
const MAX_ATTEMPTS = 8; // 이 횟수를 넘기면 창이 끝날 때까지 막는다

type Attempt = { count: number; firstAt: number; blockedUntil?: number };

const attempts = new Map<string, Attempt>();

/** 메모리가 무한정 늘지 않도록 오래된 기록을 치운다 */
function sweep(now: number) {
  if (attempts.size < 500) return;

  for (const [key, value] of attempts) {
    const expired = now - value.firstAt > WINDOW_MS && (!value.blockedUntil || value.blockedUntil < now);
    if (expired) attempts.delete(key);
  }
}

export type ThrottleResult = { allowed: boolean; retryAfterSeconds: number };

/** 시도해도 되는지 확인만 한다 (횟수를 늘리지 않는다) */
export function checkLoginAllowed(key: string): ThrottleResult {
  const now = Date.now();
  sweep(now);

  const record = attempts.get(key);

  if (!record) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (record.blockedUntil && record.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000) };
  }

  // 창이 지났으면 초기화
  if (now - record.firstAt > WINDOW_MS) {
    attempts.delete(key);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** 로그인 실패를 기록한다 */
export function recordLoginFailure(key: string) {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }

  record.count += 1;

  if (record.count >= MAX_ATTEMPTS) {
    record.blockedUntil = now + WINDOW_MS;
  }
}

/** 로그인에 성공하면 기록을 지운다 */
export function clearLoginFailures(key: string) {
  attempts.delete(key);
}

/** 시도 주체를 식별한다. 프록시 뒤라 X-Forwarded-For 를 먼저 본다 */
export function loginThrottleKey(request: Request, email: string) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";

  return `${ip}::${email.toLowerCase()}`;
}

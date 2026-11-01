// In-memory daily caps for the public /api/llm demo endpoint.
// Single web container, so process memory is sufficient. Resets on restart (acceptable).
const DAY_MS = 24 * 60 * 60 * 1000;
const PER_IP_DAILY = Number(process.env.LLM_PER_IP_DAILY) || 20;
const GLOBAL_DAILY = Number(process.env.LLM_GLOBAL_DAILY) || 500;
const MAX_TRACKED_IPS = 10_000;

let windowStart = Date.now();
let globalCount = 0;
const perIp = new Map<string, number>();

function roll(now: number) {
  if (now - windowStart >= DAY_MS) {
    windowStart = now;
    globalCount = 0;
    perIp.clear();
  }
}

/** Caddy replaces X-Forwarded-For with the real client address, so the last entry is the one the proxy set. */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function checkLlmLimit(ip: string, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  roll(now);
  const retryAfterSec = Math.ceil((windowStart + DAY_MS - now) / 1000);
  const used = perIp.get(ip) ?? 0;
  if (used >= PER_IP_DAILY || globalCount >= GLOBAL_DAILY) return { ok: false, retryAfterSec };
  if (!perIp.has(ip) && perIp.size >= MAX_TRACKED_IPS) return { ok: false, retryAfterSec };
  perIp.set(ip, used + 1);
  globalCount += 1;
  return { ok: true, retryAfterSec };
}

import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

// Per-IP fixed-window limiter, in memory (single API container). Limits are deliberately
// generous: /decide may be called on every page view, and many visitors can share one NAT IP.
const WINDOW_MS = 60_000;
const LIMITS: Record<string, number> = {
  decide: Number(process.env.RATE_LIMIT_DECIDE_PER_MIN) || 1200,
  config: Number(process.env.RATE_LIMIT_CONFIG_PER_MIN) || 600,
};
const MAX_KEYS = 50_000;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private hits = new Map<string, { count: number; reset: number }>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const bucket = req.path.startsWith('/decide') ? 'decide' : req.path.startsWith('/config') ? 'config' : null;
    if (!bucket) return true;
    const now = Date.now();
    if (this.hits.size > MAX_KEYS) {
      for (const [k, v] of this.hits) if (v.reset <= now) this.hits.delete(k);
      if (this.hits.size > MAX_KEYS) this.hits.clear();
    }
    const key = `${bucket}:${req.ip}`;
    const entry = this.hits.get(key);
    if (!entry || entry.reset <= now) {
      this.hits.set(key, { count: 1, reset: now + WINDOW_MS });
      return true;
    }
    entry.count += 1;
    if (entry.count > LIMITS[bucket]) {
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}

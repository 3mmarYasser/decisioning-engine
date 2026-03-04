'use client';

import { useEffect, useState } from 'react';
import type { DecideResponse } from '@decisioning/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

function getReferrerDomain(): string {
  try {
    return document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    return '';
  }
}

interface CacheInfo {
  age: number | null;
  cacheControl: string | null;
  etag: string | null;
}

interface VisitorCtx {
  visitorId: string;
  country: string;
  language: string;
  deviceType: string;
  referrerDomain: string;
  marketing: boolean;
}

export default function LandingHero() {
  const [decision, setDecision] = useState<DecideResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitorCtx, setVisitorCtx] = useState<VisitorCtx | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [showContext, setShowContext] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const referrerDomain = getReferrerDomain();

    const ctx: VisitorCtx = {
      visitorId: 'demo-visitor-1',
      country: 'DE',
      language: 'de',
      deviceType: 'desktop',
      referrerDomain,
      marketing: true,
    };
    setVisitorCtx(ctx);

    // Fetch config to capture cache headers (Age, Cache-Control, ETag)
    fetch(`${apiUrl}/config/site-abc`, { signal: controller.signal })
      .then((r) => {
        const age = r.headers.get('age');
        setCacheInfo({
          age: age !== null ? parseInt(age, 10) : null,
          cacheControl: r.headers.get('cache-control'),
          etag: r.headers.get('etag'),
        });
      })
      .catch(() => {});

    fetch(`${apiUrl}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: 'site-abc',
        url: window.location.href,
        visitor: {
          visitorId: ctx.visitorId,
          country: ctx.country,
          language: ctx.language,
          deviceType: ctx.deviceType,
          referrerDomain: ctx.referrerDomain,
        },
        consent: { marketing: ctx.marketing },
      }),
      signal: controller.signal,
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
      .then((data) => { setDecision(data); setLoading(false); })
      .catch((err) => { if (err.name !== 'AbortError') setLoading(false); });

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground"
          role="status"
          aria-label="Loading decision"
        />
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-2 text-center">
        <p className="text-muted-foreground">Could not reach the API.</p>
        <p className="text-sm text-muted-foreground/60">Make sure the NestJS server is running on port 4000.</p>
      </div>
    );
  }

  const isStale = cacheInfo?.age !== null && cacheInfo?.age !== undefined && cacheInfo.age > 60;

  return (
    <div className="mx-auto max-w-screen-xl px-6">
      {/* Hero */}
      <section className="flex flex-col items-center py-24 text-center">
        <Badge variant="outline" className="mb-6 font-mono text-xs">
          {decision.variantId} &middot; v{decision.configVersion}
        </Badge>

        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {decision.headline}
        </h1>

        <p className="mt-4 max-w-lg text-base text-muted-foreground">
          This headline was chosen in real-time by the rule engine based on your visitor context
          and consent flags. No rebuild required.
        </p>

        <div className="mt-8 flex items-center gap-3">
          <Link href="/admin">
            <Button className="gap-1.5">
              Open Playground <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/docs`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">API Reference</Button>
          </a>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          {Object.entries(decision.flags).map(([flag, on]) => (
            <Badge key={flag} variant={on ? 'success' : 'secondary'} className="text-xs">
              {flag}
            </Badge>
          ))}
        </div>

        {/* Cache status */}
        {cacheInfo && (
          <div className="mt-5 flex items-center gap-2">
            {isStale ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Stale config in use ({cacheInfo.age}s old) — revalidating in background
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
                {cacheInfo.age !== null
                  ? `cache age ${cacheInfo.age}s`
                  : 'max-age 60s · CDN 300s · swr 60s'}
                {cacheInfo.etag && (
                  <span className="opacity-60">&nbsp;· etag {cacheInfo.etag.slice(0, 10)}…</span>
                )}
              </span>
            )}
          </div>
        )}

        {/* Visitor context summary */}
        {visitorCtx && (
          <div className="mt-4 w-full max-w-sm">
            <button
              type="button"
              onClick={() => setShowContext((v) => !v)}
              className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              {showContext ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showContext ? 'Hide' : 'Show'} context sent to /decide
            </button>

            {showContext && (
              <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2.5 text-left font-mono text-[11px] text-muted-foreground">
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {(
                    [
                      ['visitorId', visitorCtx.visitorId],
                      ['country', visitorCtx.country],
                      ['language', visitorCtx.language],
                      ['deviceType', visitorCtx.deviceType],
                      ['referrerDomain', visitorCtx.referrerDomain || '(none)'],
                      ['marketing', String(visitorCtx.marketing)],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <div key={k} className="contents">
                      <span className="text-muted-foreground/60">{k}</span>
                      <span className="truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t py-16">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Configure rules',
              desc: 'Define conditions (country, device, referrer) and map them to variants with a priority order.',
            },
            {
              step: '02',
              title: 'Evaluate at the edge',
              desc: 'POST visitor context to /decide. The engine evaluates rules in priority order and returns the first match.',
            },
            {
              step: '03',
              title: 'Respect consent',
              desc: 'When marketing=false, PII is stripped before evaluation. Only safe fields influence the decision.',
            },
          ].map((item) => (
            <div key={item.step}>
              <span className="text-xs font-medium text-muted-foreground">{item.step}</span>
              <h3 className="mt-1 font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

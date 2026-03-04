'use client';

import { useEffect, useState } from 'react';
import type { DecideResponse } from '@decisioning/shared-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

function getReferrerDomain(): string {
  try {
    return document.referrer ? new URL(document.referrer).hostname : '';
  } catch {
    return '';
  }
}

export default function LandingHero() {
  const [decision, setDecision] = useState<DecideResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    fetch(`${apiUrl}/decide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: 'site-abc',
        url: window.location.href,
        visitor: {
          visitorId: 'demo-visitor-1',
          country: 'DE',
          language: 'de',
          deviceType: 'desktop',
          referrerDomain: getReferrerDomain(),
        },
        consent: { marketing: true },
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
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
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
          <a href="http://localhost:4000/api/docs" target="_blank" rel="noopener noreferrer">
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

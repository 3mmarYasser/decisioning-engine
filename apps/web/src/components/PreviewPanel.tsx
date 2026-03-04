'use client';

import { useCallback, useState } from 'react';
import type { DecideResponse, DecideRequest } from '@decisioning/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import CopyAssistant from './CopyAssistant';

interface PresetVisitor {
  label: string;
  visitor: DecideRequest['visitor'];
  consent: DecideRequest['consent'];
}

const PRESET_VISITORS: PresetVisitor[] = [
  {
    label: 'German mobile user',
    visitor: { visitorId: 'v-de-mobile', country: 'DE', language: 'de', deviceType: 'mobile', referrerDomain: '' },
    consent: { marketing: true },
  },
  {
    label: 'US desktop from Google',
    visitor: { visitorId: 'v-us-google', country: 'US', language: 'en', deviceType: 'desktop', referrerDomain: 'google.com' },
    consent: { marketing: true },
  },
  {
    label: 'UK tablet — no marketing consent',
    visitor: { visitorId: 'v-uk-tablet', country: 'GB', language: 'en', deviceType: 'tablet', referrerDomain: '' },
    consent: { marketing: false },
  },
];

type SentContext = DecideRequest['visitor'] & { marketing: boolean };

export default function PreviewPanel() {
  const [overrides, setOverrides] = useState({ country: '', deviceType: '', referrerDomain: '' });
  const [results, setResults] = useState<Record<string, DecideResponse | null>>({});
  const [sentContexts, setSentContexts] = useState<Record<string, SentContext>>({});
  const [expandedCtx, setExpandedCtx] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const runDecisions = useCallback(async () => {
    setLoading(true);
    setExpandedCtx(null);
    const newResults: Record<string, DecideResponse | null> = {};
    const newContexts: Record<string, SentContext> = {};

    await Promise.all(
      PRESET_VISITORS.map(async (preset) => {
        const visitor = { ...preset.visitor };
        if (overrides.country) visitor.country = overrides.country;
        if (overrides.deviceType) visitor.deviceType = overrides.deviceType;
        if (overrides.referrerDomain) visitor.referrerDomain = overrides.referrerDomain;

        newContexts[preset.label] = { ...visitor, marketing: preset.consent.marketing };

        try {
          const res = await fetch(`${apiUrl}/decide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              siteId: 'site-abc',
              url: 'https://example.com/playground',
              visitor,
              consent: preset.consent,
            }),
          });
          if (!res.ok) throw new Error(`${res.status}`);
          newResults[preset.label] = await res.json();
        } catch {
          newResults[preset.label] = null;
        }
      }),
    );

    setResults(newResults);
    setSentContexts(newContexts);
    setLoading(false);
    setHasRun(true);
  }, [overrides, apiUrl]);

  return (
    <div className="mx-auto max-w-screen-xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test the rule engine against preset visitors. Override context fields to see how decisions change.
        </p>
      </div>

      {/* Controls bar */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="w-40">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Country</label>
            <Select
              value={overrides.country}
              onValueChange={(v) => setOverrides((o) => ({ ...o, country: v === '_preset' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_preset">Use preset</SelectItem>
                <SelectItem value="DE">Germany (DE)</SelectItem>
                <SelectItem value="US">United States (US)</SelectItem>
                <SelectItem value="GB">United Kingdom (GB)</SelectItem>
                <SelectItem value="FR">France (FR)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Device</label>
            <Select
              value={overrides.deviceType}
              onValueChange={(v) => setOverrides((o) => ({ ...o, deviceType: v === '_preset' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_preset">Use preset</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <label htmlFor="ref-domain" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Referrer domain
            </label>
            <Input
              id="ref-domain"
              placeholder="e.g. google.com"
              value={overrides.referrerDomain}
              onChange={(e) => setOverrides((o) => ({ ...o, referrerDomain: e.target.value }))}
            />
          </div>

          <Button onClick={runDecisions} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Evaluate
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {!hasRun ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Press <strong>Evaluate</strong> to test 3 preset visitors against the rule engine.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {PRESET_VISITORS.map((preset) => {
            const result = results[preset.label];
            const ctx = sentContexts[preset.label];
            const isExpanded = expandedCtx === preset.label;
            return (
              <Card key={preset.label} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{preset.label}</span>
                        {!preset.consent.marketing && (
                          <Badge variant="warning" className="text-[10px]">no consent</Badge>
                        )}
                      </div>
                      {result ? (
                        <>
                          <p className="mt-1.5 text-base font-semibold">{result.headline}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(result.flags).map(([k, v]) => (
                              <Badge key={k} variant={v ? 'success' : 'secondary'} className="text-[10px] font-normal">
                                {k}
                              </Badge>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-destructive">API unreachable</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {result && (
                        <>
                          <code className="text-xs text-muted-foreground">{result.variantId}</code>
                          <p className="mt-0.5 text-[10px] text-muted-foreground/60">v{result.configVersion}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expandable context summary */}
                  {ctx && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setExpandedCtx(isExpanded ? null : preset.label)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {isExpanded ? 'Hide' : 'Show'} context sent to /decide
                      </button>
                      {isExpanded && (
                        <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                            {(
                              [
                                ['visitorId', ctx.visitorId ?? '(none)'],
                                ['country', ctx.country ?? '(none)'],
                                ['language', ctx.language ?? '(none)'],
                                ['deviceType', ctx.deviceType ?? '(none)'],
                                ['referrerDomain', ctx.referrerDomain || '(none)'],
                                ['marketing', String(ctx.marketing)],
                              ] as [string, string][]
                            ).map(([k, v]) => (
                              <div key={k} className="contents">
                                <span className="text-muted-foreground/50">{k}</span>
                                <span className="truncate">{v}</span>
                              </div>
                            ))}
                          </div>
                          {!preset.consent.marketing && (
                            <p className="mt-1.5 border-t pt-1.5 text-amber-600 dark:text-amber-400">
                              visitorId stripped before evaluation (marketing=false)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* LLM section */}
      <div className="mt-10 border-t pt-10">
        <CopyAssistant />
      </div>
    </div>
  );
}

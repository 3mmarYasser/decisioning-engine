'use client';

import { useEffect, useState } from 'react';
import type { AllowedClaim, LlmCopyResponse } from '@decisioning/shared-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wand2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface LlmResult extends LlmCopyResponse {
  allowedClaims: AllowedClaim[];
  trace: {
    requestId: string;
    model: string;
    latencyMs: number;
    validationPassed: boolean;
    retryCount: number;
  };
}

export default function CopyAssistant() {
  const [tone, setToneState] = useState('professional');
  const [audience, setAudienceState] = useState('marketing teams');
  const [result, setResult] = useState<LlmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore persisted selections on mount
  useEffect(() => {
    const savedTone = localStorage.getItem('copy_assistant_tone');
    const savedAudience = localStorage.getItem('copy_assistant_audience');
    if (savedTone) setToneState(savedTone);
    if (savedAudience) setAudienceState(savedAudience);
  }, []);

  const setTone = (v: string) => {
    setToneState(v);
    localStorage.setItem('copy_assistant_tone', v);
  };

  const setAudience = (v: string) => {
    setAudienceState(v);
    localStorage.setItem('copy_assistant_audience', v);
  };

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone, targetAudience: audience }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight">Copy Assistant</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Generate headlines with OpenAI. Claims are validated server-side — invalid references trigger a retry, then fallback.
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div className="w-40">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-44">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Audience</label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing teams">Marketing Teams</SelectItem>
                <SelectItem value="developers">Developers</SelectItem>
                <SelectItem value="executives">Executives</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={generate} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
            Generate
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div role="alert" className="mb-4 flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Headlines */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Headline 1', text: result.headline1 },
              { label: 'Headline 2', text: result.headline2 },
            ].map((h) => (
              <Card key={h.label}>
                <CardContent className="p-4">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {h.label}
                  </p>
                  <p className="text-sm font-medium leading-snug">{h.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Claims */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Referenced claims</p>
            <div className="space-y-1">
              {result.allowedClaims
                .filter((c) => result.usedClaimIds.includes(c.id))
                .map((claim) => (
                  <div key={claim.id} className="flex items-baseline gap-2 text-sm">
                    <code className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px]">{claim.id}</code>
                    <span className="text-muted-foreground">{claim.text}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Trace */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {result.trace.validationPassed ? (
                <CheckCircle2 className="mr-1 inline h-3 w-3 text-emerald-500" />
              ) : (
                <XCircle className="mr-1 inline h-3 w-3 text-destructive" />
              )}
              {result.trace.validationPassed ? 'Validated' : 'Fallback used'}
            </span>
            <span className="font-mono">{result.trace.model}</span>
            <span>{result.trace.latencyMs}ms</span>
            <span>{result.trace.retryCount} retries</span>
            <span className="font-mono">{result.trace.requestId.slice(0, 8)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { NextResponse } from 'next/server';
import { checkLlmLimit, clientIp } from '@/lib/rate-limit';
import { generateCopy, getAllowedClaims, sanitizeTone, sanitizeAudience } from '@/lib/llm';

const MAX_BODY_BYTES = 2048;

export async function POST(request: Request) {
  try {
    const declared = Number(request.headers.get('content-length') || 0);
    if (declared > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      const parsed = JSON.parse(raw);
      body = parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const limit = checkLlmLimit(clientIp(request));
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Daily limit reached for this demo. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
      );
    }

    const tone = sanitizeTone(String(body.tone || 'professional'));
    const targetAudience = sanitizeAudience(String(body.targetAudience || 'marketing teams'));

    const { result, trace } = await generateCopy(tone, targetAudience);

    return NextResponse.json({
      ...result,
      allowedClaims: getAllowedClaims(),
      trace: {
        requestId: trace.requestId,
        model: trace.model,
        latencyMs: trace.latencyMs,
        validationPassed: trace.validationPassed,
        retryCount: trace.retryCount,
      },
    });
  } catch (error) {
    console.error('[LLM Route Error]', error);
    return NextResponse.json({ error: 'Failed to generate copy' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ allowedClaims: getAllowedClaims() });
}

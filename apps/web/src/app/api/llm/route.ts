import { NextResponse } from 'next/server';
import { generateCopy, getAllowedClaims, sanitizeTone, sanitizeAudience } from '@/lib/llm';

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
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

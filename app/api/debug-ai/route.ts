import { NextResponse } from 'next/server';
import { generateDestinationBrief } from '@/lib/ai';

export async function GET() {
  const hasKey = !!process.env.GROQ_API_KEY;
  const keyPrefix = process.env.GROQ_API_KEY?.slice(0, 8) ?? 'NOT_SET';

  try {
    const brief = await generateDestinationBrief('Goa', '2026-05-01', '2026-05-04');
    return NextResponse.json({
      hasKey,
      keyPrefix,
      brief,
      status: brief ? 'AI working' : 'AI returned null (parse failure or empty response)',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      hasKey,
      keyPrefix,
      error: message,
      status: 'AI call threw an error',
    }, { status: 500 });
  }
}

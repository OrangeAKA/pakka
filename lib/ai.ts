// ============================================================
// Pakka — Groq AI helpers
// ============================================================

import Groq from 'groq-sdk';
import type { AIDestinationBrief, AIWhatsAppMessages, BudgetTier } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Client
// ─────────────────────────────────────────────────────────────────────────────

let _groq: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');
    _groq = new Groq({ apiKey });
  }
  return _groq;
}

/** For unit tests only — resets the cached Groq instance. */
export function _resetGroqClientForTesting(): void {
  _groq = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Safety helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Truncate user-supplied text and strip prompt-injection patterns before
 * interpolating into a Groq prompt.
 */
export function sanitizeForPrompt(text: string, maxLen = 200): string {
  return text
    .slice(0, maxLen)
    .replace(/^(ignore|forget|you are|act as|disregard).*/gim, '')
    .trim();
}

/**
 * Parse a JSON response from Groq, returning null on any failure.
 * Pass an optional type-guard `validator` to reject responses with the wrong schema.
 */
export function parseAIResponse<T>(
  raw: string,
  validator?: (obj: unknown) => obj is T,
): T | null {
  const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (validator && !validator(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Destination brief
// ─────────────────────────────────────────────────────────────────────────────

function isAIDestinationBrief(obj: unknown): obj is AIDestinationBrief {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    Array.isArray(o.lines) &&
    (o.confidence === 'high' || o.confidence === 'low')
  );
}

export async function generateDestinationBrief(
  destination: string,
  dateFrom: string,
  dateTo: string,
): Promise<AIDestinationBrief | null> {
  const safeDestination = sanitizeForPrompt(destination);

  const prompt = `You are a travel advisor for young urban Indians (18-35, WhatsApp-native).

Trip: ${safeDestination}, ${dateFrom} to ${dateTo}.

Write a destination brief in exactly 3-4 lines. Include:
1. Season/weather summary for those specific dates
2. Any relevant festival or peak/off-peak note
3. Travel time + rough flight cost from Mumbai and one other major city
4. One practical tip specific to this destination and season

Also assess your own confidence: set "confidence" to "high" for well-known Indian destinations (Goa, Manali, Coorg, Jaipur, Kerala, etc.) and "low" for obscure or tier-3 destinations where travel details may be unreliable.

Tone: helpful friend, not travel brochure. No emoji overload. Be specific.
Max 60 words total.

Return as JSON: {"lines": ["...", "...", "..."], "confidence": "high" | "low"}`;

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    return parseAIResponse<AIDestinationBrief>(raw, isAIDestinationBrief);
  } catch (err) {
    console.error('generateDestinationBrief failed:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp share messages
// ─────────────────────────────────────────────────────────────────────────────

function isAIWhatsAppMessages(obj: unknown): obj is AIWhatsAppMessages {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.short === 'string' &&
    typeof o.context_rich === 'string' &&
    typeof o.nudge === 'string'
  );
}

export async function generateWhatsAppMessages(
  destination: string,
  dateFrom: string,
  dateTo: string,
  shareUrl: string,
  quorumTarget?: number,
  plannerNote?: string | null,
  rsvpDeadline?: string,
): Promise<AIWhatsAppMessages | null> {
  const safeDestination = sanitizeForPrompt(destination);
  const safePlannerNote = plannerNote ? sanitizeForPrompt(plannerNote) : 'none';
  const safeUrl = shareUrl.slice(0, 300);

  const prompt = `Trip: ${safeDestination}, ${dateFrom} to ${dateTo}, need ${quorumTarget ?? '?'} people.
Share link: ${safeUrl}
Planner note: ${safePlannerNote}
RSVP deadline: ${rsvpDeadline ?? 'unspecified'}

Write THREE WhatsApp messages for this trip:
1. SHORT (under 15 words + link): casual, assumes they already know about the trip
2. CONTEXT-RICH (30-40 words + link): provides context, creates mild urgency
3. NUDGE (20-30 words + link): deadline urgency, written as if sent the day before close, mentions shortfall if possible

Rules:
- Sound like a real person texting friends, not a marketing email
- Use Indian English naturally (can include light Hindi like "Pakka" or "abhi")
- Mention the RSVP deadline in variants 2 and 3
- No hashtags, no excessive emoji, no exclamation marks

Return as JSON: {"short": "...", "context_rich": "...", "nudge": "..."}`;

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    return parseAIResponse<AIWhatsAppMessages>(raw, isAIWhatsAppMessages);
  } catch (err) {
    console.error('generateWhatsAppMessages failed:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget note
// ─────────────────────────────────────────────────────────────────────────────

export async function generateBudgetNote(
  destination: string,
  dominantTier: BudgetTier,
  countIn: number,
): Promise<string | null> {
  const safeDestination = sanitizeForPrompt(destination);

  const budgetLabel: Record<BudgetTier, string> = {
    '5k-10k': '₹5,000–10,000 per person',
    '10k-20k': '₹10,000–20,000 per person',
    '20k+': '₹20,000+ per person',
  };

  const prompt = `You are a travel budget advisor for young Indians.
For a group trip to ${safeDestination} with ${countIn} people committed, most voted for a budget of ${budgetLabel[dominantTier]}.

Write 1 short, practical sentence (max 20 words) that gives a realistic expectation or quick tip for this budget level and group size.
No emojis. No quotation marks. Just the sentence.`;

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 60,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '';
    return raw.replace(/^["']|["']$/g, '') || null;
  } catch (err) {
    console.error('generateBudgetNote failed:', err);
    return null;
  }
}

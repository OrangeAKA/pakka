/**
 * @integration
 *
 * These tests make real calls to the Groq API and require GROQ_API_KEY to be
 * set in the environment. They are skipped automatically when the key is absent
 * so the unit-test suite stays fast in CI.
 *
 * Run in isolation:
 *   GROQ_API_KEY=... npx vitest run tests/api/ai-integration.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateDestinationBrief, generateWhatsAppMessages } from '@/lib/ai';

// Skip if key is absent or is the unit-test stub set by trips.test.ts beforeEach
const SKIP = !process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'test-key-unit';

describe.skipIf(SKIP)('@integration — AI layer (real Groq calls)', () => {
  // Allow up to 30 s per call — Groq is fast but tests are conservative
  const TIMEOUT = 30_000;

  // Small delay between tests to avoid hitting Groq's free-tier rate limit
  // (14,400 req/day, 30 req/min — 600ms gap keeps sequential calls well under)
  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 600));
  });

  // ── Destination brief ─────────────────────────────────────────────────────

  it(
    'generateDestinationBrief: non-null brief with 3-4 lines, valid confidence, and "high" for Goa',
    async () => {
      const result = await generateDestinationBrief('Goa', '2026-12-15', '2026-12-18');

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.lines)).toBe(true);
      expect(result!.lines.length).toBeGreaterThanOrEqual(3);
      expect(result!.lines.length).toBeLessThanOrEqual(4);
      expect(['high', 'low']).toContain(result!.confidence);
      // Goa is explicitly listed as "high" confidence in the prompt
      expect(result!.confidence).toBe('high');

      // Every line must be a non-empty string
      for (const line of result!.lines) {
        expect(typeof line).toBe('string');
        expect(line.trim().length).toBeGreaterThan(0);
      }
    },
    TIMEOUT,
  );

  // ── WhatsApp messages ─────────────────────────────────────────────────────

  it(
    'generateWhatsAppMessages: non-null object with short, context_rich, and nudge populated',
    async () => {
      const shareUrl = 'https://pakka.app/brief/testlink99';
      const result = await generateWhatsAppMessages(
        'Goa',
        '2026-12-15',
        '2026-12-18',
        shareUrl,
        6,
        'Beach New Year plan',
        '2026-12-01T00:00:00Z',
      );

      expect(result).not.toBeNull();

      expect(typeof result!.short).toBe('string');
      expect(result!.short.trim().length).toBeGreaterThan(0);

      expect(typeof result!.context_rich).toBe('string');
      expect(result!.context_rich.trim().length).toBeGreaterThan(0);

      expect(typeof result!.nudge).toBe('string');
      expect(result!.nudge.trim().length).toBeGreaterThan(0);

      // Share link must appear in at least one variant
      const allText = [result!.short, result!.context_rich, result!.nudge].join(' ');
      expect(allText).toContain(shareUrl);
    },
    TIMEOUT,
  );
});

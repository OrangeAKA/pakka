import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/trips/route';
import { _resetGroqClientForTesting } from '@/lib/ai';

// ----------------------------------------------------------------
// Mock Supabase server client
// ----------------------------------------------------------------
const mockInsert = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: mockInsert,
        }),
      }),
    }),
  }),
}));

// ----------------------------------------------------------------
// Mock Supabase admin client (used by the AI fire-and-forget IIFE)
// ----------------------------------------------------------------
const mockAdminUpdate = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: () => ({ eq: mockAdminUpdate }),
    }),
  }),
}));

// ----------------------------------------------------------------
// Mock Groq SDK — failure path tests configure this per-test via
// vi.spyOn on the Groq client's chat.completions.create.
// Default behaviour (undefined return) causes graceful AI failure.
//
// Note: must use function() not () => so Vitest's Reflect.construct
// can treat it as a constructor when `new Groq()` is called.
// ----------------------------------------------------------------
const mockGroqCreate = vi.fn();

vi.mock('groq-sdk', () => ({
  // eslint-disable-next-line prefer-arrow-callback
  default: vi.fn().mockImplementation(function GroqMock() {
    return { chat: { completions: { create: mockGroqCreate } } };
  }),
}));

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  destination: 'Goa',
  date_from: '2026-06-01',
  date_to: '2026-06-07',
  rsvp_deadline: '2026-05-15T00:00:00.000Z',
  quorum_target: 6,
};

beforeEach(() => {
  // clearAllMocks clears call history but preserves the mock factory implementations
  // (needed so the Groq constructor still returns the mock instance).
  vi.clearAllMocks();
  // Reset mockGroqCreate's configured behaviour so failure-path rejections
  // from one test don't bleed into the next.
  mockGroqCreate.mockReset();
  // Force re-initialization so each test gets a fresh mock Groq instance
  // (avoids stale state from the previous test's fire-and-forget IIFE).
  _resetGroqClientForTesting();

  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } } });
  mockInsert.mockResolvedValue({
    data: { id: 'trip-uuid', share_token: 'abc123' },
    error: null,
  });
  mockAdminUpdate.mockResolvedValue({ error: null });
  // Provide a dummy key so getGroqClient() passes its env check.
  // The groq-sdk module itself is mocked so no real calls are made.
  process.env.GROQ_API_KEY = 'test-key-unit';
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
});

afterEach(() => {
  // Remove the stub key so it doesn't leak to integration tests in the same run
  delete process.env.GROQ_API_KEY;
});

// ----------------------------------------------------------------
// Core trip creation
// ----------------------------------------------------------------

describe('POST /api/trips', () => {
  it('creates a trip and returns share_url', async () => {
    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.share_token).toBe('abc123');
    expect(data.share_url).toBe('http://localhost:3000/brief/abc123');
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 when destination is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, destination: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/destination/i);
  });

  it('returns 400 when date_to is before date_from', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      date_from: '2026-06-10',
      date_to: '2026-06-01',
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/date_to/i);
  });

  it('returns 400 when quorum_target is 0', async () => {
    const res = await POST(makeRequest({ ...validBody, quorum_target: 0 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/quorum/i);
  });

  it('returns 400 when rsvp_deadline is missing', async () => {
    const { rsvp_deadline: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(400);
  });

  it('returns 500 when DB insert fails', async () => {
    mockInsert.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });
});

// ----------------------------------------------------------------
// AI failure paths
//
// Uses vi.spyOn semantics on the Groq client's chat.completions.create
// (mockGroqCreate) to simulate network failure and rate-limit errors.
// Verifies that:
//   1. Trip INSERT still succeeds (201 + share_token)
//   2. ai_destination_brief stays null (DB update not called)
//   3. Response returns the share token as normal
// ----------------------------------------------------------------

describe('POST /api/trips — AI failure paths', () => {
  it('trip still created when Groq throws a network error', async () => {
    // Spy on chat.completions.create to simulate network failure
    mockGroqCreate.mockRejectedValue(new Error('Network failure: ECONNRESET'));

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.share_token).toBe('abc123');
    // ai_destination_brief is never included in the creation response
    expect(data.ai_destination_brief).toBeUndefined();

    // Flush the fire-and-forget IIFE (vi.waitFor not available in bun test runner)
    await new Promise(resolve => setTimeout(resolve, 50));

    // AI call failed → admin DB update must NOT have been called
    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });

  it('trip still created when Groq returns a 429 rate-limit error', async () => {
    const rateLimitError = Object.assign(
      new Error('Too Many Requests'),
      { status: 429, error: { type: 'rate_limit_exceeded' } },
    );
    mockGroqCreate.mockRejectedValue(rateLimitError);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.share_token).toBe('abc123');
    expect(data.ai_destination_brief).toBeUndefined();

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockAdminUpdate).not.toHaveBeenCalled();
  });
});

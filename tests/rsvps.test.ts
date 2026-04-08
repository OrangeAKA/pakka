import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/rsvps/route';

// ----------------------------------------------------------------
// Mock Supabase clients
// ----------------------------------------------------------------
const mockTripSelect = vi.fn();
const mockUpsert = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'trips') {
        return {
          select: () => ({ eq: () => ({ single: mockTripSelect }) }),
        };
      }
      // rsvps table — handle both upsert and count select
      return {
        upsert: mockUpsert,
        select: () => ({
          eq: () => ({
            eq: () => Promise.resolve({ count: 3 }),
          }),
        }),
      };
    },
  }),
}));

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/rsvps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const futureDeadline = new Date(Date.now() + 86_400_000).toISOString(); // 24h from now
const pastDeadline = new Date(Date.now() - 86_400_000).toISOString();   // 24h ago

const validTrip = {
  id: 'trip-uuid',
  rsvp_deadline: futureDeadline,
  quorum_target: 6,
  status: 'active',
};

const validBody = {
  share_token: 'abc123',
  session_token: 'cookie-uuid',
  response: 'in',
  budget_tier: '10k-20k',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTripSelect.mockResolvedValue({ data: validTrip, error: null });
  mockUpsert.mockResolvedValue({ error: null });
});

describe('POST /api/rsvps', () => {
  it('submits a valid RSVP and returns count', async () => {
    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count_in).toBe(3);
    expect(data.quorum_target).toBe(6);
  });

  it('accepts RSVP without a budget_tier', async () => {
    const { budget_tier: _, ...body } = validBody;
    const res = await POST(makeRequest(body));
    expect(res.status).toBe(200);
  });

  it('returns 404 when share_token not found', async () => {
    mockTripSelect.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
  });

  it('returns 410 when deadline has passed', async () => {
    mockTripSelect.mockResolvedValue({
      data: { ...validTrip, rsvp_deadline: pastDeadline },
      error: null,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(410);
    const data = await res.json();
    expect(data.error).toMatch(/deadline/i);
  });

  it('returns 400 when response value is invalid', async () => {
    const res = await POST(makeRequest({ ...validBody, response: 'yes_please' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ share_token: 'abc123' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when upsert fails', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'DB error' } });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(500);
  });

  it('returns 200 when submitted at T-1s (just before deadline)', async () => {
    const almostPast = new Date(Date.now() + 1_000).toISOString(); // 1s in the future
    mockTripSelect.mockResolvedValue({
      data: { ...validTrip, rsvp_deadline: almostPast },
      error: null,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
  });

  it('returns 410 when submitted at T+1s (just after deadline)', async () => {
    const justPast = new Date(Date.now() - 1_000).toISOString(); // 1s in the past
    mockTripSelect.mockResolvedValue({
      data: { ...validTrip, rsvp_deadline: justPast },
      error: null,
    });
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(410);
    const data = await res.json();
    expect(data.error).toMatch(/deadline/i);
  });

  it('returns 400 when budget_tier is invalid', async () => {
    const res = await POST(makeRequest({ ...validBody, budget_tier: 'cheap' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/budget_tier/i);
  });

  it('is idempotent — second submission with same session_token updates, not duplicates', async () => {
    await POST(makeRequest(validBody));
    const res = await POST(makeRequest({ ...validBody, response: 'maybe' }));
    expect(res.status).toBe(200);
    // upsert was called twice — both calls succeed (DB handles dedup)
    expect(mockUpsert).toHaveBeenCalledTimes(2);
  });

  it('accepts RSVP with optional name', async () => {
    const res = await POST(makeRequest({ ...validBody, name: 'Aashik' }));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Aashik' }),
      expect.anything(),
    );
  });

  it('accepts RSVP without name — anonymous flow still works', async () => {
    const { budget_tier: _, ...bodyWithoutTier } = validBody;
    const res = await POST(makeRequest(bodyWithoutTier));
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: null }),
      expect.anything(),
    );
  });
});

// ----------------------------------------------------------------
// RSVP handler cleanliness — no AI side-effects
//
// ai_budget_note is generated from the dashboard page load (server
// component), not from the RSVP handler. Any Groq call here would be
// a bug that adds latency and unexpected cost to every member action.
// ----------------------------------------------------------------

describe('POST /api/rsvps — AI cleanliness', () => {
  it('does not invoke any Groq / AI function on a successful RSVP', async () => {
    // Dynamically import the AI module so we can spy on its exports.
    // The RSVP route does not import from @/lib/ai at all, so these
    // spies should never fire.
    const aiModule = await import('@/lib/ai');
    const briefSpy = vi.spyOn(aiModule, 'generateDestinationBrief');
    const msgSpy = vi.spyOn(aiModule, 'generateWhatsAppMessages');
    const budgetSpy = vi.spyOn(aiModule, 'generateBudgetNote');

    await POST(makeRequest(validBody));

    expect(briefSpy).not.toHaveBeenCalled();
    expect(msgSpy).not.toHaveBeenCalled();
    expect(budgetSpy).not.toHaveBeenCalled();

    briefSpy.mockRestore();
    msgSpy.mockRestore();
    budgetSpy.mockRestore();
  });

  it('ai_budget_note is not populated by the RSVP path', async () => {
    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    // The RSVP response shape is { success, count_in, quorum_target }.
    // It must never carry ai_budget_note — that field lives on the Trip
    // row and is populated lazily from the dashboard page load.
    expect(data).not.toHaveProperty('ai_budget_note');
  });
});

# Pakka — Build Log & Context

**Last updated:** 2026-04-05  
**Test status:** 55 pass, 2 skip, 0 fail  
**Design docs:** `~/.gstack/projects/Interviews/`

---

## What Pakka Is

India-first group trip commitment platform. Solves the core problem: planners can't get a clear "yes" from their group before booking. Members ghost. Trips die.

Core mechanic: planner creates a "Trip Brief" with destination, dates, budget tiers, RSVP deadline, and a quorum target. Members RSVP anonymously (in/out/maybe + budget vote). When enough people are in, planner gets notified and booking links appear.

**The name:** "Pakka" = Hindi/Indian English for confirmed, definite, locked in. Every interview subject used it unprompted.

---

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Supabase** (Postgres, Auth, RLS, Edge Functions)
- **Vercel** (deployment)
- **Resend** (email notifications)
- **Twilio** (SMS notifications)
- **Groq SDK** (`llama-3.3-70b-versatile`) — AI layer
- **Vitest** via **Bun** test runner

Design system: Young Serif (display) + Plus Jakarta Sans (UI), warm ivory `#F5F0E8` bg, Deep Crimson `#A81B0A` accent. DESIGN.md in project root.

---

## What's Built (Done)

### MVP — COMPLETE ✅
- `/create` — Trip Brief form with quorum guidance
- `/brief/[share_token]` — 3-screen member RSVP flow (summary → form → Pakka ticket confirmation)
- `/dashboard/[share_token]` — Planner dashboard: quorum ring, countdown, RSVP breakdown, budget distribution (anonymity threshold enforced: ≥3 votes, group >4)
- Anonymous session identity via URL param `?s=UUID` + localStorage (solves WhatsApp in-app browser problem)
- Supabase RLS + aggregate views — planner can never query individual RSVP rows
- Email magic link auth (Supabase)
- Trip creation confirmation email (Resend)
- Quorum detection Edge Function (cron, 5 min) — idempotent via `notified_at` column
- 26 original tests passing

### V1 AI Layer — COMPLETE ✅
All built, 55 tests passing.

**Features:**
1. **Destination Intelligence Card** (`BriefClient.tsx` Screen 1) — AI-generated 3-4 line brief (season, festivals, travel time, practical tip). Low-confidence destinations get a "verify independently" disclaimer. Stored as `ai_destination_brief JSONB` on trips table. Null-safe: if AI fails, card simply not shown.

2. **WhatsApp Message Generator** (`DashboardClient.tsx`) — 3 variants:
   - Short (casual, for warmed-up groups)
   - Context-rich (sells the trip, mentions deadline)
   - Nudge (deadline urgency, for the final push) — surfaced in the quorum-miss notification email
   Stored as `ai_whatsapp_messages TEXT[]`. Null-safe: fallback to generic template.

3. **Budget Reality Note** (`DashboardClient.tsx`) — AI sentence interpreting voted budget against destination + season. Lazy trigger: fires from dashboard page load when anonymity threshold first crossed. Stored as `ai_budget_note TEXT` + `ai_budget_note_generated_at TIMESTAMPTZ`. If >24h old, shows "Budget snapshot as of [date]". Null-safe.

4. **Near-quorum Social Nudge** (`BriefClient.tsx` Screen 1) — When 1-2 RSVPs short, Brief page shows Share button + pre-written "we need one more" message. Members become recruiters. Triggered from `trip_rsvp_summary` count on page load.

**AI implementation details:**
- All calls use Groq (`llama-3.3-70b-versatile`), `response_format: { type: 'json_object' }` for clean output
- `lib/ai.ts`: `sanitizeForPrompt()` (injection guard, 200 char truncation), `parseAIResponse()` (JSON extraction + type validation), `_resetGroqClientForTesting()` (test isolation)
- Cost: ~$0.00015/trip. Free tier = 14,400 req/day, well covered at MVP scale
- Destination brief + WhatsApp messages: parallel calls fired after trip INSERT, fire-and-forget IIFE in `/api/trips` POST
- Budget note: lazy, fires from `/dashboard/[share_token]/page.tsx` on threshold cross

**Test coverage:**
- `tests/lib/ai.test.ts` — 14 unit tests for `sanitizeForPrompt` + `parseAIResponse`
- `tests/api/ai-integration.test.ts` — 2 integration tests (real Groq, skipped without real key)
- `tests/trips.test.ts` — extended with AI failure path tests (network error, 429 rate limit)
- `tests/rsvps.test.ts` — extended to verify RSVP handler doesn't trigger AI calls

---

## Schema (current)

```sql
trips
  id, planner_id, destination, date_from, date_to
  budget_tiers JSONB, rsvp_deadline, quorum_target
  status, share_token, planner_note, notified_at, created_at
  -- AI columns (all nullable):
  ai_destination_brief JSONB        -- { lines, confidence, generated_at, model }
  ai_whatsapp_messages TEXT[]       -- [short, context_rich, nudge]
  ai_budget_note TEXT
  ai_budget_note_generated_at TIMESTAMPTZ

rsvps
  id, trip_id, session_token, response, budget_tier, created_at
  UNIQUE(trip_id, session_token)

-- Views (aggregate only, planners read these, never raw rsvps):
trip_rsvp_summary       -- count_in, count_out, count_maybe, count_total per trip
trip_budget_distribution -- budget_tier, count per trip
```

---

## What's NOT Built Yet (Roadmap)

### V2 — Named Commitment + Multi-destination Voting
- **Multi-destination voting**: planner proposes 2-3 destinations before creating brief; group votes; winner auto-populates form. Needs a new lightweight `destination_polls` table.
- **Named member tracking**: planner adds contacts, members claim RSVP by name
- **Soft deposit**: Razorpay ₹500 hold → booking credit (real skin in the game)
- **Phone OTP auth**: Twilio, DLT-registered for India
- *Activate when MVP validates commitment mechanic with real users*

### V2.5 — Trip Recap and Viral Loop
- **Trip completed state**: planner marks trip as happened after travel dates pass
- **Shareable recap card**: "We went to Goa, Dec 15-18, 8 people" — one-tap share to WhatsApp or Instagram Stories
- *Closes post-trip growth loop; every share = organic brand impression*

### V3 — Intelligence Layer (requires data)
- Quorum probability score (needs ~50-100 real trips of Pakka behavioural data)
- Pre-send advisor (deadline too short? quorum target too aggressive?)
- Budget conflict mediation (40/40 vote split → AI surfaces compromise destinations)
- *Don't build until behavioral data exists*

---

## Key Product Decisions (don't revisit without good reason)

| Decision | Rationale |
|----------|-----------|
| Count-only RSVP (no names) for MVP | Zero friction for members; validates mechanic before adding named commitment complexity |
| Session token in URL (`?s=UUID`) | Solves WhatsApp in-app browser problem; user carries token when switching to Chrome |
| Groq over Anthropic | 14,400 free req/day, ~$0.00015/trip, same LLM quality for structured travel content |
| `response_format: json_object` on Groq | Prevents prose-wrapped JSON that breaks parseAIResponse |
| Budget note lazy (dashboard load) not eager (RSVP handler) | Keeps RSVP handler clean; no async side effects from member actions |
| AI failures never block trip creation | All AI columns nullable; graceful degradation is the default |
| `afterEach: delete process.env.GROQ_API_KEY` in trips.test.ts | Prevents stub key leaking to integration tests in same run |
| No vi.waitFor in tests | Bun test runner doesn't implement it; use `setTimeout(resolve, 50)` to flush async IIFEs |

---

## What to Do Next

**Immediate (before any new features):**
1. Deploy to Supabase hosted + Vercel. Run schema migrations in hosted Supabase. Configure env vars (`GROQ_API_KEY`, `RESEND_API_KEY`, `TWILIO_*`, `NEXT_PUBLIC_APP_URL`).
2. GTM seeding: personally onboard Aashik, Ramya, and 3 other interview subjects. Goal: first 5 real trips created, get quorum hit rate data.

**After first 5 real trips:**
- Review: are people actually copying and using the WhatsApp messages? (proxy: time-to-first-RSVP after creation)
- Review: is the destination card being shown? (check `ai_destination_brief` null rate in DB)
- Review: what's the quorum hit rate? If <50%, diagnose before building V2.

**When quorum mechanic is validated:**
- Build V2: multi-destination voting first (low complexity, high value for planners), then named commitment + deposits

---

## Files to Know

```
app/
  api/trips/route.ts          — POST handler, fires AI calls after INSERT
  api/rsvps/route.ts          — RSVP upsert, must stay AI-free
  brief/[share_token]/
    page.tsx                  — fetches trip + count_in, passes to client
    BriefClient.tsx           — destination card + near-quorum nudge (Screen 1)
  dashboard/[share_token]/
    page.tsx                  — lazy budget note trigger on load
    DashboardClient.tsx       — WhatsApp variants + budget note display
  create/
    CreateTripForm.tsx        — trip creation form

lib/
  ai.ts                       — all Groq helpers (sanitize, parse, generate*)
  types.ts                    — Trip, AIDestinationBrief, AIWhatsAppMessages, etc.
  utils.ts                    — formatDate, formatDeadline, BUDGET_LABELS, etc.

tests/
  trips.test.ts               — trip creation + AI failure paths
  rsvps.test.ts               — RSVP submission + AI cleanliness
  lib/ai.test.ts              — unit tests for sanitizeForPrompt, parseAIResponse
  api/ai-integration.test.ts  — real Groq calls (skipped without GROQ_API_KEY)

supabase/functions/check-quorum/ — Edge Function cron (quorum detection + notifications)

~/.gstack/projects/Interviews/
  krishnaakhil-unknown-design-20260405-011851.md  — AI layer design doc (READY TO BUILD, done)
  krishnaakhil-unknown-design-20260405-003550.md  — original MVP design doc
  krishnaakhil-unknown-eng-plan-20260405.md       — engineering plan
```

---

## How to Think About the Next Build Session

The product is feature-complete for MVP + V1. The next unlock is **real user data**, not more features. Resist the urge to build V2 before the first 5 real trips have completed.

When resuming a build session, check:
1. `bun test` — must be 55 pass (or more if tests were added), 0 fail
2. Any pending schema migrations for Supabase hosted?
3. Is the site live at `pakka.space`?

The model for building new features: design doc in `~/.gstack/projects/Interviews/` → CEO review → spawn Claude Code instances by lane (backend, frontend, tests). Tests go last and should use real Groq for happy-path integration, mocks only for failure paths and unit logic.

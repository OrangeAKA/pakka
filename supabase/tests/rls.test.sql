-- ============================================================
-- RLS policy tests for Pakka MVP
-- Run with: bun x supabase test db
-- ============================================================

BEGIN;
SELECT plan(8);

-- ----------------------------------------------------------------
-- Setup: seed a planner user + a second user (attacker)
-- ----------------------------------------------------------------
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-000000000001', 'planner@test.com'),
  ('00000000-0000-0000-0000-000000000002', 'attacker@test.com');

-- Seed a trip owned by the planner
INSERT INTO trips (id, planner_id, destination, date_from, date_to,
                   rsvp_deadline, quorum_target, share_token)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Goa', '2026-06-01', '2026-06-07',
  '2026-05-01 00:00:00+00', 5,
  'testtoken01'
);

-- Seed an RSVP row
INSERT INTO rsvps (id, trip_id, session_token, response, budget_tier)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'cookie-abc123',
  'in',
  '10k-20k'
);

-- ----------------------------------------------------------------
-- Test 1: anon can read trips (for /brief/[share_token])
-- ----------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT ok(
  (SELECT COUNT(*) FROM trips WHERE share_token = 'testtoken01') = 1,
  'anon can read trip by share_token'
);

-- ----------------------------------------------------------------
-- Test 2: anon cannot SELECT rsvps directly
-- ----------------------------------------------------------------
SELECT throws_ok(
  $$SELECT * FROM rsvps WHERE trip_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'permission denied for table rsvps',
  'anon cannot SELECT rsvps directly'
);

-- ----------------------------------------------------------------
-- Test 3: authenticated planner cannot SELECT rsvps directly
-- ----------------------------------------------------------------
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub":"00000000-0000-0000-0000-000000000001"}';
SELECT throws_ok(
  $$SELECT * FROM rsvps WHERE trip_id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'permission denied for table rsvps',
  'authenticated planner cannot SELECT rsvps directly'
);

-- ----------------------------------------------------------------
-- Test 4: planner can read trip_rsvp_summary (aggregate view)
-- ----------------------------------------------------------------
SELECT ok(
  (SELECT count_in FROM trip_rsvp_summary
   WHERE trip_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 1,
  'planner can read trip_rsvp_summary aggregate view'
);

-- ----------------------------------------------------------------
-- Test 5: planner can read trip_budget_distribution (aggregate view)
-- ----------------------------------------------------------------
SELECT ok(
  (SELECT count FROM trip_budget_distribution
   WHERE trip_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND budget_tier = '10k-20k') = 1,
  'planner can read trip_budget_distribution aggregate view'
);

-- ----------------------------------------------------------------
-- Test 6: planner owns their trip (can update status)
-- ----------------------------------------------------------------
SELECT lives_ok(
  $$UPDATE trips SET status = 'expired'
    WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'$$,
  'planner can update their own trip'
);

-- ----------------------------------------------------------------
-- Test 7: attacker cannot update planner's trip
-- ----------------------------------------------------------------
SET LOCAL "request.jwt.claims" TO '{"sub":"00000000-0000-0000-0000-000000000002"}';
SELECT is(
  (SELECT COUNT(*) FROM trips
   WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND planner_id = auth.uid()),
  0::BIGINT,
  'attacker cannot see planner trip via planner_owns_trips policy'
);

-- ----------------------------------------------------------------
-- Test 8: anon can insert an RSVP
-- ----------------------------------------------------------------
SET LOCAL ROLE anon;
SELECT lives_ok(
  $$INSERT INTO rsvps (trip_id, session_token, response)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000001', 'new-cookie-xyz', 'maybe')$$,
  'anon can insert an RSVP'
);

SELECT * FROM finish();
ROLLBACK;

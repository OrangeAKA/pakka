-- ============================================================
-- Pakka MVP — initial schema
-- ============================================================

-- nanoid extension for short share tokens
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- helper: generate a short random token (URL-safe, 12 chars)
CREATE OR REPLACE FUNCTION nanoid(size INT DEFAULT 12)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  alphabet TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  id TEXT := '';
  i INT := 0;
  byte_val INT;
  raw BYTEA;
BEGIN
  raw := gen_random_bytes(size * 2);
  WHILE i < size LOOP
    byte_val := get_byte(raw, i);
    id := id || substr(alphabet, (byte_val % 62) + 1, 1);
    i := i + 1;
  END LOOP;
  RETURN id;
END;
$$;

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE trips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination   TEXT NOT NULL,
  date_from     DATE NOT NULL,
  date_to       DATE NOT NULL,
  budget_tiers  JSONB NOT NULL DEFAULT '["5k-10k","10k-20k","20k+"]',
  rsvp_deadline TIMESTAMPTZ NOT NULL,
  quorum_target INTEGER NOT NULL CHECK (quorum_target > 0),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'quorum_reached', 'expired')),
  share_token   TEXT NOT NULL UNIQUE DEFAULT nanoid(12),
  planner_note  TEXT,
  notified_at   TIMESTAMPTZ,  -- idempotency guard: set when quorum/deadline notification sent
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT date_range_valid CHECK (date_to >= date_from)
);

-- ============================================================
-- RSVPS  (anonymous — no name, no email, no phone)
-- ============================================================
CREATE TABLE rsvps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id        UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  session_token  TEXT NOT NULL,  -- cookie UUID from member's device
  response       TEXT NOT NULL CHECK (response IN ('in', 'out', 'maybe')),
  budget_tier    TEXT,           -- nullable: member may skip budget vote
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (trip_id, session_token)  -- one RSVP per cookie per trip
);

-- ============================================================
-- AGGREGATE VIEWS (planners read these, never raw rsvps rows)
-- ============================================================
CREATE VIEW trip_rsvp_summary AS
SELECT
  trip_id,
  COUNT(*) FILTER (WHERE response = 'in')    AS count_in,
  COUNT(*) FILTER (WHERE response = 'out')   AS count_out,
  COUNT(*) FILTER (WHERE response = 'maybe') AS count_maybe,
  COUNT(*)                                   AS count_total
FROM rsvps
GROUP BY trip_id;

CREATE VIEW trip_budget_distribution AS
SELECT
  trip_id,
  budget_tier,
  COUNT(*) AS count
FROM rsvps
WHERE budget_tier IS NOT NULL
GROUP BY trip_id, budget_tier;

-- ============================================================
-- RLS — TRIPS
-- ============================================================
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Planner has full access to their own trips
CREATE POLICY "planner_owns_trips"
  ON trips FOR ALL
  TO authenticated
  USING (planner_id = auth.uid())
  WITH CHECK (planner_id = auth.uid());

-- Anyone can read a trip (filtering by share_token happens in the query)
CREATE POLICY "public_read_trips"
  ON trips FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- RLS — RSVPS
-- ============================================================
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Anonymous members can insert (no auth required)
CREATE POLICY "member_insert_rsvp"
  ON rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Members can update their own row identified by session_token
-- (session_token is passed via app.session_token GUC from the API route)
CREATE POLICY "member_update_own_rsvp"
  ON rsvps FOR UPDATE
  TO anon, authenticated
  USING (session_token = current_setting('app.session_token', true));

-- NO SELECT policy on rsvps for any role → planners cannot read individual rows
-- All reads go through the aggregate views below

-- ============================================================
-- VIEW GRANTS
-- ============================================================
GRANT SELECT ON trip_rsvp_summary       TO authenticated;
GRANT SELECT ON trip_budget_distribution TO authenticated;

-- Explicitly revoke direct rsvps access
REVOKE SELECT ON rsvps FROM authenticated;
REVOKE SELECT ON rsvps FROM anon;

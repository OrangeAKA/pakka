-- Add optional name column to rsvps table
-- Anonymous RSVPs continue to work — name is nullable.

ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS name TEXT;

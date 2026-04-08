// ============================================================
// Pakka MVP — shared types
// ============================================================

export type RSVPResponse = 'in' | 'out' | 'maybe';
export type TripStatus = 'active' | 'quorum_reached' | 'expired';
export type BudgetTier = '5k-10k' | '10k-20k' | '20k+';

export const DEFAULT_BUDGET_TIERS: BudgetTier[] = ['5k-10k', '10k-20k', '20k+'];

// ----------------------------------------------------------------
// DB row shapes (mirrors Supabase schema exactly)
// ----------------------------------------------------------------

export interface AIDestinationBrief {
  lines: string[];          // 3-4 lines of destination intel
  confidence: 'high' | 'low'; // model confidence for well-known vs obscure destinations
  generated_at?: string;
  model?: string;
}

export interface AIWhatsAppMessages {
  short: string;            // casual, under 15 words + link
  context_rich: string;     // 30-40 words, mild urgency
  nudge: string;            // deadline urgency, day-before copy
}

export interface Trip {
  id: string;
  planner_id: string;
  destination: string;
  date_from: string;        // ISO date string: 'YYYY-MM-DD'
  date_to: string;          // ISO date string: 'YYYY-MM-DD'
  budget_tiers: BudgetTier[];
  rsvp_deadline: string;    // ISO timestamptz
  quorum_target: number;
  status: TripStatus;
  share_token: string;
  planner_note?: string | null;
  notified_at?: string | null;
  created_at: string;
  // AI-generated fields
  ai_destination_brief?: AIDestinationBrief | null;
  ai_whatsapp_messages?: AIWhatsAppMessages | null;
  ai_budget_note?: string | null;
  ai_budget_note_generated_at?: string | null;
}

export interface RSVP {
  id: string;
  trip_id: string;
  session_token: string;
  response: RSVPResponse;
  budget_tier?: BudgetTier | null;
  name?: string | null;
  created_at: string;
}

// ----------------------------------------------------------------
// Aggregate view shapes (planners see these, never raw RSVP rows)
// ----------------------------------------------------------------

export interface RSVPSummary {
  trip_id: string;
  count_in: number;
  count_out: number;
  count_maybe: number;
  count_total: number;
}

export interface BudgetDistributionRow {
  trip_id: string;
  budget_tier: BudgetTier;
  count: number;
}

// ----------------------------------------------------------------
// API request/response shapes
// ----------------------------------------------------------------

export interface CreateTripInput {
  destination: string;
  date_from: string;
  date_to: string;
  budget_tiers?: BudgetTier[];
  rsvp_deadline: string;
  quorum_target: number;
  planner_note?: string;
}

export interface CreateTripResponse {
  trip_id: string;
  share_token: string;
  share_url: string;        // absolute URL: /brief/{share_token}
}

export interface SubmitRSVPInput {
  share_token: string;
  session_token: string;
  response: RSVPResponse;
  budget_tier?: BudgetTier | null;
  name?: string;
}

export interface SubmitRSVPResponse {
  success: true;
  count_in: number;         // current 'in' count (for confirmation screen)
  quorum_target: number;
}

// ----------------------------------------------------------------
// Client-side dashboard state
// ----------------------------------------------------------------

export interface DashboardData {
  trip: Trip;
  summary: RSVPSummary;
  budget_distribution: BudgetDistributionRow[];
  show_budget: boolean;     // false if <3 votes OR group size ≤4 with <3 votes
  ai_budget_note?: string | null;
  in_names: string[];
  maybe_names: string[];
  out_names: string[];
}

import { BudgetDistributionRow, BudgetTier } from './types';

/**
 * Returns true if the budget distribution should be shown to the planner.
 * Hidden when: fewer than 3 votes, or group size ≤4 with fewer than 3 votes.
 */
export function shouldShowBudget(
  distribution: BudgetDistributionRow[],
  quorumTarget: number,
): boolean {
  const totalVotes = distribution.reduce((sum, r) => sum + r.count, 0);
  if (totalVotes < 3) return false;
  if (quorumTarget <= 4 && totalVotes < 3) return false;
  return true;
}

/** Format a date string (YYYY-MM-DD) for display */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a timestamptz for display */
export function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Returns true if the RSVP deadline has passed */
export function isDeadlinePassed(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

/** Returns the budget tier with the most votes, or null if no votes */
export function dominantBudgetTier(distribution: BudgetDistributionRow[]): BudgetTier | null {
  if (distribution.length === 0) return null;
  return distribution.reduce((best, row) => (row.count > best.count ? row : best)).budget_tier;
}

/** Budget tier display labels */
export const BUDGET_LABELS: Record<BudgetTier, string> = {
  '5k-10k': '₹5k – ₹10k per person',
  '10k-20k': '₹10k – ₹20k per person',
  '20k+': '₹20k+ per person',
};

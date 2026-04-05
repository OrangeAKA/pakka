import { describe, it, expect } from 'vitest';
import { shouldShowBudget, isDeadlinePassed } from '@/lib/utils';
import { BudgetDistributionRow } from '@/lib/types';

function makeRows(counts: number[]): BudgetDistributionRow[] {
  const tiers = ['5k-10k', '10k-20k', '20k+'] as const;
  return counts.map((count, i) => ({
    trip_id: 'trip-1',
    budget_tier: tiers[i % tiers.length],
    count,
  }));
}

describe('shouldShowBudget', () => {
  it('hides when total votes < 3', () => {
    expect(shouldShowBudget(makeRows([1, 1]), 10)).toBe(false);
  });

  it('shows when total votes >= 3 and group > 4', () => {
    expect(shouldShowBudget(makeRows([2, 1]), 10)).toBe(true);
  });

  it('hides when group <= 4 and votes < 3', () => {
    expect(shouldShowBudget(makeRows([1, 1]), 4)).toBe(false);
  });

  it('shows when group <= 4 and votes >= 3', () => {
    expect(shouldShowBudget(makeRows([2, 1]), 4)).toBe(true);
  });

  it('hides when no votes at all', () => {
    expect(shouldShowBudget([], 10)).toBe(false);
  });

  it('hides when 1 vote and group=3', () => {
    expect(shouldShowBudget(makeRows([1]), 3)).toBe(false);
  });
});

describe('isDeadlinePassed', () => {
  it('returns true for a past deadline', () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    expect(isDeadlinePassed(past)).toBe(true);
  });

  it('returns false for a future deadline', () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    expect(isDeadlinePassed(future)).toBe(false);
  });
});

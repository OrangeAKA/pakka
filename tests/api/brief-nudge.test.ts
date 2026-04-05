import { describe, it, expect } from 'vitest';

/**
 * Pure logic test for the "almost there" share nudge.
 *
 * The nudge renders when:
 *   (quorum_target - count_in) <= 2 && count_in < quorum_target && !deadlinePassed
 *
 * This mirrors the condition in BriefClient.tsx Screen 1.
 */
function shouldShowNudge(quorum_target: number, count_in: number, deadlinePassed = false): boolean {
  return (quorum_target - count_in) <= 2 && count_in < quorum_target && !deadlinePassed;
}

describe('brief share nudge visibility', () => {
  it('shows nudge when exactly 1 short of quorum', () => {
    expect(shouldShowNudge(6, 5)).toBe(true);
  });

  it('shows nudge when exactly 2 short of quorum', () => {
    expect(shouldShowNudge(6, 4)).toBe(true);
  });

  it('does not show nudge when quorum is met', () => {
    expect(shouldShowNudge(6, 6)).toBe(false);
  });

  it('does not show nudge when quorum is exceeded', () => {
    expect(shouldShowNudge(6, 7)).toBe(false);
  });

  it('does not show nudge when 3 or more short of quorum', () => {
    expect(shouldShowNudge(6, 3)).toBe(false);
  });

  it('does not show nudge when deadline has passed even if 1 short', () => {
    expect(shouldShowNudge(6, 5, true)).toBe(false);
  });

  it('does not show nudge when count_in is 0 and quorum is large', () => {
    expect(shouldShowNudge(10, 0)).toBe(false);
  });

  it('shows nudge at quorum_target - 1 (boundary check)', () => {
    expect(shouldShowNudge(8, 7)).toBe(true);
  });

  it('does not show nudge at exactly quorum_target (boundary check)', () => {
    expect(shouldShowNudge(8, 8)).toBe(false);
  });
});

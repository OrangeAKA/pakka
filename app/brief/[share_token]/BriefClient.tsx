'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trip, RSVPResponse, BudgetTier, AIDestinationBrief } from '@/lib/types';
import { formatDate, formatDeadline, isDeadlinePassed, BUDGET_LABELS } from '@/lib/utils';

// ─── Destination intelligence card ───────────────────────────────────────────

function DestinationBriefCard({ brief }: { brief: AIDestinationBrief }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: 'linear-gradient(160deg, #FDFAF5 0%, #F8F1E3 100%)',
        boxShadow: '0 2px 12px rgba(28,18,8,0.06), 0 0 0 1px rgba(28,18,8,0.05)',
      }}
    >
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
        Destination Intel
      </p>

      <ul className="space-y-1.5">
        {brief.lines.map((line, i) => (
          <li key={i} className="text-sm text-[var(--text-mid)] leading-relaxed">
            {line}
          </li>
        ))}
      </ul>

      {brief.confidence === 'low' && (
        <p className="text-xs text-[var(--text-muted)] border-t border-dashed border-[var(--border-light)] pt-2">
          Less-visited destination — verify travel times independently.
        </p>
      )}

      <p className="text-xs text-[var(--text-faint)]">
        AI-generated · May not reflect current conditions
      </p>
    </div>
  );
}

type Screen = 'summary' | 'rsvp' | 'confirmation';

interface ConfirmationData {
  count_in: number;
  quorum_target: number;
  response: RSVPResponse;
}

const SESSION_KEY_PREFIX = 'mtk_';

export default function BriefClient({
  trip,
  initialSessionToken,
  count_in,
}: {
  trip: Trip;
  initialSessionToken?: string;
  count_in: number;
}) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('summary');
  const [selectedResponse, setSelectedResponse] = useState<RSVPResponse | null>(null);
  const [selectedTier, setSelectedTier] = useState<BudgetTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);
  const [deadlinePassed] = useState(() => isDeadlinePassed(trip.rsvp_deadline));
  const [copied, setCopied] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(initialSessionToken ?? null);

  // Task 1: URL-based session token — ?s= is the canonical identifier
  useEffect(() => {
    if (initialSessionToken) {
      // Persist to localStorage so future visits without ?s= can reuse the same token
      try {
        localStorage.setItem(`${SESSION_KEY_PREFIX}${trip.share_token}`, initialSessionToken);
      } catch {
        // SecurityError in Safari private browsing — proceed without persistence
      }
      return;
    }

    // No ?s= in URL — retrieve existing or generate new, then redirect
    let token: string;
    try {
      const stored = localStorage.getItem(`${SESSION_KEY_PREFIX}${trip.share_token}`);
      token = stored ?? crypto.randomUUID();
      localStorage.setItem(`${SESSION_KEY_PREFIX}${trip.share_token}`, token);
    } catch {
      // SecurityError in Safari private browsing — generate ephemeral token
      token = crypto.randomUUID();
    }

    setSessionToken(token);
    router.replace(`${window.location.pathname}?s=${token}`);
  }, [initialSessionToken, trip.share_token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restore prior RSVP selection from localStorage
  useEffect(() => {
    try {
      const priorResponse = localStorage.getItem(
        `rsvp_response_${trip.share_token}`,
      ) as RSVPResponse | null;
      const priorTier = localStorage.getItem(
        `rsvp_tier_${trip.share_token}`,
      ) as BudgetTier | null;
      if (priorResponse) {
        setSelectedResponse(priorResponse);
        setSelectedTier(priorTier);
      }
    } catch {
      // SecurityError in Safari private browsing
    }
  }, [trip.share_token]);

  async function handleSubmit() {
    if (!selectedResponse || !sessionToken) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/rsvps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        share_token: trip.share_token,
        session_token: sessionToken,
        response: selectedResponse,
        budget_tier: selectedTier ?? undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Try again.');
      setLoading(false);
      return;
    }

    try {
      localStorage.setItem(`rsvp_response_${trip.share_token}`, selectedResponse);
      if (selectedTier) localStorage.setItem(`rsvp_tier_${trip.share_token}`, selectedTier);
    } catch {
      // SecurityError in Safari private browsing
    }

    setConfirmation({
      count_in: data.count_in,
      quorum_target: data.quorum_target,
      response: selectedResponse,
    });
    setScreen('confirmation');
    setLoading(false);
  }

  // ─── Screen 1: Summary ───────────────────────────────────────────────────────
  if (screen === 'summary') {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-8">
        <div className="max-w-sm mx-auto space-y-5">

          {/* Header — destination name + dates */}
          <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-semibold">
              Trip Brief
            </p>
            <h1
              className="text-4xl text-[var(--text)] leading-tight"
              style={{ fontFamily: 'var(--font-young-serif)' }}
            >
              {trip.destination}
            </h1>
            <p className="text-base text-[var(--text-mid)]">
              {formatDate(trip.date_from)} – {formatDate(trip.date_to)}
            </p>
          </div>

          {/* Brief card — invitation feel */}
          <div
            className="rounded-2xl p-5 space-y-4 animate-fade-in-up"
            style={{
              animationDelay: '80ms',
              background: 'linear-gradient(160deg, #FDFAF5 0%, #F8F1E3 100%)',
              boxShadow: '0 2px 16px rgba(28,18,8,0.07), 0 0 0 1px rgba(28,18,8,0.05)',
            }}
          >
            <div className="space-y-4 text-base">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">RSVP by</span>
                <span className="font-semibold text-[var(--text)] text-right">
                  {formatDeadline(trip.rsvp_deadline)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Min. people needed</span>
                <span className="font-semibold text-[var(--text)]">{trip.quorum_target}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-[var(--text-muted)]">Budget options</span>
                <div className="text-right space-y-0.5">
                  {trip.budget_tiers.map((tier) => (
                    <div key={tier} className="font-semibold text-[var(--text)] text-sm">
                      {BUDGET_LABELS[tier]}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {trip.planner_note && (
              <div className="pt-4 border-t border-dashed border-[var(--border-light)]">
                <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wide">
                  From the organiser
                </p>
                <blockquote className="border-l-2 border-[var(--accent)] pl-3 italic text-base text-[var(--text-mid)] leading-relaxed">
                  {trip.planner_note}
                </blockquote>
              </div>
            )}
          </div>

          {/* Destination intelligence card */}
          {trip.ai_destination_brief && (
            <div className="animate-fade-in-up" style={{ animationDelay: '160ms' }}>
              <DestinationBriefCard brief={trip.ai_destination_brief} />
            </div>
          )}

          {/* CTA */}
          <div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
            {deadlinePassed ? (
              <div className="border border-[var(--gold)] bg-[var(--gold-pale)] rounded-xl p-4 text-base text-[var(--gold)] text-center">
                The RSVP deadline for this trip has passed.
              </div>
            ) : (
              <button
                onClick={() => setScreen('rsvp')}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl py-4 text-base font-semibold transition-colors btn-lift"
              >
                {selectedResponse ? 'Update your RSVP' : 'Respond now →'}
              </button>
            )}
          </div>

          {selectedResponse && !deadlinePassed && (
            <p className="text-center text-sm text-[var(--text-muted)] animate-fade-in-up" style={{ animationDelay: '280ms' }}>
              Your current answer:{' '}
              <strong className="text-[var(--text-mid)]">
                {selectedResponse === 'in'
                  ? "I'm in"
                  : selectedResponse === 'out'
                    ? "I'm out"
                    : 'Need more time'}
              </strong>
            </p>
          )}

          {(trip.quorum_target - count_in) <= 2 && count_in < trip.quorum_target && !deadlinePassed && (
            <div className="rounded-xl border border-[var(--gold)] bg-[var(--gold-pale)] p-4 space-y-2 animate-fade-in-up" style={{ animationDelay: '320ms' }}>
              <p className="text-sm font-semibold text-[var(--text-mid)]">
                Almost there — {trip.quorum_target - count_in} more needed.
              </p>
              <p className="text-sm text-[var(--text-muted)]">Know someone who&apos;d be in?</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-sm font-semibold text-[var(--gold)] hover:opacity-80 transition-opacity"
              >
                {copied ? 'Copied!' : 'Share this trip →'}
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ─── Screen 2: RSVP form ─────────────────────────────────────────────────────
  if (screen === 'rsvp') {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-6">
        <div className="max-w-sm mx-auto space-y-6">
          {/* Back — large tap area */}
          <button
            onClick={() => setScreen('summary')}
            className="flex items-center gap-1 text-[var(--text-muted)] py-2 -ml-1 min-h-[44px]"
          >
            ← <span className="text-sm">Back</span>
          </button>

          {/* Destination heading */}
          <div className="space-y-0.5 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <h1
              className="text-2xl text-[var(--text)]"
              style={{ fontFamily: 'var(--font-young-serif)' }}
            >
              {trip.destination}
            </h1>
            <p className="text-base text-[var(--text-mid)]">
              {formatDate(trip.date_from)} – {formatDate(trip.date_to)}
            </p>
          </div>

          {/* Are you in? */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <p className="text-base font-semibold text-[var(--text)]">Are you in?</p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { value: 'in' as RSVPResponse, label: "I'm in", emoji: '✅' },
                  { value: 'out' as RSVPResponse, label: "I'm out", emoji: '❌' },
                  { value: 'maybe' as RSVPResponse, label: 'Need time', emoji: '🤔' },
                ] as const
              ).map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setSelectedResponse(value)}
                  className={`rsvp-option flex flex-col items-center gap-2 py-5 rounded-2xl border-2 text-sm font-semibold transition-colors
                    ${
                      selectedResponse === value
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
                    }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Budget vote — only show if "in" or "maybe" */}
          {(selectedResponse === 'in' || selectedResponse === 'maybe') && (
            <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
              <div>
                <p className="text-base font-semibold text-[var(--text)]">
                  Comfortable budget?{' '}
                  <span className="text-[var(--text-muted)] font-normal text-sm">(optional)</span>
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  Anonymous — organiser only sees the group total
                </p>
              </div>
              <div className="space-y-3">
                {trip.budget_tiers.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
                    className={`rsvp-option w-full text-left px-4 py-4 rounded-2xl border-2 text-base font-semibold transition-colors
                      ${
                        selectedTier === tier
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]'
                      }`}
                  >
                    {BUDGET_LABELS[tier]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-[var(--accent)] text-base">{error}</p>}

          <div className="animate-fade-in-up" style={{ animationDelay: '240ms' }}>
            <button
              onClick={handleSubmit}
              disabled={!selectedResponse || loading || !sessionToken}
              className="btn-lift w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:shadow-[inset_0_2px_4px_rgba(100,10,4,0.4)] text-white rounded-2xl py-4 text-base font-semibold disabled:opacity-40 transition-colors"
            >
              {loading ? 'Saving…' : "I'm Pakka"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Screen 3: Confirmation ──────────────────────────────────────────────────
  const isIn = confirmation?.response === 'in';

  return (
    <main className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-sm w-full animate-fade-in-up" style={{ animationDelay: '0ms' }}>
        {isIn ? (
          /* Ticket design for committed RSVP */
          <>
            {/* Crimson top half */}
            <div className="bg-[var(--accent)] rounded-t-2xl px-6 pt-8 pb-6 relative">
              {/* PAKKA stamp — slight rotation, bordered */}
              <div
                className="absolute top-5 right-5 border-[3px] border-white/70 rounded px-2.5 py-1"
                style={{ transform: 'rotate(-5deg)' }}
              >
                <span className="text-white text-sm font-bold tracking-[0.2em]">PAKKA</span>
              </div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                Trip Confirmed
              </p>
              <h1
                className="text-white text-3xl mt-1 leading-tight"
                style={{ fontFamily: 'var(--font-young-serif)' }}
              >
                {trip.destination}
              </h1>
              <p className="text-white/80 text-sm mt-2">
                {formatDate(trip.date_from)} – {formatDate(trip.date_to)}
              </p>
            </div>

            {/* Perforated divider — radial-gradient punches semi-circles from each edge */}
            <div
              className="relative h-6"
              style={{
                background: `
                  radial-gradient(circle at 0px 50%, var(--bg) 11px, transparent 11px),
                  radial-gradient(circle at 100% 50%, var(--bg) 11px, transparent 11px),
                  var(--accent)
                `,
              }}
            >
              <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-white/40" />
            </div>

            {/* Cream details half */}
            <div className="bg-[var(--surface)] rounded-b-2xl px-6 pt-5 pb-8 space-y-5">
              <div className="space-y-1.5">
                <p className="text-[var(--text)] text-lg font-semibold leading-snug">
                  Pakka ✅ You&apos;re confirmed for {trip.destination}.
                </p>
                {confirmation && (
                  <p className="text-[var(--text-mid)] text-base">
                    <strong className="text-[var(--green)]">{confirmation.count_in}</strong> of{' '}
                    <strong>{confirmation.quorum_target}</strong> people are in.
                  </p>
                )}
              </div>
              <p className="text-sm text-[var(--text-faint)]">
                RSVP deadline: {formatDeadline(trip.rsvp_deadline)}
              </p>
              <div className="pt-1 border-t border-dashed border-[var(--border-light)]">
                <Link
                  href="/create"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-mid)] transition-colors"
                >
                  Planning a trip yourself? →
                </Link>
              </div>
            </div>
          </>
        ) : (
          /* Simple state for out / maybe */
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-light)] p-8 text-center space-y-4">
            <div className="text-5xl">
              {confirmation?.response === 'out' ? '👋' : '⏳'}
            </div>
            <h1
              className="text-2xl text-[var(--text)]"
              style={{ fontFamily: 'var(--font-young-serif)' }}
            >
              {confirmation?.response === 'out'
                ? "Got it, you're out."
                : "Got it, we'll remind you."}
            </h1>
            {confirmation && (
              <p className="text-base text-[var(--text-mid)]">
                <strong>{confirmation.count_in}</strong> of{' '}
                <strong>{confirmation.quorum_target}</strong> people are in so far.
              </p>
            )}
            <p className="text-sm text-[var(--text-muted)]">
              RSVP by {formatDeadline(trip.rsvp_deadline)}
            </p>
            <button
              onClick={() => setScreen('summary')}
              className="w-full py-4 text-base text-[var(--text-mid)] border border-[var(--border)] rounded-2xl bg-[var(--bg)] transition-colors"
            >
              View trip details
            </button>
            <Link
              href="/create"
              className="block text-sm text-[var(--text-muted)] hover:text-[var(--text-mid)] transition-colors"
            >
              Planning a trip yourself? →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

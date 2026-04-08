'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardData, BudgetDistributionRow } from '@/lib/types';
import { formatDate, formatDeadline, BUDGET_LABELS } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Countdown hook
// ─────────────────────────────────────────────────────────────────────────────

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(deadline: string): TimeLeft | null {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function useCountdown(deadline: string) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(deadline));
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft(deadline)), 1_000);
    return () => clearInterval(id);
  }, [deadline]);
  return timeLeft;
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking helpers
// ─────────────────────────────────────────────────────────────────────────────

function airbnbUrl(destination: string, dateFrom: string, dateTo: string) {
  const q = encodeURIComponent(destination);
  return `https://www.airbnb.co.in/s/${q}/homes?checkin=${dateFrom}&checkout=${dateTo}`;
}

function mmtUrl(destination: string) {
  const q = encodeURIComponent(destination.toLowerCase());
  return `https://www.makemytrip.com/hotels/${q}.html`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quorum ring
// ─────────────────────────────────────────────────────────────────────────────

function QuorumRing({
  progress,
  countIn,
  quorumTarget,
  isQuorumReached,
}: {
  progress: number;
  countIn: number;
  quorumTarget: number;
  isQuorumReached: boolean;
}) {
  const r = 68;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - progress / 100);
  const strokeColor = isQuorumReached ? 'var(--green)' : 'var(--accent)';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="160" height="160" viewBox="0 0 160 160" aria-label={`${countIn} of ${quorumTarget} committed`}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--border-light)"
          strokeWidth="9"
        />
        {/* Arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress === 0 ? circumference : offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1), stroke 0.4s ease-out',
          }}
        />
        {/* Hero stat — count_in in Young Serif */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontFamily: 'var(--font-young-serif)',
            fontSize: '52px',
            fill: 'var(--text)',
          }}
        >
          {countIn}
        </text>
        {/* Sub label */}
        <text
          x={cx}
          y={cy + 22}
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-plus-jakarta-sans)',
            fontSize: '12px',
            fill: 'var(--text-muted)',
          }}
        >
          of {quorumTarget}
        </text>
      </svg>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{progress}% of quorum</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget bar chart
// ─────────────────────────────────────────────────────────────────────────────

function BudgetDistribution({ rows }: { rows: BudgetDistributionRow[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (total === 0) return null;
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const pct = Math.round((row.count / total) * 100);
        return (
          <div key={row.budget_tier} className="space-y-1">
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{BUDGET_LABELS[row.budget_tier]}</span>
              <span>{row.count} vote{row.count !== 1 ? 's' : ''} ({pct}%)</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border-light)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: 'var(--text-mid)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'quorum_reached') {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{ background: 'var(--green-pale)', color: 'var(--green)' }}
      >
        Quorum reached
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{ background: 'var(--gold-pale)', color: 'var(--gold)' }}
      >
        Deadline passed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: 'var(--accent-pale)', color: 'var(--accent)' }}
    >
      Active
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dashboard
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  initialData: DashboardData;
  shareToken: string;
}

export default function DashboardClient({ initialData, shareToken }: Props) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [copied, setCopied] = useState(false);
  const [copiedWaA, setCopiedWaA] = useState(false);
  const [copiedWaB, setCopiedWaB] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { trip, summary, budget_distribution, show_budget } = data;
  const timeLeft = useCountdown(trip.rsvp_deadline);

  // ── Polling every 30 s ────────────────────────────────────────────────────
  useEffect(() => {
    async function refresh() {
      try {
        const res = await fetch(`/api/dashboard/${shareToken}`, { cache: 'no-store' });
        if (res.ok) {
          const fresh: DashboardData = await res.json();
          setData(fresh);
        }
      } catch {
        // silent — stale data is fine; user sees last known state
      }
    }

    pollRef.current = setInterval(refresh, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [shareToken]);

  // ── Derived values ────────────────────────────────────────────────────────
  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : '';
  const briefUrl = `${appUrl}/brief/${shareToken}`;
  const shortfall = Math.max(0, trip.quorum_target - summary.count_in);
  const progress = Math.min(100, Math.round((summary.count_in / trip.quorum_target) * 100));

  // Generic fallback templates
  const genericNudgeText =
    `Hey everyone — ${shortfall} more people need to confirm by ${formatDeadline(trip.rsvp_deadline)} or we lose the dates. Takes 30 seconds: ${briefUrl}`;
  const genericConfirmedText =
    `Pakka ho gaya! ${summary.count_in} log ${trip.destination} ke liye confirm ho gaye. Dates: ${trip.date_from}–${trip.date_to}. Booking ke liye ready raho: ${briefUrl}`;

  // AI WhatsApp variants (null-safe fallback to generic templates)
  const aiMessages = trip.ai_whatsapp_messages;
  const waVariantA = aiMessages?.short ?? genericConfirmedText;
  const waVariantB = aiMessages?.context_rich ?? null;
  const waVariantC = aiMessages?.nudge ?? genericNudgeText;

  const nudgeText = waVariantC;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(nudgeText)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(briefUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
  }

  async function copyWaA() {
    await navigator.clipboard.writeText(waVariantA);
    setCopiedWaA(true);
    setTimeout(() => setCopiedWaA(false), 2_000);
  }

  async function copyWaB() {
    if (!waVariantB) return;
    await navigator.clipboard.writeText(waVariantB);
    setCopiedWaB(true);
    setTimeout(() => setCopiedWaB(false), 2_000);
  }

  // Budget note stale check
  const budgetNote = trip.ai_budget_note;
  const budgetNoteGeneratedAt = trip.ai_budget_note_generated_at;
  const isBudgetNoteStale =
    !!budgetNoteGeneratedAt &&
    Date.now() - new Date(budgetNoteGeneratedAt).getTime() > 24 * 60 * 60 * 1000;
  const budgetNoteDate = budgetNoteGeneratedAt
    ? new Date(budgetNoteGeneratedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Your trip</p>
              <h1 className="text-2xl" style={{ fontFamily: 'var(--font-young-serif)', color: 'var(--text)' }}>{trip.destination}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {formatDate(trip.date_from)} – {formatDate(trip.date_to)}
              </p>
            </div>
            <StatusBadge status={trip.status} />
          </div>
        </div>

        {/* RSVP counts — quorum ring */}
        <div
          className="rounded-2xl shadow-sm p-5 space-y-4 card-hover animate-fade-in-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', animationDelay: '60ms' }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Committed</p>

          <div className="flex justify-center">
            <QuorumRing
              progress={progress}
              countIn={summary.count_in}
              quorumTarget={trip.quorum_target}
              isQuorumReached={trip.status === 'quorum_reached'}
            />
          </div>

          {/* Breakdown */}
          <div
            className="grid grid-cols-3 gap-2 pt-1"
            style={{ borderTop: '1px dashed var(--border-light)' }}
          >
            <div className="text-center">
              <p className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{summary.count_in}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>In</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{summary.count_maybe}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Maybe</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold tabular-nums" style={{ color: 'var(--text)' }}>{summary.count_out}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Out</p>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div
          className="rounded-2xl shadow-sm p-5 card-hover animate-fade-in-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', animationDelay: '120ms' }}
        >
          {timeLeft ? (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Time left to RSVP</p>
              <div className="flex gap-4">
                {[
                  { value: timeLeft.days, label: 'd' },
                  { value: timeLeft.hours, label: 'h' },
                  { value: timeLeft.minutes, label: 'm' },
                  { value: timeLeft.seconds, label: 's' },
                ].map(({ value, label }) => (
                  <div key={label} className="text-center min-w-[2.5rem]">
                    <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>{String(value).padStart(2, '0')}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : trip.status === 'active' ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>RSVP deadline</p>
                <p className="text-sm font-medium" style={{ color: 'var(--gold)' }}>
                  Deadline passed — calculating final count…
                </p>
              </div>
              <span className="text-2xl">⏳</span>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>RSVP deadline</p>
                <p className="text-sm font-medium" style={{ color: 'var(--gold)' }}>{formatDeadline(trip.rsvp_deadline)}</p>
              </div>
              <span className="text-2xl">⏰</span>
            </div>
          )}
        </div>

        {/* Budget distribution */}
        {show_budget && budget_distribution.length > 0 && (
          <div
            className="rounded-2xl shadow-sm p-5 space-y-3 card-hover animate-fade-in-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', animationDelay: '180ms' }}
          >
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Budget votes</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Anonymous — individual selections are hidden</p>
            </div>
            <BudgetDistribution rows={budget_distribution} />
            {budgetNote && (
              <div
                className="pt-3 space-y-1"
                style={{ borderTop: '1px dashed var(--border-light)' }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>
                  {budgetNote}
                </p>
                {isBudgetNoteStale && budgetNoteDate && (
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    Budget snapshot as of {budgetNoteDate}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quorum reached: booking links + WhatsApp copy */}
        {trip.status === 'quorum_reached' && (
          <div
            className="rounded-2xl p-5 space-y-3 animate-fade-in-up"
            style={{ background: 'var(--green-pale)', border: '1px solid rgba(45,106,79,0.2)', animationDelay: '180ms' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--green)' }}>Your group is ready to book!</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--green)' }}>
                {trip.quorum_target} people committed. Time to lock in dates.
              </p>
            </div>
            {/* WhatsApp variants A + B */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--green)' }}>
                Share the news
              </p>
              {/* Variant A */}
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ background: 'var(--surface)', border: '1px solid rgba(45,106,79,0.2)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Variant A</span>
                  <button
                    onClick={copyWaA}
                    className="shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors btn-lift"
                    style={{ background: 'var(--green-pale)', color: 'var(--green)' }}
                  >
                    {copiedWaA ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>{waVariantA}</p>
              </div>
              {/* Variant B — only shown if available */}
              {waVariantB && (
                <div
                  className="rounded-xl p-3 space-y-2"
                  style={{ background: 'var(--surface)', border: '1px solid rgba(45,106,79,0.2)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Variant B</span>
                    <button
                      onClick={copyWaB}
                      className="shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors btn-lift"
                      style={{ background: 'var(--green-pale)', color: 'var(--green)' }}
                    >
                      {copiedWaB ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-mid)' }}>{waVariantB}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={airbnbUrl(trip.destination, trip.date_from, trip.date_to)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid rgba(45,106,79,0.2)', color: 'var(--text)' }}
              >
                <span>🏠</span> Airbnb
              </a>
              <a
                href={mmtUrl(trip.destination)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors"
                style={{ background: 'var(--surface)', border: '1px solid rgba(45,106,79,0.2)', color: 'var(--text)' }}
              >
                <span>✈️</span> MakeMyTrip
              </a>
            </div>
          </div>
        )}

        {/* Share + nudge */}
        <div
          className="rounded-2xl shadow-sm p-5 space-y-4 card-hover animate-fade-in-up"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', animationDelay: '240ms' }}
        >
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Share with your group</p>
          </div>

          {/* Brief link */}
          <div className="flex gap-2">
            <div
              className="flex-1 rounded-lg px-3 py-2.5 text-sm truncate font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              {briefUrl}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2.5 rounded-lg text-sm font-medium shrink-0 transition-opacity btn-lift"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* WhatsApp nudge — variant C */}
          {trip.status !== 'quorum_reached' && shortfall > 0 && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Still need {shortfall} more — send a nudge:
              </p>
              <div
                className="rounded-xl p-3 space-y-2"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  {aiMessages?.nudge && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Variant C</span>
                  )}
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(nudgeText);
                    }}
                    className="ml-auto shrink-0 px-3 py-1 rounded-lg text-xs font-medium btn-lift"
                    style={{ background: 'var(--accent-pale)', color: 'var(--accent)' }}
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-mid)' }}>{nudgeText}</p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-medium btn-lift"
                style={{ background: '#25D366', color: '#fff' }}
              >
                <span>💬</span> Send via WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* Planner note (if set) */}
        {trip.planner_note && (
          <div
            className="rounded-2xl shadow-sm p-5 space-y-1 card-hover animate-fade-in-up"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', animationDelay: '300ms' }}
          >
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Your note to the group</p>
            <p className="text-sm" style={{ color: 'var(--text-mid)' }}>{trip.planner_note}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs" style={{ color: 'var(--text-faint)' }}>
          Refreshes automatically every 30 seconds
        </p>

      </div>
    </main>
  );
}

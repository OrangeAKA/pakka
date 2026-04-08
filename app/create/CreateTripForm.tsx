'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BudgetTier, DEFAULT_BUDGET_TIERS } from '@/lib/types';
import { BUDGET_LABELS } from '@/lib/utils';

// Default RSVP deadline: 7 days from now at 9 PM
function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(21, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export default function CreateTripForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [destination, setDestination] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [quorum, setQuorum] = useState('');
  const [note, setNote] = useState('');
  const [tiers, setTiers] = useState<BudgetTier[]>([...DEFAULT_BUDGET_TIERS]);

  function toggleTier(tier: BudgetTier) {
    setTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (tiers.length === 0) {
      setError('Select at least one budget tier.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination,
        date_from: dateFrom,
        date_to: dateTo,
        rsvp_deadline: new Date(deadline).toISOString(),
        quorum_target: parseInt(quorum, 10),
        budget_tiers: tiers,
        planner_note: note || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.');
      setLoading(false);
      return;
    }

    router.push(`/dashboard/${data.share_token}`);
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-5 space-y-5 card-invitation"
      style={{ border: '1.5px solid var(--text-faint)' }}
    >
      {/* Destination */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
          Destination
        </label>
        <input
          type="text"
          placeholder="Goa, Manali, Bali..."
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
          autoComplete="off"
          className="form-input"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
            From
          </label>
          <input
            type="date"
            min={today}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
            To
          </label>
          <input
            type="date"
            min={dateFrom || today}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            required
            className="form-input"
          />
        </div>
      </div>

      {/* Budget tiers */}
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
            Budget range options
          </label>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Members pick one anonymously
          </p>
        </div>
        <div className="space-y-1">
          {DEFAULT_BUDGET_TIERS.map((tier) => (
            <label
              key={tier}
              className="flex items-center gap-3 py-3 px-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={tiers.includes(tier)}
                onChange={() => toggleTier(tier)}
                className="w-5 h-5 rounded shrink-0"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-base" style={{ color: 'var(--text-mid)' }}>
                {BUDGET_LABELS[tier]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* RSVP deadline */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
          RSVP deadline
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            min={today}
            value={deadline.slice(0, 10)}
            onChange={(e) => {
              const time = deadline.slice(11, 16) || '21:00';
              setDeadline(`${e.target.value}T${time}`);
            }}
            required
            className="form-input"
          />
          <input
            type="time"
            value={deadline.slice(11, 16)}
            onChange={(e) => {
              const date = deadline.slice(0, 10);
              setDeadline(`${date}T${e.target.value}`);
            }}
            required
            className="form-input"
          />
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Default: 7 days from now at 9 PM. Change if you need more or less time.
        </p>
      </div>

      {/* Quorum */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
          Minimum people needed
        </label>
        <input
          type="number"
          min={1}
          max={100}
          placeholder="e.g. 6"
          value={quorum}
          onChange={(e) => setQuorum(e.target.value)}
          required
          inputMode="numeric"
          className="form-input"
        />
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Tip: 60-70% of your group works well. For 10 people, that&apos;s 6-7.
        </p>
      </div>

      {/* Planner note */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium" style={{ color: 'var(--text-mid)' }}>
          Note to the group{' '}
          <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
        </label>
        <textarea
          placeholder="Rough plan, vibe, anything helpful..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="form-input resize-none"
        />
      </div>

      {error && (
        <p className="text-base" style={{ color: 'var(--accent)' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl px-4 py-4 text-base font-semibold disabled:opacity-50 transition-colors btn-lift"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {loading ? 'Creating...' : 'Create Trip Brief'}
      </button>
    </form>
  );
}

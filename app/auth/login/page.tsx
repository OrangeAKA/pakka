'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <div
            className="w-12 h-12 rounded-full mx-auto flex items-center justify-center"
            style={{ background: 'var(--accent-pale)' }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2.5 10.5L7.5 15.5L17.5 5.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1
            className="text-xl"
            style={{ fontFamily: 'var(--font-young-serif)', color: 'var(--text)' }}
          >
            Check your email
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            We sent a magic link to <strong style={{ color: 'var(--text-mid)' }}>{email}</strong>. Tap it to sign in.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'var(--font-young-serif)', color: 'var(--text)' }}
          >
            Sign in to Pakka
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>We&apos;ll email you a magic link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          {error && <p className="text-sm" style={{ color: 'var(--accent)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      </div>
    </main>
  );
}

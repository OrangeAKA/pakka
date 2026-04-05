import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <h1
              className="text-4xl leading-tight"
              style={{ fontFamily: 'var(--font-young-serif)', color: 'var(--text)' }}
            >
              Stop chasing your group.<br />
              <span style={{ color: 'var(--text-muted)' }}>Start planning.</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Create a Trip Brief, share the link on WhatsApp — your group RSVPs in 30 seconds.
              No app install. No more &quot;let me check and get back to you.&quot;
            </p>
          </div>

          <Link
            href="/create"
            className="inline-block bg-accent hover:bg-accent-hover rounded-xl px-8 py-3.5 text-sm font-semibold transition-colors text-white"
          >
            Plan a trip with friends →
          </Link>

          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Free to use. No app needed for your group.</p>
        </div>
      </section>

      {/* How it works */}
      <section
        className="px-6 py-14"
        style={{ borderTop: '1px solid var(--border-light)', background: 'var(--surface)' }}
      >
        <div className="max-w-md mx-auto space-y-8">
          <h2 className="text-lg font-semibold text-center" style={{ color: 'var(--text)' }}>How it works</h2>
          <ol className="space-y-6">
            {[
              {
                step: '1',
                title: 'Create a Trip Brief',
                desc: 'Set the destination, dates, budget range, and a deadline. Takes 2 minutes.',
              },
              {
                step: '2',
                title: 'Share the link',
                desc: 'Paste it in your WhatsApp group. Your friends tap it — no sign-up needed.',
              },
              {
                step: '3',
                title: 'Watch commitments roll in',
                desc: "Your dashboard shows who's in, the group's budget range, and how many more you need.",
              },
              {
                step: '4',
                title: 'Book with confidence',
                desc: "When your quorum is hit, you'll get notified with booking links. Trip is happening.",
              },
            ].map(({ step, title, desc }) => (
              <li key={step} className="flex gap-4">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {step}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{title}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="text-center pt-2">
            <Link
              href="/create"
              className="inline-block bg-accent hover:bg-accent-hover rounded-xl px-8 py-3 text-sm font-semibold transition-colors text-white"
            >
              Create your first Trip Brief
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-6 text-center"
        style={{ borderTop: '1px solid var(--border-light)' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Pakka — built for Indian friend groups</p>
      </footer>
    </main>
  );
}

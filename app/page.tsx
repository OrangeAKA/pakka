import Link from 'next/link';

function RouteLine() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 500"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* A wandering dotted route line — like a path on a hand-drawn map */}
      <path
        d="M -20 80 C 60 120, 140 40, 200 100 S 340 60, 380 140 S 280 200, 320 260 S 420 300, 380 380 S 200 420, 240 500"
        stroke="var(--text-faint)"
        strokeWidth="1.5"
        strokeDasharray="6 8"
        strokeLinecap="round"
        opacity="0.35"
        pathLength="1"
        className="animate-route-draw"
      />
      {/* Small waypoint dots along the route */}
      <circle cx="200" cy="100" r="3" fill="var(--accent)" opacity="0" className="animate-fade-in-up" style={{ animationDelay: '1.2s' }} />
      <circle cx="320" cy="260" r="3" fill="var(--accent)" opacity="0" className="animate-fade-in-up" style={{ animationDelay: '1.8s' }} />
      <circle cx="240" cy="500" r="3" fill="var(--accent)" opacity="0" className="animate-fade-in-up" style={{ animationDelay: '2.4s' }} />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        <RouteLine />
        <div className="max-w-md space-y-6 relative z-10">
          <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <h1
              className="text-4xl leading-tight"
              style={{ fontFamily: 'var(--font-young-serif)', color: 'var(--text)' }}
            >
              Your next trip starts here.<br />
              <span style={{ color: 'var(--text-muted)' }}>Bring everyone along this time.</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Share a Trip Brief on WhatsApp — your group RSVPs in 30 seconds, no sign-up needed.
              When your quorum is hit, you know it&apos;s happening.
            </p>
          </div>

          <Link
            href="/create"
            className="inline-block btn-lift bg-accent hover:bg-accent-hover rounded-xl px-8 py-3.5 text-sm font-semibold transition-colors text-white animate-fade-in-up"
            style={{ animationDelay: '80ms' }}
          >
            Plan a trip with friends →
          </Link>

          <p
            className="text-xs animate-fade-in-up"
            style={{ color: 'var(--text-faint)', animationDelay: '140ms' }}
          >
            Free to use. No app needed for your group.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section
        className="px-6 py-14"
        style={{ borderTop: '1px solid var(--border-light)', background: 'var(--surface)' }}
      >
        <div className="max-w-md mx-auto space-y-8">
          <h2
            className="text-lg text-center animate-fade-in-up"
            style={{ fontFamily: 'var(--font-young-serif)', color: 'var(--text)', animationDelay: '0ms' }}
          >
            How it works
          </h2>
          <ol className="space-y-6">
            {[
              {
                step: '1',
                title: 'Create a Trip Brief',
                desc: 'Pick your destination, dates, budget, and how many people you need. Two minutes and you\'re done.',
              },
              {
                step: '2',
                title: 'Share the link',
                desc: 'Drop it in the WhatsApp group. Friends tap and RSVP instantly — no app, no account.',
              },
              {
                step: '3',
                title: 'Watch the group come together',
                desc: "Your dashboard shows who's in, what budget range the group lands on, and how close you are.",
              },
              {
                step: '4',
                title: 'Book when you\'re ready',
                desc: "Hit your quorum and you'll know. No more guessing — the trip is actually happening.",
              },
            ].map(({ step, title, desc }, i) => (
              <li
                key={step}
                className="flex gap-4 animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="step-postmark shrink-0 mt-0.5">
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
              className="inline-block btn-lift bg-accent hover:bg-accent-hover rounded-xl px-8 py-3 text-sm font-semibold transition-colors text-white animate-fade-in-up"
              style={{ animationDelay: '240ms' }}
            >
              Start planning
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

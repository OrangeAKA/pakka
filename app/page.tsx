import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              Stop chasing your group.<br />
              <span className="text-gray-400">Start planning.</span>
            </h1>
            <p className="text-gray-500 text-base leading-relaxed">
              Create a Trip Brief, share the link on WhatsApp — your group RSVPs in 30 seconds.
              No app install. No more &quot;let me check and get back to you.&quot;
            </p>
          </div>

          <Link
            href="/create"
            className="inline-block bg-black text-white rounded-xl px-8 py-3.5 text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Plan a trip with friends →
          </Link>

          <p className="text-xs text-gray-400">Free to use. No app needed for your group.</p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-14">
        <div className="max-w-md mx-auto space-y-8">
          <h2 className="text-lg font-semibold text-center">How it works</h2>
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
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {step}
                </div>
                <div>
                  <p className="font-medium text-sm">{title}</p>
                  <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="text-center pt-2">
            <Link
              href="/create"
              className="inline-block bg-black text-white rounded-xl px-8 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Create your first Trip Brief
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center">
        <p className="text-xs text-gray-400">Pakka — built for Indian friend groups</p>
      </footer>
    </main>
  );
}

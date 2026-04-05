import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Trip } from '@/lib/types';
import BriefClient from './BriefClient';

interface Props {
  params: Promise<{ share_token: string }>;
  searchParams: Promise<{ s?: string }>;
}

export default async function BriefPage({ params, searchParams }: Props) {
  const { share_token } = await params;
  const { s } = await searchParams;
  const supabase = await createClient();

  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', share_token)
    .single();

  if (!trip || error) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <p className="text-[var(--text)] text-xl font-semibold">Link not found.</p>
          <Link
            href="/create"
            className="inline-block text-sm text-[var(--text-muted)] hover:text-[var(--text-mid)] transition-colors"
          >
            Create your own trip in 2 minutes. →
          </Link>
        </div>
      </main>
    );
  }

  const { data: summary } = await supabase
    .from('trip_rsvp_summary')
    .select('count_in')
    .eq('trip_id', trip.id)
    .single();
  const count_in = summary?.count_in ?? 0;

  if (trip.status === 'expired') {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <p className="text-[var(--text)] text-xl font-semibold">
            This trip&apos;s RSVP window has closed.
          </p>
          <Link
            href="/create"
            className="inline-block text-sm text-[var(--text-muted)] hover:text-[var(--text-mid)] transition-colors"
          >
            Planning your own trip? →
          </Link>
        </div>
      </main>
    );
  }

  return <BriefClient trip={trip as Trip} initialSessionToken={s} count_in={count_in} />;
}

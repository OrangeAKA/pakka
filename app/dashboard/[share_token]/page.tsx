import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Trip, RSVPSummary, BudgetDistributionRow, DashboardData } from '@/lib/types';
import { shouldShowBudget, dominantBudgetTier } from '@/lib/utils';
import { generateBudgetNote } from '@/lib/ai';
import DashboardClient from './DashboardClient';

interface Props {
  params: Promise<{ share_token: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { share_token } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=/dashboard/${share_token}`);
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', share_token)
    .eq('planner_id', user.id)
    .single();

  if (!trip) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-3xl">🔍</p>
          <h1 className="text-xl font-semibold">Trip not found</h1>
          <p className="text-gray-500 text-sm">
            This trip doesn&apos;t exist or you don&apos;t have access to it.
          </p>
        </div>
      </main>
    );
  }

  const { data: summaryRow } = await supabase
    .from('trip_rsvp_summary')
    .select('*')
    .eq('trip_id', trip.id)
    .single();

  const summary: RSVPSummary = summaryRow ?? {
    trip_id: trip.id,
    count_in: 0,
    count_out: 0,
    count_maybe: 0,
    count_total: 0,
  };

  const { data: budgetRows } = await supabase
    .from('trip_budget_distribution')
    .select('*')
    .eq('trip_id', trip.id);

  const budget_distribution: BudgetDistributionRow[] = budgetRows ?? [];
  const show_budget = shouldShowBudget(budget_distribution, trip.quorum_target);

  // Lazy budget note: generate when quorum is first crossed and note doesn't exist yet
  let ai_budget_note: string | null = (trip as Trip).ai_budget_note ?? null;
  const quorumHit = summary.count_in >= trip.quorum_target;
  if (quorumHit && !ai_budget_note && budget_distribution.length > 0) {
    const dominant = dominantBudgetTier(budget_distribution);
    if (dominant) {
      const generated = await generateBudgetNote(trip.destination, dominant, summary.count_in);
      if (generated) {
        ai_budget_note = generated;
        // Persist non-blocking — dashboard render doesn't wait for this
        const admin = createAdminClient();
        admin
          .from('trips')
          .update({
            ai_budget_note: generated,
            ai_budget_note_generated_at: new Date().toISOString(),
          })
          .eq('id', trip.id)
          .then(({ error }) => {
            if (error) console.error('Failed to persist budget note:', error);
          });
      }
    }
  }

  const initialData: DashboardData = {
    trip: trip as Trip,
    summary,
    budget_distribution,
    show_budget,
    ai_budget_note,
  };

  return <DashboardClient initialData={initialData} shareToken={share_token} />;
}

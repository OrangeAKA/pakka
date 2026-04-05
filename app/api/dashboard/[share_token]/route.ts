import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DashboardData, RSVPSummary, BudgetDistributionRow } from '@/lib/types';
import { shouldShowBudget } from '@/lib/utils';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ share_token: string }> },
) {
  const { share_token } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', share_token)
    .eq('planner_id', user.id)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
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

  const payload: DashboardData = { trip, summary, budget_distribution, show_budget };
  return NextResponse.json(payload);
}

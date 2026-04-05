import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SubmitRSVPInput, SubmitRSVPResponse } from '@/lib/types';

export async function POST(request: Request) {
  const supabase = await createClient();

  let body: SubmitRSVPInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { share_token, session_token, response: rsvpResponse, budget_tier } = body;

  if (!share_token || !session_token || !rsvpResponse) {
    return NextResponse.json({ error: 'share_token, session_token, and response are required' }, { status: 400 });
  }

  if (!['in', 'out', 'maybe'].includes(rsvpResponse)) {
    return NextResponse.json({ error: 'response must be in, out, or maybe' }, { status: 400 });
  }

  if (budget_tier !== undefined && budget_tier !== null && !['5k-10k', '10k-20k', '20k+'].includes(budget_tier)) {
    return NextResponse.json({ error: 'invalid budget_tier' }, { status: 400 });
  }

  // Fetch the trip by share_token
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, rsvp_deadline, quorum_target, status')
    .eq('share_token', share_token)
    .single();

  if (tripError || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  // Reject if deadline has passed
  if (new Date(trip.rsvp_deadline) < new Date()) {
    return NextResponse.json(
      { error: 'The RSVP deadline for this trip has passed.' },
      { status: 410 },
    );
  }

  // Upsert RSVP — idempotent on (trip_id, session_token)
  const { error: upsertError } = await supabase
    .from('rsvps')
    .upsert(
      {
        trip_id: trip.id,
        session_token,
        response: rsvpResponse,
        budget_tier: budget_tier ?? null,
      },
      { onConflict: 'trip_id,session_token' },
    );

  if (upsertError) {
    console.error('RSVP upsert error:', upsertError);
    return NextResponse.json({ error: 'Failed to save RSVP' }, { status: 500 });
  }

  // Return current 'in' count for the confirmation screen.
  // Use admin client: the view is restricted to authenticated planners,
  // but here the caller is an anonymous member.
  const admin = createAdminClient();
  const { count } = await admin
    .from('rsvps')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', trip.id)
    .eq('response', 'in');

  const result: SubmitRSVPResponse = {
    success: true,
    count_in: count ?? 0,
    quorum_target: trip.quorum_target,
  };

  return NextResponse.json(result, { status: 200 });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CreateTripInput, CreateTripResponse } from '@/lib/types';
import { generateDestinationBrief, generateWhatsAppMessages } from '@/lib/ai';

// ─────────────────────────────────────────────────────────────────────────────
// Email helper (Resend)
// ─────────────────────────────────────────────────────────────────────────────

async function sendTripCreatedEmail(
  to: string,
  destination: string,
  dateFrom: string,
  dateTo: string,
  deadline: string,
  shareUrl: string,
  dashboardUrl: string,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return; // silently skip in local dev without key

  const fromEmail = process.env.FROM_EMAIL ?? 'Pakka <notify@pakka.app>';
  const subject = `Your Pakka trip brief is ready — ${destination}`;

  const deadlineFormatted = new Date(deadline).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

  const html = `
<p>Your trip brief for <strong>${destination}</strong> is live!</p>
<ul>
  <li><strong>Dates:</strong> ${dateFrom} – ${dateTo}</li>
  <li><strong>RSVP deadline:</strong> ${deadlineFormatted}</li>
</ul>
<p>
  <strong>Share this link with your group:</strong><br />
  <a href="${shareUrl}">${shareUrl}</a>
</p>
<p>
  <a href="${dashboardUrl}">Track RSVPs on your dashboard →</a>
</p>
<p style="color:#888;font-size:12px">Pakka — commit before you plan</p>
`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: fromEmail, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Resend error ${res.status}: ${body}`);
    // Non-fatal: trip was created; log and continue
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/trips
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreateTripInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate required fields
  const { destination, date_from, date_to, rsvp_deadline, quorum_target, budget_tiers, planner_note } = body;

  if (!destination?.trim()) {
    return NextResponse.json({ error: 'destination is required' }, { status: 400 });
  }
  if (!date_from || !date_to) {
    return NextResponse.json({ error: 'date_from and date_to are required' }, { status: 400 });
  }
  if (new Date(date_to) < new Date(date_from)) {
    return NextResponse.json({ error: 'date_to must be on or after date_from' }, { status: 400 });
  }
  if (!rsvp_deadline) {
    return NextResponse.json({ error: 'rsvp_deadline is required' }, { status: 400 });
  }
  if (!quorum_target || quorum_target < 1) {
    return NextResponse.json({ error: 'quorum_target must be at least 1' }, { status: 400 });
  }
  if (quorum_target > 100) {
    return NextResponse.json({ error: 'quorum_target must be 100 or fewer' }, { status: 400 });
  }

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      planner_id: user.id,
      destination: destination.trim(),
      date_from,
      date_to,
      budget_tiers: budget_tiers ?? ['5k-10k', '10k-20k', '20k+'],
      rsvp_deadline,
      quorum_target,
      planner_note: planner_note?.trim() ?? null,
    })
    .select('id, share_token')
    .single();

  if (error) {
    console.error('Trip insert error:', error);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const shareUrl = `${appUrl}/brief/${trip.share_token}`;
  const dashboardUrl = `${appUrl}/dashboard/${trip.share_token}`;

  const response: CreateTripResponse = {
    trip_id: trip.id,
    share_token: trip.share_token,
    share_url: shareUrl,
  };

  // Send confirmation email — non-fatal if it fails
  if (user.email) {
    sendTripCreatedEmail(
      user.email,
      destination.trim(),
      date_from,
      date_to,
      rsvp_deadline,
      shareUrl,
      dashboardUrl,
    ).catch((err) => console.error('Trip created email failed:', err));
  }

  // Fire parallel Groq calls and persist results — non-fatal
  ;(async () => {
    try {
      const [brief, messages] = await Promise.all([
        generateDestinationBrief(destination.trim(), date_from, date_to),
        generateWhatsAppMessages(
          destination.trim(),
          date_from,
          date_to,
          shareUrl,
          quorum_target,
          planner_note?.trim(),
          rsvp_deadline,
        ),
      ]);

      if (!brief && !messages) return;

      const admin = createAdminClient();
      await admin
        .from('trips')
        .update({
          ...(brief ? {
            ai_destination_brief: {
              ...brief,
              generated_at: new Date().toISOString(),
              model: 'llama-3.3-70b-versatile',
            },
          } : {}),
          ...(messages ? { ai_whatsapp_messages: messages } : {}),
        })
        .eq('id', trip.id);
    } catch (err) {
      console.error('AI generation failed:', err);
    }
  })();

  return NextResponse.json(response, { status: 201 });
}

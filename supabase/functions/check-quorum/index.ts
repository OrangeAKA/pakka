// supabase/functions/check-quorum/index.ts
//
// Cron: every 5 minutes (configured in supabase/config.toml)
//
// FLOW:
// ─────────────────────────────────────────────────────
// Fetch active trips where notified_at IS NULL
//   │
//   ├── for each trip:
//   │   ├── count RSVPs where response = 'in'
//   │   ├── quorum reached? (count_in >= quorum_target)
//   │   │       → send email (+ SMS if phone on file) to planner
//   │   │       → UPDATE trips SET status='quorum_reached', notified_at=NOW()
//   │   │
//   │   └── deadline passed? (rsvp_deadline < NOW())
//   │           → send nudge email (+ SMS) to planner
//   │           → UPDATE trips SET status='expired', notified_at=NOW()
//   │
//   └── trips with notified_at IS NOT NULL → skip (idempotent)
// ─────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';

// ── env ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER');
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pakka.app';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Pakka <notify@pakka.app>';

// ── Supabase admin client (bypasses RLS) ─────────────────────────────────────

function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── notification helpers ──────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({ From: TWILIO_FROM_NUMBER, To: to, Body: body });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Twilio error ${res.status}:`, text);
    // Non-fatal: email was already sent; log and continue
  }
}

// ── copy helpers ──────────────────────────────────────────────────────────────

function briefUrl(shareToken: string) {
  return `${APP_URL}/brief/${shareToken}`;
}

function dashboardUrl(shareToken: string) {
  return `${APP_URL}/dashboard/${shareToken}`;
}

function nudgeWhatsAppText(shortfall: number, link: string, deadline: string): string {
  return `Hey everyone — ${shortfall} more ${shortfall === 1 ? 'person needs' : 'people need'} to confirm by ${deadline} or we lose the dates. Takes 30 seconds: ${link}`;
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

// ── email templates ───────────────────────────────────────────────────────────

function quorumReachedEmail(destination: string, countIn: number, dashUrl: string): string {
  return `
<p>Great news — your trip to <strong>${destination}</strong> has reached quorum!</p>
<p><strong>${countIn} people</strong> are in. Time to book.</p>
<p><a href="${dashUrl}">Open your dashboard →</a></p>
<p style="color:#888;font-size:12px">Pakka — commit before you plan</p>
`;
}

function deadlineExpiredEmail(
  destination: string,
  countIn: number,
  quorumTarget: number,
  nudgeText: string,
  dashUrl: string,
): string {
  const shortfall = quorumTarget - countIn;
  return `
<p>The RSVP deadline for your trip to <strong>${destination}</strong> has passed.</p>
<p><strong>${countIn} of ${quorumTarget}</strong> needed responded — ${shortfall > 0 ? `still ${shortfall} short of quorum` : 'quorum was reached'}.</p>
${shortfall > 0 ? `
<p><strong>Nudge your group</strong> — copy this message into WhatsApp:</p>
<blockquote style="background:#f4f4f4;padding:12px;border-left:3px solid #888;font-family:monospace">
  ${nudgeText}
</blockquote>
` : ''}
<p><a href="${dashUrl}">View your dashboard →</a></p>
<p style="color:#888;font-size:12px">Pakka — commit before you plan</p>
`;
}

// ── main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  const supabase = adminClient();
  const now = new Date().toISOString();

  // 1. Fetch active trips where we haven't notified yet
  const { data: trips, error: tripsErr } = await supabase
    .from('trips')
    .select('id, planner_id, destination, rsvp_deadline, quorum_target, share_token')
    .eq('status', 'active')
    .is('notified_at', null);

  if (tripsErr) {
    console.error('Failed to fetch trips:', tripsErr.message);
    return new Response(JSON.stringify({ error: tripsErr.message }), { status: 500 });
  }

  if (!trips || trips.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
  }

  const results: Array<{ trip_id: string; action: string; error?: string }> = [];

  for (const trip of trips) {
    try {
      // 2. Count 'in' RSVPs for this trip (uses service role — bypasses RLS)
      const { count, error: countErr } = await supabase
        .from('rsvps')
        .select('id', { count: 'exact', head: true })
        .eq('trip_id', trip.id)
        .eq('response', 'in');

      if (countErr) throw new Error(`Count error: ${countErr.message}`);

      const countIn = count ?? 0;
      const deadlinePassed = new Date(trip.rsvp_deadline) < new Date(now);
      const quorumReached = countIn >= trip.quorum_target;

      // Only notify if quorum reached OR deadline passed
      if (!quorumReached && !deadlinePassed) {
        results.push({ trip_id: trip.id, action: 'skipped:no_trigger' });
        continue;
      }

      // 3. Look up planner email + phone from auth.users
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(
        trip.planner_id,
      );
      if (userErr || !userData.user) throw new Error(`User lookup failed: ${userErr?.message}`);

      const plannerEmail = userData.user.email;
      const plannerPhone = userData.user.phone; // may be undefined in email-only auth

      if (!plannerEmail) throw new Error('Planner has no email address');

      const shareLink = briefUrl(trip.share_token);
      const dashLink = dashboardUrl(trip.share_token);
      const deadlineFormatted = formatDeadline(trip.rsvp_deadline);
      const shortfall = Math.max(0, trip.quorum_target - countIn);
      const nudgeText = nudgeWhatsAppText(shortfall, shareLink, deadlineFormatted);

      let newStatus: 'quorum_reached' | 'expired';
      let subject: string;
      let emailHtml: string;
      let smsBody: string;

      if (quorumReached) {
        newStatus = 'quorum_reached';
        subject = `Your ${trip.destination} trip has quorum — time to book!`;
        emailHtml = quorumReachedEmail(trip.destination, countIn, dashLink);
        smsBody = `Pakka: Your ${trip.destination} trip reached quorum! ${countIn} people are in. Book now: ${dashLink}`;
      } else {
        // deadline passed without quorum
        newStatus = 'expired';
        subject = `RSVP deadline passed for your ${trip.destination} trip`;
        emailHtml = deadlineExpiredEmail(
          trip.destination,
          countIn,
          trip.quorum_target,
          nudgeText,
          dashLink,
        );
        smsBody =
          shortfall > 0
            ? `Pakka: Deadline passed. ${countIn}/${trip.quorum_target} confirmed for ${trip.destination}. ${nudgeText}`
            : `Pakka: Deadline passed. ${countIn}/${trip.quorum_target} confirmed for ${trip.destination}. Check your dashboard: ${dashLink}`;
      }

      // 4. Send notifications (email required; SMS optional)
      await sendEmail(plannerEmail, subject, emailHtml);
      if (plannerPhone) {
        await sendSms(plannerPhone, smsBody);
      }

      // 5. Mark as notified — idempotency guard
      const { error: updateErr } = await supabase
        .from('trips')
        .update({ status: newStatus, notified_at: now })
        .eq('id', trip.id)
        .is('notified_at', null); // double-check: only update if still null

      if (updateErr) throw new Error(`Update error: ${updateErr.message}`);

      results.push({ trip_id: trip.id, action: newStatus });
      console.log(`[check-quorum] trip ${trip.id} → ${newStatus} (notified ${plannerEmail})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[check-quorum] trip ${trip.id} error:`, message);
      results.push({ trip_id: trip.id, action: 'error', error: message });
    }
  }

  return new Response(JSON.stringify({ processed: trips.length, results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client — bypasses RLS.
 * Only use in server-side API routes where you need to read data
 * that is otherwise restricted (e.g. RSVP counts for anon users).
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

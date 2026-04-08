'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs transition-colors"
      style={{ color: 'var(--text-muted)' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-mid)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
    >
      Sign out
    </button>
  );
}

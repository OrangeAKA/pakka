import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CreateTripForm from './CreateTripForm';

export default async function CreatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <main className="min-h-screen py-10 px-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto space-y-6">
        <div className="space-y-1 animate-fade-in-up">
          <h1
            className="text-2xl"
            style={{ fontFamily: 'var(--font-young-serif)', color: 'var(--text)' }}
          >
            Create a Trip Brief
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Share the link — your group RSVPs in 30 seconds, no app needed.
          </p>
        </div>
        <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <CreateTripForm />
        </div>
      </div>
    </main>
  );
}

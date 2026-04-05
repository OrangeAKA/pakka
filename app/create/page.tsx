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
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Create a Trip Brief</h1>
          <p className="text-gray-500 text-sm">
            Share the link — your group RSVPs in 30 seconds, no app needed.
          </p>
        </div>
        <CreateTripForm />
      </div>
    </main>
  );
}

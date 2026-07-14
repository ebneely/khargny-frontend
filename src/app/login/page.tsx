import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { LoginForm } from '@/components/login/LoginForm';
import { Suspense } from 'react';

/**
 * Login Page (Server Component)
 *
 * ARCHITECTURE:
 * - Server component that checks session server-side
 * - If authenticated, redirects home (the admin dashboard now lives in the
 *   separate khargny-dashboard app, not in this repo)
 * - If not authenticated, renders login form
 * - Uses Better Auth backend API for session validation
 */
export default async function LoginPage() {
  // Check if user is already authenticated by calling backend directly
  const session = await getServerSession();

  // If authenticated, redirect home. The admin dashboard route was removed
  // from this app (Phase 0c) — it now lives in khargny-dashboard.
  if (session?.user) {
    redirect('/');
  }

  // Render login form for unauthenticated users
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth-server';
import { LoginForm } from '@/components/login/LoginForm';
import { Suspense } from 'react';

/**
 * Login Page (Server Component)
 *
 * ARCHITECTURE:
 * - Server component that checks session server-side
 * - If authenticated, redirects to /dashboard
 * - If not authenticated, renders login form
 * - Uses Better Auth backend API for session validation
 */
export default async function LoginPage() {
  // Check if user is already authenticated by calling backend directly
  const session = await getServerSession();

  // If authenticated, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  // Render login form for unauthenticated users
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

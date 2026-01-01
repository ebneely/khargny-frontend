'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';

/**
 * Login Form Client Component
 * 
 * ARCHITECTURE:
 * - Client component for interactive login form UI
 * - Calls backend sign-in endpoint directly
 * - Backend sets HttpOnly cookie automatically
 * - Does NOT validate session client-side (SSR handles this)
 * - Redirects to dashboard - SSR will validate and redirect if needed
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorShown, setErrorShown] = useState(false);

  // Show error from URL params (useEffect to prevent multiple toasts)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam && !errorShown) {
      setErrorShown(true);
      if (errorParam === 'unauthorized') {
        toast({
          variant: 'destructive',
          title: 'Session Expired',
          description: 'Please sign in again.',
        });
      }
    }
  }, [searchParams, errorShown, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use Better Auth client for sign-in (REST for auth only)
      const { signIn } = await import('@/lib/auth-client');
      
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Sign in failed');
      }

      // Backend sets session cookie automatically via Set-Cookie header
      // Wait briefly for cookie to be stored in browser
      // SSR will validate session server-side
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Hard redirect - SSR will validate session server-side
      window.location.replace('/dashboard');
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Dashboard Login</CardTitle>
          <CardDescription>Sign in to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


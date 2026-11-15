'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components';
import { useAuth } from '@/providers/AuthProvider';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, signInWithMagicLink, isConfigured } = useAuth();
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');

    try {
      if (isConfigured && !password) {
        await signInWithMagicLink(email);
        alert('Magic sign-in link sent to your email.');
      } else {
        await login(email, password || 'password');
        router.push('/today');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface">
      <Card className="w-full max-w-sm p-8 shadow-xl border-outline-variant/50">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-primary font-bold">Create Account</h1>
          <p className="text-xs text-on-surface-variant mt-1 font-body">
            Migrate your guest wardrobe and connect with your household.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded bg-error-container/40 text-sindoor text-xs border border-sindoor/30 font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="spec-label block text-xs text-primary/70 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-surface-container border border-outline-variant rounded p-2.5 text-sm text-primary focus:outline-none focus:border-secondary font-body"
            />
          </div>

          <div>
            <label className="spec-label block text-xs text-primary/70 mb-1">
              Password {isConfigured && '(Optional for Magic Link)'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-container border border-outline-variant rounded p-2.5 text-sm text-primary focus:outline-none focus:border-secondary font-body"
            />
          </div>

          <Button type="submit" className="w-full justify-center py-2.5 mt-2" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up & Migrate Closet'}
          </Button>

          <p className="text-center text-xs text-on-surface-variant pt-2 font-body">
            Already have an account?{' '}
            <Link href="/login" className="text-secondary font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}

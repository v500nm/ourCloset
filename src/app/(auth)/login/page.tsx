'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Card, Button } from '@/components';
import { useAuth } from '@/providers/AuthProvider';
import { MotionContainer, MotionText } from '@/components/ui/motionText';

export default function LoginPage() {
  const [mode, setMode] = useState<'standard' | 'quickcode'>('standard');
  const [email, setEmail] = useState('admin@ourcloset.com');
  const [password, setPassword] = useState('password');
  const [quickCode, setQuickCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, loginWithQuickCode } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'standard') {
        if (!email) throw new Error('Email is required');
        await login(email, password);
      } else {
        if (!quickCode) throw new Error('QuickCode is required');
        await loginWithQuickCode(quickCode);
      }
      router.push('/today');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-surface relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[80px]" />
      
      <MotionContainer staggerChildren={0.1} className="w-full max-w-sm z-10">
        <div className="text-center mb-8">
          <MotionText as="h1" className="font-display text-4xl text-primary font-bold mb-2">ourCloset</MotionText>
          <MotionText as="p" className="text-primary/60 text-sm spec-label uppercase tracking-widest">AI Wardrobe Coordination</MotionText>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-8 shadow-2xl border-outline-variant/50 relative overflow-hidden">
            
            {/* Mode Switcher */}
            <div className="flex mb-6 bg-surface-container rounded-lg p-1">
              <button 
                type="button"
                onClick={() => { setMode('standard'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'standard' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
              >
                Email
              </button>
              <button 
                type="button"
                onClick={() => { setMode('quickcode'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${mode === 'quickcode' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}
              >
                QuickCode
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-sindoor/10 text-sindoor text-xs p-3 rounded border border-sindoor/20 text-center">
                  {error}
                </div>
              )}

              {mode === 'standard' ? (
                <>
                  <div>
                    <label className="spec-label block text-[10px] text-primary/60 mb-1 ml-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@ourcloset.com"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-sm text-primary placeholder:text-primary/30 focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="spec-label block text-[10px] text-primary/60 mb-1 ml-1">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-sm text-primary placeholder:text-primary/30 focus:outline-none focus:border-secondary transition-colors"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="spec-label block text-[10px] text-primary/60 mb-1 ml-1">6-Digit QuickCode</label>
                  <input
                    type="text"
                    value={quickCode}
                    onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                    placeholder="e.g. X7K9P2"
                    maxLength={6}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-3 text-center text-xl font-mono tracking-[0.5em] text-primary placeholder:text-primary/30 focus:outline-none focus:border-secondary transition-colors uppercase"
                  />
                  <p className="text-[10px] text-center text-on-surface-variant mt-2">
                    Enter the QuickCode provided during your last active session to instantly resume.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full justify-center py-3 mt-2" disabled={isSubmitting}>
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
              </Button>
              
              {mode === 'standard' && (
                <div className="text-center mt-4">
                  <p className="text-[10px] text-primary/50 font-mono">
                    Hint: Use admin@ourcloset.com for Admin access, or user@ourcloset.com for standard access.
                  </p>
                </div>
              )}
            </form>
          </Card>
        </motion.div>
      </MotionContainer>
    </main>
  );
}

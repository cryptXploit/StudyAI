'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  referralReward: { message: string } | null;
  clearReferralReward: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [referralReward, setReferralReward] = useState<{ message: string } | null>(null);
  const clearReferralReward = () => setReferralReward(null);
  
  const supabase = createClient();

  // 🟢 গ্লোবাল রেফারেল চেকার ফাংশন
  const checkAndApplyReferral = async (currentSession: Session) => {
    const storedRef = localStorage.getItem('referral_code');
    const storedContext = localStorage.getItem('referral_context'); // 🟢 NEW: Read context from storage

    if (storedRef && currentSession) {
      try {
        let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
        const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/referral/apply` : `${apiUrlBase}/api/rewards/referral/apply`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${currentSession.access_token}` 
          },
          body: JSON.stringify({ 
            referralCode: storedRef,
            context: storedContext // 🟢 NEW: Send context to backend
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
             console.warn("Referral API rate limited");
          } else if (response.status === 404) {
             console.error("Invalid referral code. Removing from local storage.");
             localStorage.removeItem('referral_code');
             localStorage.removeItem('referral_context');
          } else {
             console.error("Referral API failed:", response.status);
          }
          return;
        }

        let data;
        try {
          const text = await response.text();
          data = JSON.parse(text);
        } catch (e) {
          console.error("Invalid JSON from referral API");
          return;
        }
        
        // সফলভাবে অ্যাপ্লাই হয়ে গেলে অথবা অলরেডি ক্লেইমড থাকলে কোডটি রিমুভ করে দেব
        if (response.ok || data.error?.includes('already claimed')) {
          localStorage.removeItem('referral_code');
          localStorage.removeItem('referral_context'); // 🟢 NEW: Clear context
          
          if (response.ok && data.message) {
             setReferralReward({ message: data.message });
          }
        } else if (data.error?.includes('already claimed')) {
          localStorage.removeItem('referral_code');
          localStorage.removeItem('referral_context'); // 🟢 NEW: Clear context
        }
      } catch (err) {
        console.error("Global Referral apply failed:", err);
      }
    }
  };

  const checkDailyDrip = async (session: any) => {
    try {
      let apiUrlBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
      const apiUrl = apiUrlBase.endsWith('/api') ? `${apiUrlBase}/rewards/daily-drip` : `${apiUrlBase}/api/rewards/daily-drip`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        console.warn("Daily Drip API returned status:", response.status);
        return; 
      }

      let data;
      try {
        const text = await response.text();
        data = JSON.parse(text);
      } catch (e) {
        console.error("Invalid JSON from Daily Drip API");
        return;
      }

      if (data.success && data.tokensAdded) {
         console.log("Daily Drip Claimed!");
      }
    } catch (error) {
      console.error("Daily Drip check failed:", error);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        setSession(initialSession);
        setUser(initialSession?.user || null);

        if (initialSession) {
          checkAndApplyReferral(initialSession);
          checkDailyDrip(initialSession);
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch session';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        checkAndApplyReferral(newSession);
        checkDailyDrip(newSession);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (googleError) throw googleError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign in failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        error,
        referralReward,
        clearReferralReward,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

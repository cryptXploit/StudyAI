'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useTokens() {
  const supabase = createClient();
  const [tokens, setTokens] = useState<number>(0);
  const [tier, setTier] = useState<'FREE' | 'PRO'>('FREE');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTokenData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles') // FIXED: DB table name is profiles
        .select('tokens, tier')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setTokens(data.tokens || 0);
        setTier(data.tier || 'FREE');
      }
    } catch (err) {
      console.error('Error fetching tokens:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenData();
  }, []);

  return { tokens, tier, isLoading, refreshTokens: fetchTokenData };
}

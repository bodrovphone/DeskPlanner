import { useState, useCallback } from 'react';
import { useDataStore } from '@/contexts/DataStoreContext';

export function useShareBooking() {
  const dataStore = useDataStore();
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateShareLink = useCallback(async (bookingId: string, deskId?: string, date?: string) => {
    if (!dataStore.getOrCreateShareToken) {
      throw new Error('Share feature requires Supabase storage');
    }
    setIsLoading(true);
    try {
      const token = await dataStore.getOrCreateShareToken(bookingId, deskId, date);
      setShareToken(token);
      return token;
    } finally {
      setIsLoading(false);
    }
  }, [dataStore]);

  const getShareUrl = useCallback((token: string) => {
    return `${window.location.origin}/share/${token}`;
  }, []);

  return { shareToken, isLoading, generateShareLink, getShareUrl };
}

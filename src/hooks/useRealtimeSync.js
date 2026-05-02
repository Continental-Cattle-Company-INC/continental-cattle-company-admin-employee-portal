import { useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useRealtimeSync(entityName, onUpdate) {
  useEffect(() => {
    let unsubscribe;

    const subscribe = async () => {
      unsubscribe = base44.entities[entityName].subscribe((event) => {
        onUpdate?.(event);
      });
    };

    subscribe();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [entityName, onUpdate]);
}

export function useAutoRefetch(queryClient, queryKey, intervalMs = 30000) {
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey });
    }, intervalMs);

    const handleFocus = () => {
      queryClient.invalidateQueries({ queryKey });
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient, queryKey, intervalMs]);
}
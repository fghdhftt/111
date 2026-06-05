import { useEffect, useState } from 'react';
import type { BitrixAuthPayload, CrmEntityType } from '@counterparty-check/shared';
import { getBitrixAuth, resizeWidget } from '../api/client';

interface BitrixContext {
  entityType: CrmEntityType;
  entityId: number;
  auth: BitrixAuthPayload | null;
  loading: boolean;
  error: string | null;
}

export function useBitrixContext(): BitrixContext {
  const [state, setState] = useState<BitrixContext>({
    entityType: window.__BITRIX24__?.entityType ?? 'deal',
    entityId: window.__BITRIX24__?.entityId ?? 0,
    auth: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    getBitrixAuth()
      .then((auth) => {
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          auth,
          entityType: window.__BITRIX24__?.entityType ?? prev.entityType,
          entityId: window.__BITRIX24__?.entityId ?? prev.entityId,
          loading: false,
        }));
        resizeWidget();
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

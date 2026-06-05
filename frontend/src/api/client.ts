import type { BitrixAuthPayload, CounterpartyCheckResult, CrmEntityType } from '@counterparty-check/shared';

declare global {
  interface Window {
    __BITRIX24__?: {
      placement?: string;
      entityType?: CrmEntityType;
      entityId?: number;
      domain?: string;
      authId?: string;
    };
    BX24?: {
      init: (callback: () => void) => void;
      getAuth: () => { access_token?: string; domain?: string };
      fitWindow: () => void;
      resizeWindow: (width: number, height: number) => void;
    };
  }
}

async function requestJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error ?? `HTTP ${response.status}`);
  }

  return json.data as T;
}

export async function getBitrixAuth(): Promise<BitrixAuthPayload> {
  const fallback = window.__BITRIX24__;

  if (window.BX24) {
    return new Promise((resolve, reject) => {
      window.BX24!.init(() => {
        const auth = window.BX24!.getAuth();
        if (!auth.access_token || !auth.domain) {
          if (fallback?.domain && fallback.authId) {
            resolve({ domain: fallback.domain, accessToken: fallback.authId });
            return;
          }
          reject(new Error('Не удалось получить авторизацию Bitrix24'));
          return;
        }
        resolve({ domain: auth.domain, accessToken: auth.access_token });
      });
    });
  }

  if (fallback?.domain && fallback.authId) {
    return { domain: fallback.domain, accessToken: fallback.authId };
  }

  throw new Error('Bitrix24 SDK недоступен');
}

export async function checkCounterparty(params: {
  entityType: CrmEntityType;
  entityId: number;
  auth: BitrixAuthPayload;
  forceRefresh?: boolean;
}): Promise<CounterpartyCheckResult> {
  return requestJson<CounterpartyCheckResult>('/api/check', {
    ...params,
    forceRefresh: params.forceRefresh ?? false,
  });
}

export async function loadSavedResult(params: {
  entityType: CrmEntityType;
  entityId: number;
  auth: BitrixAuthPayload;
}): Promise<CounterpartyCheckResult | null> {
  const data = await requestJson<CounterpartyCheckResult | undefined>('/api/saved', params);
  return data ?? null;
}

export function resizeWidget(height = 900): void {
  window.BX24?.fitWindow();
  window.BX24?.resizeWindow(document.body.scrollWidth, height);
}

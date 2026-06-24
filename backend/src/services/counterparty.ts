import type {
  BitrixAuthPayload,
  CounterpartyCheckResult,
  CrmEntityType,
} from '@counterparty-check/shared';
import { fetchCounterpartyByInn } from './checko';
import { analyzeCounterparty } from './openai-ai';
import {
  addTimelineEntry,
  getEntityInn,
  getResultField,
  saveCheckResult,
  bitrixCall,
} from './bitrix';
import { clearCache, getCachedResult, setCachedResult } from './cache';

export async function runCounterpartyCheck(params: {
  auth: BitrixAuthPayload;
  entityType: CrmEntityType;
  entityId: number;
  inn?: string;
  forceRefresh?: boolean;
  skipAi?: boolean;
  skipSave?: boolean;
}): Promise<CounterpartyCheckResult> {
  const { auth, entityType, entityId, forceRefresh, skipAi, skipSave } = params;

  let inn = params.inn?.replace(/\D/g, '') ?? null;
  if (!inn) {
    inn = await getEntityInn(auth, entityType, entityId);
  }

  if (!inn || inn.length < 10) {
    throw new Error('ИНН не указан в карточке CRM или имеет неверный формат');
  }

  if (forceRefresh) {
    clearCache(inn);
  }

  let result = !forceRefresh ? getCachedResult(inn) : undefined;

  if (!result) {
    result = await fetchCounterpartyByInn(inn);

    if (!skipAi) {
      result.aiAnalysis = await analyzeCounterparty(result);
    }

    setCachedResult(inn, result);
  } else if (!result.aiAnalysis && !skipAi) {
    result.aiAnalysis = await analyzeCounterparty(result);
    setCachedResult(inn, result);
  }

  if (!skipSave) {
    await saveCheckResult(auth, entityType, entityId, result);
    await addTimelineEntry(auth, entityType, entityId, result);
  }

  return result;
}

export async function loadSavedResult(
  auth: BitrixAuthPayload,
  entityType: CrmEntityType,
  entityId: number,
): Promise<CounterpartyCheckResult | null> {
  const method = entityType === 'deal' ? 'crm.deal.get' : 'crm.lead.get';
  const resultField = getResultField(entityType);

  console.log(`[loadSavedResult] calling ${method} with id=${entityId}`);
  const entity = await bitrixCall<Record<string, unknown>>(auth, method, { id: entityId });
  const raw = entity[resultField];

  if (!raw || typeof raw !== 'string') {
    return null;
  }

  try {
    return JSON.parse(raw) as CounterpartyCheckResult;
  } catch {
    return null;
  }
}

import NodeCache from 'node-cache';
import { config } from '../config';
import type { CounterpartyCheckResult } from '@counterparty-check/shared';

const cache = new NodeCache({
  stdTTL: config.cacheTtlHours * 3600,
  checkperiod: 600,
  useClones: true,
});

export function getCacheKey(inn: string): string {
  return `checko:${inn}`;
}

export function getCachedResult(inn: string): CounterpartyCheckResult | undefined {
  return cache.get<CounterpartyCheckResult>(getCacheKey(inn));
}

export function setCachedResult(inn: string, result: CounterpartyCheckResult): void {
  cache.set(getCacheKey(inn), { ...result, source: 'cache' });
}

export function clearCache(inn: string): void {
  cache.del(getCacheKey(inn));
}

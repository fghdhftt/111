import {
  CHECKO_ENDPOINTS,
  FINANCE_CODES,
  type CounterpartyCheckResult,
  type LegalCaseSummary,
  type EnforcementSummary,
} from '@counterparty-check/shared';
import { config } from '../config';

interface CheckoMeta {
  status?: string;
  message?: string;
}

async function checkoGet<T>(url: string, params: Record<string, string>): Promise<T> {
  const search = new URLSearchParams({ key: config.checkoApiKey, ...params });
  const response = await fetch(`${url}?${search.toString()}`);

  if (!response.ok) {
    throw new Error(`Checko API error: HTTP ${response.status}`);
  }

  const json = (await response.json()) as T & { meta?: CheckoMeta };
  if (json.meta?.status === 'error') {
    throw new Error(json.meta.message ?? 'Checko API returned error');
  }

  return json;
}

function formatMoney(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num);
}

function extractFinanceValue(data: Record<string, unknown>, code: string): string | undefined {
  const years = Object.keys(data)
    .filter((k) => /^\d{4}$/.test(k))
    .sort((a, b) => Number(b) - Number(a));

  for (const year of years) {
    const yearData = data[year] as Record<string, Record<string, { Сумма?: number; Знач?: number }>>;
    const line = yearData?.[code]?.['0'] ?? yearData?.[code];
    if (!line) continue;

    const amount = (line as { Сумма?: number; Знач?: number }).Сумма ?? (line as { Знач?: number }).Знач;
    if (amount !== undefined) {
      return `${formatMoney(amount)} (${year} г.)`;
    }
  }

  return undefined;
}

function mapLegalCases(raw: Record<string, unknown>): LegalCaseSummary {
  const data = (raw.data ?? {}) as Record<string, unknown>;
  const records = (data.Записи ?? []) as Array<Record<string, unknown>>;

  return {
    total: Number(data.ЗапВсего ?? records.length),
    totalClaimAmount: data.ОбщСуммИск ? Number(data.ОбщСуммИск) : undefined,
    recent: records.slice(0, 5).map((item) => ({
      date: item.Дата as string | undefined,
      court: item.Суд as string | undefined,
      caseNumber: item.Номер as string | undefined,
      claimAmount: item.СуммИск ? Number(item.СуммИск) : undefined,
    })),
  };
}

function mapEnforcements(raw: Record<string, unknown>): EnforcementSummary {
  const data = (raw.data ?? {}) as Record<string, unknown>;
  const records = (data.Записи ?? []) as Array<Record<string, unknown>>;

  const totalDebt = records.reduce((sum, item) => sum + Number(item.СумДолг ?? 0), 0);

  return {
    total: records.length,
    totalDebt: totalDebt || undefined,
    recent: records.slice(0, 5).map((item) => ({
      number: item.ИспПрНомер as string | undefined,
      date: item.ИспПрДата as string | undefined,
      subject: item.ПредмИсп as string | undefined,
      debtAmount: item.СумДолг ? Number(item.СумДолг) : undefined,
      remainingDebt: item.ОстЗадолж ? Number(item.ОстЗадолж) : undefined,
    })),
  };
}

function mapLiquidationSigns(company: Record<string, unknown>): string {
  const parts: string[] = [];
  const liquid = company.Ликвид as Record<string, unknown> | undefined;

  if (liquid?.Дата) {
    parts.push(`Дата ликвидации: ${liquid.Дата}${liquid.Наим ? ` (${liquid.Наим})` : ''}`);
  }

  const status = company.Статус as Record<string, unknown> | undefined;
  if (status?.Наим && /ликвид|прекращ|исключ/i.test(String(status.Наим))) {
    parts.push(String(status.Наим));
  }

  return parts.length ? parts.join('; ') : 'Не выявлено';
}

function mapBankruptcySigns(company: Record<string, unknown>): string {
  const efrsb = (company.ЕФРСБ ?? []) as Array<Record<string, unknown>>;
  if (!efrsb.length) return 'Не выявлено';

  return efrsb
    .slice(0, 5)
    .map((msg) => `${msg.Дата ?? '—'}: ${msg.Тип ?? 'сообщение'}${msg.Дело ? ` (дело ${msg.Дело})` : ''}`)
    .join('; ');
}

export async function fetchCounterpartyByInn(inn: string): Promise<CounterpartyCheckResult> {
  const [companyRaw, financesRaw, legalRaw, enforceRaw] = await Promise.all([
    checkoGet<{ data?: Record<string, unknown> }>(CHECKO_ENDPOINTS.company, { inn }),
    checkoGet<{ data?: Record<string, unknown> }>(CHECKO_ENDPOINTS.finances, {
      inn,
      extended: 'true',
    }).catch(() => ({ data: {} })),
    checkoGet<Record<string, unknown>>(CHECKO_ENDPOINTS.legalCases, { inn }).catch(() => ({
      data: { Записи: [] },
    })),
    checkoGet<Record<string, unknown>>(CHECKO_ENDPOINTS.enforcements, { inn }).catch(() => ({
      data: { Записи: [] },
    })),
  ]);

  const company = companyRaw.data;
  if (!company) {
    throw new Error(`Компания с ИНН ${inn} не найдена`);
  }

  const director = ((company.Руковод as Array<Record<string, unknown>>) ?? [])[0];
  const okved = company.ОКВЭД as Record<string, unknown> | undefined;
  const address = company.ЮрАдрес as Record<string, unknown> | undefined;
  const status = company.Статус as Record<string, unknown> | undefined;
  const finances = financesRaw.data ?? {};

  const legalCases = mapLegalCases(legalRaw);
  const enforcements = mapEnforcements(enforceRaw);

  return {
    inn,
    checkedAt: new Date().toISOString(),
    source: 'api',
    company: {
      name: String(company.НаимПолн ?? company.НаимСокр ?? '—'),
      inn: String(company.ИНН ?? inn),
      kpp: company.КПП ? String(company.КПП) : undefined,
      ogrn: company.ОГРН ? String(company.ОГРН) : undefined,
      status: status?.Наим ? String(status.Наим) : undefined,
      registrationDate: company.ДатаРег ? String(company.ДатаРег) : undefined,
      director: director
        ? `${director.ФИО ?? '—'}${director.НаимДолжн ? ` (${director.НаимДолжн})` : ''}`
        : undefined,
      legalAddress: address?.АдресРФ
        ? String(address.АдресРФ)
        : address?.НасПункт
          ? String(address.НасПункт)
          : undefined,
      okved: okved ? `${okved.Код ?? ''} — ${okved.Наим ?? ''}`.trim() : undefined,
      revenue: extractFinanceValue(finances, FINANCE_CODES.revenue),
      profit: extractFinanceValue(finances, FINANCE_CODES.profit),
      employees: company.СЧР ? String(company.СЧР) : undefined,
      liquidationSigns: mapLiquidationSigns(company),
      bankruptcySigns: mapBankruptcySigns(company),
      legalCases,
      enforcements,
    },
  };
}

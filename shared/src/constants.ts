export const TAB_TITLE = 'Проверка контрагента';

export const PLACEMENTS = {
  DEAL: 'CRM_DEAL_DETAIL_TAB',
  LEAD: 'CRM_LEAD_DETAIL_TAB',
} as const;

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const CHECKO_ENDPOINTS = {
  company: 'https://api.checko.ru/v2/company',
  finances: 'https://api.checko.ru/v2/finances',
  legalCases: 'https://api.checko.ru/v2/legal-cases',
  enforcements: 'https://api.checko.ru/v2/enforcements',
} as const;

export const FINANCE_CODES = {
  revenue: '2110',
  profit: '2400',
} as const;

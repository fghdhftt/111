export type CrmEntityType = 'deal' | 'lead';

export interface AiAnalysis {
  overallAssessment: string;
  risks: string[];
  recommendations: string[];
  rawText?: string;
}

export interface LegalCaseSummary {
  total: number;
  totalClaimAmount?: number;
  recent: Array<{
    date?: string;
    court?: string;
    caseNumber?: string;
    claimAmount?: number;
  }>;
}

export interface EnforcementSummary {
  total: number;
  totalDebt?: number;
  recent: Array<{
    number?: string;
    date?: string;
    subject?: string;
    debtAmount?: number;
    remainingDebt?: number;
  }>;
}

export interface CounterpartyCheckResult {
  inn: string;
  checkedAt: string;
  source: 'cache' | 'api';
  company: {
    name: string;
    inn: string;
    kpp?: string;
    ogrn?: string;
    status?: string;
    registrationDate?: string;
    director?: string;
    legalAddress?: string;
    okved?: string;
    revenue?: string;
    profit?: string;
    employees?: string;
    liquidationSigns?: string;
    bankruptcySigns?: string;
    legalCases?: LegalCaseSummary;
    enforcements?: EnforcementSummary;
  };
  aiAnalysis?: AiAnalysis;
}

export interface CheckCounterpartyRequest {
  entityType: CrmEntityType;
  entityId: number;
  inn?: string;
  forceRefresh?: boolean;
  auth: BitrixAuthPayload;
}

export interface BitrixAuthPayload {
  domain: string;
  accessToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

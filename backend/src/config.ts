import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appUrl: process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  get checkoApiKey(): string {
    return requireEnv('CHECKO_API_KEY');
  },
  get vibecodeApiKey(): string {
    return requireEnv('VIBECODE_API_KEY');
  },
  vibecodeApiUrl: process.env.VIBECODE_API_URL ?? 'https://vibecode.bitrix24.tech',
  vibecodeAiModel: process.env.VIBECODE_AI_MODEL ?? 'bitrix/google/gemma-4-26B-A4B-it',
  bitrixClientId: process.env.BITRIX_CLIENT_ID ?? '',
  bitrixClientSecret: process.env.BITRIX_CLIENT_SECRET ?? '',
  innField: {
    deal: process.env.BITRIX_INN_FIELD_DEAL ?? 'UF_CRM_INN',
    lead: process.env.BITRIX_INN_FIELD_LEAD ?? 'UF_CRM_INN',
  },
  resultField: {
    deal: process.env.BITRIX_RESULT_FIELD_DEAL ?? 'UF_CRM_CHECKO_RESULT',
    lead: process.env.BITRIX_RESULT_FIELD_LEAD ?? 'UF_CRM_CHECKO_RESULT',
  },
  cacheTtlHours: Number(process.env.CACHE_TTL_HOURS ?? 24),
};

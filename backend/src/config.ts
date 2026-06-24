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
  get openaiApiKey(): string {
    return requireEnv('OPENAI_API_KEY');
  },
  openaiApiUrl: process.env.OPENAI_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions',
  openaiModel: process.env.OPENAI_MODEL ?? 'llama-3.3-70b-versatile',
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

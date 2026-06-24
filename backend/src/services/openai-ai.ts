import type { AiAnalysis, CounterpartyCheckResult } from '@counterparty-check/shared';
import { config } from '../config';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function buildCompanySummary(result: CounterpartyCheckResult): string {
  const { company } = result;
  const legalCasesText = company.legalCases
    ? `Судебные дела: ${company.legalCases.total}, сумма исков: ${company.legalCases.totalClaimAmount ?? 'н/д'}`
    : 'Судебные дела: н/д';

  const enforcementsText = company.enforcements
    ? `Исполнительные производства: ${company.enforcements.total}, сумма долга: ${company.enforcements.totalDebt ?? 'н/д'}`
    : 'Исполнительные производства: н/д';

  return [
    `Наименование: ${company.name}`,
    `ИНН: ${company.inn}`,
    `КПП: ${company.kpp ?? '—'}`,
    `ОГРН: ${company.ogrn ?? '—'}`,
    `Статус: ${company.status ?? '—'}`,
    `Дата регистрации: ${company.registrationDate ?? '—'}`,
    `Руководитель: ${company.director ?? '—'}`,
    `Юридический адрес: ${company.legalAddress ?? '—'}`,
    `ОКВЭД: ${company.okved ?? '—'}`,
    `Выручка: ${company.revenue ?? '—'}`,
    `Прибыль: ${company.profit ?? '—'}`,
    `Численность: ${company.employees ?? '—'}`,
    `Признаки ликвидации: ${company.liquidationSigns ?? '—'}`,
    `Признаки банкротства: ${company.bankruptcySigns ?? '—'}`,
    legalCasesText,
    enforcementsText,
  ].join('\n');
}

function parseAiResponse(text: string): AiAnalysis {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const risks: string[] = [];
  const recommendations: string[] = [];
  let overallAssessment = '';
  let section: 'overall' | 'risks' | 'recommendations' = 'overall';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/общ(ая|ая оценка)|итог|заключение/.test(lower)) {
      section = 'overall';
      continue;
    }
    if (/риск/.test(lower)) {
      section = 'risks';
      continue;
    }
    if (/рекоменд/.test(lower)) {
      section = 'recommendations';
      continue;
    }

    const cleaned = line.replace(/^[-*•\d.)]+\s*/, '');
    if (!cleaned) continue;

    if (section === 'overall' && !overallAssessment) {
      overallAssessment = cleaned;
    } else if (section === 'risks') {
      risks.push(cleaned);
    } else if (section === 'recommendations') {
      recommendations.push(cleaned);
    }
  }

  if (!overallAssessment) {
    overallAssessment = lines[0] ?? text.slice(0, 500);
  }

  if (!risks.length) {
    const riskMatch = text.match(/риск[^\n]*:?\s*([\s\S]*?)(?=рекоменд|$)/i);
    if (riskMatch?.[1]) {
      risks.push(...riskMatch[1].split(/[;\n•-]/).map((s) => s.trim()).filter(Boolean));
    }
  }

  if (!recommendations.length) {
    const recMatch = text.match(/рекоменд[^\n]*:?\s*([\s\S]*?)$/i);
    if (recMatch?.[1]) {
      recommendations.push(...recMatch[1].split(/[;\n•-]/).map((s) => s.trim()).filter(Boolean));
    }
  }

  return {
    overallAssessment,
    risks: risks.length ? risks : ['Явные риски не выделены в ответе модели'],
    recommendations: recommendations.length
      ? recommendations
      : ['Проверьте актуальность данных и проведите дополнительную due diligence при необходимости'],
    rawText: text,
  };
}

export async function analyzeCounterparty(result: CounterpartyCheckResult): Promise<AiAnalysis> {
  const companyData = buildCompanySummary(result);

  const response = await fetch(config.openaiApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages: [
        {
          role: 'system',
          content: 'Ты аналитик по проверке юридических лиц.',
        },
        {
          role: 'user',
          content: `Проанализируй данные компании и выдай краткое заключение по рискам сотрудничества.

Структурируй ответ так:
1. Общая оценка (1-2 предложения)
2. Выявленные риски (список)
3. Рекомендации менеджеру (список)

Данные компании:
${companyData}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI AI error: HTTP ${response.status} — ${body}`);
  }

  const json = (await response.json()) as ChatCompletionResponse;
  const content = json.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(json.error?.message ?? 'OpenAI returned empty response');
  }

  return parseAiResponse(content);
}

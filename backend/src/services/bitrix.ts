import type { BitrixAuthPayload, CounterpartyCheckResult, CrmEntityType } from '@counterparty-check/shared';
import { config } from '../config';

type BitrixResponse<T> = { result?: T; error?: string; error_description?: string };

async function bitrixCall<T>(
  auth: BitrixAuthPayload,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = `https://${auth.domain}/rest/${method}.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth: auth.accessToken, ...params }),
  });

  const json = (await response.json()) as BitrixResponse<T>;
  if (json.error) {
    const errMsg = json.error_description ?? json.error;
    console.error(`[bitrixCall] ${method} error:`, errMsg, 'params:', JSON.stringify(params));
    throw new Error(errMsg);
  }

  return json.result as T;
}

function entityMethod(entityType: CrmEntityType, action: 'get' | 'update'): string {
  return entityType === 'deal' ? `crm.deal.${action}` : `crm.lead.${action}`;
}

export function getInnField(entityType: CrmEntityType): string {
  return entityType === 'deal' ? config.innField.deal : config.innField.lead;
}

export function getResultField(entityType: CrmEntityType): string {
  return entityType === 'deal' ? config.resultField.deal : config.resultField.lead;
}

export async function getEntityInn(
  auth: BitrixAuthPayload,
  entityType: CrmEntityType,
  entityId: number,
): Promise<string | null> {
  const method = entityMethod(entityType, 'get');
  const innField = getInnField(entityType);

  const entity = await bitrixCall<Record<string, unknown>>(auth, method, { id: entityId });
  const inn = entity[innField] ?? entity.INN ?? entity.inn;

  if (!inn || String(inn).trim() === '') {
    return null;
  }

  return String(inn).replace(/\D/g, '');
}

export async function saveCheckResult(
  auth: BitrixAuthPayload,
  entityType: CrmEntityType,
  entityId: number,
  result: CounterpartyCheckResult,
): Promise<void> {
  const resultField = getResultField(entityType);
  const payload = JSON.stringify(result);

  await bitrixCall(auth, entityMethod(entityType, 'update'), {
    id: entityId,
    fields: { [resultField]: payload },
  });
}

export async function addTimelineEntry(
  auth: BitrixAuthPayload,
  entityType: CrmEntityType,
  entityId: number,
  result: CounterpartyCheckResult,
): Promise<void> {
  const entityTypeId = entityType === 'deal' ? 2 : 1;
  const assessment = result.aiAnalysis?.overallAssessment ?? 'Проверка выполнена';

  const comment = [
    `[Проверка контрагента] ${result.company.name} (ИНН ${result.inn})`,
    `Статус: ${result.company.status ?? '—'}`,
    `Оценка AI: ${assessment}`,
  ].join('\n');

  await bitrixCall(auth, 'crm.timeline.comment.add', {
    fields: {
      ENTITY_ID: entityId,
      ENTITY_TYPE: entityType === 'deal' ? 'deal' : 'lead',
      ENTITY_TYPE_ID: entityTypeId,
      COMMENT: comment,
    },
  });
}

export async function bindPlacements(auth: BitrixAuthPayload, handlerUrl: string): Promise<void> {
  const placements = [
    { PLACEMENT: 'CRM_DEAL_DETAIL_TAB', TITLE: 'Проверка контрагента' },
    { PLACEMENT: 'CRM_LEAD_DETAIL_TAB', TITLE: 'Проверка контрагента' },
  ];

  for (const placement of placements) {
    await bitrixCall(auth, 'placement.bind', {
      ...placement,
      HANDLER: handlerUrl,
      LANG_ALL: {
        ru: { TITLE: 'Проверка контрагента' },
        en: { TITLE: 'Counterparty check' },
      },
    }).catch((err) => {
      console.warn(`placement.bind ${placement.PLACEMENT}:`, err);
    });
  }
}

export async function ensureUserFields(auth: BitrixAuthPayload): Promise<void> {
  const fields = [
    {
      method: 'crm.deal.userfield.add',
      fieldName: config.resultField.deal.replace(/^UF_CRM_/, ''),
      label: 'Результат проверки Checko',
    },
    {
      method: 'crm.lead.userfield.add',
      fieldName: config.resultField.lead.replace(/^UF_CRM_/, ''),
      label: 'Результат проверки Checko',
    },
  ];

  for (const field of fields) {
    await bitrixCall(auth, field.method, {
      fields: {
        FIELD_NAME: field.fieldName,
        EDIT_FORM_LABEL: { ru: field.label, en: 'Checko check result' },
        LIST_COLUMN_LABEL: { ru: field.label, en: 'Checko check result' },
        USER_TYPE_ID: 'string',
        XML_ID: field.fieldName,
        SETTINGS: { SIZE: 100, ROWS: 5 },
      },
    }).catch(() => undefined);
  }
}

export { bitrixCall };

import { Router, type Request, type Response } from 'express';
import type { ApiResponse, BitrixAuthPayload, CheckCounterpartyRequest } from '@counterparty-check/shared';
import { loadSavedResult, runCounterpartyCheck } from '../services/counterparty';
import { bitrixCall } from '../services/bitrix';

export const apiRouter = Router();

function parseAuth(body: CheckCounterpartyRequest['auth'] | undefined) {
  if (!body?.domain || !body?.accessToken) {
    throw new Error('Missing Bitrix24 auth payload');
  }
  return body;
}

apiRouter.post('/check', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, inn, forceRefresh, auth } = req.body as CheckCounterpartyRequest;

    if (!entityType || !entityId) {
      res.status(400).json({ success: false, error: 'entityType and entityId are required' } satisfies ApiResponse<never>);
      return;
    }

    const result = await runCounterpartyCheck({
      auth: parseAuth(auth),
      entityType,
      entityId: Number(entityId),
      inn,
      forceRefresh: Boolean(forceRefresh),
    });

    res.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message } satisfies ApiResponse<never>);
  }
});

apiRouter.post('/saved', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, auth } = req.body as CheckCounterpartyRequest;

    if (!entityType || !entityId) {
      res.status(400).json({ success: false, error: 'entityType and entityId are required' } satisfies ApiResponse<never>);
      return;
    }

    const result = await loadSavedResult(parseAuth(auth), entityType, Number(entityId));
    res.json({ success: true, data: result ?? undefined } satisfies ApiResponse<typeof result>);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[api/saved] error:', message);
    res.status(500).json({ success: false, error: message } satisfies ApiResponse<never>);
  }
});

apiRouter.post('/fields', async (req: Request, res: Response) => {
  try {
    const { entityType, auth } = req.body as { entityType: string; auth: BitrixAuthPayload };
    if (!entityType || !auth?.domain || !auth?.accessToken) {
      res.status(400).json({ success: false, error: 'entityType and auth (domain, accessToken) required' });
      return;
    }
    const method = entityType === 'deal' ? 'crm.deal.fields' : 'crm.lead.fields';
    const fields = await bitrixCall<Record<string, unknown>>(auth, method, {});
    const ufFields = Object.keys(fields).filter(k => k.startsWith('UF_CRM'));
    res.json({ success: true, data: { ufFields, count: ufFields.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/debug-entity', async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, auth } = req.body as { entityType: string; entityId: number; auth: BitrixAuthPayload };
    if (!entityType || !entityId || !auth?.domain || !auth?.accessToken) {
      res.status(400).json({ success: false, error: 'entityType, entityId, auth required' });
      return;
    }
    const method = entityType === 'deal' ? 'crm.deal.get' : 'crm.lead.get';
    const entity = await bitrixCall<Record<string, unknown>>(auth, method, { id: entityId });
    const ufKeys = Object.keys(entity).filter(k => k.startsWith('UF_CRM') || k.startsWith('INN') || k.startsWith('inn'));
    const innCandidates: Record<string, unknown> = {};
    for (const key of ufKeys) {
      innCandidates[key] = entity[key];
    }
    // Also check with common INN field patterns
    const allKeys = Object.keys(entity).filter(k => k.startsWith('UF_CRM'));
    res.json({
      success: true,
      data: {
        entityId,
        entityType,
        innCandidates,
        allUfFields: allKeys,
        fieldCount: allKeys.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

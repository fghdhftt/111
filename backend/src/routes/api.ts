import { Router, type Request, type Response } from 'express';
import type { ApiResponse, CheckCounterpartyRequest } from '@counterparty-check/shared';
import { loadSavedResult, runCounterpartyCheck } from '../services/counterparty';

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

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

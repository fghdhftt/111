import path from 'path';
import { Router, type Request, type Response } from 'express';

export const placementRouter = Router();

function escapeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

placementRouter.all('/', (req: Request, res: Response) => {
  const payload = { ...req.query, ...req.body } as Record<string, string>;

  const placement = payload.PLACEMENT ?? '';
  const placementOptions = payload.PLACEMENT_OPTIONS ?? '';
  const domain = payload.DOMAIN ?? '';
  const authId = payload.AUTH_ID ?? '';

  console.log('[placement] received:', JSON.stringify({ placement, placementOptions, domain, authIdPresent: !!authId }, null, 2));

  let entityId = 0;
  let entityType: 'deal' | 'lead' = 'deal';

  try {
    const raw = placementOptions || '{}';
    const options = JSON.parse(raw) as { ID?: string | number; ENTITY_ID?: string | number };
    entityId = Number(options.ID ?? options.ENTITY_ID ?? 0);
    console.log('[placement] parsed entityId:', entityId, 'from options:', JSON.stringify(options));
  } catch (e) {
    console.warn('[placement] failed to parse PLACEMENT_OPTIONS:', placementOptions, e);
    entityId = 0;
  }

  if (placement.includes('LEAD')) {
    entityType = 'lead';
  }

  const context = {
    placement,
    entityType,
    entityId,
    domain,
    authId,
  };

  res.send(`<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Проверка контрагента</title>
    <script src="https://api.bitrix24.com/api/v1/"></script>
    <script type="module" crossorigin src="/assets/index.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index.css">
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__BITRIX24__ = ${escapeJson(context)};
    </script>
  </body>
</html>`);
});

placementRouter.get('/manifest', (_req, res) => {
  res.json({
    name: 'Проверка контрагента Checko',
    description: 'Проверка контрагентов по ИНН через Checko с AI-анализом',
    placements: ['CRM_DEAL_DETAIL_TAB', 'CRM_LEAD_DETAIL_TAB'],
    version: '1.0.0',
  });
});

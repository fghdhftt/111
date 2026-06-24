import { Router, type Request, type Response } from 'express';
import { config } from '../config';
import { bindPlacements, ensureUserFields } from '../services/bitrix';

export const installRouter = Router();

function isCloudDomain(domain: string): boolean {
  return /bitrix24/i.test(domain);
}

function oauthAuthorizeUrl(clientId: string, redirectUri: string, domain?: string): string {
  if (domain && !isCloudDomain(domain)) {
    // On-premise: use portal's own OAuth
    return `https://${domain}/oauth/authorize/?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
  // Cloud: use global Bitrix24 OAuth
  return `https://oauth.bitrix.info/oauth/authorize/?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

interface AuthTokens {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

async function handleInstall(domain: string, accessToken: string, res: Response) {
  try {
    const auth = { domain, accessToken };
    await ensureUserFields(auth);
    await bindPlacements(auth, `${config.appUrl}/placement`);

    res.send(`
      <!DOCTYPE html>
      <html lang="ru">
        <head><meta charset="utf-8"><title>Установка завершена</title></head>
        <body style="font-family:sans-serif;padding:2rem;">
          <h1>Приложение установлено</h1>
          <p>Вкладка «Проверка контрагента» добавлена в карточки сделок и лидов.</p>
          <p>Убедитесь, что в CRM заполнено поле ИНН (<code>${config.innField.deal}</code> / <code>${config.innField.lead}</code>).</p>
        </body>
      </html>
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Install failed';
    res.status(500).send(message);
  }
}

// GET /install?code=...&domain=... — from OAuth redirect
installRouter.get('/', async (req: Request, res: Response) => {
  const { code, domain } = req.query;

  if (!code || !domain) {
    res.status(400).send('Missing OAuth code or domain');
    return;
  }

  try {
    const tokenUrl = `https://${domain}/oauth/token/`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.bitrixClientId,
        client_secret: config.bitrixClientSecret,
        code: String(code),
      }),
    });
    const tokens = (await tokenResponse.json()) as AuthTokens;

    if (!tokens.access_token) {
      res.status(500).send(tokens.error_description ?? tokens.error ?? 'OAuth failed');
      return;
    }

    await handleInstall(String(domain), tokens.access_token, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Install failed';
    res.status(500).send(message);
  }
});

function renderPlacementHtml(ctx: { placement: string; entityType: string; entityId: number; domain: string; authId: string }): string {
  const escapeJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
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
      window.__BITRIX24__ = ${escapeJson(ctx)};
    </script>
  </body>
</html>`;
}

// POST /install — from Bitrix24 local app install or placement handler
installRouter.post('/', async (req: Request, res: Response) => {
  const body = req.body || {};

  console.log('=== POST /install ===');
  console.log('query:', JSON.stringify(req.query));
  console.log('body keys:', Object.keys(body).join(', '));

  let domain: string | undefined;
  let accessToken: string | undefined;

  // Format 1: JSON body with event/data/auth (Bitrix24 event format)
  if (body.event === 'ONAPPINSTALL' && body.auth?.access_token && body.auth?.domain) {
    domain = body.auth.domain;
    accessToken = body.auth.access_token;
  }

  // Format 2: signed_request (base64-encoded JSON in POST body)
  if (!accessToken && body.signed_request) {
    try {
      const decoded = JSON.parse(Buffer.from(body.signed_request, 'base64').toString());
      domain = decoded.domain || decoded.auth?.domain;
      accessToken = decoded.access_token || decoded.auth?.access_token;
    } catch (e) { /* ignore */ }
  }

  // Format 3: Bitrix24 local app POST with AUTH_ID in body, DOMAIN in query
  if (!accessToken) {
    domain = String(req.query.DOMAIN || req.query.domain || '');
    accessToken = String(body.AUTH_ID || body.auth_id || body.authId || body.access_token || '');
  }

  // Format 4: raw AUTH_ID / DOMAIN in body fields (uppercase Bitrix24 style)
  if (!accessToken) {
    domain = domain || body.DOMAIN || body.domain;
    accessToken = accessToken || body.AUTH_ID || body.auth_id || body.authId || body.access_token;
  }

  if (!accessToken || !domain) {
    console.log('POST /install FAILED. domain=' + domain + ' token=' + (accessToken ? 'present' : 'missing'));
    res.status(400).send('Missing install data (no access_token or domain found)');
    return;
  }

  console.log('POST /install OK domain=' + domain + ' token=' + accessToken.slice(0, 10) + '...');

  // Always run install logic (ensureUserFields + bindPlacements) for fresh/reauth
  try {
    const auth = { domain, accessToken };
    await ensureUserFields(auth);
    await bindPlacements(auth, `${config.appUrl}/placement`);
  } catch (error) {
    console.error('Install logic failed:', error instanceof Error ? error.message : error);
  }

  // If this request also carries PLACEMENT data, render widget HTML, otherwise install page
  if (body.PLACEMENT) {
    const placement = String(body.PLACEMENT || '');
    const placementOptions = String(body.PLACEMENT_OPTIONS || '{}');
    let entityId = 0;
    let entityType: 'deal' | 'lead' = 'deal';
    try {
      const options = JSON.parse(placementOptions) as { ID?: string | number; ENTITY_ID?: string | number };
      entityId = Number(options.ID ?? options.ENTITY_ID ?? 0);
    } catch { /* ignore */ }
    if (placement.includes('LEAD')) {
      entityType = 'lead';
    }
    res.send(renderPlacementHtml({
      placement,
      entityType,
      entityId,
      domain,
      authId: accessToken,
    }));
    return;
  }

  // Pure install (no placement context) — show install page
  await handleInstall(domain, accessToken, res);
});



installRouter.get('/authorize', (req, res) => {
  if (!config.bitrixClientId) {
    res.status(500).send('BITRIX_CLIENT_ID is not configured');
    return;
  }

  const domain = req.query.domain as string | undefined;
  const redirectUri = `${config.appUrl}/install`;
  const url = oauthAuthorizeUrl(config.bitrixClientId, redirectUri, domain);
  res.redirect(url);
});

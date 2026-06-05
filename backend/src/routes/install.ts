import { Router, type Request, type Response } from 'express';
import { config } from '../config';
import { bindPlacements, ensureUserFields } from '../services/bitrix';

export const installRouter = Router();

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
    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokens.access_token) {
      res.status(500).send(tokens.error_description ?? tokens.error ?? 'OAuth failed');
      return;
    }

    const auth = { domain: String(domain), accessToken: tokens.access_token };

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
});

installRouter.get('/authorize', (_req, res) => {
  if (!config.bitrixClientId) {
    res.status(500).send('BITRIX_CLIENT_ID is not configured');
    return;
  }

  const redirectUri = `${config.appUrl}/install`;
  const url = `https://oauth.bitrix.info/oauth/authorize/?client_id=${config.bitrixClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(url);
});

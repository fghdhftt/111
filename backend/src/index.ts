import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Counterparty check app listening on port ${config.port}`);
  console.log(`APP_URL: ${config.appUrl}`);
});

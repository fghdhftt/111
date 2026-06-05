import express from 'express';
import cors from 'cors';
import path from 'path';
import { apiRouter } from './routes/api';
import { installRouter } from './routes/install';
import { placementRouter } from './routes/placement';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiRouter);
  app.use('/install', installRouter);
  app.use('/placement', placementRouter);

  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use('/assets', express.static(frontendDist));
  app.use(express.static(frontendDist));

  app.get('/', (_req, res) => {
    res.redirect('/install/authorize');
  });

  return app;
}

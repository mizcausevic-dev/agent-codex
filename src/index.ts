import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import {
  policiesRouter,
  packsRouter,
  decisionsRouter,
  approvalsRouter,
  complianceRouter,
  dashboardRouter,
} from './routes/policies.js';
import { evaluateRouter } from './routes/evaluate.js';
import { openApiSpec } from './docs/swagger.js';

export const app = express();
const startedAt = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-codex',
    version: '0.1.0',
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    nodeEnv: env.nodeEnv,
  });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/api/policies', policiesRouter);
app.use('/api/packs', packsRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/evaluate', evaluateRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'not-found' });
});

if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`[agent-codex] listening on http://localhost:${env.port}`);
    console.log(`[agent-codex] swagger docs at http://localhost:${env.port}/docs`);
  });
}

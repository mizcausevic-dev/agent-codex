import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import { env } from './config/env';
import {
  policiesRouter,
  packsRouter,
  decisionsRouter,
  approvalsRouter,
  complianceRouter,
  dashboardRouter,
} from './routes/policies';
import { evaluateRouter } from './routes/evaluate';
import { openApiSpec } from './docs/swagger';

export const app = express();
const startedAt = Date.now();

app.use(helmet());
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
if (env.nodeEnv !== 'production') app.use('/demo', express.static(path.join(__dirname, '..', 'dashboard-preview')));

app.use((_req, res) => {
  res.status(404).json({ error: 'not-found' });
});

if (require.main === module) {
  if (env.nodeEnv === 'production') {
    console.error('[agent-codex] production start disabled: this fixture API has no authentication, approval workflow, or audit ledger.');
    process.exitCode = 1;
  } else {
    app.listen(env.port, '127.0.0.1', () => {
      console.log(`[agent-codex] demo listening on http://127.0.0.1:${env.port}`);
    });
  }
}

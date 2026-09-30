import { env } from './env';

if (env.nodeEnv === 'production') {
  throw new Error('[agent-codex] production import disabled: this fixture API is local-demo only.');
}

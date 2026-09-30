import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const entrypoints = ['src/index.ts', 'src/routes/policies.ts', 'src/routes/evaluate.ts'];

function importEntrypoint(entrypoint: string, nodeEnv: string) {
  return spawnSync(
    process.execPath,
    ['--require', 'ts-node/register', '--eval', `require(${JSON.stringify(path.join(root, entrypoint))})`],
    { cwd: root, env: { ...process.env, NODE_ENV: nodeEnv }, encoding: 'utf8', timeout: 20_000 }
  );
}

test('local demo app remains importable in development', () => {
  const result = importEntrypoint('src/index.ts', 'development');
  assert.equal(result.status, 0, result.stderr);
});

test('production import fails closed for the app and exported route modules', () => {
  for (const entrypoint of entrypoints) {
    const result = importEntrypoint(entrypoint, 'production');
    assert.equal(result.status, 1, `${entrypoint}: ${result.stderr}`);
    assert.match(result.stderr, /production import disabled/, entrypoint);
  }
});

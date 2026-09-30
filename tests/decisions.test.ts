import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateContext } from '../src/engine/policy-engine';
import { policies, policiesInPack } from '../src/data/policies';
import type { EvaluationContext, Policy } from '../src/schemas/validation-schemas';
import { simulateDryRun } from '../src/engine/dry-run';

test('decision: PII without redaction is denied by POL-005', () => {
  const ctx: EvaluationContext = {
    contextType: 'output',
    agentId: 'agt_support',
    environment: 'production',
    outputContainsPii: true,
    attributes: { redactionApplied: false },
  };
  const result = evaluateContext(policies, ctx);
  assert.equal(result.outcome, 'deny');
  assert.ok(result.policiesFired.some((p) => p.policyId === 'POL-005'));
});

test('decision: destructive tool call requires approval (POL-002)', () => {
  const ctx: EvaluationContext = {
    contextType: 'tool_invocation',
    agentId: 'agt_data_analyst',
    environment: 'production',
    attributes: { toolName: 'snowflake.delete_warehouse' },
  };
  const result = evaluateContext(policies, ctx);
  assert.equal(result.outcome, 'require_approval');
});

test('decision: pack-scoped evaluation only counts pack policies', () => {
  const euActPolicies = policiesInPack('eu-ai-act-ready');
  const ctx: EvaluationContext = {
    contextType: 'agent_registration',
    agentId: 'agt_eu',
    environment: 'production',
    riskClassification: 'high',
  };
  const result = evaluateContext(euActPolicies, ctx);
  assert.ok(result.policiesEvaluated < policies.length);
  // High-risk without oversight should fire POL-202
  assert.ok(result.policiesFired.some((p) => p.policyId === 'POL-202'));
});

test('POL-004 denies only production registrations without a tool allowlist', () => {
  const policy = policies.find((p) => p.id === 'POL-004');
  assert.ok(policy);
  const base: EvaluationContext = {
    contextType: 'agent_registration', agentId: 'agt_test', environment: 'production',
    toolAllowlist: ['github.read'],
  };
  assert.equal(evaluateContext([policy], base).outcome, 'allow');
  assert.equal(evaluateContext([policy], { ...base, toolAllowlist: undefined }).outcome, 'deny');
  assert.equal(evaluateContext([policy], { ...base, environment: 'staging', toolAllowlist: undefined }).outcome, 'allow');
});

test('dry-run rejects caller-supplied regex', () => {
  const candidate: Policy = { ...policies[0], conditions: [{ field: 'agentId', op: 'matches', value: '(a+)+$' }] };
  const rejected = simulateDryRun(candidate, 100);
  assert.deepEqual(rejected, { error: 'regex-candidate-not-supported' });
});

test('dry-run labels allowed replay synthetic', () => {
  const allowed = simulateDryRun({ ...policies[0], conditions: [{ field: 'environment', op: 'eq', value: 'production' }] }, 100);
  assert.ok(!('error' in allowed));
  assert.equal(allowed.synthetic, true);
});

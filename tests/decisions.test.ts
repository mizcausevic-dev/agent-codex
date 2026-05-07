import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateContext } from '../src/engine/policy-engine';
import { policies, policiesInPack } from '../src/data/policies';
import type { EvaluationContext } from '../src/schemas/validation-schemas';

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

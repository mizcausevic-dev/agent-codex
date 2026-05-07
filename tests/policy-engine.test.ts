import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCondition, evaluatePolicy, evaluateContext, combineOutcomes } from '../src/engine/policy-engine';
import { findPolicy, policies } from '../src/data/policies';
import type { EvaluationContext } from '../src/schemas/validation-schemas';

test('evaluateCondition: eq operator', () => {
  const ctx: EvaluationContext = {
    contextType: 'agent_registration',
    agentId: 'a1',
    environment: 'production',
  };
  assert.equal(evaluateCondition({ field: 'environment', op: 'eq', value: 'production' }, ctx), true);
  assert.equal(evaluateCondition({ field: 'environment', op: 'eq', value: 'staging' }, ctx), false);
});

test('evaluateCondition: nested attributes', () => {
  const ctx: EvaluationContext = {
    contextType: 'tool_invocation',
    agentId: 'a1',
    environment: 'production',
    attributes: { toolName: 'snowflake.delete_table' },
  };
  assert.equal(
    evaluateCondition({ field: 'attributes.toolName', op: 'matches', value: '(delete|terminate|drop)' }, ctx),
    true
  );
});

test('evaluateCondition: not_exists for missing field', () => {
  const ctx: EvaluationContext = {
    contextType: 'agent_registration',
    agentId: 'a1',
    environment: 'production',
  };
  assert.equal(evaluateCondition({ field: 'toolAllowlist', op: 'not_exists' }, ctx), true);
});

test('evaluatePolicy: production env without tool allowlist denies POL-004', () => {
  const policy = findPolicy('POL-004');
  assert.ok(policy);
  const ctx: EvaluationContext = {
    contextType: 'agent_registration',
    agentId: 'agt_test',
    environment: 'production',
  };
  const match = evaluatePolicy(policy!, ctx);
  assert.ok(match);
  assert.equal(match!.action, 'deny');
});

test('evaluatePolicy: contextType mismatch returns null', () => {
  const policy = findPolicy('POL-004'); // applies to agent_registration only
  const ctx: EvaluationContext = {
    contextType: 'output',
    agentId: 'agt_test',
    environment: 'production',
  };
  assert.equal(evaluatePolicy(policy!, ctx), null);
});

test('combineOutcomes: deny wins over warn', () => {
  const matches = [
    { policyId: 'A', policyName: 'A', severity: 'medium' as const, action: 'warn' as const, matchedConditions: [], complianceTags: [] },
    { policyId: 'B', policyName: 'B', severity: 'high' as const, action: 'deny' as const, matchedConditions: [], complianceTags: [] },
  ];
  assert.equal(combineOutcomes(matches), 'deny');
});

test('combineOutcomes: empty list is allow', () => {
  assert.equal(combineOutcomes([]), 'allow');
});

test('evaluateContext: clean staging registration with full data is allow', () => {
  const ctx: EvaluationContext = {
    contextType: 'agent_registration',
    agentId: 'agt_clean',
    environment: 'staging',
    ownerTeam: 'platform-eng',
    primaryModel: 'claude-sonnet-4-6',
    fallbackModel: 'gpt-4o-mini',
    toolAllowlist: ['github.read'],
    declaredPurpose: 'Test agent for CI',
    attributes: {
      auditRetentionDays: 365,
      auditLoggingEnabled: true,
      rbacOwner: 'platform-eng',
      credentialSource: 'vault',
      modelCardUrl: 'https://docs/internal/model-card.md',
      humanOversightMechanism: 'review-gate',
    },
  };
  const result = evaluateContext(policies, ctx);
  assert.equal(result.outcome, 'allow');
});

test('evaluateContext: production registration missing required fields is deny', () => {
  const ctx: EvaluationContext = {
    contextType: 'agent_registration',
    agentId: 'agt_broken',
    environment: 'production',
    primaryModel: 'gpt-3.5-turbo', // deprecated
  };
  const result = evaluateContext(policies, ctx);
  assert.equal(result.outcome, 'deny');
  assert.ok(result.policiesFired.length >= 3);
});

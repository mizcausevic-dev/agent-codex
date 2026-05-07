import type { Policy, PolicyCondition, EvaluationContext } from '../schemas/validation-schemas.js';

function getFieldValue(context: EvaluationContext, field: string): unknown {
  if (!field.includes('.')) {
    return (context as unknown as Record<string, unknown>)[field];
  }
  const parts = field.split('.');
  let cursor: unknown = context;
  for (const part of parts) {
    if (cursor === null || cursor === undefined) return undefined;
    cursor = (cursor as Record<string, unknown>)[part];
  }
  return cursor;
}

function valueIn(target: unknown, list: unknown): boolean {
  if (!Array.isArray(list)) return false;
  return list.includes(target);
}

function compareNumeric(a: unknown, b: unknown, op: 'gt' | 'gte' | 'lt' | 'lte'): boolean {
  if (typeof a !== 'number' || typeof b !== 'number') return false;
  switch (op) {
    case 'gt': return a > b;
    case 'gte': return a >= b;
    case 'lt': return a < b;
    case 'lte': return a <= b;
  }
}

export function evaluateCondition(
  condition: PolicyCondition,
  context: EvaluationContext
): boolean {
  const actual = getFieldValue(context, condition.field);
  switch (condition.op) {
    case 'eq': return actual === condition.value;
    case 'neq': return actual !== condition.value;
    case 'in': return valueIn(actual, condition.value);
    case 'not_in': return !valueIn(actual, condition.value);
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
      return compareNumeric(actual, condition.value, condition.op);
    case 'matches':
      if (typeof actual !== 'string' || typeof condition.value !== 'string') return false;
      try {
        return new RegExp(condition.value).test(actual);
      } catch {
        return false;
      }
    case 'exists': return actual !== undefined && actual !== null;
    case 'not_exists': return actual === undefined || actual === null;
  }
}

export interface PolicyMatch {
  policyId: string;
  policyName: string;
  severity: Policy['severity'];
  action: Policy['action'];
  matchedConditions: PolicyCondition[];
  rationale?: string;
  complianceTags: string[];
}

export function evaluatePolicy(policy: Policy, context: EvaluationContext): PolicyMatch | null {
  if (!policy.enabled) return null;
  if (!policy.appliesTo.includes(context.contextType)) return null;

  const matchedConditions = policy.conditions.filter((c) => evaluateCondition(c, context));
  const fired = policy.conditionsOperator === 'all'
    ? matchedConditions.length === policy.conditions.length
    : matchedConditions.length > 0;

  if (!fired) return null;

  return {
    policyId: policy.id,
    policyName: policy.name,
    severity: policy.severity,
    action: policy.action,
    matchedConditions,
    rationale: policy.rationale,
    complianceTags: policy.complianceTags,
  };
}

export type Outcome = 'allow' | 'warn' | 'deny' | 'require_approval';

export interface EvaluationResult {
  outcome: Outcome;
  policiesEvaluated: number;
  policiesFired: PolicyMatch[];
  passedPolicies: { policyId: string; policyName: string }[];
  reasoning: string;
  recommendedNextAction: string;
  complianceTagsHit: string[];
}

const ACTION_PRECEDENCE: Record<Outcome, number> = {
  allow: 0,
  warn: 1,
  require_approval: 2,
  deny: 3,
};

export function combineOutcomes(matches: PolicyMatch[]): Outcome {
  if (matches.length === 0) return 'allow';
  let highest: Outcome = 'allow';
  for (const m of matches) {
    if (ACTION_PRECEDENCE[m.action] > ACTION_PRECEDENCE[highest]) {
      highest = m.action;
    }
  }
  return highest;
}

export function evaluateContext(
  policies: Policy[],
  context: EvaluationContext
): EvaluationResult {
  const applicable = policies.filter((p) => p.enabled && p.appliesTo.includes(context.contextType));
  const fired: PolicyMatch[] = [];
  const passed: { policyId: string; policyName: string }[] = [];

  for (const p of applicable) {
    const match = evaluatePolicy(p, context);
    if (match) fired.push(match);
    else passed.push({ policyId: p.id, policyName: p.name });
  }

  const outcome = combineOutcomes(fired);
  const complianceTagsHit = Array.from(new Set(fired.flatMap((m) => m.complianceTags)));

  let reasoning: string;
  let recommendedNextAction: string;
  if (fired.length === 0) {
    reasoning = `All ${applicable.length} applicable policies satisfied.`;
    recommendedNextAction = 'Allow; continue routine policy sampling.';
  } else {
    const summary = fired.map((m) => `${m.policyId} (${m.action})`).join(', ');
    reasoning = `${fired.length} of ${applicable.length} policies fired: ${summary}.`;
    if (outcome === 'deny') {
      recommendedNextAction = 'Block context; surface violations to agent owner; require remediation before retry.';
    } else if (outcome === 'require_approval') {
      recommendedNextAction = 'Route to approval queue; human reviewer decides allow or deny.';
    } else if (outcome === 'warn') {
      recommendedNextAction = 'Allow but emit warning to owner team; track for trending.';
    } else {
      recommendedNextAction = 'Allow.';
    }
  }

  return {
    outcome,
    policiesEvaluated: applicable.length,
    policiesFired: fired,
    passedPolicies: passed,
    reasoning,
    recommendedNextAction,
    complianceTagsHit,
  };
}

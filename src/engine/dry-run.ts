import type { EvaluationContext, Policy } from '../schemas/validation-schemas';
import { decisions } from '../data/decisions';
import { evaluatePolicy } from './policy-engine';

export function simulateDryRun(candidate: Policy, sampleSize: number) {
  if (candidate.conditions.some((condition) => condition.op === 'matches')) {
    return { error: 'regex-candidate-not-supported' } as const;
  }

  const sample = decisions.slice(0, sampleSize);
  let wouldAllow = 0;
  let wouldWarn = 0;
  let wouldDeny = 0;
  let wouldApprove = 0;
  const examples: { decisionId: string; agentId: string; impact: 'no-change' | 'now-blocked' | 'now-warned' | 'now-approval' }[] = [];

  for (const d of sample) {
    const synthetic: EvaluationContext = {
      contextType: d.contextType,
      agentId: d.agentId,
      environment: d.environment,
      attributes: { auditRetentionDays: 90, dataClass: 'pii', auditLoggingEnabled: true },
      ownerTeam: 'platform-eng',
    };
    const match = evaluatePolicy(candidate, synthetic);
    if (!match) {
      wouldAllow += 1;
      continue;
    }
    if (match.action === 'deny') wouldDeny += 1;
    else if (match.action === 'warn') wouldWarn += 1;
    else if (match.action === 'require_approval') wouldApprove += 1;
    else wouldAllow += 1;

    if (examples.length < 5 && d.outcome === 'allow') {
      const impact = match.action === 'deny'
        ? 'now-blocked'
        : match.action === 'warn'
          ? 'now-warned'
          : match.action === 'require_approval'
            ? 'now-approval'
            : 'no-change';
      examples.push({ decisionId: d.decisionId, agentId: d.agentId, impact });
    }
  }

  return {
    synthetic: true,
    sampleSource: 'seeded-decision-fixtures-with-synthetic-attributes',
    candidatePolicyId: candidate.id,
    sampleSize: sample.length,
    projectedOutcome: { wouldAllow, wouldWarn, wouldApprove, wouldDeny },
    impactedExamples: examples,
    note: 'Illustrative fixture replay only. It does not measure production blast radius.',
  };
}

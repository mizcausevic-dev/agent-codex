import { Router } from 'express';
import { EvaluationContextSchema, DryRunRequestSchema, PolicySchema } from '../schemas/validation-schemas.js';
import { policies, findPack } from '../data/policies.js';
import { decisions } from '../data/decisions.js';
import { evaluateContext, evaluatePolicy } from '../engine/policy-engine.js';

export const evaluateRouter = Router();

evaluateRouter.post('/', (req, res) => {
  const parsed = EvaluationContextSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid-payload', issues: parsed.error.issues });
  }
  const start = Date.now();
  const result = evaluateContext(policies, parsed.data);
  const latencyMs = Date.now() - start;
  return res.json({
    decisionId: `dec_${Math.random().toString(36).slice(2, 8)}`,
    contextType: parsed.data.contextType,
    agentId: parsed.data.agentId,
    environment: parsed.data.environment,
    ...result,
    latencyMs,
    evaluatedAt: new Date().toISOString(),
  });
});

evaluateRouter.post('/by-pack/:packId', (req, res) => {
  const pack = findPack(req.params.packId);
  if (!pack) return res.status(404).json({ error: 'pack-not-found', id: req.params.packId });
  const parsed = EvaluationContextSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid-payload', issues: parsed.error.issues });
  }
  const packPolicies = pack.policyIds
    .map((id) => policies.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const start = Date.now();
  const result = evaluateContext(packPolicies, parsed.data);
  const latencyMs = Date.now() - start;
  return res.json({
    decisionId: `dec_${Math.random().toString(36).slice(2, 8)}`,
    packId: pack.id,
    contextType: parsed.data.contextType,
    agentId: parsed.data.agentId,
    ...result,
    latencyMs,
    evaluatedAt: new Date().toISOString(),
  });
});

evaluateRouter.post('/dry-run', (req, res) => {
  const parsed = DryRunRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid-payload', issues: parsed.error.issues });
  }
  // Synthesize a candidate policy and replay against historic decisions
  const candidate = PolicySchema.safeParse({
    ...parsed.data.candidatePolicy,
    createdAt: parsed.data.candidatePolicy.createdAt ?? new Date().toISOString(),
    updatedAt: parsed.data.candidatePolicy.updatedAt ?? new Date().toISOString(),
  });
  if (!candidate.success) {
    return res.status(400).json({ error: 'invalid-candidate-policy', issues: candidate.error.issues });
  }

  // Mock historic context replay using the recorded decisions as proxies
  const sample = decisions.slice(0, parsed.data.sampleSize);
  let wouldAllow = 0;
  let wouldWarn = 0;
  let wouldDeny = 0;
  let wouldApprove = 0;
  const examples: { decisionId: string; agentId: string; impact: 'no-change' | 'now-blocked' | 'now-warned' | 'now-approval' }[] = [];

  for (const d of sample) {
    const synthetic = {
      contextType: d.contextType,
      agentId: d.agentId,
      environment: d.environment,
      attributes: { auditRetentionDays: 90, dataClass: 'pii', auditLoggingEnabled: true },
      ownerTeam: 'platform-eng',
    };
    const match = evaluatePolicy(candidate.data, synthetic as any);
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

  return res.json({
    candidatePolicyId: candidate.data.id,
    sampleSize: sample.length,
    projectedOutcome: {
      wouldAllow,
      wouldWarn,
      wouldApprove,
      wouldDeny,
    },
    impactedExamples: examples,
    note: 'Dry-run replays the candidate policy against recorded decisions to estimate blast radius before enabling.',
  });
});

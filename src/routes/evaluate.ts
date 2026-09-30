import '../config/demo-only';
import { Router } from 'express';
import { EvaluationContextSchema, DryRunRequestSchema, PolicySchema } from '../schemas/validation-schemas';
import { policies, findPack } from '../data/policies';
import { evaluateContext } from '../engine/policy-engine';
import { simulateDryRun } from '../engine/dry-run';

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
  const preview = simulateDryRun(candidate.data, parsed.data.sampleSize);
  if ('error' in preview) return res.status(400).json(preview);
  return res.json(preview);
});

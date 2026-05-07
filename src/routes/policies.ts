import { Router } from 'express';
import { policies, policyPacks, supportedFrameworks, findPolicy, findPack, policiesInPack } from '../data/policies';
import { decisions, approvals } from '../data/decisions';
import { buildComplianceCoverage } from '../engine/compliance-mapper';

export const policiesRouter = Router();

policiesRouter.get('/', (req, res) => {
  const pack = req.query.pack as string | undefined;
  const severity = req.query.severity as string | undefined;
  let filtered = policies;
  if (pack) filtered = filtered.filter((p) => p.packs.includes(pack));
  if (severity) filtered = filtered.filter((p) => p.severity === severity);
  res.json({
    count: filtered.length,
    policies: filtered.map((p) => ({
      id: p.id,
      name: p.name,
      severity: p.severity,
      action: p.action,
      enabled: p.enabled,
      appliesTo: p.appliesTo,
      packs: p.packs,
      complianceTags: p.complianceTags,
      ownerTeam: p.ownerTeam,
    })),
  });
});

policiesRouter.get('/:id', (req, res) => {
  const policy = findPolicy(req.params.id);
  if (!policy) return res.status(404).json({ error: 'policy-not-found', id: req.params.id });
  return res.json(policy);
});

export const packsRouter = Router();

packsRouter.get('/', (_req, res) => {
  res.json({
    count: policyPacks.length,
    packs: policyPacks.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      framework: p.framework,
      enabled: p.enabled,
      policyCount: p.policyIds.length,
    })),
  });
});

packsRouter.get('/:id', (req, res) => {
  const pack = findPack(req.params.id);
  if (!pack) return res.status(404).json({ error: 'pack-not-found', id: req.params.id });
  const memberPolicies = policiesInPack(pack.id);
  return res.json({ ...pack, policies: memberPolicies });
});

export const decisionsRouter = Router();

decisionsRouter.get('/', (req, res) => {
  const outcome = req.query.outcome as string | undefined;
  const agentId = req.query.agentId as string | undefined;
  let filtered = decisions;
  if (outcome) filtered = filtered.filter((d) => d.outcome === outcome);
  if (agentId) filtered = filtered.filter((d) => d.agentId === agentId);
  res.json({ count: filtered.length, decisions: filtered });
});

decisionsRouter.get('/:id', (req, res) => {
  const decision = decisions.find((d) => d.decisionId === req.params.id);
  if (!decision) return res.status(404).json({ error: 'decision-not-found', id: req.params.id });
  // Hydrate fired policy details
  const firedPolicies = decision.policiesFired
    .map((id) => findPolicy(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  return res.json({ ...decision, firedPolicies });
});

export const approvalsRouter = Router();

approvalsRouter.get('/', (_req, res) => {
  res.json({ count: approvals.length, approvals });
});

export const complianceRouter = Router();

complianceRouter.get('/coverage', (_req, res) => {
  res.json(buildComplianceCoverage());
});

complianceRouter.get('/frameworks', (_req, res) => {
  res.json({ count: supportedFrameworks.length, frameworks: supportedFrameworks });
});

export const dashboardRouter = Router();

dashboardRouter.get('/summary', (_req, res) => {
  const enabled = policies.filter((p) => p.enabled).length;
  const byOutcome = {
    allow: decisions.filter((d) => d.outcome === 'allow').length,
    warn: decisions.filter((d) => d.outcome === 'warn').length,
    deny: decisions.filter((d) => d.outcome === 'deny').length,
    require_approval: decisions.filter((d) => d.outcome === 'require_approval').length,
  };
  const coverage = buildComplianceCoverage();
  res.json({
    library: {
      totalPolicies: policies.length,
      enabledPolicies: enabled,
      activePacks: policyPacks.filter((p) => p.enabled).length,
      frameworksSupported: supportedFrameworks.length,
    },
    decisions: {
      total: decisions.length,
      byOutcome,
      avgLatencyMs: Math.round(decisions.reduce((acc, d) => acc + d.latencyMs, 0) / Math.max(1, decisions.length)),
      pendingApprovals: approvals.filter((a) => a.status === 'pending').length,
    },
    compliance: {
      avgCoveragePct: Math.round(
        coverage.frameworks.reduce((acc, f) => acc + f.coveragePct, 0) / coverage.frameworks.length
      ),
      framework: coverage.frameworks.map((f) => ({
        id: f.frameworkId,
        name: f.frameworkName,
        coveragePct: f.coveragePct,
      })),
    },
    generatedAt: new Date().toISOString(),
  });
});

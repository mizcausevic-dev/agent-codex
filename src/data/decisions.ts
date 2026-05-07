export interface PolicyDecision {
  decisionId: string;
  contextType: 'agent_registration' | 'agent_run' | 'tool_invocation' | 'output';
  agentId: string;
  environment: 'production' | 'staging' | 'development';
  outcome: 'allow' | 'warn' | 'deny' | 'require_approval';
  policiesEvaluated: number;
  policiesFired: string[]; // policy IDs that matched
  reasoning: string;
  evaluatedAt: string;
  latencyMs: number;
  evaluator: string;
}

export const decisions: PolicyDecision[] = [
  {
    decisionId: 'dec_4f8e21',
    contextType: 'agent_registration',
    agentId: 'agt_finance_audit',
    environment: 'production',
    outcome: 'deny',
    policiesEvaluated: 18,
    policiesFired: ['POL-004', 'POL-009', 'POL-103', 'POL-305'],
    reasoning: 'Missing tool allowlist, owner team, audit retention < 90d, and inline credentials.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    latencyMs: 38,
    evaluator: 'platform-eng-cli',
  },
  {
    decisionId: 'dec_a91c04',
    contextType: 'tool_invocation',
    agentId: 'agt_data_analyst',
    environment: 'production',
    outcome: 'require_approval',
    policiesEvaluated: 12,
    policiesFired: ['POL-002'],
    reasoning: 'Tool invocation matches destructive verb (delete); human approval required.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    latencyMs: 22,
    evaluator: 'agentobserve-runtime',
  },
  {
    decisionId: 'dec_b2f7d8',
    contextType: 'output',
    agentId: 'agt_support_triage',
    environment: 'production',
    outcome: 'deny',
    policiesEvaluated: 8,
    policiesFired: ['POL-005'],
    reasoning: 'Output contains PII; redaction guardrail not applied.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    latencyMs: 41,
    evaluator: 'agentobserve-runtime',
  },
  {
    decisionId: 'dec_e84102',
    contextType: 'agent_run',
    agentId: 'agt_data_analyst',
    environment: 'production',
    outcome: 'warn',
    policiesEvaluated: 14,
    policiesFired: ['POL-006', 'POL-008'],
    reasoning: 'Tool calls > 50 and retry count > 3 — flagging for owner review.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    latencyMs: 27,
    evaluator: 'agentobserve-runtime',
  },
  {
    decisionId: 'dec_c91a55',
    contextType: 'agent_registration',
    agentId: 'agt_research',
    environment: 'production',
    outcome: 'allow',
    policiesEvaluated: 18,
    policiesFired: [],
    reasoning: 'All applicable policies satisfied.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    latencyMs: 31,
    evaluator: 'platform-eng-cli',
  },
  {
    decisionId: 'dec_72db14',
    contextType: 'agent_registration',
    agentId: 'agt_eu_classifier',
    environment: 'production',
    outcome: 'deny',
    policiesEvaluated: 18,
    policiesFired: ['POL-202', 'POL-204'],
    reasoning: 'High-risk classification without human oversight gate; audit retention < 180d.',
    evaluatedAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    latencyMs: 44,
    evaluator: 'governance-portal',
  },
];

export interface ApprovalQueue {
  approvalId: string;
  decisionId: string;
  agentId: string;
  policyId: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  reviewer?: string;
}

export const approvals: ApprovalQueue[] = [
  {
    approvalId: 'apr_001',
    decisionId: 'dec_a91c04',
    agentId: 'agt_data_analyst',
    policyId: 'POL-002',
    reason: 'Run requested DELETE on snowflake.warehouse — human approval required.',
    requestedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    status: 'pending',
  },
  {
    approvalId: 'apr_002',
    decisionId: 'dec_x42a91',
    agentId: 'agt_invoice_processor',
    policyId: 'POL-002',
    reason: 'Run requested netsuite.terminate_invoice — human approval required.',
    requestedAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    status: 'pending',
  },
];

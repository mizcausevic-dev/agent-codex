export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AgentCodex API',
    version: '0.1.0',
    description:
      'Governance-as-code policy engine for AI platforms — define policies, map to compliance standards, evaluate decisions, produce audit ledgers.',
  },
  servers: [{ url: 'http://localhost:3002', description: 'Local dev' }],
  paths: {
    '/health': { get: { summary: 'Service health' } },
    '/api/policies': { get: { summary: 'List all policies (filter by pack or severity)' } },
    '/api/policies/{id}': { get: { summary: 'Fetch one policy' } },
    '/api/packs': { get: { summary: 'List policy packs' } },
    '/api/packs/{id}': { get: { summary: 'Fetch one pack with member policies' } },
    '/api/decisions': { get: { summary: 'List recent policy decisions (filter by outcome / agentId)' } },
    '/api/decisions/{id}': { get: { summary: 'Fetch one decision with hydrated fired policies' } },
    '/api/approvals': { get: { summary: 'List pending human approvals' } },
    '/api/compliance/coverage': { get: { summary: 'Coverage report by framework' } },
    '/api/compliance/frameworks': { get: { summary: 'List supported compliance frameworks' } },
    '/api/dashboard/summary': { get: { summary: 'Operations summary view' } },
    '/api/evaluate': { post: { summary: 'Evaluate a context against all enabled policies' } },
    '/api/evaluate/by-pack/{packId}': { post: { summary: 'Evaluate a context against a single pack' } },
    '/api/evaluate/dry-run': { post: { summary: 'Replay a candidate policy against historic decisions to estimate blast radius' } },
  },
};

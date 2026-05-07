import { z } from 'zod';

export const PolicyConditionSchema = z.object({
  field: z.string().min(1),
  op: z.enum(['eq', 'neq', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'matches', 'exists', 'not_exists']),
  value: z.unknown().optional(),
});

export const PolicySchema = z.object({
  id: z.string().regex(/^POL-\d{3}$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  action: z.enum(['allow', 'warn', 'deny', 'require_approval']),
  enabled: z.boolean().default(true),
  appliesTo: z.array(z.enum(['agent_registration', 'agent_run', 'tool_invocation', 'output'])).min(1),
  conditions: z.array(PolicyConditionSchema).min(1),
  conditionsOperator: z.enum(['all', 'any']).default('all'),
  packs: z.array(z.string()).default([]),
  complianceTags: z.array(z.string()).default([]),
  rationale: z.string().max(2000).optional(),
  ownerTeam: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const EvaluationContextSchema = z.object({
  contextType: z.enum(['agent_registration', 'agent_run', 'tool_invocation', 'output']),
  agentId: z.string().min(1),
  environment: z.enum(['production', 'staging', 'development']),
  ownerTeam: z.string().optional(),
  primaryModel: z.string().optional(),
  fallbackModel: z.string().optional(),
  toolAllowlist: z.array(z.string()).optional(),
  declaredPurpose: z.string().optional(),
  riskClassification: z.enum(['low', 'limited', 'high', 'unacceptable']).optional(),
  runCostUsd: z.number().min(0).optional(),
  toolCallCount: z.number().min(0).optional(),
  retryCount: z.number().min(0).optional(),
  outputContainsPii: z.boolean().optional(),
  // Free-form extension bag for policy authors
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const PolicyPackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  policyIds: z.array(z.string().regex(/^POL-\d{3}$/)).min(1),
  framework: z.string().optional(),
  enabled: z.boolean().default(true),
});

export const DryRunRequestSchema = z.object({
  candidatePolicy: PolicySchema.partial({ createdAt: true, updatedAt: true }).extend({
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
  sampleSize: z.number().min(1).max(1000).optional().default(100),
});

export type PolicyCondition = z.infer<typeof PolicyConditionSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;
export type PolicyPack = z.infer<typeof PolicyPackSchema>;
export type DryRunRequest = z.infer<typeof DryRunRequestSchema>;

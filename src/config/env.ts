import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT ?? '3002', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  defaultPack: process.env.POLICY_DEFAULT_PACK ?? 'production-baseline',
  dryRunDefault: process.env.POLICY_DRY_RUN_DEFAULT === 'true',
  auditRetentionDays: parseInt(process.env.POLICY_AUDIT_RETENTION_DAYS ?? '180', 10),
  decisionLatencyTargetMs: parseInt(process.env.DECISION_LATENCY_TARGET_MS ?? '50', 10),
  defaultFramework: process.env.COMPLIANCE_DEFAULT_FRAMEWORK ?? 'soc2',
  sentinelBaseUrl: process.env.SENTINEL_BASE_URL ?? '',
  agentobserveBaseUrl: process.env.AGENTOBSERVE_BASE_URL ?? '',
};

import type { MetricProvenance, MetricValue } from './types';

/** Host / tool environments CUO can observe. */
export type AgentEnvironment = 'cursor' | 'claude_code' | 'unknown';

export type IntegrationId = 'cursor' | 'claude_code' | 'ponytail' | 'graphify';

export type IntegrationAvailability =
  | 'available'
  | 'detected'
  | 'missing'
  | 'error'
  | 'disabled';

export interface IntegrationCapability {
  id: string;
  label: string;
  available: boolean;
  notes?: string;
}

export interface IntegrationStatus {
  id: IntegrationId;
  displayName: string;
  availability: IntegrationAvailability;
  version?: string;
  enabled: boolean;
  pathHints: string[];
  capabilities: IntegrationCapability[];
  errors: string[];
  compatibilityNotes: string[];
  lastCheckedAt: string;
}

export interface TelemetrySessionRecord {
  schemaVersion: 1;
  id: string;
  environment: AgentEnvironment;
  projectKey: string;
  startedAt: string;
  endedAt?: string;
  inputTokens: MetricValue;
  outputTokens: MetricValue;
  contextTokens: MetricValue;
  costUsd: MetricValue;
  durationMs: MetricValue;
  toolCallCount: number;
  repetitiveOps: number;
  recommendations: string[];
  notes: string[];
  sourcePaths: string[];
}

export interface TelemetryActivityEvent {
  schemaVersion: 1;
  id: string;
  sessionId: string;
  environment: AgentEnvironment;
  projectKey: string;
  at: string;
  kind:
    | 'session_start'
    | 'session_end'
    | 'prompt'
    | 'tool'
    | 'statusline'
    | 'optimization'
    | 'graphify'
    | 'ponytail'
    | 'note';
  summary: string;
  details?: Record<string, unknown>;
  provenance: MetricProvenance;
}

export interface TelemetryOptimizationRecord {
  schemaVersion: 1;
  id: string;
  at: string;
  environment: AgentEnvironment;
  projectKey: string;
  title: string;
  estimatedSavingsTokens: MetricValue;
  resultNotes: string[];
}

export interface EnvironmentAggregate {
  environment: AgentEnvironment;
  sessionCount: number;
  inputTokens: MetricValue;
  outputTokens: MetricValue;
  contextTokens: MetricValue;
  costUsd: MetricValue;
  durationMs: MetricValue;
  toolCallCount: number;
  repetitiveOps: number;
  optimizationCount: number;
  estimatedSavingsTokens: MetricValue;
}

export interface CrossAgentComparison {
  generatedAt: string;
  filter: CrossAgentFilter;
  byEnvironment: EnvironmentAggregate[];
  notes: string[];
  normalizationNotes: string[];
}

export interface CrossAgentFilter {
  environments?: AgentEnvironment[];
  projectKey?: string;
  sinceIso?: string;
  untilIso?: string;
}

export interface GraphifyQueryHint {
  available: boolean;
  graphPath?: string;
  query?: string;
  resultPreview?: string;
  tokensAvoidedNote?: string;
  provenance: MetricProvenance;
  error?: string;
}

export interface PonytailObservation {
  detected: boolean;
  modeHint?: string;
  bandMetricsPath?: string;
  recentTaskCount?: number;
  notes: string[];
  provenance: MetricProvenance;
}

export interface EcosystemSnapshot {
  integrations: IntegrationStatus[];
  sessions: TelemetrySessionRecord[];
  activity: TelemetryActivityEvent[];
  optimizations: TelemetryOptimizationRecord[];
  comparison: CrossAgentComparison;
  ponytail?: PonytailObservation;
  graphify?: GraphifyQueryHint;
}

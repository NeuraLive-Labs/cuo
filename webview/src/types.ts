export type MetricProvenance = 'Real' | 'Estimated' | 'Imported' | 'Unavailable';

export interface MetricValue {
  tokens: number | null;
  bytes?: number | null;
  provenance: MetricProvenance;
  source: string;
  confidence: number;
  notes?: string;
}

export interface ContextCategoryBreakdown {
  id: string;
  label: string;
  metric: MetricValue;
  details: string[];
}

export interface ContextSnapshot {
  id: string;
  capturedAt: string;
  workspaceFolder?: string;
  total: MetricValue;
  categories: ContextCategoryBreakdown[];
  acquisitionPath: string[];
  notes: string[];
}

export interface Recommendation {
  id: string;
  module: string;
  title: string;
  description: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimatedSavingsTokens: number;
  savingsProvenance: MetricProvenance;
  confidence: number;
  evidence: string[];
  actionKind: string;
  targetPath?: string;
  proposedContent?: string;
  reversible: boolean;
  requiresAuthorization: boolean;
}

export interface WasteFinding {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  impact: string;
  evidence: string[];
  recommendation: string;
  estimatedSavingsTokens: number;
  savingsProvenance: MetricProvenance;
  confidence: number;
}

export interface ModelAdvice {
  taskType: string;
  recommendedModelFamily: string;
  rationale: string;
  whenToAvoid: string;
  estimatedRelativeCost: 'low' | 'medium' | 'high';
}

export interface UsageSessionStats {
  sessionId: string;
  startedAt: string;
  inputTokens: MetricValue;
  outputTokens: MetricValue;
  contextTokens: MetricValue;
  estimatedCostUsd: MetricValue;
  projectKey: string;
  savingsTokens: MetricValue;
}

export interface OptimizationRunResult {
  id: string;
  ranAt: string;
  mode: string;
  context: ContextSnapshot;
  findings: WasteFinding[];
  recommendations: Recommendation[];
  applied: Array<{ id: string; path: string; summary: string }>;
  notes: string[];
}

export interface IntegrationStatus {
  id: string;
  displayName: string;
  availability: string;
  version?: string;
  enabled: boolean;
  pathHints: string[];
  capabilities: Array<{ id: string; label: string; available: boolean; notes?: string }>;
  errors: string[];
  compatibilityNotes: string[];
  lastCheckedAt: string;
}

export interface EnvironmentAggregate {
  environment: string;
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

export interface EcosystemSnapshot {
  integrations: IntegrationStatus[];
  sessions: Array<{
    id: string;
    environment: string;
    projectKey: string;
    startedAt: string;
    toolCallCount: number;
    repetitiveOps: number;
    inputTokens: MetricValue;
    outputTokens: MetricValue;
    contextTokens: MetricValue;
    costUsd: MetricValue;
    notes: string[];
  }>;
  activity: Array<{
    id: string;
    at: string;
    environment: string;
    kind: string;
    summary: string;
    provenance: MetricProvenance;
  }>;
  optimizations: Array<{
    id: string;
    at: string;
    environment: string;
    title: string;
    estimatedSavingsTokens: MetricValue;
  }>;
  comparison: {
    generatedAt: string;
    byEnvironment: EnvironmentAggregate[];
    notes: string[];
    normalizationNotes: string[];
  };
  ponytail?: {
    detected: boolean;
    recentTaskCount?: number;
    notes: string[];
    provenance: MetricProvenance;
  };
  graphify?: {
    available: boolean;
    graphPath?: string;
    resultPreview?: string;
    tokensAvoidedNote?: string;
    provenance: MetricProvenance;
    error?: string;
  };
}

export interface AnalyticsBundle {
  generatedAt: string;
  latestContext?: ContextSnapshot;
  history: ContextSnapshot[];
  latestRun?: OptimizationRunResult;
  usage: UsageSessionStats;
  findings: WasteFinding[];
  recommendations: Recommendation[];
  modelAdvice: ModelAdvice[];
  ecosystem?: EcosystemSnapshot;
}

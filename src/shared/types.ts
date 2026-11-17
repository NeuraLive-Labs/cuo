/** Provenance for every numeric metric CUO surfaces. */
export type MetricProvenance = 'Real' | 'Estimated' | 'Imported' | 'Unavailable';

export type ContextCategoryId =
  | 'system_prompt'
  | 'tool_definitions'
  | 'rules'
  | 'skills'
  | 'mcp_dynamic_tools'
  | 'subagent_definitions'
  | 'summarized_conversation'
  | 'conversation'
  | 'files';

export const CONTEXT_CATEGORY_LABELS: Record<ContextCategoryId, string> = {
  system_prompt: 'System Prompt',
  tool_definitions: 'Tool Definitions',
  rules: 'Rules',
  skills: 'Skills',
  mcp_dynamic_tools: 'MCP & Dynamic Tools',
  subagent_definitions: 'Subagent Definitions',
  summarized_conversation: 'Summarized Conversation',
  conversation: 'Conversation',
  files: 'Files'
};

export type WastePriority = 'Critical' | 'High' | 'Medium' | 'Low';

export type OptimizationMode = 'analysis' | 'recommendation' | 'assisted' | 'automatic';

export type SafeAutoAction =
  | 'suggestOnly'
  | 'appendCursorignorePatterns'
  | 'disableRedundantMcpServer';

export interface MetricValue {
  tokens: number | null;
  bytes?: number | null;
  provenance: MetricProvenance;
  source: string;
  confidence: number;
  notes?: string;
}

export interface ContextCategoryBreakdown {
  id: ContextCategoryId;
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
  category: ContextCategoryId | 'general' | 'model' | 'conversation';
  priority: WastePriority;
  estimatedSavingsTokens: number;
  savingsProvenance: MetricProvenance;
  confidence: number;
  evidence: string[];
  actionKind:
    | 'none'
    | 'editFile'
    | 'appendFile'
    | 'disableMcp'
    | 'suggestPrompt'
    | 'suggestModel'
    | 'summarizeStrategy';
  targetPath?: string;
  proposedContent?: string;
  reversible: boolean;
  requiresAuthorization: boolean;
  safeAutoAction?: SafeAutoAction;
}

export interface WasteFinding {
  id: string;
  title: string;
  description: string;
  category: ContextCategoryId | 'general';
  priority: WastePriority;
  impact: string;
  evidence: string[];
  recommendation: string;
  estimatedSavingsTokens: number;
  savingsProvenance: MetricProvenance;
  confidence: number;
  dedupeKey: string;
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
  mode: OptimizationMode;
  context: ContextSnapshot;
  findings: WasteFinding[];
  recommendations: Recommendation[];
  applied: AppliedChange[];
  notes: string[];
}

export interface AppliedChange {
  id: string;
  recommendationId: string;
  path: string;
  appliedAt: string;
  backupKey: string;
  summary: string;
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
  /** Multi-agent ecosystem snapshot (optional integrations). */
  ecosystem?: import('./ecosystem').EcosystemSnapshot;
}

export interface CuoSettings {
  optimizationMode: OptimizationMode;
  charsPerToken: number;
  autoAnalyzeOnOpen: boolean;
  statusBarEnabled: boolean;
  historyLimit: number;
  safeAutoActions: SafeAutoAction[];
  tokenPricingUsdPer1kInput: number;
  tokenPricingUsdPer1kOutput: number;
  neverSendCodeExternally: boolean;
  integrations: {
    cursor: boolean;
    claudeCode: boolean;
    ponytail: boolean;
    graphify: boolean;
  };
}

export interface ManualContextCapture {
  systemPromptTokens?: number;
  toolDefinitionsTokens?: number;
  rulesTokens?: number;
  skillsTokens?: number;
  mcpDynamicToolsTokens?: number;
  subagentDefinitionsTokens?: number;
  summarizedConversationTokens?: number;
  conversationTokens?: number;
  filesTokens?: number;
  totalTokens?: number;
  notes?: string;
}

export interface ImportedContextReport {
  raw: string;
  parsed: ManualContextCapture;
  format: 'json' | 'keyvalue' | 'unknown';
}

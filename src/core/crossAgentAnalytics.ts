import type {
  CrossAgentComparison,
  CrossAgentFilter,
  EnvironmentAggregate,
  TelemetryActivityEvent,
  TelemetryOptimizationRecord,
  TelemetrySessionRecord
} from '../shared/ecosystem';
import type { MetricProvenance, MetricValue } from '../shared/types';
import { LocalTelemetryStore } from './localTelemetry';

const ENVIRONMENTS = ['cursor', 'claude_code'] as const;

export class CrossAgentAnalytics {
  constructor(private readonly store = new LocalTelemetryStore()) {}

  buildComparison(filter: CrossAgentFilter = {}): CrossAgentComparison {
    const sessions = this.store.listSessions(filter);
    const optimizations = this.store.listOptimizations(filter);
    const byEnvironment = ENVIRONMENTS.map((environment) =>
      aggregateEnvironment(
        environment,
        sessions.filter((s) => s.environment === environment),
        optimizations.filter((o) => o.environment === environment)
      )
    );

    return {
      generatedAt: new Date().toISOString(),
      filter,
      byEnvironment,
      notes: [
        'Cursor has no public Context Usage composition API; Cursor context figures are often Estimated or Imported.',
        'Claude Code status-line token counts come from the latest API response when present (Real); cost.total_cost_usd is client-side Estimated.',
        'Never mix Estimated totals into Real totals — aggregates keep the weakest provenance in the set.'
      ],
      normalizationNotes: [
        'Input/output token fields are only summed when every contributing session has a numeric value for that field; otherwise tokens=null and provenance=Unavailable.',
        'Cost and duration follow the same rule; a single Unavailable/null contribution voids a Real sum.',
        'When mixed provenances exist among numeric values, the aggregate provenance is the weakest (Unavailable < Imported < Estimated < Real inverted ranking).'
      ]
    };
  }

  loadBundle(filter: CrossAgentFilter = {}): {
    sessions: TelemetrySessionRecord[];
    activity: TelemetryActivityEvent[];
    optimizations: TelemetryOptimizationRecord[];
    comparison: CrossAgentComparison;
  } {
    return {
      sessions: this.store.listSessions(filter),
      activity: this.store.listActivity(filter).slice(0, 200),
      optimizations: this.store.listOptimizations(filter).slice(0, 100),
      comparison: this.buildComparison(filter)
    };
  }
}

function aggregateEnvironment(
  environment: (typeof ENVIRONMENTS)[number],
  sessions: TelemetrySessionRecord[],
  optimizations: TelemetryOptimizationRecord[]
): EnvironmentAggregate {
  return {
    environment,
    sessionCount: sessions.length,
    inputTokens: sumMetrics(sessions.map((s) => s.inputTokens), 'cross-agent:input'),
    outputTokens: sumMetrics(sessions.map((s) => s.outputTokens), 'cross-agent:output'),
    contextTokens: sumMetrics(sessions.map((s) => s.contextTokens), 'cross-agent:context'),
    costUsd: sumMetrics(sessions.map((s) => s.costUsd), 'cross-agent:cost', 'tokens'),
    durationMs: sumMetrics(sessions.map((s) => s.durationMs), 'cross-agent:duration'),
    toolCallCount: sessions.reduce((acc, s) => acc + (s.toolCallCount || 0), 0),
    repetitiveOps: sessions.reduce((acc, s) => acc + (s.repetitiveOps || 0), 0),
    optimizationCount: optimizations.length,
    estimatedSavingsTokens: sumMetrics(
      optimizations.map((o) => o.estimatedSavingsTokens),
      'cross-agent:savings'
    )
  };
}

/**
 * Sum only when every metric has a number. Provenance becomes the weakest among contributors.
 * Cost metrics reuse the `tokens` field as a numeric carrier (USD or ms) — callers label via source.
 */
function sumMetrics(
  metrics: MetricValue[],
  source: string,
  _field: 'tokens' = 'tokens'
): MetricValue {
  if (!metrics.length) {
    return unavailable(source, 'No sessions in filter');
  }
  const values = metrics.map((m) => m.tokens);
  if (values.some((v) => v === null || v === undefined)) {
    return unavailable(source, 'At least one contributing metric is null; refusing to invent a total');
  }
  const sum = values.reduce<number>((acc, v) => acc + (v as number), 0);
  const provenance = weakestProvenance(metrics.map((m) => m.provenance));
  return {
    tokens: sum,
    provenance,
    source,
    confidence: Math.min(...metrics.map((m) => m.confidence)),
    notes: `Sum of ${metrics.length} values; provenance=${provenance}`
  };
}

function weakestProvenance(list: MetricProvenance[]): MetricProvenance {
  const rank: Record<MetricProvenance, number> = {
    Unavailable: 0,
    Imported: 1,
    Estimated: 2,
    Real: 3
  };
  let worst: MetricProvenance = 'Real';
  for (const p of list) {
    if (rank[p] < rank[worst]) {
      worst = p;
    }
  }
  return worst;
}

function unavailable(source: string, notes: string): MetricValue {
  return {
    tokens: null,
    provenance: 'Unavailable',
    source,
    confidence: 0,
    notes
  };
}

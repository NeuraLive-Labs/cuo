import { ProvenanceBadge } from './ProvenanceBadge';
import type { MetricValue } from '../types';

export function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return String(value);
}

export function MetricBlock({ label, metric }: { label: string; metric: MetricValue }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{formatTokens(metric.tokens)}</div>
      <div className="row">
        <ProvenanceBadge value={metric.provenance} />
        <span className="status-line">{metric.source}</span>
      </div>
      {metric.notes ? <p className="status-line">{metric.notes}</p> : null}
    </div>
  );
}

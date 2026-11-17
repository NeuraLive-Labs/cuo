import type { MetricProvenance } from '../types';

export function ProvenanceBadge({ value }: { value: MetricProvenance }) {
  return (
    <span className={`badge ${value}`} title={`Metric provenance: ${value}`}>
      {value}
    </span>
  );
}

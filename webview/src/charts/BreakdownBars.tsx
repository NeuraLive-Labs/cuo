import { formatTokens } from '../components/MetricBlock';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import type { ContextCategoryBreakdown } from '../types';

export function BreakdownBars({ categories }: { categories: ContextCategoryBreakdown[] }) {
  const max = Math.max(
    1,
    ...categories.map((c) => (c.metric.tokens === null ? 0 : c.metric.tokens))
  );

  return (
    <div className="bar-chart" role="list" aria-label="Context category breakdown">
      {categories.map((cat) => {
        const tokens = cat.metric.tokens;
        const width = tokens === null ? 0 : Math.round((tokens / max) * 100);
        return (
          <div className="bar-row" role="listitem" key={cat.id}>
            <div className="bar-label" title={cat.label}>
              {cat.label}
            </div>
            <div className="bar-track" aria-hidden="true">
              <div className="bar-fill" style={{ width: `${width}%` }} />
            </div>
            <div className="bar-value">
              {formatTokens(tokens)} <ProvenanceBadge value={cat.metric.provenance} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

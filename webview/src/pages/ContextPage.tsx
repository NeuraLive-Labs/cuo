import { BreakdownBars } from '../charts/BreakdownBars';
import type { AnalyticsBundle } from '../types';

export function ContextPage({ data }: { data: AnalyticsBundle }) {
  const ctx = data.latestContext;
  if (!ctx) {
    return (
      <div className="content">
        <p className="empty">No context snapshot. Import a report or run Analyze.</p>
      </div>
    );
  }

  return (
    <div className="content">
      <h2 className="section-title">Context breakdown</h2>
      <BreakdownBars categories={ctx.categories} />

      <h2 className="section-title">Category details</h2>
      <div className="list">
        {ctx.categories.map((cat) => (
          <div className="item" key={cat.id}>
            <h3>{cat.label}</h3>
            <p>{cat.metric.notes ?? 'No notes.'}</p>
            {cat.details.length ? (
              <ul className="notes">
                {cat.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

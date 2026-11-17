import { MetricBlock } from '../components/MetricBlock';
import type { AnalyticsBundle } from '../types';

export function OverviewPage({ data }: { data: AnalyticsBundle }) {
  const ctx = data.latestContext;
  const run = data.latestRun;

  return (
    <div className="content">
      <div className="row">
        <MetricBlock
          label="Context total"
          metric={
            ctx?.total ?? {
              tokens: null,
              provenance: 'Unavailable',
              source: 'none',
              confidence: 0
            }
          }
        />
        <MetricBlock label="Context (session)" metric={data.usage.contextTokens} />
        <MetricBlock label="Estimated savings applied" metric={data.usage.savingsTokens} />
      </div>

      <h2 className="section-title">Acquisition</h2>
      {ctx ? (
        <ul className="notes">
          {ctx.acquisitionPath.map((p) => (
            <li key={p}>{p}</li>
          ))}
          {ctx.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : (
        <p className="empty">No snapshot yet. Run Analyze.</p>
      )}

      <h2 className="section-title">Latest run</h2>
      {run ? (
        <div className="item">
          <h3>
            {run.mode} · {new Date(run.ranAt).toLocaleString()}
          </h3>
          <p>
            {run.findings.length} findings · {run.recommendations.length} recommendations ·{' '}
            {run.applied.length} applied
          </p>
          <ul className="notes">
            {run.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="empty">No optimization run stored yet.</p>
      )}

      <h2 className="section-title">Usage distinctions</h2>
      <ul className="notes">
        <li>Context window tokens ≠ billed tokens.</li>
        <li>Cost appears only when you configure pricing and import usage figures.</li>
        <li>Estimated values are never labeled Real.</li>
      </ul>
    </div>
  );
}

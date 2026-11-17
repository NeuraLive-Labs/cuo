import { MetricBlock } from '../components/MetricBlock';
import type { AnalyticsBundle } from '../types';

export function CrossAgentPage({ data }: { data: AnalyticsBundle }) {
  const eco = data.ecosystem;
  const comparison = eco?.comparison;

  if (!eco) {
    return (
      <div className="content">
        <p className="empty">Ecosystem snapshot unavailable.</p>
      </div>
    );
  }

  return (
    <div className="content">
      <h2 className="section-title">Cross-Agent Analytics</h2>
      <p className="muted">
        Compare Cursor vs Claude Code from local <code>~/.cuo/telemetry</code>. Provenances are never
        mixed into a fake Real total.
      </p>

      <div className="row">
        {(comparison?.byEnvironment ?? []).map((env) => (
          <div key={env.environment} className="item" style={{ flex: 1, minWidth: 220 }}>
            <h3>{env.environment}</h3>
            <p>
              {env.sessionCount} sessions · {env.toolCallCount} tools · {env.repetitiveOps} repetitive
            </p>
            <MetricBlock label="Input tokens" metric={env.inputTokens} />
            <MetricBlock label="Output tokens" metric={env.outputTokens} />
            <MetricBlock label="Context tokens" metric={env.contextTokens} />
            <MetricBlock label="Cost (numeric carrier)" metric={env.costUsd} />
            <MetricBlock label="Est. savings" metric={env.estimatedSavingsTokens} />
          </div>
        ))}
      </div>

      <h2 className="section-title">Normalization notes</h2>
      <ul className="notes">
        {(comparison?.normalizationNotes ?? []).map((n) => (
          <li key={n}>{n}</li>
        ))}
        {(comparison?.notes ?? []).map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>

      <h2 className="section-title">Recent sessions</h2>
      {eco.sessions.length === 0 ? (
        <p className="empty">No shared telemetry yet. Install Claude Code hooks or run Analyze in Cursor.</p>
      ) : (
        eco.sessions.slice(0, 12).map((s) => (
          <div className="item" key={s.id}>
            <h3>
              {s.environment} · {s.projectKey}
            </h3>
            <p>
              {new Date(s.startedAt).toLocaleString()} · tools {s.toolCallCount} · repetitive{' '}
              {s.repetitiveOps}
            </p>
            <div className="row">
              <MetricBlock label="In" metric={s.inputTokens} />
              <MetricBlock label="Out" metric={s.outputTokens} />
              <MetricBlock label="Cost" metric={s.costUsd} />
            </div>
          </div>
        ))
      )}

      <h2 className="section-title">Activity</h2>
      {eco.activity.slice(0, 20).map((a) => (
        <div className="item" key={a.id}>
          <h3>
            {a.kind} · {a.environment} · {a.provenance}
          </h3>
          <p>
            {new Date(a.at).toLocaleString()} — {a.summary}
          </p>
        </div>
      ))}

      <h2 className="section-title">Ponytail / Graphify</h2>
      <div className="item">
        <h3>Ponytail</h3>
        <p>
          {eco.ponytail?.detected ? 'Detected' : 'Not detected'} · provenance{' '}
          {eco.ponytail?.provenance ?? 'Unavailable'}
          {eco.ponytail?.recentTaskCount != null
            ? ` · band artifacts ${eco.ponytail.recentTaskCount}`
            : ''}
        </p>
        <ul className="notes">
          {(eco.ponytail?.notes ?? []).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      <div className="item">
        <h3>Graphify</h3>
        <p>
          {eco.graphify?.available ? 'Graph available' : 'No graph'} ·{' '}
          {eco.graphify?.provenance ?? 'Unavailable'}
        </p>
        {eco.graphify?.graphPath ? <p className="muted">{eco.graphify.graphPath}</p> : null}
        {eco.graphify?.resultPreview ? <pre className="code-block">{eco.graphify.resultPreview}</pre> : null}
        {eco.graphify?.tokensAvoidedNote ? <p>{eco.graphify.tokensAvoidedNote}</p> : null}
      </div>
    </div>
  );
}

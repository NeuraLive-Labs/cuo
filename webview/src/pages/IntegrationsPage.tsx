import type { AnalyticsBundle } from '../types';
import { getVsCodeApi } from '../vscodeApi';

export function IntegrationsPage({ data }: { data: AnalyticsBundle }) {
  const eco = data.ecosystem;
  const vscode = getVsCodeApi();

  if (!eco) {
    return (
      <div className="content">
        <p className="empty">Integration Manager unavailable.</p>
      </div>
    );
  }

  return (
    <div className="content">
      <h2 className="section-title">Integration Manager</h2>
      <p className="muted">
        Optional tools can be disabled in Settings (<code>cuo.integrations.*</code>) without breaking
        CUO core.
      </p>
      <div className="row" style={{ marginBottom: 12 }}>
        <button
          className="btn"
          type="button"
          onClick={() => vscode.postMessage({ type: 'installClaudeCode' })}
        >
          Install Claude Code integration
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => vscode.postMessage({ type: 'refresh' })}
        >
          Re-detect
        </button>
      </div>

      {eco.integrations.map((integ) => (
        <div className="item" key={integ.id}>
          <h3>
            {integ.displayName}{' '}
            <span className={`badge provenance-${integ.availability}`}>{integ.availability}</span>
            {integ.version ? <span className="muted"> · {integ.version}</span> : null}
            <span className="muted"> · {integ.enabled ? 'enabled' : 'disabled'}</span>
          </h3>
          <h4 className="section-title" style={{ fontSize: 12 }}>
            Capabilities
          </h4>
          <ul className="notes">
            {integ.capabilities.map((c) => (
              <li key={c.id}>
                {c.available ? '✓' : '○'} {c.label}
                {c.notes ? ` — ${c.notes}` : ''}
              </li>
            ))}
          </ul>
          {integ.pathHints.length ? (
            <>
              <h4 className="section-title" style={{ fontSize: 12 }}>
                Paths
              </h4>
              <ul className="notes">
                {integ.pathHints.map((p) => (
                  <li key={p}>
                    <code>{p}</code>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {integ.errors.length ? (
            <ul className="notes">
              {integ.errors.map((e) => (
                <li key={e} style={{ color: 'var(--cuo-error)' }}>
                  {e}
                </li>
              ))}
            </ul>
          ) : null}
          <ul className="notes">
            {integ.compatibilityNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

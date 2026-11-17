import { ProvenanceBadge } from '../components/ProvenanceBadge';
import type { AnalyticsBundle } from '../types';

export function OptimizationPage({
  data,
  onApply
}: {
  data: AnalyticsBundle;
  onApply: (id: string) => void;
}) {
  return (
    <div className="content">
      <h2 className="section-title">Waste findings</h2>
      <div className="list">
        {data.findings.length === 0 ? (
          <p className="empty">No findings yet.</p>
        ) : (
          data.findings.map((f) => (
            <div className="item" key={f.id}>
              <h3 className={`priority-${f.priority}`}>
                {f.priority}: {f.title}
              </h3>
              <p>{f.description}</p>
              <div className="meta">
                <span className="badge">{f.category}</span>
                <span className="badge">~{f.estimatedSavingsTokens} tok</span>
                <ProvenanceBadge value={f.savingsProvenance} />
              </div>
              <p>{f.recommendation}</p>
              <ul className="notes">
                {f.evidence.slice(0, 4).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <h2 className="section-title">Recommendations</h2>
      <div className="list">
        {data.recommendations.length === 0 ? (
          <p className="empty">No recommendations in current mode/run.</p>
        ) : (
          data.recommendations.map((r) => (
            <div className="item" key={r.id}>
              <h3>{r.title}</h3>
              <p>{r.description}</p>
              <div className="meta">
                <span className={`badge priority-${r.priority}`}>{r.priority}</span>
                <span className="badge">{r.module}</span>
                <span className="badge">~{r.estimatedSavingsTokens} tok</span>
                <ProvenanceBadge value={r.savingsProvenance} />
              </div>
              <div className="row">
                <button className="btn" type="button" onClick={() => onApply(r.id)}>
                  {r.requiresAuthorization ? 'Authorize & apply' : 'Open suggestion'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <h2 className="section-title">Model advisor</h2>
      <div className="list">
        {data.modelAdvice.map((a) => (
          <div className="item" key={a.taskType + a.recommendedModelFamily}>
            <h3>{a.taskType}</h3>
            <p>
              <strong>{a.recommendedModelFamily}</strong> · relative cost {a.estimatedRelativeCost}
            </p>
            <p>{a.rationale}</p>
            <p className="status-line">Avoid when: {a.whenToAvoid}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

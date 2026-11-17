import { formatTokens } from '../components/MetricBlock';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import type { AnalyticsBundle } from '../types';

export function HistoryPage({ data }: { data: AnalyticsBundle }) {
  return (
    <div className="content">
      <h2 className="section-title">Context history</h2>
      <div className="list">
        {data.history.length === 0 ? (
          <p className="empty">History is empty for this workspace.</p>
        ) : (
          data.history.map((h) => (
            <div className="item" key={h.id}>
              <h3>{new Date(h.capturedAt).toLocaleString()}</h3>
              <div className="meta">
                <span className="badge">{formatTokens(h.total.tokens)} tokens</span>
                <ProvenanceBadge value={h.total.provenance} />
                <span className="badge">{h.acquisitionPath.join(' → ')}</span>
              </div>
              <p className="status-line">{h.workspaceFolder ?? 'No folder'}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

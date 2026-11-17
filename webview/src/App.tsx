import { useEffect, useState } from 'react';
import { OverviewPage } from './pages/OverviewPage';
import { ContextPage } from './pages/ContextPage';
import { OptimizationPage } from './pages/OptimizationPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProjectPage } from './pages/ProjectPage';
import { CrossAgentPage } from './pages/CrossAgentPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { getVsCodeApi } from './vscodeApi';
import type { AnalyticsBundle } from './types';

type Tab = 'overview' | 'context' | 'optimize' | 'history' | 'project' | 'cross' | 'integrations';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'context', label: 'Context' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'cross', label: 'Cross-Agent' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'history', label: 'History' },
  { id: 'project', label: 'Project' }
];

export function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<AnalyticsBundle | undefined>();
  const [status, setStatus] = useState('Connecting…');
  const vscode = getVsCodeApi();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data as { type?: string; payload?: AnalyticsBundle; message?: string };
      if (msg.type === 'analytics' && msg.payload) {
        setData(msg.payload);
        setStatus(`Updated ${new Date(msg.payload.generatedAt).toLocaleTimeString()}`);
      } else if (msg.type === 'status' && msg.message) {
        setStatus(msg.message);
      } else if (msg.type === 'error' && msg.message) {
        setStatus(msg.message);
      }
    };
    window.addEventListener('message', handler);
    vscode.postMessage({ type: 'ready' });
    return () => window.removeEventListener('message', handler);
  }, [vscode]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">CUO</div>
        <button className="btn secondary" type="button" onClick={() => vscode.postMessage({ type: 'refresh' })}>
          Refresh
        </button>
        <button className="btn" type="button" onClick={() => vscode.postMessage({ type: 'analyze' })}>
          Analyze
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => vscode.postMessage({ type: 'runOptimization' })}
        >
          Optimize
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={() => vscode.postMessage({ type: 'revertLast' })}
        >
          Revert
        </button>
      </header>

      <nav className="tabs" role="tablist" aria-label="CUO sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className="tab"
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <p className="status-line" style={{ padding: '6px 12px 0' }}>
        {status}
      </p>

      {!data ? (
        <div className="content">
          <p className="empty">Waiting for analytics from the extension host…</p>
        </div>
      ) : (
        <>
          {tab === 'overview' ? <OverviewPage data={data} /> : null}
          {tab === 'context' ? <ContextPage data={data} /> : null}
          {tab === 'optimize' ? (
            <OptimizationPage
              data={data}
              onApply={(id) => vscode.postMessage({ type: 'applyRecommendation', id })}
            />
          ) : null}
          {tab === 'history' ? <HistoryPage data={data} /> : null}
          {tab === 'project' ? (
            <ProjectPage
              data={data}
              onImport={(raw) => vscode.postMessage({ type: 'importReport', raw })}
              onManual={(totalTokens, filesTokens, rulesTokens) =>
                vscode.postMessage({
                  type: 'manualCapture',
                  capture: { totalTokens, filesTokens, rulesTokens }
                })
              }
              onPrompt={(prompt) => vscode.postMessage({ type: 'setPrompt', prompt })}
            />
          ) : null}
          {tab === 'cross' ? <CrossAgentPage data={data} /> : null}
          {tab === 'integrations' ? <IntegrationsPage data={data} /> : null}
        </>
      )}
    </div>
  );
}

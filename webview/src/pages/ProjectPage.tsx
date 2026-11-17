import { useState } from 'react';
import type { AnalyticsBundle } from '../types';

export function ProjectPage({
  data,
  onImport,
  onManual,
  onPrompt
}: {
  data: AnalyticsBundle;
  onImport: (raw: string) => void;
  onManual: (total?: number, files?: number, rules?: number) => void;
  onPrompt: (prompt: string) => void;
}) {
  const [raw, setRaw] = useState('');
  const [total, setTotal] = useState('');
  const [files, setFiles] = useState('');
  const [rules, setRules] = useState('');
  const [prompt, setPrompt] = useState('');

  return (
    <div className="content">
      <h2 className="section-title">Project analysis</h2>
      <p className="status-line">
        Workspace: {data.latestContext?.workspaceFolder ?? data.usage.projectKey}
      </p>
      <p className="status-line">
        Input billed: {data.usage.inputTokens.provenance} · Output billed:{' '}
        {data.usage.outputTokens.provenance}
      </p>

      <h2 className="section-title">Import context report</h2>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={'{\n  "files": 12000,\n  "rules": 1800,\n  "total": 42000\n}'}
        aria-label="Imported context report"
      />
      <div className="row">
        <button className="btn" type="button" onClick={() => onImport(raw)} disabled={!raw.trim()}>
          Import as Imported provenance
        </button>
      </div>

      <h2 className="section-title">Manual capture</h2>
      <div className="row">
        <input
          placeholder="Total tokens"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
          aria-label="Total tokens"
        />
        <input
          placeholder="Files tokens"
          value={files}
          onChange={(e) => setFiles(e.target.value)}
          aria-label="Files tokens"
        />
        <input
          placeholder="Rules tokens"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          aria-label="Rules tokens"
        />
      </div>
      <div className="row">
        <button
          className="btn secondary"
          type="button"
          onClick={() =>
            onManual(
              total ? Number(total) : undefined,
              files ? Number(files) : undefined,
              rules ? Number(rules) : undefined
            )
          }
        >
          Capture snapshot
        </button>
      </div>

      <h2 className="section-title">Prompt optimizer input</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Paste a prompt to analyze redundancy / ambiguity…"
        aria-label="Prompt text"
      />
      <div className="row">
        <button
          className="btn secondary"
          type="button"
          disabled={!prompt.trim()}
          onClick={() => onPrompt(prompt)}
        >
          Analyze prompt
        </button>
      </div>
    </div>
  );
}

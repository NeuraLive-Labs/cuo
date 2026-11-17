#!/usr/bin/env node
/**
 * Claude Code statusLine command for CUO.
 * stdin: documented status-line JSON (model, cost, context_window, session_id, …)
 * https://code.claude.com/docs/en/statusline
 *
 * Provenance:
 * - context_window.* token counts → Real (latest API response) when present
 * - cost.total_cost_usd → Estimated (client-side; may differ from bill)
 */
import path from 'node:path';
import {
  appendJsonl,
  dayStamp,
  id,
  metric,
  parseJsonSafe,
  projectKey,
  readStdin,
  telemetryRoot,
  writeJson
} from './cuo-lib.mjs';

async function main() {
  const raw = await readStdin();
  const data = parseJsonSafe(raw);
  const cw = data.context_window || {};
  const cost = data.cost || {};
  const sessionId = data.session_id || 'unknown';
  const cwd = data.cwd || process.cwd();
  const at = new Date().toISOString();

  const inputTokens = typeof cw.total_input_tokens === 'number' ? cw.total_input_tokens : null;
  const outputTokens = typeof cw.total_output_tokens === 'number' ? cw.total_output_tokens : null;
  const pct =
    typeof cw.used_percentage === 'number' ? Math.floor(cw.used_percentage) : null;
  const costUsd = typeof cost.total_cost_usd === 'number' ? cost.total_cost_usd : null;

  const session = {
    schemaVersion: 1,
    id: sessionId,
    environment: 'claude_code',
    projectKey: projectKey(cwd),
    startedAt: at,
    inputTokens: metric(
      inputTokens,
      'Real',
      'claude-code:statusline.context_window.total_input_tokens'
    ),
    outputTokens: metric(
      outputTokens,
      'Real',
      'claude-code:statusline.context_window.total_output_tokens'
    ),
    contextTokens: metric(
      inputTokens,
      'Real',
      'claude-code:statusline.context_window.total_input_tokens'
    ),
    costUsd: metric(costUsd, 'Estimated', 'claude-code:statusline.cost.total_cost_usd'),
    durationMs: metric(
      cost.total_duration_ms,
      'Real',
      'claude-code:statusline.cost.total_duration_ms'
    ),
    toolCallCount: 0,
    repetitiveOps: 0,
    recommendations: [],
    notes: [
      'Status-line ingest. Cost is Estimated per Claude Code docs.',
      data.model?.display_name ? `Model: ${data.model.display_name}` : ''
    ].filter(Boolean),
    sourcePaths: ['statusLine stdin JSON']
  };

  // Preserve earlier start + tool counters if hook state/live exists.
  const livePath = path.join(telemetryRoot(), 'sessions', `live-${sessionId}.json`);
  try {
    const prev = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(livePath, 'utf8')));
    if (prev.startedAt) session.startedAt = prev.startedAt;
    session.toolCallCount = prev.toolCallCount || 0;
    session.repetitiveOps = prev.repetitiveOps || 0;
    session.recommendations = prev.recommendations || [];
  } catch {
    // first statusline write
  }

  writeJson(livePath, session);
  appendJsonl(path.join(telemetryRoot(), 'sessions', `${dayStamp(at)}.jsonl`), session);
  appendJsonl(path.join(telemetryRoot(), 'activity', `${dayStamp(at)}.jsonl`), {
    schemaVersion: 1,
    id: id('act'),
    sessionId,
    environment: 'claude_code',
    projectKey: projectKey(cwd),
    at,
    kind: 'statusline',
    summary: `ctx ${pct ?? '?'}% · in ${inputTokens ?? '—'} · cost $${
      costUsd != null ? costUsd.toFixed(4) : '—'
    } (est)`,
    provenance: 'Real'
  });

  const model = data.model?.display_name || 'Claude';
  const ctxLabel = pct != null ? `${pct}%` : 'n/a';
  const costLabel = costUsd != null ? `$${costUsd.toFixed(3)}` : 'n/a';
  process.stdout.write(`[CUO] ${model} · ctx ${ctxLabel} · ${costLabel} est`);
}

main().catch(() => {
  process.stdout.write('[CUO] statusline error');
});

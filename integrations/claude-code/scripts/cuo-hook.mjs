#!/usr/bin/env node
/**
 * Claude Code command hook for CUO.
 * Reads documented hook JSON from stdin; writes local ~/.cuo/telemetry.
 * Official events: SessionStart, SessionEnd, UserPromptSubmit, PostToolUse, Stop.
 * https://code.claude.com/docs/en/hooks/
 */
import path from 'node:path';
import {
  appendJsonl,
  dayStamp,
  id,
  loadState,
  parseJsonSafe,
  projectKey,
  readStdin,
  saveState,
  telemetryRoot,
  writeJson,
  metric
} from './cuo-lib.mjs';

const eventName = process.argv[2] || 'Unknown';

async function main() {
  const raw = await readStdin();
  const input = parseJsonSafe(raw);
  const sessionId = input.session_id || 'unknown';
  const cwd = input.cwd || process.cwd();
  const at = new Date().toISOString();
  const state = loadState(sessionId);
  state.sessionId = sessionId;
  if (!state.startedAt) state.startedAt = at;

  const activity = {
    schemaVersion: 1,
    id: id('act'),
    sessionId,
    environment: 'claude_code',
    projectKey: projectKey(cwd),
    at,
    kind: mapKind(eventName),
    summary: summarize(eventName, input),
    details: safeDetails(eventName, input),
    provenance: 'Real'
  };

  appendJsonl(path.join(telemetryRoot(), 'activity', `${dayStamp(at)}.jsonl`), activity);

  if (eventName === 'PostToolUse') {
    const tool = input.tool_name || input.toolName || 'unknown';
    state.toolCallCount = (state.toolCallCount || 0) + 1;
    state.toolNames = state.toolNames || [];
    state.toolNames.push(tool);
    const recent = state.toolNames.slice(-8);
    if (recent.length >= 4 && recent.every((t) => t === recent[0])) {
      state.repetitiveOps = (state.repetitiveOps || 0) + 1;
      appendJsonl(path.join(telemetryRoot(), 'activity', `${dayStamp(at)}.jsonl`), {
        ...activity,
        id: id('act'),
        kind: 'note',
        summary: `Repetitive tool ops detected: ${recent[0]} ×${recent.length}`,
        provenance: 'Estimated'
      });
    }
  }

  if (eventName === 'UserPromptSubmit') {
    state.prompts = (state.prompts || 0) + 1;
  }

  if (eventName === 'SessionStart') {
    state.startedAt = at;
    state.toolNames = [];
    state.toolCallCount = 0;
    state.repetitiveOps = 0;
    state.prompts = 0;
  }

  saveState(state);

  const session = {
    schemaVersion: 1,
    id: sessionId,
    environment: 'claude_code',
    projectKey: projectKey(cwd),
    startedAt: state.startedAt,
    endedAt: eventName === 'SessionEnd' ? at : undefined,
    inputTokens: metric(null, 'Unavailable', 'claude-code:hook', 'Use statusline for token fields'),
    outputTokens: metric(null, 'Unavailable', 'claude-code:hook', 'Use statusline for token fields'),
    contextTokens: metric(null, 'Unavailable', 'claude-code:hook', 'Use statusline for token fields'),
    costUsd: metric(null, 'Unavailable', 'claude-code:hook', 'Use statusline for cost fields'),
    durationMs: metric(null, 'Unavailable', 'claude-code:hook'),
    toolCallCount: state.toolCallCount || 0,
    repetitiveOps: state.repetitiveOps || 0,
    recommendations: buildRecommendations(state),
    notes: [
      `Last hook: ${eventName}`,
      'Token/cost numbers come from the statusLine script when configured (documented JSON fields).'
    ],
    sourcePaths: ['hooks stdin JSON']
  };

  // Merge any prior statusline snapshot metrics if present.
  const livePath = path.join(telemetryRoot(), 'sessions', `live-${sessionId}.json`);
  try {
    const prev = JSON.parse(await import('node:fs').then((fs) => fs.readFileSync(livePath, 'utf8')));
    for (const key of ['inputTokens', 'outputTokens', 'contextTokens', 'costUsd', 'durationMs']) {
      if (prev[key] && prev[key].tokens != null) session[key] = prev[key];
    }
    if (prev.startedAt) session.startedAt = prev.startedAt;
  } catch {
    // no prior live snapshot
  }

  writeJson(livePath, session);
  appendJsonl(path.join(telemetryRoot(), 'sessions', `${dayStamp(at)}.jsonl`), session);

  // Observational hooks: exit 0, no blocking.
  process.exit(0);
}

function mapKind(eventName) {
  switch (eventName) {
    case 'SessionStart':
      return 'session_start';
    case 'SessionEnd':
      return 'session_end';
    case 'UserPromptSubmit':
      return 'prompt';
    case 'PostToolUse':
      return 'tool';
    case 'Stop':
      return 'note';
    default:
      return 'note';
  }
}

function summarize(eventName, input) {
  if (eventName === 'PostToolUse') {
    return `Tool ${input.tool_name || input.toolName || 'unknown'}`;
  }
  if (eventName === 'SessionStart') {
    return `Session start (${input.source || 'unknown'})`;
  }
  if (eventName === 'SessionEnd') {
    return `Session end (${input.reason || input.source || 'unknown'})`;
  }
  if (eventName === 'UserPromptSubmit') {
    return 'User prompt submitted';
  }
  if (eventName === 'Stop') {
    return 'Turn stop';
  }
  return eventName;
}

function safeDetails(eventName, input) {
  if (eventName === 'PostToolUse') {
    return { tool_name: input.tool_name || input.toolName };
  }
  if (eventName === 'SessionStart') {
    return { source: input.source };
  }
  if (eventName === 'SessionEnd') {
    return { reason: input.reason || input.source };
  }
  // Do not persist full prompt text by default (privacy).
  return { hook_event_name: input.hook_event_name || eventName };
}

function buildRecommendations(state) {
  const out = [];
  if ((state.repetitiveOps || 0) > 0) {
    out.push('Repetitive tool calls detected — consider Graphify query or a narrower task scope.');
  }
  if ((state.toolCallCount || 0) > 40) {
    out.push('High tool volume this session — summarize decisions and start a fresh thread.');
  }
  return out;
}

main().catch((err) => {
  // Never block Claude Code on telemetry failures.
  console.error(String(err));
  process.exit(0);
});

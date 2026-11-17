import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IntegrationStatus } from '../shared/ecosystem';
import { LocalTelemetryStore } from '../core/localTelemetry';
import { projectKeyFromCwd } from '../core/paths';
import type { TelemetrySessionRecord } from '../shared/ecosystem';
import type { MetricValue } from '../shared/types';

/**
 * Claude Code integration detection + ingest of CUO hook/statusline telemetry.
 * Official surfaces used (not invented): Hooks, statusLine command JSON, plugins, skills.
 * Docs: https://code.claude.com/docs/en/hooks/ and https://code.claude.com/docs/en/statusline
 */
export class ClaudeCodeAdapter {
  constructor(private readonly telemetry = new LocalTelemetryStore()) {}

  detect(enabled: boolean, extensionRoot?: string): IntegrationStatus {
    const home = os.homedir();
    const errors: string[] = [];
    const hints: string[] = [];
    const capabilities = [
      { id: 'cli-config', label: '~/.claude settings / plugins', available: false },
      { id: 'cuo-plugin', label: 'CUO Claude Code plugin files present', available: false },
      { id: 'telemetry', label: 'Shared ~/.cuo/telemetry from hooks/statusline', available: false },
      {
        id: 'statusline-metrics',
        label: 'Status-line context_window + cost fields (documented)',
        available: true,
        notes: 'Available when Claude Code runs CUO statusline script'
      }
    ];

    const claudeDir = path.join(home, '.claude');
    if (fs.existsSync(claudeDir)) {
      capabilities[0].available = true;
      hints.push(claudeDir);
    }

    const pluginCandidates = [
      extensionRoot ? path.join(extensionRoot, 'integrations', 'claude-code') : undefined,
      path.join(process.cwd(), 'integrations', 'claude-code'),
      path.join(home, '.claude', 'plugins', 'cuo'),
      path.join(home, '.cuo', 'claude-code')
    ].filter(Boolean) as string[];

    for (const p of pluginCandidates) {
      if (fs.existsSync(path.join(p, '.claude-plugin', 'plugin.json')) || fs.existsSync(path.join(p, 'hooks', 'hooks.json'))) {
        capabilities[1].available = true;
        hints.push(p);
        break;
      }
    }

    const sessions = this.telemetry.listSessions({ environments: ['claude_code'] });
    if (sessions.length) {
      capabilities[2].available = true;
      hints.push(path.join(home, '.cuo', 'telemetry'));
    }

    const detected =
      capabilities[0].available || capabilities[1].available || capabilities[2].available;

    return {
      id: 'claude_code',
      displayName: 'Claude Code',
      availability: !enabled ? 'disabled' : detected ? 'detected' : 'missing',
      enabled,
      pathHints: hints,
      capabilities,
      errors,
      compatibilityNotes: [
        'Works without Cursor: install integrations/claude-code as a Claude Code plugin or copy hooks into ~/.claude/settings.json.',
        'Token counts from status-line context_window.* are Real when present (latest API response).',
        'cost.total_cost_usd is Estimated (client-side; may differ from billing).',
        'No undocumented Claude Code private APIs are used.'
      ],
      lastCheckedAt: new Date().toISOString()
    };
  }

  listRecentSessions(limit = 50): TelemetrySessionRecord[] {
    return this.telemetry.listSessions({ environments: ['claude_code'] }).slice(0, limit);
  }

  /**
   * Helper used by unit tests / Node scripts: build a session metric set with honest provenance.
   */
  static metricsFromStatusLine(payload: {
    session_id?: string;
    cwd?: string;
    cost?: { total_cost_usd?: number; total_duration_ms?: number };
    context_window?: {
      total_input_tokens?: number;
      total_output_tokens?: number;
      used_percentage?: number | null;
    };
  }): TelemetrySessionRecord {
    const now = new Date().toISOString();
    const cw = payload.context_window ?? {};
    const cost = payload.cost ?? {};
    return {
      schemaVersion: 1,
      id: payload.session_id || `claude-unknown-${now}`,
      environment: 'claude_code',
      projectKey: projectKeyFromCwd(payload.cwd),
      startedAt: now,
      inputTokens: numMetric(cw.total_input_tokens, 'Real', 'claude-code:statusline.context_window.total_input_tokens'),
      outputTokens: numMetric(cw.total_output_tokens, 'Real', 'claude-code:statusline.context_window.total_output_tokens'),
      contextTokens: numMetric(cw.total_input_tokens, 'Real', 'claude-code:statusline.context_window.total_input_tokens'),
      costUsd: numMetric(cost.total_cost_usd, 'Estimated', 'claude-code:statusline.cost.total_cost_usd'),
      durationMs: numMetric(cost.total_duration_ms, 'Real', 'claude-code:statusline.cost.total_duration_ms'),
      toolCallCount: 0,
      repetitiveOps: 0,
      recommendations: [],
      notes: [
        'Ingested from Claude Code status-line JSON (documented fields only).',
        'Cost is Estimated per Claude Code docs.'
      ],
      sourcePaths: ['statusLine command stdin JSON']
    };
  }
}

function numMetric(
  value: number | undefined,
  provenance: MetricValue['provenance'],
  source: string
): MetricValue {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return {
      tokens: null,
      provenance: 'Unavailable',
      source,
      confidence: 0,
      notes: 'Field absent in status-line payload'
    };
  }
  return {
    tokens: value,
    provenance,
    source,
    confidence: provenance === 'Real' ? 0.9 : 0.7
  };
}

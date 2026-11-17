import { ClaudeCodeAdapter } from '../adapters/claudeCodeAdapter';
import { CursorAdapter } from '../adapters/cursorAdapter';
import { GraphifyAdapter } from '../adapters/graphifyAdapter';
import { PonytailAdapter } from '../adapters/ponytailAdapter';
import { CrossAgentAnalytics } from '../core/crossAgentAnalytics';
import { LocalTelemetryStore } from '../core/localTelemetry';
import type {
  CrossAgentFilter,
  EcosystemSnapshot,
  IntegrationId,
  IntegrationStatus
} from '../shared/ecosystem';

export interface IntegrationToggles {
  cursor: boolean;
  claude_code: boolean;
  ponytail: boolean;
  graphify: boolean;
}

export interface IntegrationManagerOptions {
  toggles?: Partial<IntegrationToggles>;
  workspaceRoot?: string;
  extensionRoot?: string;
  vscodeVersion?: string;
}

const DEFAULT_TOGGLES: IntegrationToggles = {
  cursor: true,
  claude_code: true,
  ponytail: true,
  graphify: true
};

/**
 * Detects optional integrations and exposes enable/disable without breaking CUO core.
 */
export class IntegrationManager {
  private toggles: IntegrationToggles;
  private readonly cursor = new CursorAdapter();
  private readonly claude = new ClaudeCodeAdapter();
  private readonly ponytail = new PonytailAdapter();
  private readonly graphify = new GraphifyAdapter();
  private readonly analytics = new CrossAgentAnalytics();
  private readonly telemetry = new LocalTelemetryStore();

  constructor(private readonly options: IntegrationManagerOptions = {}) {
    this.toggles = { ...DEFAULT_TOGGLES, ...options.toggles };
  }

  setEnabled(id: IntegrationId, enabled: boolean): void {
    this.toggles[id] = enabled;
  }

  getToggles(): IntegrationToggles {
    return { ...this.toggles };
  }

  detectAll(): IntegrationStatus[] {
    return [
      this.cursor.detect(this.toggles.cursor, this.options.vscodeVersion),
      this.claude.detect(this.toggles.claude_code, this.options.extensionRoot),
      this.ponytail.detect(this.toggles.ponytail),
      this.graphify.detect(this.toggles.graphify, this.options.workspaceRoot)
    ];
  }

  snapshot(filter: CrossAgentFilter = {}): EcosystemSnapshot {
    const integrations = this.detectAll();
    const bundle = this.analytics.loadBundle(filter);
    const ponytail = this.toggles.ponytail ? this.ponytail.observe() : undefined;
    const graphify = this.toggles.graphify
      ? this.graphify.queryExisting(
          'What are the highest-degree nodes relevant to context optimization?',
          this.options.workspaceRoot,
          { allowCliQuery: false }
        )
      : undefined;

    if (graphify && this.graphify.shouldSuggestUpdate(this.options.workspaceRoot)) {
      graphify.tokensAvoidedNote = `${graphify.tokensAvoidedNote ?? ''} Graph looks stale (>7d); consider \`graphify --update\` manually — CUO will not auto-rebuild.`.trim();
    }

    return {
      integrations,
      sessions: bundle.sessions,
      activity: bundle.activity,
      optimizations: bundle.optimizations,
      comparison: bundle.comparison,
      ponytail,
      graphify
    };
  }

  recordCursorOptimization(projectKey: string, title: string, savingsTokens: number | null): void {
    this.telemetry.writeOptimization({
      schemaVersion: 1,
      id: `opt-${Date.now()}`,
      at: new Date().toISOString(),
      environment: 'cursor',
      projectKey,
      title,
      estimatedSavingsTokens: {
        tokens: savingsTokens,
        provenance: savingsTokens === null ? 'Unavailable' : 'Estimated',
        source: 'cuo:optimization-engine',
        confidence: savingsTokens === null ? 0 : 0.55
      },
      resultNotes: ['Recorded from CUO Cursor adapter']
    });
  }
}

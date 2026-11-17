import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GraphifyQueryHint, IntegrationStatus } from '../shared/ecosystem';

/**
 * Graphify CLI (PyPI: graphifyy, command: graphify).
 * Docs: https://github.com/Graphify-Labs/graphify — MIT.
 * CUO queries an existing graph; it does not regenerate on every call.
 */
export class GraphifyAdapter {
  detect(enabled: boolean, workspaceRoot?: string): IntegrationStatus {
    const errors: string[] = [];
    const hints: string[] = [];
    const capabilities = [
      { id: 'cli', label: 'graphify CLI on PATH', available: false },
      { id: 'graph-json', label: 'Existing graphify-out/graph.json', available: false },
      { id: 'query', label: 'graphify query (no rebuild)', available: false }
    ];

    const cli = this.resolveCli();
    if (cli) {
      capabilities[0].available = true;
      capabilities[2].available = true;
      hints.push(cli.path);
    } else {
      hints.push('Install: pip install graphifyy && graphify install (Python ≥ 3.10)');
    }

    const graphPath = this.findGraphJson(workspaceRoot);
    if (graphPath) {
      capabilities[1].available = true;
      hints.push(graphPath);
    }

    const available =
      capabilities[0].available || capabilities[1].available ? 'detected' : 'missing';

    return {
      id: 'graphify',
      displayName: 'Graphify',
      availability: !enabled ? 'disabled' : available,
      version: cli?.version,
      enabled,
      pathHints: hints,
      capabilities,
      errors,
      compatibilityNotes: [
        'CUO never runs a full /graphify rebuild unless you explicitly ask; prefer graphify query / existing graph.json.',
        'PyPI package name is temporarily graphifyy; CLI remains graphify.',
        'Requires Python 3.10+ when using the CLI.',
        'CUO structures retrieval via Graphify; it does not replace Graphify.'
      ],
      lastCheckedAt: new Date().toISOString()
    };
  }

  /**
   * Query existing graph only. If graph.json is missing, return Unavailable — do not regenerate.
   */
  queryExisting(
    question: string,
    workspaceRoot?: string,
    opts: { allowCliQuery?: boolean } = {}
  ): GraphifyQueryHint {
    const graphPath = this.findGraphJson(workspaceRoot);
    if (!graphPath) {
      return {
        available: false,
        query: question,
        provenance: 'Unavailable',
        tokensAvoidedNote:
          'No graphify-out/graph.json found. Run graphify once in the project, then CUO can query without re-reading the corpus.',
        error: 'graph.json missing'
      };
    }

    if (opts.allowCliQuery !== false) {
      const cli = this.resolveCli();
      if (cli) {
        try {
          const stdout = execFileSync(cli.command, ['query', question], {
            cwd: workspaceRoot || path.dirname(path.dirname(graphPath)),
            encoding: 'utf8',
            timeout: 15_000,
            windowsHide: true
          });
          return {
            available: true,
            graphPath,
            query: question,
            resultPreview: stdout.slice(0, 2000),
            tokensAvoidedNote:
              'Used graphify query against an existing graph instead of bulk file re-read.',
            provenance: 'Real'
          };
        } catch (err) {
          // Fall through to local graph.json peek.
          return {
            available: true,
            graphPath,
            query: question,
            provenance: 'Imported',
            tokensAvoidedNote:
              'CLI query failed; falling back to local graph.json presence only (no rebuild).',
            error: String(err),
            resultPreview: peekGraphSummary(graphPath)
          };
        }
      }
    }

    return {
      available: true,
      graphPath,
      query: question,
      resultPreview: peekGraphSummary(graphPath),
      tokensAvoidedNote:
        'Existing graph.json detected. Prefer graphify query over re-reading all files.',
      provenance: 'Imported'
    };
  }

  shouldSuggestUpdate(workspaceRoot?: string): boolean {
    const graphPath = this.findGraphJson(workspaceRoot);
    if (!graphPath) {
      return false;
    }
    try {
      const graphStat = fs.statSync(graphPath);
      const ageMs = Date.now() - graphStat.mtimeMs;
      // Suggest refresh only when graph is older than 7 days — never auto-regenerate.
      return ageMs > 7 * 24 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  }

  findGraphJson(workspaceRoot?: string): string | undefined {
    const roots = [
      workspaceRoot,
      process.cwd(),
      workspaceRoot ? path.join(workspaceRoot, '..') : undefined
    ].filter(Boolean) as string[];

    for (const root of roots) {
      const candidate = path.join(root, 'graphify-out', 'graph.json');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }

  private resolveCli(): { command: string; path: string; version?: string } | undefined {
    const commands = process.platform === 'win32' ? ['graphify.cmd', 'graphify'] : ['graphify'];
    for (const command of commands) {
      try {
        const version = execFileSync(command, ['--version'], {
          encoding: 'utf8',
          timeout: 5000,
          windowsHide: true
        }).trim();
        return { command, path: command, version: version || undefined };
      } catch {
        try {
          execFileSync(command, ['--help'], {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true
          });
          return { command, path: command };
        } catch {
          // try next
        }
      }
    }
    return undefined;
  }
}

function peekGraphSummary(graphPath: string): string {
  try {
    const raw = fs.readFileSync(graphPath, 'utf8');
    const json = JSON.parse(raw) as {
      nodes?: unknown[];
      edges?: unknown[];
      graph?: { nodes?: unknown[]; edges?: unknown[] };
    };
    const nodes = json.nodes?.length ?? json.graph?.nodes?.length ?? '?';
    const edges = json.edges?.length ?? json.graph?.edges?.length ?? '?';
    return `graph.json nodes=${nodes} edges=${edges} (local peek; not a full query)`;
  } catch (err) {
    return `graph.json present but unreadable: ${String(err)}`;
  }
}

import * as path from 'node:path';
import { createId, stableHash } from '../core/ids';
import { estimateTokensFromText } from '../core/tokenEstimator';
import {
  findWorkspaceFiles,
  readTextFiles,
  workspaceRootPath
} from '../core/fsInventory';
import type { Recommendation, WasteFinding } from '../shared/types';
import { parseMcpConfig } from './mcpConfig';

export { applyMcpDisable } from './mcpConfig';

export interface McpServerInfo {
  name: string;
  configPath: string;
  approxConfigTokens: number;
  command?: string;
  url?: string;
  disabled?: boolean;
}

export interface McpAnalysis {
  servers: McpServerInfo[];
  findings: WasteFinding[];
  recommendations: Recommendation[];
}

export class McpOptimizer {
  async analyze(charsPerToken = 4): Promise<McpAnalysis> {
    const root = workspaceRootPath();
    if (!root) {
      return { servers: [], findings: [], recommendations: [] };
    }

    const uris = await findWorkspaceFiles([
      '**/.cursor/mcp.json',
      '**/mcp.json',
      '**/.vscode/mcp.json'
    ]);
    const files = await readTextFiles(uris, root);
    const servers: McpServerInfo[] = [];
    const findings: WasteFinding[] = [];
    const recommendations: Recommendation[] = [];

    for (const file of files) {
      const parsed = parseMcpConfig(file.text ?? '');
      for (const server of parsed) {
        const blob = JSON.stringify(server.raw);
        servers.push({
          name: server.name,
          configPath: file.relativePath,
          approxConfigTokens: estimateTokensFromText(blob, charsPerToken).tokens ?? 0,
          command: server.command,
          url: server.url,
          disabled: server.disabled
        });
      }
    }

    const byName = new Map<string, McpServerInfo[]>();
    for (const s of servers) {
      const key = s.name.toLowerCase();
      const list = byName.get(key) ?? [];
      list.push(s);
      byName.set(key, list);
    }

    for (const [name, group] of byName) {
      if (group.length < 2) {
        continue;
      }
      findings.push({
        id: createId('waste'),
        title: `Redundant MCP server name "${name}"`,
        description: 'Same server name appears in multiple config locations.',
        category: 'mcp_dynamic_tools',
        priority: 'High',
        impact: 'Duplicate MCP registrations can multiply tool definition payload.',
        evidence: group.map((g) => `${g.configPath} (${g.approxConfigTokens} est. tokens)`),
        recommendation:
          'Keep a single registration. CUO will not assume a server is unused without evidence.',
        estimatedSavingsTokens: group.slice(1).reduce((a, g) => a + g.approxConfigTokens, 0),
        savingsProvenance: 'Estimated',
        confidence: 0.75,
        dedupeKey: `mcp-name:${stableHash(name)}`
      });

      const secondary = group[1];
      recommendations.push({
        id: createId('rec'),
        module: 'mcp-optimizer',
        title: `Disable duplicate MCP server "${name}" in ${secondary.configPath}`,
        description:
          'Propose marking the secondary registration disabled. Requires authorization; reversible from CUO backup.',
        category: 'mcp_dynamic_tools',
        priority: 'High',
        estimatedSavingsTokens: secondary.approxConfigTokens,
        savingsProvenance: 'Estimated',
        confidence: 0.7,
        evidence: group.map((g) => g.configPath),
        actionKind: 'disableMcp',
        targetPath: path.join(root, secondary.configPath),
        proposedContent: JSON.stringify({ name, disabled: true }),
        reversible: true,
        requiresAuthorization: true,
        safeAutoAction: 'disableRedundantMcpServer'
      });
    }

    for (const s of servers) {
      if (s.approxConfigTokens > 400) {
        findings.push({
          id: createId('waste'),
          title: `Large MCP config entry: ${s.name}`,
          description: 'Server config block is unusually large (Estimated).',
          category: 'mcp_dynamic_tools',
          priority: 'Medium',
          impact:
            'Config size is a lower bound; runtime tool schemas may be much larger when the server is connected.',
          evidence: [`${s.configPath} / ${s.name}: ~${s.approxConfigTokens} tokens`],
          recommendation:
            'Prefer focused MCP servers; avoid registering broad tool surfaces for every workspace.',
          estimatedSavingsTokens: Math.round(s.approxConfigTokens * 0.2),
          savingsProvenance: 'Estimated',
          confidence: 0.45,
          dedupeKey: `mcp-size:${s.configPath}:${s.name}`
        });
      }
    }

    if (!servers.length && files.length) {
      findings.push({
        id: createId('waste'),
        title: 'MCP config present but no servers parsed',
        description: 'Config file(s) found; structure may be nonstandard.',
        category: 'mcp_dynamic_tools',
        priority: 'Low',
        impact: 'Unable to estimate tool definition pressure from config alone.',
        evidence: files.map((f) => f.relativePath),
        recommendation: 'Validate mcp.json schema; CUO only reads documented config shapes.',
        estimatedSavingsTokens: 0,
        savingsProvenance: 'Unavailable',
        confidence: 0.3,
        dedupeKey: 'mcp-unparsed'
      });
    }

    return { servers, findings, recommendations };
  }
}


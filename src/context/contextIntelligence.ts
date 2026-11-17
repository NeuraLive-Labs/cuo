import * as vscode from 'vscode';
import * as path from 'node:path';
import { createId } from '../core/ids';
import {
  estimateTokensFromBytes,
  estimateTokensFromText,
  importedMetric,
  realMetric,
  sumMetrics,
  unavailableMetric
} from '../core/tokenEstimator';
import {
  findWorkspaceFiles,
  readTextFiles,
  workspaceRootPath
} from '../core/fsInventory';
import { getSettings } from '../configuration/settings';
import {
  CONTEXT_CATEGORY_LABELS,
  type ContextCategoryBreakdown,
  type ContextCategoryId,
  type ContextSnapshot,
  type ManualContextCapture,
  type MetricValue
} from '../shared/types';
import { parseContextReport } from './reportImport';

export interface ContextAcquisitionOptions {
  importedRaw?: string;
  manual?: ManualContextCapture;
}

export class ContextIntelligence {
  async acquire(options: ContextAcquisitionOptions = {}): Promise<ContextSnapshot> {
    const settings = getSettings();
    const root = workspaceRootPath();
    const acquisitionPath: string[] = [];
    const notes: string[] = [
      'Cursor does not expose a public Context Usage composition API to extensions.',
      'CUO combines local inventory (Real), optional imports/manual capture (Imported), and labeled heuristics (Estimated).'
    ];

    const imported = options.importedRaw
      ? parseContextReport(options.importedRaw)
      : undefined;
    if (imported && imported.format !== 'unknown') {
      acquisitionPath.push(`import:${imported.format}`);
    }
    if (options.manual) {
      acquisitionPath.push('manual-capture');
    }

    const inventory = await this.collectLocalInventory(root, settings.charsPerToken);
    acquisitionPath.push(...inventory.paths);

    const categories: ContextCategoryBreakdown[] = (
      Object.keys(CONTEXT_CATEGORY_LABELS) as ContextCategoryId[]
    ).map((id) => {
      const fromImport = this.metricFromCapture(id, imported?.parsed, 'Imported report');
      const fromManual = this.metricFromCapture(id, options.manual, 'Manual capture');
      const fromInventory = inventory.byCategory[id];

      const chosen = pickBestMetric([fromImport, fromManual, fromInventory]);
      return {
        id,
        label: CONTEXT_CATEGORY_LABELS[id],
        metric: chosen,
        details: inventory.details[id] ?? []
      };
    });

    const totalFromCapture =
      imported?.parsed.totalTokens !== undefined
        ? importedMetric(
            imported.parsed.totalTokens,
            'Imported report total',
            0.7,
            'User-imported total; category mix may still be partial.'
          )
        : options.manual?.totalTokens !== undefined
          ? importedMetric(options.manual.totalTokens, 'Manual total', 0.65)
          : undefined;

    const total =
      totalFromCapture ??
      sumMetrics(
        categories.map((c) => c.metric),
        'category-sum'
      );

    if (!acquisitionPath.length) {
      acquisitionPath.push('unavailable');
    }

    return {
      id: createId('ctx'),
      capturedAt: new Date().toISOString(),
      workspaceFolder: root,
      total,
      categories,
      acquisitionPath,
      notes
    };
  }

  private metricFromCapture(
    id: ContextCategoryId,
    capture: ManualContextCapture | undefined,
    source = 'capture'
  ): MetricValue | undefined {
    if (!capture) {
      return undefined;
    }
    const map: Record<ContextCategoryId, number | undefined> = {
      system_prompt: capture.systemPromptTokens,
      tool_definitions: capture.toolDefinitionsTokens,
      rules: capture.rulesTokens,
      skills: capture.skillsTokens,
      mcp_dynamic_tools: capture.mcpDynamicToolsTokens,
      subagent_definitions: capture.subagentDefinitionsTokens,
      summarized_conversation: capture.summarizedConversationTokens,
      conversation: capture.conversationTokens,
      files: capture.filesTokens
    };
    const tokens = map[id];
    if (tokens === undefined) {
      return undefined;
    }
    return importedMetric(tokens, source, 0.7, capture.notes);
  }

  private async collectLocalInventory(
    root: string | undefined,
    charsPerToken: number
  ): Promise<{
    byCategory: Partial<Record<ContextCategoryId, MetricValue>>;
    details: Partial<Record<ContextCategoryId, string[]>>;
    paths: string[];
  }> {
    const byCategory: Partial<Record<ContextCategoryId, MetricValue>> = {};
    const details: Partial<Record<ContextCategoryId, string[]>> = {};
    const paths: string[] = [];

    byCategory.system_prompt = unavailableMetric(
      'cursor-extension-api',
      'System prompt text is not exposed to third-party extensions.'
    );
    byCategory.tool_definitions = unavailableMetric(
      'cursor-extension-api',
      'Built-in tool definition payloads are not publicly readable.'
    );
    byCategory.summarized_conversation = unavailableMetric(
      'cursor-extension-api',
      'Summarized conversation segments are internal to Cursor chat.'
    );
    byCategory.conversation = unavailableMetric(
      'cursor-extension-api',
      'Live chat transcript is not available via a supported extension API.'
    );
    byCategory.subagent_definitions = unavailableMetric(
      'cursor-extension-api',
      'Subagent definition bundles are not publicly enumerable.'
    );

    if (!root) {
      paths.push('no-workspace');
      byCategory.rules = unavailableMetric('workspace', 'No workspace folder open.');
      byCategory.skills = unavailableMetric('workspace', 'No workspace folder open.');
      byCategory.mcp_dynamic_tools = unavailableMetric('workspace', 'No workspace folder open.');
      byCategory.files = unavailableMetric('workspace', 'No workspace folder open.');
      return { byCategory, details, paths };
    }

    paths.push('local-inventory');

    const ruleUris = await findWorkspaceFiles([
      '**/.cursor/rules/**/*.{md,mdc,markdown}',
      '**/AGENTS.md',
      '**/.cursorrules',
      '**/CLAUDE.md'
    ]);
    const ruleFiles = await readTextFiles(ruleUris, root);
    const ruleText = ruleFiles.map((f) => f.text ?? '').join('\n');
    const ruleBytes = ruleFiles.reduce((a, f) => a + f.bytes, 0);
    byCategory.rules = ruleFiles.length
      ? {
          ...estimateTokensFromText(ruleText, charsPerToken),
          notes: `Inventory of ${ruleFiles.length} instruction/rule files (Estimated tokens from text). File sizes are Real (${ruleBytes} bytes).`
        }
      : unavailableMetric('rules-inventory', 'No rule/instruction files found.');
    // Promote byte count as Real companion detail while tokens stay Estimated.
    if (ruleFiles.length) {
      byCategory.rules = {
        ...byCategory.rules,
        bytes: ruleBytes,
        provenance: 'Estimated',
        source: 'rules-inventory+token-heuristic',
        confidence: 0.6
      };
      details.rules = ruleFiles
        .slice(0, 12)
        .map((f) => `${f.relativePath} (${f.bytes} bytes)`);
    }

    const skillUris = await findWorkspaceFiles([
      '**/.cursor/skills/**/SKILL.md',
      '**/skills/**/SKILL.md',
      '**/.agents/skills/**/SKILL.md'
    ]);
    const skillFiles = await readTextFiles(skillUris, root);
    const skillText = skillFiles.map((f) => f.text ?? '').join('\n');
    const skillBytes = skillFiles.reduce((a, f) => a + f.bytes, 0);
    byCategory.skills = skillFiles.length
      ? {
          ...estimateTokensFromText(skillText, charsPerToken),
          bytes: skillBytes,
          source: 'skills-inventory+token-heuristic',
          confidence: 0.6,
          notes: `${skillFiles.length} SKILL.md files inventoried. Token count Estimated.`
        }
      : unavailableMetric('skills-inventory', 'No SKILL.md files found.');
    details.skills = skillFiles.slice(0, 12).map((f) => `${f.relativePath} (${f.bytes} bytes)`);

    const mcpUris = await findWorkspaceFiles([
      '**/.cursor/mcp.json',
      '**/mcp.json',
      '**/.vscode/mcp.json'
    ]);
    const mcpFiles = await readTextFiles(mcpUris, root);
    const mcpText = mcpFiles.map((f) => f.text ?? '').join('\n');
    const serverCount = countMcpServers(mcpText);
    byCategory.mcp_dynamic_tools = mcpFiles.length
      ? {
          ...estimateTokensFromText(mcpText, charsPerToken),
          bytes: mcpFiles.reduce((a, f) => a + f.bytes, 0),
          source: 'mcp-config-inventory',
          confidence: 0.5,
          notes: `Config inventory only (${serverCount} servers detected). Runtime tool schemas may be larger; tokens Estimated.`
        }
      : unavailableMetric('mcp-inventory', 'No MCP config files found.');
    details.mcp_dynamic_tools = [
      ...mcpFiles.map((f) => f.relativePath),
      serverCount ? `${serverCount} servers in config` : '0 servers parsed'
    ];

    const openEditors = vscode.window.visibleTextEditors.map((e) => e.document.uri);
    const active = vscode.window.activeTextEditor?.document.uri;
    const focusUris = [
      ...new Map(
        [...(active ? [active] : []), ...openEditors].map((u) => [u.fsPath, u])
      ).values()
    ].slice(0, 20);
    const openFiles = await readTextFiles(focusUris, root, 200_000);
    const openBytes = openFiles.reduce((a, f) => a + f.bytes, 0);
    byCategory.files = openFiles.length
      ? {
          ...estimateTokensFromBytes(openBytes, charsPerToken),
          bytes: openBytes,
          source: 'open-editors-inventory',
          confidence: 0.5,
          notes:
            'Estimated from currently open/visible editors only — not the full context file set Cursor may attach.'
        }
      : realMetric(0, 'open-editors-inventory', 0.8, 'No open editors in this window.', 0);
    details.files = openFiles.map((f) => `${f.relativePath} (${f.bytes} bytes)`);

    // Absolute path helper for ignore presence (informational).
    const ignorePath = path.join(root, '.cursorignore');
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(ignorePath));
      details.files = [...(details.files ?? []), '.cursorignore present'];
    } catch {
      details.files = [...(details.files ?? []), '.cursorignore missing'];
    }

    return { byCategory, details, paths };
  }
}

function pickBestMetric(candidates: Array<MetricValue | undefined>): MetricValue {
  const rank = { Imported: 4, Real: 3, Estimated: 2, Unavailable: 1 } as const;
  const present = candidates.filter((c): c is MetricValue => Boolean(c));
  if (!present.length) {
    return unavailableMetric('none', 'No acquisition source for this category.');
  }
  present.sort((a, b) => {
    const pr = rank[b.provenance] - rank[a.provenance];
    if (pr !== 0) {
      return pr;
    }
    return b.confidence - a.confidence;
  });
  return present[0];
}

function countMcpServers(text: string): number {
  try {
    const json = JSON.parse(text) as { mcpServers?: Record<string, unknown>; servers?: unknown[] };
    if (json.mcpServers && typeof json.mcpServers === 'object') {
      return Object.keys(json.mcpServers).length;
    }
    if (Array.isArray(json.servers)) {
      return json.servers.length;
    }
  } catch {
    // multi-file concat may not parse as one JSON
  }
  const matches = text.match(/"command"\s*:/g);
  return matches?.length ?? 0;
}

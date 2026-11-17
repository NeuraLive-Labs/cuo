import * as path from 'node:path';
import { createId, stableHash } from '../core/ids';
import { estimateTokensFromText } from '../core/tokenEstimator';
import {
  findWorkspaceFiles,
  readTextFiles,
  workspaceRootPath
} from '../core/fsInventory';
import type { Recommendation, WasteFinding } from '../shared/types';

export interface RulesAnalysis {
  files: Array<{ relativePath: string; bytes: number; tokens: number }>;
  findings: WasteFinding[];
  recommendations: Recommendation[];
}

export class RulesOptimizer {
  async analyze(charsPerToken = 4): Promise<RulesAnalysis> {
    const root = workspaceRootPath();
    if (!root) {
      return { files: [], findings: [], recommendations: [] };
    }

    const uris = await findWorkspaceFiles([
      '**/.cursor/rules/**/*.{md,mdc,markdown}',
      '**/AGENTS.md',
      '**/.cursorrules',
      '**/CLAUDE.md'
    ]);
    const files = await readTextFiles(uris, root);
    const summarized = files.map((f) => ({
      relativePath: f.relativePath,
      bytes: f.bytes,
      tokens: estimateTokensFromText(f.text ?? '', charsPerToken).tokens ?? 0
    }));

    const findings: WasteFinding[] = [];
    const recommendations: Recommendation[] = [];

    const lineIndex = new Map<string, string[]>();
    for (const file of files) {
      for (const line of (file.text ?? '').split(/\r?\n/)) {
        const t = line.trim();
        if (t.length < 24) {
          continue;
        }
        const key = t.toLowerCase();
        const list = lineIndex.get(key) ?? [];
        list.push(file.relativePath);
        lineIndex.set(key, list);
      }
    }

    for (const [line, paths] of lineIndex) {
      const unique = [...new Set(paths)];
      if (unique.length < 2) {
        continue;
      }
      const tokens = estimateTokensFromText(line, charsPerToken).tokens ?? 0;
      const dedupeKey = `rules-dup:${stableHash(line)}`;
      findings.push({
        id: createId('waste'),
        title: 'Duplicate rule text across files',
        description: `The same instruction appears in ${unique.length} files.`,
        category: 'rules',
        priority: unique.length >= 3 ? 'High' : 'Medium',
        impact: 'Repeated rules inflate context when multiple instruction files are loaded.',
        evidence: unique.map((p) => `${p}: "${line.slice(0, 80)}…"`),
        recommendation: 'Keep the rule in one scoped file; reference it elsewhere or delete copies.',
        estimatedSavingsTokens: tokens * (unique.length - 1),
        savingsProvenance: 'Estimated',
        confidence: 0.7,
        dedupeKey
      });

      const primary = unique[0];
      const primaryFile = files.find((f) => f.relativePath === primary);
      if (primaryFile?.text) {
        recommendations.push({
          id: createId('rec'),
          module: 'rules-optimizer',
          title: `Deduplicate rules toward ${primary}`,
          description: `Remove duplicated instruction blocks from secondary files; keep canonical copy in ${primary}.`,
          category: 'rules',
          priority: unique.length >= 3 ? 'High' : 'Medium',
          estimatedSavingsTokens: tokens * (unique.length - 1),
          savingsProvenance: 'Estimated',
          confidence: 0.65,
          evidence: unique,
          actionKind: 'editFile',
          targetPath: path.join(root, unique[1]),
          proposedContent: stripLine(files.find((f) => f.relativePath === unique[1])?.text ?? '', line),
          reversible: true,
          requiresAuthorization: true
        });
      }
    }

    const large = summarized.filter((f) => f.tokens > 1500);
    for (const file of large) {
      findings.push({
        id: createId('waste'),
        title: 'Oversized rules file',
        description: `${file.relativePath} is ~${file.tokens} tokens (Estimated).`,
        category: 'rules',
        priority: file.tokens > 3000 ? 'High' : 'Medium',
        impact: 'Large always-on rules consume context budget before task files.',
        evidence: [`${file.relativePath}: ${file.bytes} bytes`],
        recommendation: 'Split into scoped .cursor/rules with globs; keep global rules minimal.',
        estimatedSavingsTokens: Math.round(file.tokens * 0.3),
        savingsProvenance: 'Estimated',
        confidence: 0.55,
        dedupeKey: `rules-size:${file.relativePath}`
      });
    }

    const hasAgents = summarized.some((f) => /(^|\/)AGENTS\.md$/i.test(f.relativePath));
    const hasCursorRules = summarized.some((f) => f.relativePath.includes('.cursor/rules'));
    if (hasAgents && hasCursorRules) {
      findings.push({
        id: createId('waste'),
        title: 'Overlapping instruction surfaces',
        description: 'Both AGENTS.md and .cursor/rules are present — check for duplicated policy.',
        category: 'rules',
        priority: 'Low',
        impact: 'Multiple instruction entry points increase chance of contradiction.',
        evidence: summarized.map((f) => f.relativePath),
        recommendation: 'Decide a single source of truth per concern; cross-link instead of copying.',
        estimatedSavingsTokens: 0,
        savingsProvenance: 'Estimated',
        confidence: 0.5,
        dedupeKey: 'rules-overlap-surfaces'
      });
    }

    return { files: summarized, findings, recommendations };
  }
}

function stripLine(content: string, line: string): string {
  const target = line.trim().toLowerCase();
  return content
    .split(/\r?\n/)
    .filter((l) => l.trim().toLowerCase() !== target)
    .join('\n');
}

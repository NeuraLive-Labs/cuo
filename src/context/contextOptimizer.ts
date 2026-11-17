import * as path from 'node:path';
import { createId, stableHash } from '../core/ids';
import { estimateTokensFromBytes, estimateTokensFromText } from '../core/tokenEstimator';
import {
  fileExists,
  findWorkspaceFiles,
  readTextFile,
  readTextFiles,
  workspaceRootPath
} from '../core/fsInventory';
import type { Recommendation, WasteFinding } from '../shared/types';
import { GraphifyAdapter } from '../adapters/graphifyAdapter';
import * as vscode from 'vscode';

export interface ContextOptimizerResult {
  findings: WasteFinding[];
  recommendations: Recommendation[];
}

const NOISE_GLOBS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/out/**',
  '**/coverage/**',
  '**/.git/**',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/pnpm-lock.yaml'
];

export class ContextOptimizer {
  async analyze(charsPerToken = 4): Promise<ContextOptimizerResult> {
    const root = workspaceRootPath();
    const findings: WasteFinding[] = [];
    const recommendations: Recommendation[] = [];
    if (!root) {
      return { findings, recommendations };
    }

    const rootUri = vscode.Uri.file(root);
    const ignoreUri = vscode.Uri.joinPath(rootUri, '.cursorignore');
    const hasIgnore = await fileExists(ignoreUri);
    let ignoreText = '';
    if (hasIgnore) {
      ignoreText = await readTextFile(ignoreUri);
    } else {
      findings.push({
        id: createId('waste'),
        title: 'Missing .cursorignore',
        description: 'No .cursorignore at workspace root.',
        category: 'files',
        priority: 'High',
        impact: 'Build artifacts and lockfiles are more likely to enter indexing/context.',
        evidence: ['.cursorignore not found'],
        recommendation: 'Add a .cursorignore with node_modules, dist, coverage, and lockfiles.',
        estimatedSavingsTokens: 2000,
        savingsProvenance: 'Estimated',
        confidence: 0.55,
        dedupeKey: 'cursorignore-missing'
      });
      recommendations.push({
        id: createId('rec'),
        module: 'context-optimizer',
        title: 'Create .cursorignore with safe defaults',
        description: 'Writes a conservative ignore file. Requires authorization.',
        category: 'files',
        priority: 'High',
        estimatedSavingsTokens: 2000,
        savingsProvenance: 'Estimated',
        confidence: 0.55,
        evidence: ['Workspace root lacks .cursorignore'],
        actionKind: 'editFile',
        targetPath: ignoreUri.fsPath,
        proposedContent: defaultCursorIgnore(),
        reversible: true,
        requiresAuthorization: true,
        safeAutoAction: 'appendCursorignorePatterns'
      });
    }

    const missingPatterns = NOISE_GLOBS.map(globToIgnoreLine).filter(
      (line) => line && !ignoreContains(ignoreText, line)
    );
    if (hasIgnore && missingPatterns.length) {
      findings.push({
        id: createId('waste'),
        title: '.cursorignore missing common noise patterns',
        description: `${missingPatterns.length} recommended ignore pattern(s) absent.`,
        category: 'files',
        priority: 'Medium',
        impact: 'Noise directories may still be eligible for context inclusion.',
        evidence: missingPatterns,
        recommendation: 'Append the missing patterns after review.',
        estimatedSavingsTokens: missingPatterns.length * 250,
        savingsProvenance: 'Estimated',
        confidence: 0.5,
        dedupeKey: `cursorignore-gaps:${stableHash(missingPatterns.join('|'))}`
      });
      recommendations.push({
        id: createId('rec'),
        module: 'context-optimizer',
        title: 'Append noise patterns to .cursorignore',
        description: 'Adds missing ignore lines. Requires authorization; reversible.',
        category: 'files',
        priority: 'Medium',
        estimatedSavingsTokens: missingPatterns.length * 250,
        savingsProvenance: 'Estimated',
        confidence: 0.5,
        evidence: missingPatterns,
        actionKind: 'appendFile',
        targetPath: ignoreUri.fsPath,
        proposedContent: `${ignoreText.trimEnd()}\n\n# Added by CUO\n${missingPatterns.join('\n')}\n`,
        reversible: true,
        requiresAuthorization: true,
        safeAutoAction: 'appendCursorignorePatterns'
      });
    }

    const open = vscode.window.visibleTextEditors.map((e) => e.document.uri);
    const openFiles = await readTextFiles(open, root, 400_000);
    for (const file of openFiles) {
      if (file.bytes > 120_000) {
        const tokens = estimateTokensFromBytes(file.bytes, charsPerToken).tokens ?? 0;
        findings.push({
          id: createId('waste'),
          title: 'Very large open file',
          description: `${file.relativePath} is ${file.bytes} bytes (~${tokens} est. tokens).`,
          category: 'files',
          priority: file.bytes > 400_000 ? 'Critical' : 'High',
          impact: 'Large open files are strong candidates for accidental context inclusion.',
          evidence: [file.relativePath],
          recommendation: 'Close the file or open a narrower excerpt; prefer path references in prompts.',
          estimatedSavingsTokens: Math.round(tokens * 0.8),
          savingsProvenance: 'Estimated',
          confidence: 0.7,
          dedupeKey: `large-open:${file.relativePath}`
        });
      }
    }

    // Redundant similar open files (same basename in different folders)
    const byBase = new Map<string, string[]>();
    for (const f of openFiles) {
      const base = path.basename(f.relativePath).toLowerCase();
      const list = byBase.get(base) ?? [];
      list.push(f.relativePath);
      byBase.set(base, list);
    }
    for (const [base, paths] of byBase) {
      if (paths.length < 2) {
        continue;
      }
      findings.push({
        id: createId('waste'),
        title: `Multiple open files named ${base}`,
        description: 'Same basename open in different locations — review relevance.',
        category: 'files',
        priority: 'Low',
        impact: 'Risk of attaching the wrong variant or both variants into context.',
        evidence: paths,
        recommendation: 'Keep only the relevant file open for the active task.',
        estimatedSavingsTokens: 200,
        savingsProvenance: 'Estimated',
        confidence: 0.4,
        dedupeKey: `open-basename:${base}`
      });
    }

    const instructionUris = await findWorkspaceFiles([
      '**/README.md',
      '**/.cursorrules',
      '**/AGENTS.md'
    ]);
    const instructionFiles = await readTextFiles(instructionUris.slice(0, 10), root, 100_000);
    for (const file of instructionFiles) {
      const text = file.text ?? '';
      if (/TODO: fill|lorem ipsum|placeholder/i.test(text) && text.length > 200) {
        findings.push({
          id: createId('waste'),
          title: 'Low-signal instruction content',
          description: `${file.relativePath} contains placeholder-like text.`,
          category: 'files',
          priority: 'Low',
          impact: 'Placeholder docs add tokens without actionable guidance.',
          evidence: [file.relativePath],
          recommendation: 'Remove placeholders or replace with concise project truth.',
          estimatedSavingsTokens: estimateTokensFromText(text, charsPerToken).tokens ?? 0,
          savingsProvenance: 'Estimated',
          confidence: 0.45,
          dedupeKey: `placeholder:${file.relativePath}`
        });
      }
    }

    this.enrichWithGraphify(root, findings, recommendations);
    return { findings, recommendations };
  }

  /** Prefer Graphify graph lookup over bulk re-reads when a graph already exists. */
  private enrichWithGraphify(
    root: string,
    findings: WasteFinding[],
    recommendations: Recommendation[]
  ): void {
    const graphify = new GraphifyAdapter();
    const hint = graphify.queryExisting(
      'Which files and modules dominate the knowledge graph for this workspace?',
      root,
      { allowCliQuery: false }
    );
    if (!hint.available) {
      return;
    }
    findings.push({
      id: createId('waste'),
      title: 'Graphify graph available — prefer structured retrieval',
      description:
        'An existing graphify-out/graph.json was found. Prefer graph queries over attaching large file sets.',
      category: 'files',
      priority: 'Medium',
      impact: 'Bulk file re-reads inflate context when a knowledge graph already encodes structure.',
      evidence: [hint.graphPath ?? 'graphify-out/graph.json', hint.resultPreview ?? ''].filter(
        Boolean
      ),
      recommendation:
        'Ask targeted questions via `graphify query` (or CUO Cross-Agent view) instead of dumping directories into chat. CUO will not auto-rebuild the graph.',
      estimatedSavingsTokens: 1500,
      savingsProvenance: 'Estimated',
      confidence: 0.5,
      dedupeKey: 'graphify-prefer-query'
    });
    recommendations.push({
      id: createId('rec'),
      module: 'context-optimizer',
      title: 'Use Graphify query instead of mass file context',
      description:
        hint.tokensAvoidedNote ??
        'Query the existing graph rather than re-reading the corpus. Run `graphify --update` only when the graph is stale.',
      category: 'files',
      priority: 'Medium',
      estimatedSavingsTokens: 1500,
      savingsProvenance: 'Estimated',
      confidence: 0.5,
      evidence: [hint.graphPath ?? 'graphify-out/graph.json'],
      actionKind: 'suggestPrompt',
      proposedContent: [
        '# Graphify-assisted context',
        '',
        'Use the existing knowledge graph (do not regenerate unless outdated):',
        '```',
        'graphify query "what connects <concept A> to <concept B>?"',
        'graphify explain "<symbol>"',
        '```',
        '',
        hint.resultPreview ? `Local peek:\n${hint.resultPreview}` : '',
        ''
      ].join('\n'),
      reversible: true,
      requiresAuthorization: false
    });
  }
}

function globToIgnoreLine(glob: string): string {
  return glob.replace(/^\*\*\//, '').replace(/\/\*\*$/, '/');
}

function ignoreContains(ignoreText: string, pattern: string): boolean {
  const lines = ignoreText.split(/\r?\n/).map((l) => l.trim());
  const normalized = pattern.replace(/\/$/, '');
  return lines.some((l) => l === pattern || l === normalized || l === `${normalized}/`);
}

function defaultCursorIgnore(): string {
  return [
    '# Generated by CUO — review before relying on it',
    'node_modules/',
    'dist/',
    'out/',
    'coverage/',
    '.git/',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '*.vsix',
    ''
  ].join('\n');
}

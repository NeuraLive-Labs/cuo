import { createId, stableHash } from '../core/ids';
import { estimateTokensFromText } from '../core/tokenEstimator';
import type { Recommendation } from '../shared/types';

export interface PromptAnalysis {
  original: string;
  optimized: string;
  beforeTokens: number;
  afterTokens: number;
  issues: string[];
  recommendations: Recommendation[];
}

const FILLER =
  /\b(please|kindly|just|really|actually|basically|simply|make sure to|be sure to)\b/gi;

export class PromptOptimizer {
  analyze(prompt: string, charsPerToken = 4): PromptAnalysis {
    const issues: string[] = [];
    const lines = prompt.split(/\r?\n/).map((l) => l.trimEnd());
    const nonEmpty = lines.filter((l) => l.trim().length > 0);

    const seen = new Map<string, number>();
    for (const line of nonEmpty) {
      const key = line.trim().toLowerCase();
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    const duplicateLines = [...seen.entries()].filter(([, n]) => n > 1);
    if (duplicateLines.length) {
      issues.push(`Repeated instructions: ${duplicateLines.length} duplicate line(s).`);
    }

    const contradictions = findContradictions(nonEmpty);
    if (contradictions.length) {
      issues.push(...contradictions);
    }

    if ((prompt.match(FILLER) ?? []).length >= 4) {
      issues.push('High filler-word density; intent can be stated more directly.');
    }

    const ambiguity = nonEmpty.filter((l) =>
      /\b(something|somehow|stuff|things|etc\.?|and so on)\b/i.test(l)
    );
    if (ambiguity.length) {
      issues.push(`Ambiguous phrasing in ${ambiguity.length} line(s).`);
    }

    const optimized = optimizePrompt(prompt);
    const before = estimateTokensFromText(prompt, charsPerToken);
    const after = estimateTokensFromText(optimized, charsPerToken);
    const savings = Math.max(0, (before.tokens ?? 0) - (after.tokens ?? 0));

    const recommendations: Recommendation[] = [];
    if (issues.length || savings > 0) {
      recommendations.push({
        id: createId('rec'),
        module: 'prompt-optimizer',
        title: 'Tighten prompt while preserving intent',
        description:
          'Remove duplicate/filler phrasing and clarify ambiguous lines. CUO does not intercept Cursor chat; paste the optimized prompt manually.',
        category: 'conversation',
        priority: savings > 120 ? 'High' : savings > 40 ? 'Medium' : 'Low',
        estimatedSavingsTokens: savings,
        savingsProvenance: 'Estimated',
        confidence: 0.6,
        evidence: issues.length ? issues : ['Compression opportunity detected.'],
        actionKind: 'suggestPrompt',
        proposedContent: optimized,
        reversible: true,
        requiresAuthorization: false
      });
    }

    return {
      original: prompt,
      optimized,
      beforeTokens: before.tokens ?? 0,
      afterTokens: after.tokens ?? 0,
      issues,
      recommendations
    };
  }
}

function findContradictions(lines: string[]): string[] {
  const issues: string[] = [];
  const joined = lines.join('\n').toLowerCase();
  const pairs: Array<[RegExp, RegExp, string]> = [
    [/\balways\b/, /\bnever\b/, 'Contains both "always" and "never" directives — check scope.'],
    [/\bmust\b/, /\boptional\b/, 'Contains both "must" and "optional" — may conflict.'],
    [/\bdo not\b/, /\bmake sure to\b/, 'Negations and affirmative "make sure" may fight each other.']
  ];
  for (const [a, b, msg] of pairs) {
    if (a.test(joined) && b.test(joined)) {
      issues.push(msg);
    }
  }
  return issues;
}

function optimizePrompt(prompt: string): string {
  const lines = prompt.split(/\r?\n/);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (out.length && out[out.length - 1] !== '') {
        out.push('');
      }
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const cleaned = trimmed
      .replace(FILLER, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.])/g, '$1')
      .trim();
    if (cleaned) {
      out.push(cleaned);
    }
  }

  while (out.length && out[0] === '') {
    out.shift();
  }
  while (out.length && out[out.length - 1] === '') {
    out.pop();
  }
  return out.join('\n');
}

export function promptDedupeKey(prompt: string): string {
  return stableHash(prompt.trim().toLowerCase());
}

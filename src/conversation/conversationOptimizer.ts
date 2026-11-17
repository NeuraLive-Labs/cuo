import { createId, stableHash } from '../core/ids';
import { estimateTokensFromText } from '../core/tokenEstimator';
import { GraphifyAdapter } from '../adapters/graphifyAdapter';
import { workspaceRootPath } from '../core/fsInventory';
import type { Recommendation, WasteFinding } from '../shared/types';

export interface ConversationAnalysis {
  findings: WasteFinding[];
  recommendations: Recommendation[];
  strategyNotes: string[];
}

/**
 * Conversation optimizer operates on user-provided transcripts only.
 * It does not mutate Cursor chat history (unsupported API).
 */
export class ConversationOptimizer {
  analyze(transcript: string, charsPerToken = 4): ConversationAnalysis {
    const findings: WasteFinding[] = [];
    const recommendations: Recommendation[] = [];
    const strategyNotes = [
      'CUO cannot rewrite Cursor chat history without a supported API.',
      'Use these strategies in a new chat or when composing a handoff summary.'
    ];

    if (!transcript.trim()) {
      return {
        findings: [],
        recommendations: [
          {
            id: createId('rec'),
            module: 'conversation-optimizer',
            title: 'Start a focused thread for active requirements',
            description:
              'When context is bloated, open a new chat with a concise handoff: goals, decisions, open questions, and file paths — not the full prior transcript.',
            category: 'conversation',
            priority: 'Medium',
            estimatedSavingsTokens: 0,
            savingsProvenance: 'Unavailable',
            confidence: 0.5,
            evidence: ['No transcript provided; guidance-only.'],
            actionKind: 'summarizeStrategy',
            proposedContent: defaultHandoffTemplate(),
            reversible: true,
            requiresAuthorization: false
          }
        ],
        strategyNotes
      };
    }

    const turns = splitTurns(transcript);
    const normalized = turns.map((t) => t.text.trim().toLowerCase());
    const counts = new Map<string, number>();
    for (const n of normalized) {
      if (n.length < 20) {
        continue;
      }
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    const repeats = [...counts.entries()].filter(([, n]) => n > 1);
    if (repeats.length) {
      const savings = repeats.reduce((acc, [text, n]) => {
        const tokens = estimateTokensFromText(text, charsPerToken).tokens ?? 0;
        return acc + tokens * (n - 1);
      }, 0);
      findings.push({
        id: createId('waste'),
        title: 'Repetitive conversation turns',
        description: `${repeats.length} repeated message pattern(s) detected in provided transcript.`,
        category: 'conversation',
        priority: savings > 500 ? 'High' : 'Medium',
        impact: 'Restated requirements inflate conversation context without new signal.',
        evidence: repeats.slice(0, 5).map(([t, n]) => `${n}× ${t.slice(0, 90)}…`),
        recommendation: 'Collapse repeats into one canonical requirement block in a handoff summary.',
        estimatedSavingsTokens: savings,
        savingsProvenance: 'Estimated',
        confidence: 0.65,
        dedupeKey: `conv-repeat:${stableHash(repeats.map(([t]) => t).join('|'))}`
      });
    }

    const obsolete = turns.filter((t) =>
      /\b(ignore (the )?previous|scratch that|never ?mind|we (no longer|don't) need)\b/i.test(
        t.text
      )
    );
    if (obsolete.length) {
      findings.push({
        id: createId('waste'),
        title: 'Superseded instructions still in transcript',
        description: 'Messages explicitly retract earlier guidance.',
        category: 'conversation',
        priority: 'High',
        impact: 'Retracted asks still occupy context unless summarized away.',
        evidence: obsolete.slice(0, 5).map((t) => t.text.slice(0, 120)),
        recommendation:
          'When starting a new chat, omit retracted asks; keep only the final accepted decisions.',
        estimatedSavingsTokens: obsolete.reduce(
          (a, t) => a + (estimateTokensFromText(t.text, charsPerToken).tokens ?? 0),
          0
        ),
        savingsProvenance: 'Estimated',
        confidence: 0.6,
        dedupeKey: 'conv-obsolete'
      });
    }

    const summary = buildHandoffSummary(transcript);
    const before = estimateTokensFromText(transcript, charsPerToken).tokens ?? 0;
    const after = estimateTokensFromText(summary, charsPerToken).tokens ?? 0;

    recommendations.push({
      id: createId('rec'),
      module: 'conversation-optimizer',
      title: 'Use a decision-preserving handoff summary',
      description:
        'Replace long thread context with a compact summary that keeps requirements and decisions. Paste into a new chat — CUO will not mutate history.',
      category: 'conversation',
      priority: before - after > 300 ? 'High' : 'Medium',
      estimatedSavingsTokens: Math.max(0, before - after),
      savingsProvenance: 'Estimated',
      confidence: 0.55,
      evidence: [`Transcript ~${before} tokens → handoff ~${after} tokens (Estimated).`],
      actionKind: 'summarizeStrategy',
      proposedContent: summary,
      reversible: true,
      requiresAuthorization: false
    });

    const graphHint = new GraphifyAdapter().queryExisting(
      'Which symbols and docs should a handoff mention without pasting full files?',
      workspaceRootPath(),
      { allowCliQuery: false }
    );
    if (graphHint.available) {
      strategyNotes.push(
        'Graphify graph detected: prefer graphify query / explain over pasting large file bodies into the handoff.'
      );
      recommendations.push({
        id: createId('rec'),
        module: 'conversation-optimizer',
        title: 'Anchor the handoff on Graphify structure',
        description:
          'Point the next agent at graph nodes/paths instead of re-attaching entire transcripts or directories.',
        category: 'conversation',
        priority: 'Medium',
        estimatedSavingsTokens: 800,
        savingsProvenance: 'Estimated',
        confidence: 0.5,
        evidence: [graphHint.graphPath ?? 'graphify-out/graph.json'],
        actionKind: 'suggestPrompt',
        proposedContent: [
          '# Graph-aware handoff',
          '',
          'Existing graph (do not rebuild unless stale):',
          graphHint.graphPath ?? 'graphify-out/graph.json',
          '',
          '```',
          'graphify query "open questions and entry points for this task"',
          '```',
          '',
          graphHint.resultPreview ?? '',
          ''
        ].join('\n'),
        reversible: true,
        requiresAuthorization: false
      });
    }

    return { findings, recommendations, strategyNotes };
  }
}

function splitTurns(transcript: string): Array<{ role: string; text: string }> {
  const parts = transcript.split(/\n(?=(?:User|Assistant|Human|AI|System)\s*:)/i);
  return parts
    .map((p) => {
      const m = p.match(/^(User|Assistant|Human|AI|System)\s*:\s*([\s\S]*)$/i);
      if (m) {
        return { role: m[1], text: m[2].trim() };
      }
      return { role: 'unknown', text: p.trim() };
    })
    .filter((t) => t.text.length > 0);
}

function buildHandoffSummary(transcript: string): string {
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const decisions = lines.filter((l) =>
    /\b(decided|decision|we will|approved|accepted|final)\b/i.test(l)
  );
  const requirements = lines.filter((l) =>
    /\b(must|should|need to|requirement|acceptance)\b/i.test(l)
  );
  const paths = [...new Set(lines.flatMap((l) => l.match(/[\w./\\-]+\.[a-z]{1,5}/gi) ?? []))];

  return [
    '# Handoff summary (generated by CUO)',
    '',
    '## Goals / requirements',
    ...(requirements.slice(0, 12).map((l) => `- ${l}`) || ['- (add active requirements)']),
    '',
    '## Decisions to preserve',
    ...(decisions.slice(0, 12).map((l) => `- ${l}`) || ['- (add decisions)']),
    '',
    '## Relevant paths',
    ...(paths.slice(0, 20).map((p) => `- ${p}`) || ['- (add paths)']),
    '',
    '## Open questions',
    '- (add unresolved questions)',
    ''
  ].join('\n');
}

function defaultHandoffTemplate(): string {
  return [
    '# Handoff summary',
    '',
    '## Goals',
    '- ',
    '',
    '## Decisions',
    '- ',
    '',
    '## Files',
    '- ',
    '',
    '## Open questions',
    '- ',
    ''
  ].join('\n');
}

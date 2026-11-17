import type { WasteFinding, WastePriority } from '../shared/types';

const PRIORITY_RANK: Record<WastePriority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

export class WasteDetector {
  /**
   * Merge findings from all modules, dedupe by dedupeKey, keep highest impact.
   */
  consolidate(findings: WasteFinding[]): WasteFinding[] {
    const map = new Map<string, WasteFinding>();
    for (const finding of findings) {
      const existing = map.get(finding.dedupeKey);
      if (!existing) {
        map.set(finding.dedupeKey, finding);
        continue;
      }
      map.set(finding.dedupeKey, pickBetter(existing, finding));
    }
    return [...map.values()].sort((a, b) => {
      const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (pr !== 0) {
        return pr;
      }
      return b.estimatedSavingsTokens - a.estimatedSavingsTokens;
    });
  }
}

function pickBetter(a: WasteFinding, b: WasteFinding): WasteFinding {
  const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
  if (pr > 0) {
    return mergeEvidence(b, a);
  }
  if (pr < 0) {
    return mergeEvidence(a, b);
  }
  if (b.estimatedSavingsTokens > a.estimatedSavingsTokens) {
    return mergeEvidence(b, a);
  }
  if (b.confidence > a.confidence) {
    return mergeEvidence(b, a);
  }
  return mergeEvidence(a, b);
}

function mergeEvidence(primary: WasteFinding, secondary: WasteFinding): WasteFinding {
  const evidence = [...new Set([...primary.evidence, ...secondary.evidence])];
  return { ...primary, evidence };
}

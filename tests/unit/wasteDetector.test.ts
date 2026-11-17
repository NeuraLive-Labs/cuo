import { describe, expect, it } from 'vitest';
import { WasteDetector } from '../../src/waste-detector/wasteDetector';
import type { WasteFinding } from '../../src/shared/types';

function finding(partial: Partial<WasteFinding> & Pick<WasteFinding, 'dedupeKey' | 'priority'>): WasteFinding {
  return {
    id: partial.id ?? 'id',
    title: partial.title ?? 't',
    description: partial.description ?? 'd',
    category: partial.category ?? 'files',
    priority: partial.priority,
    impact: partial.impact ?? 'i',
    evidence: partial.evidence ?? ['e'],
    recommendation: partial.recommendation ?? 'r',
    estimatedSavingsTokens: partial.estimatedSavingsTokens ?? 10,
    savingsProvenance: partial.savingsProvenance ?? 'Estimated',
    confidence: partial.confidence ?? 0.5,
    dedupeKey: partial.dedupeKey
  };
}

describe('WasteDetector', () => {
  it('dedupes by key keeping higher priority', () => {
    const detector = new WasteDetector();
    const result = detector.consolidate([
      finding({ dedupeKey: 'a', priority: 'Low', estimatedSavingsTokens: 100, evidence: ['low'] }),
      finding({ dedupeKey: 'a', priority: 'High', estimatedSavingsTokens: 50, evidence: ['high'] }),
      finding({ dedupeKey: 'b', priority: 'Medium', estimatedSavingsTokens: 20 })
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].priority).toBe('High');
    expect(result[0].evidence).toEqual(expect.arrayContaining(['high', 'low']));
  });
});

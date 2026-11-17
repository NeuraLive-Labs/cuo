import { describe, expect, it } from 'vitest';
import { parseContextReport } from '../../src/context/reportImport';
import { importedMetric, sumMetrics, unavailableMetric } from '../../src/core/tokenEstimator';
import { WasteDetector } from '../../src/waste-detector/wasteDetector';
import { PromptOptimizer } from '../../src/prompts/promptOptimizer';
import type { WasteFinding } from '../../src/shared/types';

describe('provenance-aware pipeline integration', () => {
  it('keeps Imported totals distinct from Estimated prompt savings', () => {
    const imported = parseContextReport('{"total": 42000, "files": 12000}');
    const total = importedMetric(imported.parsed.totalTokens ?? null, 'import', 0.7);
    expect(total.provenance).toBe('Imported');

    const prompt = new PromptOptimizer().analyze('please just do it\nplease just do it', 4);
    expect(prompt.recommendations[0]?.savingsProvenance).toBe('Estimated');

    const mixed = sumMetrics(
      [total, unavailableMetric('conversation', 'no api'), prompt.recommendations[0]
        ? {
            tokens: prompt.recommendations[0].estimatedSavingsTokens,
            provenance: 'Estimated' as const,
            source: 'prompt',
            confidence: 0.5
          }
        : unavailableMetric('prompt', 'none')],
      'pipeline'
    );
    expect(mixed.provenance).toBe('Estimated');

    const detector = new WasteDetector();
    const findings = detector.consolidate([
      {
        id: '1',
        title: 'a',
        description: 'd',
        category: 'files',
        priority: 'High',
        impact: 'i',
        evidence: ['e'],
        recommendation: 'r',
        estimatedSavingsTokens: 100,
        savingsProvenance: 'Estimated',
        confidence: 0.5,
        dedupeKey: 'x'
      } satisfies WasteFinding,
      {
        id: '2',
        title: 'b',
        description: 'd',
        category: 'files',
        priority: 'Low',
        impact: 'i',
        evidence: ['e2'],
        recommendation: 'r',
        estimatedSavingsTokens: 10,
        savingsProvenance: 'Estimated',
        confidence: 0.5,
        dedupeKey: 'x'
      } satisfies WasteFinding
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].priority).toBe('High');
  });
});

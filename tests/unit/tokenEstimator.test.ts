import { describe, expect, it } from 'vitest';
import {
  estimateTokensFromText,
  formatTokens,
  importedMetric,
  realMetric,
  sumMetrics,
  unavailableMetric
} from '../../src/core/tokenEstimator';

describe('tokenEstimator', () => {
  it('labels heuristic estimates as Estimated, never Real', () => {
    const metric = estimateTokensFromText('abcd'.repeat(10), 4);
    expect(metric.provenance).toBe('Estimated');
    expect(metric.tokens).toBe(10);
    expect(metric.provenance).not.toBe('Real');
  });

  it('sums mixed provenance as Estimated with note', () => {
    const total = sumMetrics(
      [realMetric(10, 'bytes', 1), importedMetric(5, 'import', 0.7), estimateTokensFromText('xxxx', 4)],
      'mix'
    );
    expect(total.tokens).toBe(16);
    expect(total.provenance).toBe('Estimated');
  });

  it('returns Unavailable when nothing countable exists', () => {
    const total = sumMetrics([unavailableMetric('a', 'n/a'), unavailableMetric('b', 'n/a')], 'x');
    expect(total.provenance).toBe('Unavailable');
    expect(total.tokens).toBeNull();
  });

  it('formats token counts compactly', () => {
    expect(formatTokens(null)).toBe('—');
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(2_500_000)).toBe('2.50M');
  });
});

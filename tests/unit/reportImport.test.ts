import { describe, expect, it } from 'vitest';
import { parseContextReport } from '../../src/context/reportImport';

describe('parseContextReport', () => {
  it('parses JSON imports', () => {
    const result = parseContextReport(JSON.stringify({ files: 1200, rules: 300, total: 5000 }));
    expect(result.format).toBe('json');
    expect(result.parsed.filesTokens).toBe(1200);
    expect(result.parsed.rulesTokens).toBe(300);
    expect(result.parsed.totalTokens).toBe(5000);
  });

  it('parses key:value lines with k suffix', () => {
    const result = parseContextReport('Files: 12k\nRules: 1.5k\nTotal: 40k');
    expect(result.format).toBe('keyvalue');
    expect(result.parsed.filesTokens).toBe(12000);
    expect(result.parsed.rulesTokens).toBe(1500);
    expect(result.parsed.totalTokens).toBe(40000);
  });

  it('returns unknown for empty garbage', () => {
    expect(parseContextReport('???').format).toBe('unknown');
  });
});

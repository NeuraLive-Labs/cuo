import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue
    })
  }
}));

import { UsageMonitor } from '../../src/usage/usageMonitor';
import { importedMetric } from '../../src/core/tokenEstimator';
import type { ContextSnapshot, OptimizationRunResult } from '../../src/shared/types';

describe('UsageMonitor', () => {
  it('marks billed tokens Unavailable until imported and keeps context provenance', () => {
    const monitor = new UsageMonitor();
    let stats = monitor.createSession('proj');
    expect(stats.inputTokens.provenance).toBe('Unavailable');

    const snapshot: ContextSnapshot = {
      id: 'c1',
      capturedAt: new Date().toISOString(),
      total: importedMetric(1000, 'import', 0.7),
      categories: [],
      acquisitionPath: ['import:json'],
      notes: []
    };
    stats = monitor.applyContext(stats, snapshot);
    expect(stats.contextTokens.provenance).toBe('Imported');
    expect(stats.contextTokens.notes).toMatch(/not necessarily billed/i);

    const run: OptimizationRunResult = {
      id: 'r1',
      ranAt: new Date().toISOString(),
      mode: 'recommendation',
      context: snapshot,
      findings: [],
      recommendations: [
        {
          id: 'rec1',
          module: 'x',
          title: 't',
          description: 'd',
          category: 'files',
          priority: 'Low',
          estimatedSavingsTokens: 40,
          savingsProvenance: 'Estimated',
          confidence: 0.5,
          evidence: [],
          actionKind: 'none',
          reversible: false,
          requiresAuthorization: false
        }
      ],
      applied: [
        {
          id: 'a1',
          recommendationId: 'rec1',
          path: '/tmp',
          appliedAt: new Date().toISOString(),
          backupKey: 'b1',
          summary: 's'
        }
      ],
      notes: []
    };
    stats = monitor.applySavings(stats, run);
    expect(stats.savingsTokens.provenance).toBe('Estimated');
    expect(stats.savingsTokens.tokens).toBe(40);
  });
});

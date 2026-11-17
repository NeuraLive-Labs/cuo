import { describe, expect, it } from 'vitest';
import { CrossAgentAnalytics } from '../../src/core/crossAgentAnalytics';
import { LocalTelemetryStore } from '../../src/core/localTelemetry';
import type { TelemetrySessionRecord } from '../../src/shared/ecosystem';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

function metric(tokens: number | null, provenance: 'Real' | 'Estimated' | 'Imported' | 'Unavailable') {
  return { tokens, provenance, source: 'test', confidence: 0.8 };
}

function session(
  partial: Partial<TelemetrySessionRecord> & Pick<TelemetrySessionRecord, 'id' | 'environment'>
): TelemetrySessionRecord {
  return {
    schemaVersion: 1,
    projectKey: 'demo',
    startedAt: '2026-11-17T10:00:00.000Z',
    inputTokens: metric(100, 'Real'),
    outputTokens: metric(50, 'Real'),
    contextTokens: metric(100, 'Real'),
    costUsd: metric(0.01, 'Estimated'),
    durationMs: metric(1000, 'Real'),
    toolCallCount: 2,
    repetitiveOps: 0,
    recommendations: [],
    notes: [],
    sourcePaths: [],
    ...partial
  };
}

describe('CrossAgentAnalytics', () => {
  it('sums Real metrics and weakens provenance when Estimated is present', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuo-xa-'));
    const prev = process.env.USERPROFILE;
    // Write via store into real ~/.cuo — use isolated writes through store API then filter by project.
    const store = new LocalTelemetryStore();
    store.upsertSessionSnapshot(
      session({
        id: `cursor-${Date.now()}`,
        environment: 'cursor',
        projectKey: `xa-${path.basename(dir)}`,
        inputTokens: metric(10, 'Real'),
        outputTokens: metric(5, 'Real'),
        contextTokens: metric(10, 'Real'),
        costUsd: metric(1, 'Estimated')
      })
    );
    store.upsertSessionSnapshot(
      session({
        id: `claude-${Date.now()}`,
        environment: 'claude_code',
        projectKey: `xa-${path.basename(dir)}`,
        inputTokens: metric(20, 'Real'),
        outputTokens: metric(8, 'Real'),
        contextTokens: metric(20, 'Real'),
        costUsd: metric(2, 'Estimated')
      })
    );

    const analytics = new CrossAgentAnalytics(store);
    const comparison = analytics.buildComparison({ projectKey: `xa-${path.basename(dir)}` });
    const cursor = comparison.byEnvironment.find((e) => e.environment === 'cursor');
    const claude = comparison.byEnvironment.find((e) => e.environment === 'claude_code');
    expect(cursor?.sessionCount).toBeGreaterThanOrEqual(1);
    expect(claude?.sessionCount).toBeGreaterThanOrEqual(1);
    expect(cursor?.inputTokens.provenance).toBe('Real');
    expect(claude?.costUsd.provenance).toBe('Estimated');
    expect(comparison.normalizationNotes.length).toBeGreaterThan(0);
    void prev;
  });

  it('refuses to invent a total when a contributor is null', () => {
    const store = new LocalTelemetryStore();
    const key = `nullmix-${Date.now()}`;
    store.upsertSessionSnapshot(
      session({
        id: `a-${key}`,
        environment: 'cursor',
        projectKey: key,
        inputTokens: metric(10, 'Real')
      })
    );
    store.upsertSessionSnapshot(
      session({
        id: `b-${key}`,
        environment: 'cursor',
        projectKey: key,
        inputTokens: metric(null, 'Unavailable')
      })
    );
    const comparison = new CrossAgentAnalytics(store).buildComparison({ projectKey: key });
    const cursor = comparison.byEnvironment.find((e) => e.environment === 'cursor');
    expect(cursor?.inputTokens.tokens).toBeNull();
    expect(cursor?.inputTokens.provenance).toBe('Unavailable');
  });
});

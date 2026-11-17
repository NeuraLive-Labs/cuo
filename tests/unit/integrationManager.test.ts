import { describe, expect, it } from 'vitest';
import { IntegrationManager } from '../../src/integrations/integrationManager';

describe('IntegrationManager', () => {
  it('detects all four integrations and respects disable toggles', () => {
    const manager = new IntegrationManager({
      toggles: { cursor: true, claude_code: false, ponytail: true, graphify: true },
      vscodeVersion: '1.85.0'
    });
    const statuses = manager.detectAll();
    expect(statuses.map((s) => s.id)).toEqual(['cursor', 'claude_code', 'ponytail', 'graphify']);
    expect(statuses.find((s) => s.id === 'claude_code')?.availability).toBe('disabled');
    expect(statuses.find((s) => s.id === 'cursor')?.capabilities.some((c) => c.id === 'context-usage-api' && !c.available)).toBe(
      true
    );
  });

  it('builds an ecosystem snapshot without throwing when optionals are missing', () => {
    const snap = new IntegrationManager({ vscodeVersion: '1.85.0' }).snapshot();
    expect(snap.integrations.length).toBe(4);
    expect(snap.comparison.byEnvironment.length).toBe(2);
    expect(snap.comparison.notes.some((n) => n.includes('Context Usage'))).toBe(true);
  });
});

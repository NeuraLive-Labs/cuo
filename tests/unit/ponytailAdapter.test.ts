import { describe, expect, it } from 'vitest';
import { PonytailAdapter } from '../../src/adapters/ponytailAdapter';

describe('PonytailAdapter', () => {
  it('returns a status object with compatibility notes', () => {
    const status = new PonytailAdapter().detect(true);
    expect(status.id).toBe('ponytail');
    expect(status.compatibilityNotes.some((n) => n.includes('does not replace'))).toBe(true);
    expect(['detected', 'missing', 'error']).toContain(status.availability);
  });

  it('observe never claims Real without band artifacts', () => {
    const obs = new PonytailAdapter().observe();
    if (!obs.detected) {
      expect(obs.provenance).toBe('Unavailable');
    } else {
      expect(['Imported', 'Unavailable']).toContain(obs.provenance);
    }
  });
});

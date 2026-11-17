import { describe, expect, it } from 'vitest';
import { ModelAdvisor } from '../../src/model-advisor/modelAdvisor';

describe('ModelAdvisor', () => {
  it('recommends economical models for mechanical edits and never claims auto-switch', () => {
    const advice = new ModelAdvisor().advise('fix a typo and format the file');
    expect(advice.some((a) => a.estimatedRelativeCost === 'low')).toBe(true);
    expect(advice.some((a) => /manual/i.test(a.recommendedModelFamily))).toBe(true);
  });
});

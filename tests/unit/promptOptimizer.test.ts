import { describe, expect, it } from 'vitest';
import { PromptOptimizer } from '../../src/prompts/promptOptimizer';

describe('PromptOptimizer', () => {
  it('removes duplicate lines and reports savings as Estimated', () => {
    const prompt = [
      'Please really just implement the feature.',
      'Please really just implement the feature.',
      'Always use TypeScript.',
      'Never use TypeScript.'
    ].join('\n');
    const result = new PromptOptimizer().analyze(prompt, 4);
    expect(result.afterTokens).toBeLessThan(result.beforeTokens);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.recommendations[0]?.savingsProvenance).toBe('Estimated');
    expect(result.optimized.toLowerCase()).not.toContain('please really just implement the feature.\nplease');
  });
});

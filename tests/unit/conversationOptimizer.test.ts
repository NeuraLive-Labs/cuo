import { describe, expect, it } from 'vitest';
import { ConversationOptimizer } from '../../src/conversation/conversationOptimizer';

describe('ConversationOptimizer', () => {
  it('detects repeats and produces handoff without claiming Real savings', () => {
    const transcript = [
      'User: We must support offline mode.',
      'Assistant: Understood.',
      'User: We must support offline mode.',
      'User: Scratch that previous approach; never mind the cache idea.'
    ].join('\n');
    const result = new ConversationOptimizer().analyze(transcript, 4);
    expect(result.findings.some((f) => f.title.includes('Repetitive'))).toBe(true);
    expect(result.findings.some((f) => f.title.includes('Superseded'))).toBe(true);
    expect(result.recommendations[0]?.savingsProvenance).toBe('Estimated');
    expect(result.recommendations[0]?.proposedContent).toContain('Handoff summary');
  });

  it('provides strategy-only guidance when transcript empty', () => {
    const result = new ConversationOptimizer().analyze('', 4);
    expect(result.recommendations[0]?.actionKind).toBe('summarizeStrategy');
  });
});

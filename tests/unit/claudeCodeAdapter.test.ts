import { describe, expect, it } from 'vitest';
import { ClaudeCodeAdapter } from '../../src/adapters/claudeCodeAdapter';

describe('ClaudeCodeAdapter.metricsFromStatusLine', () => {
  it('labels context tokens Real and cost Estimated', () => {
    const session = ClaudeCodeAdapter.metricsFromStatusLine({
      session_id: 'sess-1',
      cwd: 'C:\\Users\\IGNITER\\CUO',
      cost: { total_cost_usd: 0.12, total_duration_ms: 5000 },
      context_window: {
        total_input_tokens: 15000,
        total_output_tokens: 400,
        used_percentage: 12.5
      }
    });
    expect(session.environment).toBe('claude_code');
    expect(session.inputTokens.provenance).toBe('Real');
    expect(session.inputTokens.tokens).toBe(15000);
    expect(session.costUsd.provenance).toBe('Estimated');
    expect(session.costUsd.tokens).toBe(0.12);
    expect(session.durationMs.provenance).toBe('Real');
  });

  it('marks missing fields Unavailable', () => {
    const session = ClaudeCodeAdapter.metricsFromStatusLine({ session_id: 'sess-2' });
    expect(session.inputTokens.provenance).toBe('Unavailable');
    expect(session.costUsd.provenance).toBe('Unavailable');
  });
});

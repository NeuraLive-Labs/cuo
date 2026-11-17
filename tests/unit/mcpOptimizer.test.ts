import { describe, expect, it } from 'vitest';
import { applyMcpDisable } from '../../src/mcp/mcpConfig';

describe('applyMcpDisable', () => {
  it('marks mcpServers entry disabled without dropping others', () => {
    const input = JSON.stringify({
      mcpServers: {
        alpha: { command: 'npx', args: ['a'] },
        beta: { command: 'npx', args: ['b'] }
      }
    });
    const next = JSON.parse(applyMcpDisable(input, 'alpha')) as {
      mcpServers: Record<string, { disabled?: boolean; command?: string }>;
    };
    expect(next.mcpServers.alpha.disabled).toBe(true);
    expect(next.mcpServers.alpha.command).toBe('npx');
    expect(next.mcpServers.beta.disabled).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('extension packaging contract', () => {
  it('declares activation, views, and commands required by CUO', () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8')
    ) as {
      main: string;
      contributes: {
        commands: Array<{ command: string }>;
        views: { cuo: Array<{ id: string; type: string }> };
      };
      activationEvents: string[];
    };

    expect(pkg.main).toBe('./dist/extension.js');
    expect(pkg.activationEvents).toContain('onStartupFinished');
    expect(pkg.contributes.views.cuo.some((v) => v.id === 'cuo.sidebar')).toBe(true);

    const commands = pkg.contributes.commands.map((c) => c.command);
    for (const required of [
      'cuo.openDashboard',
      'cuo.analyzeWorkspace',
      'cuo.importContextReport',
      'cuo.runOptimization',
      'cuo.revertLastChange',
      'cuo.showIntegrations',
      'cuo.installClaudeCodeIntegration'
    ]) {
      expect(commands).toContain(required);
    }
  });

  it('extension entry exports activate', async () => {
    const source = readFileSync(path.resolve(__dirname, '../../src/extension.ts'), 'utf8');
    expect(source).toContain('export function activate');
    expect(source).toContain('export function deactivate');
  });
});

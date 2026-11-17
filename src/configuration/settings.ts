import * as vscode from 'vscode';
import type { CuoSettings, OptimizationMode, SafeAutoAction } from '../shared/types';

const SAFE_ACTIONS: SafeAutoAction[] = [
  'suggestOnly',
  'appendCursorignorePatterns',
  'disableRedundantMcpServer'
];

export function getSettings(): CuoSettings {
  const cfg = vscode.workspace.getConfiguration('cuo');
  const mode = cfg.get<string>('optimizationMode', 'recommendation');
  const safe = cfg.get<string[]>('safeAutoActions', []) ?? [];

  return {
    optimizationMode: isOptimizationMode(mode) ? mode : 'recommendation',
    charsPerToken: cfg.get<number>('charsPerToken', 4) ?? 4,
    autoAnalyzeOnOpen: cfg.get<boolean>('autoAnalyzeOnOpen', true) ?? true,
    statusBarEnabled: cfg.get<boolean>('statusBarEnabled', true) ?? true,
    historyLimit: cfg.get<number>('historyLimit', 50) ?? 50,
    safeAutoActions: safe.filter((s): s is SafeAutoAction =>
      SAFE_ACTIONS.includes(s as SafeAutoAction)
    ),
    tokenPricingUsdPer1kInput: cfg.get<number>('tokenPricingUsdPer1kInput', 0) ?? 0,
    tokenPricingUsdPer1kOutput: cfg.get<number>('tokenPricingUsdPer1kOutput', 0) ?? 0,
    neverSendCodeExternally: cfg.get<boolean>('privacy.neverSendCodeExternally', true) ?? true,
    integrations: {
      cursor: cfg.get<boolean>('integrations.cursor', true) ?? true,
      claudeCode: cfg.get<boolean>('integrations.claudeCode', true) ?? true,
      ponytail: cfg.get<boolean>('integrations.ponytail', true) ?? true,
      graphify: cfg.get<boolean>('integrations.graphify', true) ?? true
    }
  };
}

function isOptimizationMode(value: string): value is OptimizationMode {
  return (
    value === 'analysis' ||
    value === 'recommendation' ||
    value === 'assisted' ||
    value === 'automatic'
  );
}

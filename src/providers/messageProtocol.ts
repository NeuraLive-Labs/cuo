import type { AnalyticsBundle, ManualContextCapture, Recommendation } from '../shared/types';

export type HostToWebview =
  | { type: 'analytics'; payload: AnalyticsBundle }
  | { type: 'status'; message: string }
  | { type: 'error'; message: string };

export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'analyze' }
  | { type: 'runOptimization' }
  | { type: 'applyRecommendation'; id: string }
  | { type: 'revertLast' }
  | { type: 'importReport'; raw: string }
  | { type: 'manualCapture'; capture: ManualContextCapture }
  | { type: 'openDashboard' }
  | { type: 'setPrompt'; prompt: string }
  | { type: 'requestModelAdvice'; task: string }
  | { type: 'installClaudeCode' };

export function isWebviewToHost(value: unknown): value is WebviewToHost {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  return typeof type === 'string';
}

export type { Recommendation };

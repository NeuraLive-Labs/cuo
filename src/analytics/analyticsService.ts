import * as vscode from 'vscode';
import { CuoStorage } from '../storage/persistence';
import { ModelAdvisor } from '../model-advisor/modelAdvisor';
import { UsageMonitor } from '../usage/usageMonitor';
import { IntegrationManager } from '../integrations/integrationManager';
import { getSettings } from '../configuration/settings';
import type { AnalyticsBundle, OptimizationRunResult } from '../shared/types';

export class AnalyticsService {
  private readonly models = new ModelAdvisor();
  private readonly usageMonitor = new UsageMonitor();

  constructor(
    private readonly storage: CuoStorage,
    private readonly extensionUri?: vscode.Uri
  ) {}

  buildBundle(latestRun?: OptimizationRunResult): AnalyticsBundle {
    const settings = getSettings();
    const history = this.storage.getHistory();
    const run = latestRun ?? this.storage.getLatestRun();
    const usage =
      this.storage.getUsage() ??
      this.usageMonitor.createSession(history[0]?.workspaceFolder ?? 'no-workspace');

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const manager = new IntegrationManager({
      toggles: {
        cursor: settings.integrations.cursor,
        claude_code: settings.integrations.claudeCode,
        ponytail: settings.integrations.ponytail,
        graphify: settings.integrations.graphify
      },
      workspaceRoot,
      extensionRoot: this.extensionUri?.fsPath,
      vscodeVersion: vscode.version
    });

    return {
      generatedAt: new Date().toISOString(),
      latestContext: run?.context ?? history[0],
      history,
      latestRun: run,
      usage,
      findings: run?.findings ?? [],
      recommendations: run?.recommendations ?? [],
      modelAdvice: this.models.advise('general coding context optimization'),
      ecosystem: manager.snapshot()
    };
  }
}

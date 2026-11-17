import * as vscode from 'vscode';
import { AnalyticsService } from '../analytics/analyticsService';
import { OptimizationEngine } from '../optimization-engine/engine';
import { CuoStorage } from '../storage/persistence';
import { getWebviewHtml } from './webviewHtml';
import { isWebviewToHost, type HostToWebview } from './messageProtocol';

export class DashboardPanel {
  public static current?: DashboardPanel;
  private readonly panel: vscode.WebviewPanel;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly storage: CuoStorage,
    private readonly engine: OptimizationEngine,
    private readonly analytics: AnalyticsService
  ) {
    this.panel = panel;
    this.panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')]
    };
    this.panel.webview.html = getWebviewHtml(this.panel.webview, extensionUri, 'CUO Dashboard');
    this.panel.onDidDispose(() => {
      DashboardPanel.current = undefined;
    });
    this.panel.webview.onDidReceiveMessage(async (msg) => {
      if (!isWebviewToHost(msg)) {
        return;
      }
      switch (msg.type) {
        case 'ready':
        case 'refresh':
          this.postAnalytics();
          break;
        case 'analyze':
        case 'runOptimization':
          await this.engine.run({
            authorize: async (rec) => {
              const pick = await vscode.window.showWarningMessage(
                `Apply: ${rec.title}?`,
                { modal: true },
                'Apply'
              );
              return pick === 'Apply';
            }
          });
          this.postAnalytics();
          break;
        case 'applyRecommendation': {
          const run = this.storage.getLatestRun();
          const rec = run?.recommendations.find((r) => r.id === msg.id);
          if (!rec) {
            this.post({ type: 'error', message: 'Recommendation not found.' });
            return;
          }
          if (rec.actionKind === 'suggestPrompt' || rec.actionKind === 'summarizeStrategy') {
            const doc = await vscode.workspace.openTextDocument({
              content: rec.proposedContent ?? '',
              language: 'markdown'
            });
            await vscode.window.showTextDocument(doc, { preview: true });
            return;
          }
          const pick = await vscode.window.showWarningMessage(
            `Apply: ${rec.title}?`,
            { modal: true },
            'Apply'
          );
          if (pick === 'Apply') {
            await this.engine.applyRecommendation(rec);
            this.postAnalytics();
          }
          break;
        }
        case 'revertLast': {
          const path = await this.engine.revertLast();
          void vscode.window.showInformationMessage(
            path ? `CUO reverted ${path}` : 'No reversible CUO change found.'
          );
          this.postAnalytics();
          break;
        }
        case 'importReport':
          await this.engine.run({ importedRaw: msg.raw });
          this.postAnalytics();
          break;
        case 'manualCapture':
          await this.engine.run({ manual: msg.capture });
          this.postAnalytics();
          break;
        case 'setPrompt':
          await this.engine.run({ promptText: msg.prompt });
          this.postAnalytics();
          break;
        case 'installClaudeCode':
          await vscode.commands.executeCommand('cuo.installClaudeCodeIntegration');
          break;
        default:
          break;
      }
    });
  }

  static show(
    extensionUri: vscode.Uri,
    storage: CuoStorage,
    engine: OptimizationEngine,
    analytics: AnalyticsService
  ): DashboardPanel {
    if (DashboardPanel.current) {
      DashboardPanel.current.panel.reveal(vscode.ViewColumn.Beside);
      DashboardPanel.current.postAnalytics();
      return DashboardPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'cuo.dashboard',
      'CUO Dashboard',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    DashboardPanel.current = new DashboardPanel(panel, extensionUri, storage, engine, analytics);
    DashboardPanel.current.postAnalytics();
    return DashboardPanel.current;
  }

  postAnalytics(): void {
    this.post({ type: 'analytics', payload: this.analytics.buildBundle() });
  }

  private post(message: HostToWebview): void {
    void this.panel.webview.postMessage(message);
  }
}

import * as vscode from 'vscode';
import { AnalyticsService } from '../analytics/analyticsService';
import { OptimizationEngine } from '../optimization-engine/engine';
import { CuoStorage } from '../storage/persistence';
import { getWebviewHtml } from './webviewHtml';
import { isWebviewToHost, type HostToWebview } from './messageProtocol';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'cuo.sidebar';
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly storage: CuoStorage,
    private readonly engine: OptimizationEngine,
    private readonly analytics: AnalyticsService,
    private readonly onOpenDashboard: () => void
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')]
    };
    webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, 'CUO');
    webviewView.webview.onDidReceiveMessage(async (msg) => {
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
          this.post({
            type: 'status',
            message: path ? `Reverted ${path}` : 'No reversible change found.'
          });
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
        case 'openDashboard':
          this.onOpenDashboard();
          break;
        case 'setPrompt':
          await this.engine.run({ promptText: msg.prompt });
          this.postAnalytics();
          break;
        case 'requestModelAdvice':
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

  postAnalytics(): void {
    this.post({ type: 'analytics', payload: this.analytics.buildBundle() });
  }

  private post(message: HostToWebview): void {
    void this.view?.webview.postMessage(message);
  }
}

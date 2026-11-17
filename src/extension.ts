import * as vscode from 'vscode';
import { AnalyticsService } from './analytics/analyticsService';
import { getSettings } from './configuration/settings';
import { OptimizationEngine } from './optimization-engine/engine';
import { DashboardPanel } from './providers/dashboardPanel';
import { SidebarProvider } from './providers/sidebarProvider';
import { CuoStatusBar } from './providers/statusBar';
import { CuoStorage } from './storage/persistence';
import type { ManualContextCapture } from './shared/types';

export function activate(context: vscode.ExtensionContext): void {
  const storage = new CuoStorage(context);
  const engine = new OptimizationEngine(storage);
  const analytics = new AnalyticsService(storage, context.extensionUri);
  const statusBar = new CuoStatusBar();
  context.subscriptions.push(statusBar);

  const openDashboard = () => {
    DashboardPanel.show(context.extensionUri, storage, engine, analytics);
  };

  const sidebar = new SidebarProvider(
    context.extensionUri,
    storage,
    engine,
    analytics,
    openDashboard
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar)
  );

  const refreshStatus = () => {
    const settings = getSettings();
    statusBar.setVisible(settings.statusBarEnabled);
    if (!settings.statusBarEnabled) {
      return;
    }
    statusBar.update(storage.getHistory()[0] ?? storage.getLatestRun()?.context);
  };

  const runAnalyze = async (extra?: {
    importedRaw?: string;
    manual?: ManualContextCapture;
    promptText?: string;
  }) => {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'CUO analyzing workspace…',
        cancellable: false
      },
      async () => {
        const run = await engine.run({
          ...extra,
          authorize: async (rec) => {
            const pick = await vscode.window.showWarningMessage(
              `CUO wants to apply: ${rec.title}`,
              { modal: true, detail: rec.description },
              'Apply',
              'Skip'
            );
            return pick === 'Apply';
          }
        });
        statusBar.update(run.context);
        sidebar.postAnalytics();
        DashboardPanel.current?.postAnalytics();
        void vscode.window.showInformationMessage(
          `CUO: ${run.findings.length} findings, ${run.recommendations.length} recommendations (${run.context.total.provenance}).`
        );
      }
    );
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('cuo.openDashboard', openDashboard),
    vscode.commands.registerCommand('cuo.analyzeWorkspace', () => runAnalyze()),
    vscode.commands.registerCommand('cuo.refreshContext', () => runAnalyze()),
    vscode.commands.registerCommand('cuo.runOptimization', () => runAnalyze()),
    vscode.commands.registerCommand('cuo.importContextReport', async () => {
      const raw = await vscode.window.showInputBox({
        title: 'Import Context Report',
        prompt: 'Paste JSON or key:value lines (e.g. Files: 12k). Values become Imported provenance.',
        ignoreFocusOut: true
      });
      if (raw) {
        await runAnalyze({ importedRaw: raw });
      }
    }),
    vscode.commands.registerCommand('cuo.captureManualContext', async () => {
      const total = await vscode.window.showInputBox({
        title: 'Manual Context Capture',
        prompt: 'Total context tokens (optional). Leave blank to skip total.',
        validateInput: (v) => (v && Number.isNaN(Number(v)) ? 'Enter a number' : undefined)
      });
      const files = await vscode.window.showInputBox({
        title: 'Files category tokens',
        prompt: 'Optional'
      });
      const rules = await vscode.window.showInputBox({
        title: 'Rules category tokens',
        prompt: 'Optional'
      });
      const capture: ManualContextCapture = {
        totalTokens: total ? Number(total) : undefined,
        filesTokens: files ? Number(files) : undefined,
        rulesTokens: rules ? Number(rules) : undefined,
        notes: 'Manual capture from Cursor UI'
      };
      await runAnalyze({ manual: capture });
    }),
    vscode.commands.registerCommand('cuo.applyRecommendation', async () => {
      const run = storage.getLatestRun();
      if (!run?.recommendations.length) {
        void vscode.window.showInformationMessage('No recommendations yet. Run CUO: Analyze Workspace.');
        return;
      }
      const pick = await vscode.window.showQuickPick(
        run.recommendations.map((r) => ({
          label: r.title,
          description: `${r.priority} · ~${r.estimatedSavingsTokens} tok (${r.savingsProvenance})`,
          detail: r.description,
          rec: r
        })),
        { title: 'Apply CUO recommendation' }
      );
      if (!pick) {
        return;
      }
      if (pick.rec.actionKind === 'suggestPrompt' || pick.rec.actionKind === 'summarizeStrategy') {
        const doc = await vscode.workspace.openTextDocument({
          content: pick.rec.proposedContent ?? '',
          language: 'markdown'
        });
        await vscode.window.showTextDocument(doc, { preview: true });
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        `Apply: ${pick.rec.title}?`,
        { modal: true },
        'Apply'
      );
      if (confirm === 'Apply') {
        await engine.applyRecommendation(pick.rec);
        void vscode.window.showInformationMessage('CUO applied change. Use Revert Last if needed.');
        sidebar.postAnalytics();
      }
    }),
    vscode.commands.registerCommand('cuo.revertLastChange', async () => {
      const path = await engine.revertLast();
      void vscode.window.showInformationMessage(
        path ? `Reverted ${path}` : 'No reversible CUO change found.'
      );
      sidebar.postAnalytics();
    }),
    vscode.commands.registerCommand('cuo.showWaste', async () => {
      const run = storage.getLatestRun();
      if (!run?.findings.length) {
        void vscode.window.showInformationMessage('No waste findings yet.');
        return;
      }
      const pick = await vscode.window.showQuickPick(
        run.findings.map((f) => ({
          label: `$(warning) ${f.title}`,
          description: `${f.priority} · ${f.category}`,
          detail: f.description
        }))
      );
      if (pick) {
        openDashboard();
      }
    }),
    vscode.commands.registerCommand('cuo.modelAdvice', async () => {
      const task = await vscode.window.showInputBox({
        title: 'Model Advisor',
        prompt: 'Describe the task (CUO will not switch models automatically).',
        value: 'general coding'
      });
      const advice = engine.getModelAdvice(task ?? 'general coding');
      const pick = await vscode.window.showQuickPick(
        advice.map((a) => ({
          label: a.taskType,
          description: a.recommendedModelFamily,
          detail: a.rationale
        }))
      );
      if (pick) {
        void vscode.window.showInformationMessage(
          `${pick.label}: ${pick.description}. Apply manually in Cursor — no auto-switch API.`
        );
      }
    }),
    vscode.commands.registerCommand('cuo.exportAnalytics', async () => {
      const bundle = analytics.buildBundle();
      const uri = await vscode.window.showSaveDialog({
        filters: { JSON: ['json'] },
        saveLabel: 'Export CUO analytics',
        defaultUri: vscode.Uri.file('cuo-analytics.json')
      });
      if (!uri) {
        return;
      }
      await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(bundle, null, 2), 'utf8'));
      void vscode.window.showInformationMessage(`Exported analytics to ${uri.fsPath}`);
    }),
    vscode.commands.registerCommand('cuo.clearHistory', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Clear local CUO history for this workspace?',
        { modal: true },
        'Clear'
      );
      if (confirm === 'Clear') {
        await storage.clearHistory();
        refreshStatus();
        sidebar.postAnalytics();
      }
    }),
    vscode.commands.registerCommand('cuo.showIntegrations', () => {
      openDashboard();
      void vscode.window.showInformationMessage(
        'CUO Integrations: open the Cross-Agent / Integrations tabs in the dashboard.'
      );
    }),
    vscode.commands.registerCommand('cuo.installClaudeCodeIntegration', async () => {
      const src = vscode.Uri.joinPath(context.extensionUri, 'integrations', 'claude-code');
      const readme = vscode.Uri.joinPath(src, 'README.md');
      try {
        const doc = await vscode.workspace.openTextDocument(readme);
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch {
        void vscode.window.showErrorMessage(
          'Claude Code integration package missing from the VSIX. Reinstall CUO from the packaged artifact.'
        );
        return;
      }
      const terminal = vscode.window.createTerminal({ name: 'CUO Claude Code Install' });
      terminal.show();
      const installPs1 = vscode.Uri.joinPath(src, 'install.ps1').fsPath;
      terminal.sendText(`powershell -ExecutionPolicy Bypass -File "${installPs1}"`);
    })
  );

  refreshStatus();

  if (getSettings().autoAnalyzeOnOpen && vscode.workspace.workspaceFolders?.length) {
    void runAnalyze();
  }
}

export function deactivate(): void {
  // Disposables registered on activate.
}

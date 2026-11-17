import * as vscode from 'vscode';
import { formatTokens } from '../core/tokenEstimator';
import type { ContextSnapshot } from '../shared/types';

export class CuoStatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.item.command = 'cuo.openDashboard';
    this.item.tooltip = 'CUO — Cursor Usage Optimizer';
    this.item.text = 'CUO: —';
    this.item.show();
  }

  setVisible(visible: boolean): void {
    if (visible) {
      this.item.show();
    } else {
      this.item.hide();
    }
  }

  update(snapshot?: ContextSnapshot): void {
    if (!snapshot) {
      this.item.text = 'CUO: —';
      this.item.tooltip = 'CUO: no context snapshot yet';
      return;
    }
    const tokens = formatTokens(snapshot.total.tokens);
    this.item.text = `CUO: ${tokens} (${snapshot.total.provenance})`;
    this.item.tooltip = [
      `Context total: ${tokens}`,
      `Provenance: ${snapshot.total.provenance}`,
      `Source: ${snapshot.total.source}`,
      'Click to open dashboard'
    ].join('\n');
  }

  dispose(): void {
    this.item.dispose();
  }
}

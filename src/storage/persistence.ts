import * as vscode from 'vscode';
import type {
  AppliedChange,
  ContextSnapshot,
  OptimizationRunResult,
  UsageSessionStats
} from '../shared/types';

const KEYS = {
  history: 'cuo.contextHistory',
  latestRun: 'cuo.latestRun',
  usage: 'cuo.usageSession',
  applied: 'cuo.appliedChanges',
  backupsPrefix: 'backups'
} as const;

export class CuoStorage {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getHistory(): ContextSnapshot[] {
    return this.context.workspaceState.get<ContextSnapshot[]>(KEYS.history, []) ?? [];
  }

  async pushHistory(snapshot: ContextSnapshot, limit: number): Promise<void> {
    const next = [snapshot, ...this.getHistory()].slice(0, Math.max(5, limit));
    await this.context.workspaceState.update(KEYS.history, next);
    await this.writeJsonFile(`history/${snapshot.id}.json`, snapshot);
  }

  getLatestRun(): OptimizationRunResult | undefined {
    return this.context.workspaceState.get<OptimizationRunResult>(KEYS.latestRun);
  }

  async saveRun(run: OptimizationRunResult): Promise<void> {
    await this.context.workspaceState.update(KEYS.latestRun, run);
    await this.writeJsonFile(`runs/${run.id}.json`, run);
  }

  getUsage(): UsageSessionStats | undefined {
    return this.context.globalState.get<UsageSessionStats>(KEYS.usage);
  }

  async saveUsage(usage: UsageSessionStats): Promise<void> {
    await this.context.globalState.update(KEYS.usage, usage);
  }

  getAppliedChanges(): AppliedChange[] {
    return this.context.globalState.get<AppliedChange[]>(KEYS.applied, []) ?? [];
  }

  async recordAppliedChange(change: AppliedChange, priorContent: string): Promise<void> {
    const list = [change, ...this.getAppliedChanges()].slice(0, 30);
    await this.context.globalState.update(KEYS.applied, list);
    await this.writeJsonFile(`${KEYS.backupsPrefix}/${change.backupKey}.json`, {
      change,
      priorContent
    });
  }

  async readBackup(backupKey: string): Promise<{ change: AppliedChange; priorContent: string } | undefined> {
    return this.readJsonFile(`${KEYS.backupsPrefix}/${backupKey}.json`);
  }

  async clearHistory(): Promise<void> {
    await this.context.workspaceState.update(KEYS.history, []);
    await this.context.workspaceState.update(KEYS.latestRun, undefined);
  }

  private async ensureDir(relativeDir: string): Promise<vscode.Uri | undefined> {
    const base = this.context.storageUri ?? this.context.globalStorageUri;
    if (!base) {
      return undefined;
    }
    const dir = vscode.Uri.joinPath(base, relativeDir);
    try {
      await vscode.workspace.fs.createDirectory(dir);
    } catch {
      // Directory may already exist.
    }
    return dir;
  }

  private async writeJsonFile(relativePath: string, value: unknown): Promise<void> {
    const parts = relativePath.split('/');
    const file = parts.pop();
    if (!file) {
      return;
    }
    const dir = await this.ensureDir(parts.join('/'));
    if (!dir) {
      return;
    }
    const uri = vscode.Uri.joinPath(dir, file);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(value, null, 2), 'utf8'));
  }

  private async readJsonFile<T>(relativePath: string): Promise<T | undefined> {
    const base = this.context.storageUri ?? this.context.globalStorageUri;
    if (!base) {
      return undefined;
    }
    const uri = vscode.Uri.joinPath(base, relativePath);
    try {
      const data = await vscode.workspace.fs.readFile(uri);
      return JSON.parse(Buffer.from(data).toString('utf8')) as T;
    } catch {
      return undefined;
    }
  }
}

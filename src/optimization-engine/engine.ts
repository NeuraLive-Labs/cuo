import * as vscode from 'vscode';
import { createId } from '../core/ids';
import { readTextFile, writeTextFile } from '../core/fsInventory';
import { getSettings } from '../configuration/settings';
import { CuoStorage } from '../storage/persistence';
import { ContextIntelligence } from '../context/contextIntelligence';
import { ContextOptimizer } from '../context/contextOptimizer';
import { PromptOptimizer } from '../prompts/promptOptimizer';
import { RulesOptimizer } from '../rules/rulesOptimizer';
import { SkillsOptimizer } from '../skills/skillsOptimizer';
import { McpOptimizer } from '../mcp/mcpOptimizer';
import { applyMcpDisable } from '../mcp/mcpConfig';
import { ConversationOptimizer } from '../conversation/conversationOptimizer';
import { WasteDetector } from '../waste-detector/wasteDetector';
import { ModelAdvisor } from '../model-advisor/modelAdvisor';
import { UsageMonitor } from '../usage/usageMonitor';
import { LocalTelemetryStore } from '../core/localTelemetry';
import { projectKeyFromCwd } from '../core/paths';
import type {
  AppliedChange,
  ManualContextCapture,
  OptimizationRunResult,
  Recommendation,
  WasteFinding
} from '../shared/types';

export interface EngineRunOptions {
  importedRaw?: string;
  manual?: ManualContextCapture;
  promptText?: string;
  conversationText?: string;
  taskDescription?: string;
  authorize?: (rec: Recommendation) => Promise<boolean>;
}

export class OptimizationEngine {
  private readonly contextIntel = new ContextIntelligence();
  private readonly contextOpt = new ContextOptimizer();
  private readonly prompts = new PromptOptimizer();
  private readonly rules = new RulesOptimizer();
  private readonly skills = new SkillsOptimizer();
  private readonly mcp = new McpOptimizer();
  private readonly conversation = new ConversationOptimizer();
  private readonly waste = new WasteDetector();
  private readonly models = new ModelAdvisor();
  private readonly usage = new UsageMonitor();
  private readonly telemetry = new LocalTelemetryStore();

  constructor(private readonly storage: CuoStorage) {}

  async run(options: EngineRunOptions = {}): Promise<OptimizationRunResult> {
    const settings = getSettings();
    const notes: string[] = [
      `Mode: ${settings.optimizationMode}`,
      ...this.usage.distinguishLabels()
    ];

    const context = await this.contextIntel.acquire({
      importedRaw: options.importedRaw,
      manual: options.manual
    });
    await this.storage.pushHistory(context, settings.historyLimit);

    const contextOpt = await this.contextOpt.analyze(settings.charsPerToken);
    const rules = await this.rules.analyze(settings.charsPerToken);
    const skills = await this.skills.analyze(settings.charsPerToken);
    const mcp = await this.mcp.analyze(settings.charsPerToken);
    const prompt = this.prompts.analyze(options.promptText ?? '', settings.charsPerToken);
    const conversation = this.conversation.analyze(
      options.conversationText ?? '',
      settings.charsPerToken
    );

    const findings: WasteFinding[] = this.waste.consolidate([
      ...contextOpt.findings,
      ...rules.findings,
      ...skills.findings,
      ...mcp.findings,
      ...conversation.findings
    ]);

    const recommendations = prioritize([
      ...contextOpt.recommendations,
      ...rules.recommendations,
      ...skills.recommendations,
      ...mcp.recommendations,
      ...prompt.recommendations,
      ...conversation.recommendations
    ]);

    const applied: AppliedChange[] = [];

    if (settings.optimizationMode === 'analysis') {
      notes.push('Analysis mode: findings only; recommendations suppressed from apply path.');
    }

    if (
      settings.optimizationMode === 'assisted' ||
      settings.optimizationMode === 'automatic'
    ) {
      for (const rec of recommendations) {
        if (!rec.requiresAuthorization || rec.actionKind === 'none' || rec.actionKind === 'suggestPrompt') {
          continue;
        }
        if (settings.optimizationMode === 'automatic') {
          if (!rec.safeAutoAction || !settings.safeAutoActions.includes(rec.safeAutoAction)) {
            continue;
          }
        } else if (options.authorize) {
          const ok = await options.authorize(rec);
          if (!ok) {
            continue;
          }
        } else {
          continue;
        }

        const change = await this.applyRecommendation(rec);
        if (change) {
          applied.push(change);
        }
      }
    } else if (settings.optimizationMode === 'recommendation') {
      notes.push('Recommendation mode: review items in the dashboard; apply explicitly.');
    }

    const run: OptimizationRunResult = {
      id: createId('run'),
      ranAt: new Date().toISOString(),
      mode: settings.optimizationMode,
      context,
      findings: settings.optimizationMode === 'analysis' ? findings : findings,
      recommendations: settings.optimizationMode === 'analysis' ? [] : recommendations,
      applied,
      notes
    };

    let usage = this.storage.getUsage();
    if (!usage) {
      usage = this.usage.createSession(context.workspaceFolder ?? 'no-workspace');
    }
    usage = this.usage.applyContext(usage, context);
    usage = this.usage.applySavings(usage, run);
    await this.storage.saveUsage(usage);
    await this.storage.saveRun(run);

    const projectKey = projectKeyFromCwd(context.workspaceFolder);
    this.telemetry.upsertSessionSnapshot({
      schemaVersion: 1,
      id: usage.sessionId,
      environment: 'cursor',
      projectKey,
      startedAt: usage.startedAt,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      contextTokens: usage.contextTokens,
      costUsd: usage.estimatedCostUsd,
      durationMs: {
        tokens: null,
        provenance: 'Unavailable',
        source: 'cursor:session',
        confidence: 0,
        notes: 'Cursor extension host does not expose a documented session duration API'
      },
      toolCallCount: 0,
      repetitiveOps: 0,
      recommendations: run.recommendations.slice(0, 5).map((r) => r.title),
      notes: run.notes,
      sourcePaths: ['cuo:optimization-engine']
    });
    this.telemetry.writeOptimization({
      schemaVersion: 1,
      id: run.id,
      at: run.ranAt,
      environment: 'cursor',
      projectKey,
      title: `CUO run (${run.mode})`,
      estimatedSavingsTokens: {
        tokens: run.recommendations.reduce((a, r) => a + r.estimatedSavingsTokens, 0),
        provenance: 'Estimated',
        source: 'cuo:optimization-engine',
        confidence: 0.5
      },
      resultNotes: [
        `${run.findings.length} findings`,
        `${run.recommendations.length} recommendations`,
        `${run.applied.length} applied`
      ]
    });
    this.telemetry.createActivity({
      sessionId: usage.sessionId,
      environment: 'cursor',
      projectKey,
      at: run.ranAt,
      kind: 'optimization',
      summary: `Optimization run ${run.mode}: ${run.findings.length} findings`,
      provenance: 'Estimated'
    });

    // Touch model advisor so results are available to analytics consumers.
    void this.models.advise(options.taskDescription ?? inferTaskFromFindings(findings));

    return run;
  }

  getModelAdvice(taskDescription?: string) {
    return this.models.advise(taskDescription ?? 'general coding');
  }

  async applyRecommendation(rec: Recommendation): Promise<AppliedChange | undefined> {
    if (!rec.targetPath) {
      return undefined;
    }
    const uri = vscode.Uri.file(rec.targetPath);
    let prior = '';
    try {
      prior = await readTextFile(uri);
    } catch {
      prior = '';
    }

    let next = rec.proposedContent ?? prior;
    if (rec.actionKind === 'disableMcp') {
      const name = extractMcpName(rec.proposedContent ?? '');
      if (!name) {
        return undefined;
      }
      next = applyMcpDisable(prior || '{}', name);
    } else if (rec.actionKind === 'appendFile' && rec.proposedContent) {
      next = rec.proposedContent;
    } else if (rec.actionKind === 'editFile' && rec.proposedContent !== undefined) {
      next = rec.proposedContent;
    } else {
      return undefined;
    }

    await writeTextFile(uri, next);
    const change: AppliedChange = {
      id: createId('chg'),
      recommendationId: rec.id,
      path: rec.targetPath,
      appliedAt: new Date().toISOString(),
      backupKey: createId('bak'),
      summary: rec.title
    };
    await this.storage.recordAppliedChange(change, prior);
    return change;
  }

  async revertLast(): Promise<string | undefined> {
    const [last] = this.storage.getAppliedChanges();
    if (!last) {
      return undefined;
    }
    const backup = await this.storage.readBackup(last.backupKey);
    if (!backup) {
      return undefined;
    }
    await writeTextFile(vscode.Uri.file(last.path), backup.priorContent);
    return last.path;
  }
}

function prioritize(recs: Recommendation[]): Recommendation[] {
  const rank = { Critical: 4, High: 3, Medium: 2, Low: 1 } as const;
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  const sorted = [...recs].sort((a, b) => {
    const pr = rank[b.priority] - rank[a.priority];
    if (pr !== 0) {
      return pr;
    }
    return b.estimatedSavingsTokens - a.estimatedSavingsTokens;
  });
  for (const rec of sorted) {
    const key = `${rec.module}:${rec.targetPath ?? ''}:${rec.title}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(rec);
  }
  return out;
}

function extractMcpName(proposed: string): string | undefined {
  try {
    const json = JSON.parse(proposed) as { name?: string };
    return json.name;
  } catch {
    return undefined;
  }
}

function inferTaskFromFindings(findings: WasteFinding[]): string {
  if (findings.some((f) => f.category === 'rules')) {
    return 'refactor rules architecture';
  }
  if (findings.some((f) => f.category === 'mcp_dynamic_tools')) {
    return 'optimize mcp tools';
  }
  return 'general coding context optimization';
}

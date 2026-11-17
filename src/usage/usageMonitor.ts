import { createId } from '../core/ids';
import { getSettings } from '../configuration/settings';
import { importedMetric, realMetric, unavailableMetric } from '../core/tokenEstimator';
import type {
  ContextSnapshot,
  MetricValue,
  OptimizationRunResult,
  UsageSessionStats
} from '../shared/types';

export class UsageMonitor {
  createSession(projectKey: string): UsageSessionStats {
    return {
      sessionId: createId('sess'),
      startedAt: new Date().toISOString(),
      projectKey,
      inputTokens: unavailableMetric(
        'billing-api',
        'Billed input tokens are not available via a public personal Context/Usage extension API.'
      ),
      outputTokens: unavailableMetric(
        'billing-api',
        'Billed output tokens are not available via a public personal extension API.'
      ),
      contextTokens: unavailableMetric('context-api', 'Awaiting local context snapshot.'),
      estimatedCostUsd: unavailableMetric('pricing', 'Configure cuo.tokenPricing* to enable Estimated cost.'),
      savingsTokens: realMetric(0, 'session-init', 1, 'No optimizations applied yet.')
    };
  }

  applyContext(stats: UsageSessionStats, snapshot: ContextSnapshot): UsageSessionStats {
    return {
      ...stats,
      contextTokens: {
        ...snapshot.total,
        notes: [
          snapshot.total.notes,
          'This is context-window pressure (composition), not necessarily billed tokens.'
        ]
          .filter(Boolean)
          .join(' ')
      }
    };
  }

  applyImportedUsage(
    stats: UsageSessionStats,
    input?: number,
    output?: number
  ): UsageSessionStats {
    const settings = getSettings();
    const inputMetric: MetricValue =
      input === undefined
        ? stats.inputTokens
        : importedMetric(input, 'user-imported-usage', 0.7, 'Imported billed/input figure.');
    const outputMetric: MetricValue =
      output === undefined
        ? stats.outputTokens
        : importedMetric(output, 'user-imported-usage', 0.7, 'Imported billed/output figure.');

    let estimatedCostUsd = stats.estimatedCostUsd;
    if (
      inputMetric.tokens !== null &&
      outputMetric.tokens !== null &&
      (settings.tokenPricingUsdPer1kInput > 0 || settings.tokenPricingUsdPer1kOutput > 0)
    ) {
      const cost =
        (inputMetric.tokens / 1000) * settings.tokenPricingUsdPer1kInput +
        (outputMetric.tokens / 1000) * settings.tokenPricingUsdPer1kOutput;
      estimatedCostUsd = {
        tokens: null,
        provenance: 'Estimated',
        source: 'local-pricing-config',
        confidence: 0.4,
        notes: `USD ${cost.toFixed(4)} using user-configured rates (Estimated). Not an invoice.`
      };
      // Encode cost in notes; tokens field stays null for cost metric.
      (estimatedCostUsd as MetricValue & { costUsd?: number }).notes = estimatedCostUsd.notes;
    }

    return {
      ...stats,
      inputTokens: inputMetric,
      outputTokens: outputMetric,
      estimatedCostUsd
    };
  }

  applySavings(stats: UsageSessionStats, run: OptimizationRunResult): UsageSessionStats {
    const appliedSavings = run.applied.reduce((acc, change) => {
      const rec = run.recommendations.find((r) => r.id === change.recommendationId);
      return acc + (rec?.estimatedSavingsTokens ?? 0);
    }, 0);
    const recommended = run.recommendations.reduce((a, r) => a + r.estimatedSavingsTokens, 0);
    return {
      ...stats,
      savingsTokens: {
        tokens: appliedSavings,
        provenance: 'Estimated',
        source: 'optimization-run',
        confidence: 0.5,
        notes: `Applied estimated savings ${appliedSavings}; recommended pool ${recommended}. Estimates ≠ billed savings.`
      }
    };
  }

  distinguishLabels(): string[] {
    return [
      'Context window tokens: composition pressure for the model prompt (CUO focus).',
      'Billed tokens: provider invoice metrics (Unavailable unless Imported).',
      'Cost: derived only from user-configured rates × imported/estimated tokens (Estimated).',
      'Estimates are never shown as Real.'
    ];
  }
}

import type { ModelAdvice } from '../shared/types';

export class ModelAdvisor {
  /**
   * Advisory only — CUO never auto-switches models without a supported API.
   */
  advise(taskDescription: string): ModelAdvice[] {
    const text = taskDescription.toLowerCase();
    const advice: ModelAdvice[] = [];

    if (/(refactor|architecture|design|multi-?file|complex|migrate)/.test(text)) {
      advice.push({
        taskType: 'Complex multi-file reasoning',
        recommendedModelFamily: 'Highest-capability coding model available in Cursor',
        rationale:
          'Architectural refactors and multi-hop reasoning benefit from stronger models; token waste here often comes from weak first passes, not model size alone.',
        whenToAvoid: 'Trivial renames, single-line fixes, or formatting-only edits.',
        estimatedRelativeCost: 'high'
      });
    }

    if (/(typo|rename|format|lint|comment|docstring|css color)/.test(text)) {
      advice.push({
        taskType: 'Mechanical / low-stakes edit',
        recommendedModelFamily: 'Fast / economical model',
        rationale:
          'Shallow edits rarely need frontier reasoning. Prefer a cheaper model and a tight prompt with exact file paths.',
        whenToAvoid: 'Security-sensitive changes or ambiguous product behavior.',
        estimatedRelativeCost: 'low'
      });
    }

    if (/(test|unit test|coverage|vitest|jest)/.test(text)) {
      advice.push({
        taskType: 'Test authoring',
        recommendedModelFamily: 'Mid-tier coding model',
        rationale:
          'Tests need reliable code understanding but often not maximal creativity. Pair with focused file context.',
        whenToAvoid: 'Flaky integration diagnosis spanning many services.',
        estimatedRelativeCost: 'medium'
      });
    }

    if (/(explain|summarize|docs|readme)/.test(text)) {
      advice.push({
        taskType: 'Explanation / documentation',
        recommendedModelFamily: 'Fast / economical model',
        rationale:
          'Documentation tasks are usually bandwidth-bound; keep context to the files being documented.',
        whenToAvoid: 'API design decisions that set long-term contracts.',
        estimatedRelativeCost: 'low'
      });
    }

    if (!advice.length) {
      advice.push({
        taskType: 'General coding',
        recommendedModelFamily: 'Default Cursor coding model for the workspace',
        rationale:
          'Without a clearer task signal, optimize context first (files, rules, MCP surface) before escalating model tier.',
        whenToAvoid: 'Do not escalate model tier to compensate for noisy context.',
        estimatedRelativeCost: 'medium'
      });
    }

    advice.push({
      taskType: 'Policy',
      recommendedModelFamily: 'Manual selection in Cursor UI',
      rationale:
        'CUO does not call undocumented APIs to switch models. Apply the recommendation yourself in Cursor.',
      whenToAvoid: 'Any automation that would require private Cursor internals.',
      estimatedRelativeCost: 'low'
    });

    return advice;
  }
}

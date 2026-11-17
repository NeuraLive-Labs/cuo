import { createId, stableHash } from '../core/ids';
import { estimateTokensFromText } from '../core/tokenEstimator';
import {
  findWorkspaceFiles,
  readTextFiles,
  workspaceRootPath
} from '../core/fsInventory';
import type { Recommendation, WasteFinding } from '../shared/types';

export interface SkillsAnalysis {
  skills: Array<{ relativePath: string; bytes: number; tokens: number; title: string }>;
  findings: WasteFinding[];
  recommendations: Recommendation[];
}

export class SkillsOptimizer {
  async analyze(charsPerToken = 4): Promise<SkillsAnalysis> {
    const root = workspaceRootPath();
    if (!root) {
      return { skills: [], findings: [], recommendations: [] };
    }

    const uris = await findWorkspaceFiles([
      '**/.cursor/skills/**/SKILL.md',
      '**/skills/**/SKILL.md',
      '**/.agents/skills/**/SKILL.md'
    ]);
    const files = await readTextFiles(uris, root);
    const skills = files.map((f) => {
      const text = f.text ?? '';
      return {
        relativePath: f.relativePath,
        bytes: f.bytes,
        tokens: estimateTokensFromText(text, charsPerToken).tokens ?? 0,
        title: extractTitle(text) || f.relativePath
      };
    });

    const findings: WasteFinding[] = [];
    const recommendations: Recommendation[] = [];

    for (const skill of skills) {
      if (skill.tokens > 2500) {
        findings.push({
          id: createId('waste'),
          title: 'Long skill document',
          description: `${skill.title} ≈ ${skill.tokens} tokens (Estimated).`,
          category: 'skills',
          priority: skill.tokens > 5000 ? 'High' : 'Medium',
          impact: 'Large skills loaded into agent context reduce room for code and conversation.',
          evidence: [`${skill.relativePath}: ${skill.bytes} bytes`],
          recommendation:
            'Split reference.md content out of SKILL.md; keep SKILL.md as a short procedure.',
          estimatedSavingsTokens: Math.round(skill.tokens * 0.4),
          savingsProvenance: 'Estimated',
          confidence: 0.6,
          dedupeKey: `skill-size:${skill.relativePath}`
        });
        recommendations.push({
          id: createId('rec'),
          module: 'skills-optimizer',
          title: `Trim skill: ${skill.title}`,
          description:
            'Move lengthy reference material to companion files and keep the skill entrypoint concise. No auto-edit without approval.',
          category: 'skills',
          priority: skill.tokens > 5000 ? 'High' : 'Medium',
          estimatedSavingsTokens: Math.round(skill.tokens * 0.4),
          savingsProvenance: 'Estimated',
          confidence: 0.55,
          evidence: [skill.relativePath],
          actionKind: 'none',
          targetPath: skill.relativePath,
          reversible: false,
          requiresAuthorization: true
        });
      }
    }

    const byTitle = new Map<string, typeof skills>();
    for (const skill of skills) {
      const key = skill.title.toLowerCase();
      const list = byTitle.get(key) ?? [];
      list.push(skill);
      byTitle.set(key, list);
    }
    for (const [title, group] of byTitle) {
      if (group.length < 2) {
        continue;
      }
      findings.push({
        id: createId('waste'),
        title: 'Duplicate skill titles',
        description: `Multiple skills share title "${title}".`,
        category: 'skills',
        priority: 'Medium',
        impact: 'Agents may load redundant procedures for the same workflow.',
        evidence: group.map((g) => g.relativePath),
        recommendation: 'Merge into one canonical skill; remove or rename duplicates.',
        estimatedSavingsTokens: group.slice(1).reduce((a, g) => a + g.tokens, 0),
        savingsProvenance: 'Estimated',
        confidence: 0.65,
        dedupeKey: `skill-title:${stableHash(title)}`
      });
    }

    // Near-duplicate body detection via first 400 normalized chars.
    const fingerprints = new Map<string, string[]>();
    for (const file of files) {
      const fp = stableHash((file.text ?? '').slice(0, 800).toLowerCase().replace(/\s+/g, ' '));
      const list = fingerprints.get(fp) ?? [];
      list.push(file.relativePath);
      fingerprints.set(fp, list);
    }
    for (const [, paths] of fingerprints) {
      if (paths.length < 2) {
        continue;
      }
      findings.push({
        id: createId('waste'),
        title: 'Near-duplicate skill bodies',
        description: 'Skills share nearly identical openings — likely copied.',
        category: 'skills',
        priority: 'High',
        impact: 'Duplicate skill text doubles context cost when both are eligible.',
        evidence: paths,
        recommendation: 'Keep one skill and delete or heavily differentiate the other.',
        estimatedSavingsTokens: 800,
        savingsProvenance: 'Estimated',
        confidence: 0.7,
        dedupeKey: `skill-body:${stableHash(paths.sort().join('|'))}`
      });
    }

    return { skills, findings, recommendations };
  }
}

function extractTitle(text: string): string {
  const m = text.match(/^#\s+(.+)$/m);
  return m?.[1]?.trim() ?? '';
}

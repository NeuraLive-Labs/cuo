import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IntegrationStatus, PonytailObservation } from '../shared/ecosystem';

/**
 * Detects Ponytail without redistributing it (MIT — we only observe install locations).
 * Sources: https://github.com/dietrichgebert/ponytail README / INSTALL.md
 */
export class PonytailAdapter {
  detect(enabled: boolean): IntegrationStatus {
    const home = os.homedir();
    const hints: string[] = [];
    const errors: string[] = [];
    const capabilities = [
      {
        id: 'lazy-coding-skill',
        label: 'Lazy senior-dev skill / AGENTS.md rules',
        available: false
      },
      {
        id: 'review-audit',
        label: '/ponytail-review and /ponytail-audit commands',
        available: false
      },
      {
        id: 'band-metrics',
        label: 'Claude Code band local metrics (~/.config/ponytail/band)',
        available: false
      }
    ];

    const candidates = [
      path.join(home, '.config', 'ponytail'),
      path.join(home, '.claude', 'skills', 'ponytail'),
      path.join(home, '.claude', 'plugins', 'ponytail'),
      path.join(home, '.codex', 'plugins', 'ponytail')
    ];

    let detected = false;
    let version: string | undefined;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        detected = true;
        hints.push(p);
      }
    }

    const bandDir = path.join(home, '.config', 'ponytail', 'band');
    if (fs.existsSync(bandDir)) {
      capabilities[2].available = true;
      hints.push(bandDir);
      detected = true;
    }

    const skillMd = path.join(home, '.claude', 'skills', 'ponytail', 'SKILL.md');
    if (fs.existsSync(skillMd)) {
      capabilities[0].available = true;
      capabilities[1].available = true;
    }

    const configPath = path.join(home, '.config', 'ponytail', 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { version?: string };
        if (cfg.version) {
          version = String(cfg.version);
        }
      } catch (err) {
        errors.push(`Failed to parse ${configPath}: ${String(err)}`);
      }
    }

    const workspaceAgents = findWorkspacePonytailMarker();
    if (workspaceAgents) {
      detected = true;
      capabilities[0].available = true;
      hints.push(workspaceAgents);
    }

    return {
      id: 'ponytail',
      displayName: 'Ponytail',
      availability: !enabled
        ? 'disabled'
        : detected
          ? 'detected'
          : errors.length
            ? 'error'
            : 'missing',
      version,
      enabled,
      pathHints: hints,
      capabilities,
      errors,
      compatibilityNotes: [
        'CUO does not replace Ponytail; it detects installation and may surface band metrics as Imported.',
        'Install only from DietrichGebert/ponytail (GitHub) or @dietrichgebert/ponytail (npm).',
        'Band UI requires Claude Code ≥ 2.1.290; not available in VS Code chat panel.',
        'Token/cost metrics from Ponytail board are read-only local files when present — no public live API assumed.'
      ],
      lastCheckedAt: new Date().toISOString()
    };
  }

  observe(): PonytailObservation {
    const home = os.homedir();
    const bandDir = path.join(home, '.config', 'ponytail', 'band');
    const notes: string[] = [];
    const status = this.detect(true);
    if (status.availability === 'missing') {
      return {
        detected: false,
        notes: ['Ponytail not detected. Optional: install skill/plugin to improve agent thrift.'],
        provenance: 'Unavailable'
      };
    }

    let recentTaskCount: number | undefined;
    let bandMetricsPath: string | undefined;
    let provenance: PonytailObservation['provenance'] = 'Unavailable';

    if (fs.existsSync(bandDir)) {
      bandMetricsPath = bandDir;
      try {
        const files = fs.readdirSync(bandDir).filter((f) => f.endsWith('.json') || f.endsWith('.jsonl'));
        recentTaskCount = files.length;
        provenance = files.length ? 'Imported' : 'Unavailable';
        notes.push(`Found ${files.length} local band artifact(s) under ~/.config/ponytail/band`);
      } catch (err) {
        notes.push(`Band dir unreadable: ${String(err)}`);
      }
    } else {
      notes.push('Ponytail markers found but band metrics directory absent.');
      provenance = 'Unavailable';
    }

    notes.push('CUO coordinates; Ponytail improves how the agent writes code.');
    return {
      detected: true,
      bandMetricsPath,
      recentTaskCount,
      notes,
      provenance
    };
  }
}

function findWorkspacePonytailMarker(): string | undefined {
  const cwd = process.cwd();
  for (const rel of ['AGENTS.md', '.cursor/rules/ponytail.mdc', '.claude/skills/ponytail/SKILL.md']) {
    const full = path.join(cwd, rel);
    if (!fs.existsSync(full)) {
      continue;
    }
    try {
      const text = fs.readFileSync(full, 'utf8').toLowerCase();
      if (text.includes('ponytail') || rel.includes('ponytail')) {
        return full;
      }
    } catch {
      // skip
    }
  }
  return undefined;
}

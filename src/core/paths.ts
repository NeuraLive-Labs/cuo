import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/** Shared local telemetry root (no DB). Cross-tool bridge between Cursor and Claude Code. */
export function cuoHomeDir(): string {
  return path.join(os.homedir(), '.cuo');
}

export function telemetryRoot(): string {
  return path.join(cuoHomeDir(), 'telemetry');
}

export function telemetrySessionsDir(): string {
  return path.join(telemetryRoot(), 'sessions');
}

export function telemetryActivityDir(): string {
  return path.join(telemetryRoot(), 'activity');
}

export function telemetryOptimizationsDir(): string {
  return path.join(telemetryRoot(), 'optimizations');
}

export function ensureTelemetryDirs(): void {
  for (const dir of [
    cuoHomeDir(),
    telemetryRoot(),
    telemetrySessionsDir(),
    telemetryActivityDir(),
    telemetryOptimizationsDir()
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function projectKeyFromCwd(cwd?: string): string {
  if (!cwd) {
    return 'no-workspace';
  }
  return path.basename(path.resolve(cwd)).toLowerCase() || 'no-workspace';
}

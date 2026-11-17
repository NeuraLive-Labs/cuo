import * as fs from 'node:fs';
import * as path from 'node:path';
import { createId } from './ids';
import {
  ensureTelemetryDirs,
  telemetryActivityDir,
  telemetryOptimizationsDir,
  telemetrySessionsDir
} from './paths';
import type {
  TelemetryActivityEvent,
  TelemetryOptimizationRecord,
  TelemetrySessionRecord
} from '../shared/ecosystem';
import type { CrossAgentFilter } from '../shared/ecosystem';

function safeReadJsonl<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const out: T[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      out.push(JSON.parse(trimmed) as T);
    } catch {
      // Skip corrupt lines; The system wont invent metrics.
    }
  }
  return out;
}

function appendJsonl(filePath: string, value: unknown): void {
  ensureTelemetryDirs();
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

function dayStamp(iso = new Date().toISOString()): string {
  return iso.slice(0, 10);
}

export class LocalTelemetryStore {
  writeSession(session: TelemetrySessionRecord): void {
    const file = path.join(telemetrySessionsDir(), `${dayStamp(session.startedAt)}.jsonl`);
    appendJsonl(file, session);
  }

  upsertSessionSnapshot(session: TelemetrySessionRecord): void {
    ensureTelemetryDirs();
    const file = path.join(telemetrySessionsDir(), `live-${session.id}.json`);
    fs.writeFileSync(file, JSON.stringify(session, null, 2), 'utf8');
    this.writeSession(session);
  }

  writeActivity(event: TelemetryActivityEvent): void {
    const file = path.join(telemetryActivityDir(), `${dayStamp(event.at)}.jsonl`);
    appendJsonl(file, event);
  }

  writeOptimization(record: TelemetryOptimizationRecord): void {
    const file = path.join(telemetryOptimizationsDir(), `${dayStamp(record.at)}.jsonl`);
    appendJsonl(file, record);
  }

  listSessions(filter: CrossAgentFilter = {}): TelemetrySessionRecord[] {
    ensureTelemetryDirs();
    const live = this.readLiveSessions();
    const historical = this.readJsonlDir<TelemetrySessionRecord>(telemetrySessionsDir(), (name) =>
      name.endsWith('.jsonl')
    );
    const merged = dedupeSessions([...live, ...historical]);
    return filterSessions(merged, filter);
  }

  listActivity(filter: CrossAgentFilter = {}): TelemetryActivityEvent[] {
    ensureTelemetryDirs();
    const events = this.readJsonlDir<TelemetryActivityEvent>(telemetryActivityDir(), (name) =>
      name.endsWith('.jsonl')
    );
    return filterActivity(events, filter).sort((a, b) => b.at.localeCompare(a.at));
  }

  listOptimizations(filter: CrossAgentFilter = {}): TelemetryOptimizationRecord[] {
    ensureTelemetryDirs();
    const rows = this.readJsonlDir<TelemetryOptimizationRecord>(
      telemetryOptimizationsDir(),
      (name) => name.endsWith('.jsonl')
    );
    return filterOptimizations(rows, filter).sort((a, b) => b.at.localeCompare(a.at));
  }

  createActivity(partial: Omit<TelemetryActivityEvent, 'schemaVersion' | 'id'>): TelemetryActivityEvent {
    const event: TelemetryActivityEvent = {
      schemaVersion: 1,
      id: createId('act'),
      ...partial
    };
    this.writeActivity(event);
    return event;
  }

  private readLiveSessions(): TelemetrySessionRecord[] {
    const dir = telemetrySessionsDir();
    if (!fs.existsSync(dir)) {
      return [];
    }
    const out: TelemetrySessionRecord[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (!name.startsWith('live-') || !name.endsWith('.json')) {
        continue;
      }
      try {
        const raw = fs.readFileSync(path.join(dir, name), 'utf8');
        out.push(JSON.parse(raw) as TelemetrySessionRecord);
      } catch {
        // Ignore unreadable live snapshots.
      }
    }
    return out;
  }

  private readJsonlDir<T>(dir: string, accept: (name: string) => boolean): T[] {
    if (!fs.existsSync(dir)) {
      return [];
    }
    const out: T[] = [];
    for (const name of fs.readdirSync(dir)) {
      if (!accept(name)) {
        continue;
      }
      out.push(...safeReadJsonl<T>(path.join(dir, name)));
    }
    return out;
  }
}

function dedupeSessions(sessions: TelemetrySessionRecord[]): TelemetrySessionRecord[] {
  const byId = new Map<string, TelemetrySessionRecord>();
  for (const s of sessions) {
    const prev = byId.get(s.id);
    if (!prev || (s.startedAt ?? '') >= (prev.startedAt ?? '')) {
      byId.set(s.id, s);
    }
  }
  return [...byId.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function inRange(iso: string, filter: CrossAgentFilter): boolean {
  if (filter.sinceIso && iso < filter.sinceIso) {
    return false;
  }
  if (filter.untilIso && iso > filter.untilIso) {
    return false;
  }
  return true;
}

function filterSessions(
  sessions: TelemetrySessionRecord[],
  filter: CrossAgentFilter
): TelemetrySessionRecord[] {
  return sessions.filter((s) => {
    if (filter.environments?.length && !filter.environments.includes(s.environment)) {
      return false;
    }
    if (filter.projectKey && s.projectKey !== filter.projectKey) {
      return false;
    }
    return inRange(s.startedAt, filter);
  });
}

function filterActivity(
  events: TelemetryActivityEvent[],
  filter: CrossAgentFilter
): TelemetryActivityEvent[] {
  return events.filter((e) => {
    if (filter.environments?.length && !filter.environments.includes(e.environment)) {
      return false;
    }
    if (filter.projectKey && e.projectKey !== filter.projectKey) {
      return false;
    }
    return inRange(e.at, filter);
  });
}

function filterOptimizations(
  rows: TelemetryOptimizationRecord[],
  filter: CrossAgentFilter
): TelemetryOptimizationRecord[] {
  return rows.filter((r) => {
    if (filter.environments?.length && !filter.environments.includes(r.environment)) {
      return false;
    }
    if (filter.projectKey && r.projectKey !== filter.projectKey) {
      return false;
    }
    return inRange(r.at, filter);
  });
}

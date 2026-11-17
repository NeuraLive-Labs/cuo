import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export function cuoHome() {
  return path.join(os.homedir(), '.cuo');
}

export function telemetryRoot() {
  return path.join(cuoHome(), 'telemetry');
}

export function ensureDirs() {
  for (const dir of [
    cuoHome(),
    telemetryRoot(),
    path.join(telemetryRoot(), 'sessions'),
    path.join(telemetryRoot(), 'activity'),
    path.join(telemetryRoot(), 'optimizations'),
    path.join(telemetryRoot(), 'state')
  ]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function projectKey(cwd) {
  if (!cwd) return 'no-workspace';
  return path.basename(path.resolve(cwd)).toLowerCase() || 'no-workspace';
}

export function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

export function parseJsonSafe(text) {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}

export function appendJsonl(filePath, value) {
  ensureDirs();
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, 'utf8');
}

export function writeJson(filePath, value) {
  ensureDirs();
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function dayStamp(iso = new Date().toISOString()) {
  return iso.slice(0, 10);
}

export function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

export function metric(value, provenance, source, notes) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return {
      tokens: null,
      provenance: 'Unavailable',
      source,
      confidence: 0,
      notes: notes || 'Field absent'
    };
  }
  return {
    tokens: value,
    provenance,
    source,
    confidence: provenance === 'Real' ? 0.9 : 0.7,
    notes
  };
}

export function statePath(sessionId) {
  return path.join(telemetryRoot(), 'state', `${sessionId || 'unknown'}.json`);
}

export function loadState(sessionId) {
  return (
    readJson(statePath(sessionId), null) || {
      sessionId,
      toolNames: [],
      toolCallCount: 0,
      repetitiveOps: 0,
      prompts: 0,
      startedAt: new Date().toISOString()
    }
  );
}

export function saveState(state) {
  writeJson(statePath(state.sessionId), state);
}

import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GraphifyAdapter } from '../../src/adapters/graphifyAdapter';

describe('GraphifyAdapter', () => {
  it('does not regenerate when graph.json is missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuo-gf-'));
    const hint = new GraphifyAdapter().queryExisting('test?', dir, { allowCliQuery: false });
    expect(hint.available).toBe(false);
    expect(hint.provenance).toBe('Unavailable');
    expect(hint.error).toMatch(/missing/i);
  });

  it('peeks existing graph.json without CLI rebuild', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cuo-gf-'));
    const out = path.join(dir, 'graphify-out');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, 'graph.json'),
      JSON.stringify({ nodes: [{ id: 1 }], edges: [] }),
      'utf8'
    );
    const adapter = new GraphifyAdapter();
    expect(adapter.findGraphJson(dir)).toContain('graph.json');
    const hint = adapter.queryExisting('what connects A to B?', dir, { allowCliQuery: false });
    expect(hint.available).toBe(true);
    expect(hint.provenance).toBe('Imported');
    expect(hint.resultPreview).toMatch(/nodes=1/);
  });
});

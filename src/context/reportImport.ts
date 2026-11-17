import type { ImportedContextReport, ManualContextCapture } from '../shared/types';

type NumericCaptureKey = Exclude<keyof ManualContextCapture, 'notes'>;

const KEY_MAP: Record<string, NumericCaptureKey> = {
  system_prompt: 'systemPromptTokens',
  systemprompt: 'systemPromptTokens',
  'system prompt': 'systemPromptTokens',
  tool_definitions: 'toolDefinitionsTokens',
  tooldefinitions: 'toolDefinitionsTokens',
  'tool definitions': 'toolDefinitionsTokens',
  rules: 'rulesTokens',
  skills: 'skillsTokens',
  mcp: 'mcpDynamicToolsTokens',
  mcp_dynamic_tools: 'mcpDynamicToolsTokens',
  'mcp & dynamic tools': 'mcpDynamicToolsTokens',
  subagent: 'subagentDefinitionsTokens',
  subagent_definitions: 'subagentDefinitionsTokens',
  'subagent definitions': 'subagentDefinitionsTokens',
  summarized_conversation: 'summarizedConversationTokens',
  'summarized conversation': 'summarizedConversationTokens',
  conversation: 'conversationTokens',
  files: 'filesTokens',
  total: 'totalTokens',
  context: 'totalTokens'
};

export function parseContextReport(raw: string): ImportedContextReport {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { raw, parsed: {}, format: 'unknown' };
  }

  try {
    const json = JSON.parse(trimmed) as Record<string, unknown>;
    const parsed: ManualContextCapture = {};
    for (const [key, value] of Object.entries(json)) {
      const mapped = KEY_MAP[normalizeKey(key)];
      if (mapped && typeof value === 'number' && Number.isFinite(value)) {
        parsed[mapped] = Math.max(0, Math.round(value));
      }
    }
    if (typeof json.notes === 'string') {
      parsed.notes = json.notes;
    }
    return { raw, parsed, format: 'json' };
  } catch {
    // fall through to key/value parser
  }

  const parsed: ManualContextCapture = {};
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([^:=|]+)\s*[:=|]\s*([\d,.]+)\s*(k|m|tokens?)?\s*$/i);
    if (!match) {
      continue;
    }
    const key = normalizeKey(match[1]);
    const mapped = KEY_MAP[key];
    if (!mapped) {
      continue;
    }
    let num = Number(match[2].replace(/,/g, ''));
    const suffix = (match[3] ?? '').toLowerCase();
    if (suffix === 'k') {
      num *= 1000;
    } else if (suffix === 'm') {
      num *= 1_000_000;
    }
    if (Number.isFinite(num)) {
      parsed[mapped] = Math.max(0, Math.round(num));
    }
  }

  return {
    raw,
    parsed,
    format: Object.keys(parsed).length ? 'keyvalue' : 'unknown'
  };
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

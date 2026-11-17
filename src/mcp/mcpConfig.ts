export function applyMcpDisable(content: string, serverName: string): string {
  const json = JSON.parse(content) as {
    mcpServers?: Record<string, Record<string, unknown>>;
    servers?: Array<Record<string, unknown>>;
  };
  if (json.mcpServers?.[serverName]) {
    json.mcpServers[serverName] = { ...json.mcpServers[serverName], disabled: true };
  }
  if (Array.isArray(json.servers)) {
    json.servers = json.servers.map((s) =>
      s.name === serverName ? { ...s, disabled: true } : s
    );
  }
  return `${JSON.stringify(json, null, 2)}\n`;
}

export interface ParsedServer {
  name: string;
  command?: string;
  url?: string;
  disabled?: boolean;
  raw: unknown;
}

export function parseMcpConfig(text: string): ParsedServer[] {
  try {
    const json = JSON.parse(text) as {
      mcpServers?: Record<string, Record<string, unknown>>;
      servers?: Array<Record<string, unknown>>;
    };
    const out: ParsedServer[] = [];
    if (json.mcpServers) {
      for (const [name, cfg] of Object.entries(json.mcpServers)) {
        out.push({
          name,
          command: typeof cfg.command === 'string' ? cfg.command : undefined,
          url: typeof cfg.url === 'string' ? cfg.url : undefined,
          disabled: cfg.disabled === true,
          raw: cfg
        });
      }
    }
    if (Array.isArray(json.servers)) {
      for (const cfg of json.servers) {
        const name = typeof cfg.name === 'string' ? cfg.name : 'unnamed';
        out.push({
          name,
          command: typeof cfg.command === 'string' ? cfg.command : undefined,
          url: typeof cfg.url === 'string' ? cfg.url : undefined,
          disabled: cfg.disabled === true,
          raw: cfg
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

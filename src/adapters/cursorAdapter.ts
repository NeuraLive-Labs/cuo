import type { IntegrationStatus } from '../shared/ecosystem';

/**
 * Cursor / VS Code host adapter. Context Usage composition API remains unavailable.
 */
export class CursorAdapter {
  detect(enabled: boolean, vscodeVersion?: string): IntegrationStatus {
    const inCursor =
      typeof process.env.CURSOR_TRACE_ID === 'string' ||
      process.env.TERM_PROGRAM === 'vscode' ||
      Boolean(vscodeVersion);

    return {
      id: 'cursor',
      displayName: 'Cursor / VS Code',
      availability: !enabled ? 'disabled' : inCursor || vscodeVersion ? 'available' : 'detected',
      version: vscodeVersion,
      enabled,
      pathHints: [],
      capabilities: [
        {
          id: 'extension-host',
          label: 'CUO native extension host',
          available: true
        },
        {
          id: 'context-usage-api',
          label: 'Public Context Usage composition API',
          available: false,
          notes: 'Does not exist — use Estimated / Imported / manual capture'
        },
        {
          id: 'webview-dashboard',
          label: 'Dashboard + sidebar webviews',
          available: true
        }
      ],
      errors: [],
      compatibilityNotes: [
        'Never invent a Cursor Context Usage API.',
        'Real provenance limited to local filesystem/config facts.'
      ],
      lastCheckedAt: new Date().toISOString()
    };
  }
}

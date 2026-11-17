export const workspace = {
  workspaceFolders: undefined as Array<{ uri: { fsPath: string } }> | undefined,
  getConfiguration: () => ({
    get: (_key: string, defaultValue: unknown) => defaultValue
  }),
  findFiles: async () => [],
  fs: {
    readFile: async () => new Uint8Array(),
    writeFile: async () => undefined,
    stat: async () => ({ type: 1, ctime: 0, mtime: 0, size: 0 }),
    createDirectory: async () => undefined
  }
};

export const window = {
  visibleTextEditors: [],
  activeTextEditor: undefined
};

export const Uri = {
  file: (fsPath: string) => ({ fsPath, scheme: 'file' }),
  joinPath: (base: { fsPath: string }, ...parts: string[]) => ({
    fsPath: [base.fsPath, ...parts].join('/'),
    scheme: 'file'
  })
};

export default { workspace, window, Uri };

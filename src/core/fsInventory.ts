import * as vscode from 'vscode';
import * as path from 'node:path';

export interface TextFile {
  uri: vscode.Uri;
  relativePath: string;
  bytes: number;
  text?: string;
}

export async function findWorkspaceFiles(
  patterns: string[],
  exclude = '**/{node_modules,dist,out,.git,coverage}/**',
  maxFiles = 200
): Promise<vscode.Uri[]> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    return [];
  }

  const found: vscode.Uri[] = [];
  for (const pattern of patterns) {
    const matches = await vscode.workspace.findFiles(pattern, exclude, maxFiles);
    for (const uri of matches) {
      if (!found.some((f) => f.fsPath === uri.fsPath)) {
        found.push(uri);
      }
    }
  }
  return found;
}

export async function readTextFile(uri: vscode.Uri, maxBytes = 512_000): Promise<string> {
  const data = await vscode.workspace.fs.readFile(uri);
  const slice = data.byteLength > maxBytes ? data.slice(0, maxBytes) : data;
  return Buffer.from(slice).toString('utf8');
}

export async function readTextFiles(
  uris: vscode.Uri[],
  workspaceRoot?: string,
  maxBytes = 256_000
): Promise<TextFile[]> {
  const results: TextFile[] = [];
  for (const uri of uris) {
    try {
      const data = await vscode.workspace.fs.readFile(uri);
      const bytes = data.byteLength;
      const text = Buffer.from(data.byteLength > maxBytes ? data.slice(0, maxBytes) : data).toString(
        'utf8'
      );
      results.push({
        uri,
        relativePath: workspaceRoot ? path.relative(workspaceRoot, uri.fsPath) : uri.fsPath,
        bytes,
        text
      });
    } catch {
      // Skip unreadable files; inventory remains partial but honest.
    }
  }
  return results;
}

export function workspaceRootPath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export async function writeTextFile(uri: vscode.Uri, content: string): Promise<void> {
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
}

export interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}

let api: VsCodeApi | undefined;

export function getVsCodeApi(): VsCodeApi {
  if (!api) {
    api = window.acquireVsCodeApi?.() ?? {
      postMessage: () => undefined,
      getState: () => undefined,
      setState: () => undefined
    };
  }
  return api;
}

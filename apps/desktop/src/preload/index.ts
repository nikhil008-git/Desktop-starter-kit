import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

import { IPC, type AuthEvent, type AuthState, type Result } from "../shared/contract";

/**
 * Everything the renderer can ask of main, and nothing more.
 *
 * Deliberately not a generic `invoke(channel, ...)`: that would let any script
 * in the renderer call any handler main ever registers.
 */
const api = {
  auth: {
    me: (): Promise<AuthState> => ipcRenderer.invoke(IPC.me),
    signIn: (): Promise<void> => ipcRenderer.invoke(IPC.signIn),
    cancelSignIn: (): Promise<void> => ipcRenderer.invoke(IPC.cancelSignIn),
    submitCode: (code: string): Promise<Result> => ipcRenderer.invoke(IPC.submitCode, code),
    signOut: (): Promise<void> => ipcRenderer.invoke(IPC.signOut),

    /** Returns an unsubscribe, for a `useEffect` cleanup. */
    onChange: (callback: (event: AuthEvent) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, payload: AuthEvent) => callback(payload);
      ipcRenderer.on(IPC.changed, listener);
      return () => ipcRenderer.removeListener(IPC.changed, listener);
    },
  },
};

export type Api = typeof api;

contextBridge.exposeInMainWorld("api", api);

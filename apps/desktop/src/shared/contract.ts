/**
 * The contract between main, preload and renderer.
 *
 * No `electron` or Node imports, so all three bundles can share it. The
 * channel names live here once; a typo in a string repeated on both sides
 * is an `invoke` that hangs forever with no error.
 */
export const IPC = {
  me: "auth:me",
  signIn: "auth:sign-in",
  submitCode: "auth:submit-code",
  cancelSignIn: "auth:cancel-sign-in",
  signOut: "auth:sign-out",
  /** main to renderer: a deep link finished (or failed) signing in. */
  changed: "auth:changed",
} as const;

export type AuthUser = { id: string; email: string; name: string };

/** What the renderer learns from "who am I?". Never the token itself. */
export type AuthState =
  | { status: "signed-in"; user: AuthUser }
  | { status: "signed-out" }
  | { status: "offline"; message: string };

export type AuthEvent =
  | { kind: "signed-in"; user: AuthUser }
  | { kind: "error"; message: string };

/**
 * IPC calls return a result instead of throwing. A throw from `ipcMain.handle`
 * reaches the renderer as "Error invoking remote method 'auth:...': Error: ...",
 * which is not something to put in front of a user.
 */
export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

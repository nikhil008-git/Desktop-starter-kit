import { createHash, randomBytes } from "node:crypto";
import { hostname } from "node:os";

import { shell } from "electron";

import type { AuthState, AuthUser } from "../shared/contract";
import { ApiError, apiFetch } from "./api";
import { WEB_URL } from "./config";
import { clearToken, loadToken, saveToken } from "./token-store";

/**
 * The PKCE verifier for the sign-in in progress.
 *
 * Only its hash (the challenge) goes out in the browser URL. The code that
 * comes back is useless without this value, and this value never leaves the
 * process, so a `starterkit://` link intercepted by another app gets nowhere.
 */
let pendingVerifier: string | null = null;

/** Step 1: open the website's connect page in the user's real browser. */
export async function startSignIn(): Promise<void> {
  pendingVerifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(pendingVerifier).digest("base64url");

  // The system browser, not a BrowserWindow: the user is probably already
  // signed in there, password managers work, and Google refuses OAuth inside
  // embedded webviews altogether.
  await shell.openExternal(`${WEB_URL}/desktop/connect?challenge=${challenge}`);
}

export function cancelSignIn(): void {
  pendingVerifier = null;
}

/** Step 2: the deep link (or a pasted code) arrived. Swap it for a token. */
export async function completeSignIn(code: string): Promise<AuthUser> {
  if (!pendingVerifier) {
    throw new Error("No sign-in in progress. Click Sign in in the app first.");
  }

  const { token } = await apiFetch<{ token: string }>("/api/desktop/token", {
    method: "POST",
    body: JSON.stringify({
      code: code.trim(),
      verifier: pendingVerifier,
      deviceName: hostname().replace(/\.local$/, ""),
    }),
  });
  // Single use on the server too, so clear it whether or not what follows works.
  pendingVerifier = null;

  saveToken(token);
  const state = await currentUser();
  if (state.status !== "signed-in") throw new Error("Signed in, but the server did not recognise the token");
  return state.user;
}

/** Who is signed in. Asked on every launch by the renderer's ProtectedRoute. */
export async function currentUser(): Promise<AuthState> {
  if (!loadToken()) return { status: "signed-out" };
  try {
    const { user } = await apiFetch<{ user: AuthUser }>("/api/me");
    return { status: "signed-in", user };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Revoked from the website's device list, or the user was deleted.
      clearToken();
      return { status: "signed-out" };
    }
    // Server down or no network. Keep the token: this is not a sign-out.
    return { status: "offline", message: "Can't reach the server. Check your connection." };
  }
}

export async function signOut(): Promise<void> {
  // Revoke server-side first, while the token still exists to authenticate
  // the request. Best effort: an offline sign-out still forgets the token.
  await apiFetch("/api/desktop/sign-out", { method: "POST" }).catch(() => {});
  clearToken();
}

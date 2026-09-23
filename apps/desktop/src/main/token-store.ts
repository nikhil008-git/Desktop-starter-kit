import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { app, safeStorage } from "electron";

/**
 * The device token, encrypted at rest.
 *
 * `safeStorage` encrypts with a key held in the OS keychain (Keychain on
 * macOS, DPAPI on Windows, libsecret on Linux), so the file alone is useless
 * if copied off the machine. The token only ever lives in main: the renderer
 * is told who is signed in, never how.
 */
const FILE = () => join(app.getPath("userData"), "device-token.bin");

export function loadToken(): string | null {
  if (!existsSync(FILE())) return null;
  try {
    return safeStorage.decryptString(readFileSync(FILE()));
  } catch {
    // Keychain entry gone or reset: the file can never be read again, so
    // treat it as signed out rather than failing on every launch.
    clearToken();
    return null;
  }
}

export function saveToken(token: string): void {
  if (!safeStorage.isEncryptionAvailable()) {
    // Linux without a keyring. Refusing beats silently writing plaintext.
    throw new Error("No secure storage on this system. Install a keyring (e.g. gnome-keyring)");
  }
  writeFileSync(FILE(), safeStorage.encryptString(token));
}

export function clearToken(): void {
  rmSync(FILE(), { force: true });
}

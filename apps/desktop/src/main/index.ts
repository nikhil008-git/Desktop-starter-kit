import { join } from "node:path";

import { app, BrowserWindow, ipcMain, shell } from "electron";

import { IPC, type AuthEvent, type Result } from "../shared/contract";
import { cancelSignIn, completeSignIn, currentUser, signOut, startSignIn } from "./auth";
import { onDeepLink, registerScheme } from "./deep-link";

let mainWindow: BrowserWindow | null = null;

// A second copy would register for deep links too, and whichever received the
// link would not be the one holding the sign-in verifier.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  registerScheme();

  const links = onDeepLink((url) => {
    // starterkit://auth/callback?code=...
    const code = url.searchParams.get("code");
    if (url.host === "auth" && url.pathname === "/callback" && code) void finishSignIn(code);
  });

  app.on("second-instance", showWindow);

  app.whenReady().then(() => {
    registerIpc();
    createWindow();
    links.ready();

    // macOS: clicking the Dock icon with no windows open should bring one back.
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  // Quitting when the last window closes is the Windows/Linux convention. On
  // macOS apps stay running in the Dock.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 640,
    minHeight: 480,
    show: false,
    // Traffic lights inset into our own UI instead of a grey system title bar.
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      // The renderer is treated like an untrusted website: no Node, no
      // access to the preload's scope. It gets only what preload exposes.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Showing on `ready-to-show` avoids a white flash before React paints.
  mainWindow.on("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => (mainWindow = null));

  // Links with target=_blank open in the real browser, never in a new
  // Electron window that would inherit the preload bridge.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  if (!app.isPackaged) {
    // Renderer console lines in the terminal running `npm run dev`.
    mainWindow.webContents.on("console-message", ({ level, message }) => {
      console.log(`[renderer:${level}] ${message}`);
    });
  }

  // Dev: electron-vite serves the renderer with hot reload.
  // Built: the files are on disk next to this bundle.
  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function showWindow(): void {
  if (!mainWindow) return createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function broadcast(event: AuthEvent): void {
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(IPC.changed, event);
}

async function finishSignIn(code: string): Promise<Result<void>> {
  showWindow();
  try {
    const user = await completeSignIn(code);
    broadcast({ kind: "signed-in", user });
    return { ok: true, value: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign-in failed";
    broadcast({ kind: "error", message });
    return { ok: false, error: message };
  }
}

function registerIpc(): void {
  ipcMain.handle(IPC.me, () => currentUser());
  ipcMain.handle(IPC.signIn, () => startSignIn());
  ipcMain.handle(IPC.cancelSignIn, () => cancelSignIn());
  // The paste-a-code fallback, for when the browser could not open the link.
  ipcMain.handle(IPC.submitCode, (_event, code: string) => finishSignIn(code));
  ipcMain.handle(IPC.signOut, () => signOut());
}

// Ctrl-C in the terminal: quit through Electron so windows close cleanly.
process.on("SIGINT", () => app.quit());
process.on("SIGTERM", () => app.quit());

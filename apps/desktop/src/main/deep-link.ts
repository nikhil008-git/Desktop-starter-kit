import { resolve } from "node:path";

import { app } from "electron";

import { SCHEME } from "./config";

/**
 * `starterkit://` links, and the three different ways the OS delivers one.
 *
 * - App already running, macOS: an `open-url` event.
 * - App already running, Windows/Linux: the OS starts a *second* copy with the
 *   URL in its argv. The single-instance lock makes that copy quit and hands
 *   its argv to this one's `second-instance` event.
 * - App not running: it launches with the URL: `open-url` again on macOS,
 *   `process.argv` elsewhere.
 *
 * Wire only one and sign-in works in whichever state you happened to test.
 */
export function registerScheme(): void {
  if (process.defaultApp) {
    // Unpackaged (`electron .`): the OS has to be told to launch Electron
    // *with this app's folder*, or the link opens the bare Electron window.
    app.setAsDefaultProtocolClient(SCHEME, process.execPath, [resolve(process.argv[1] ?? ".")]);
  } else {
    app.setAsDefaultProtocolClient(SCHEME);
  }
}

/**
 * Calls `handler` for every link, including ones that arrived before the app
 * was ready. `open-url` fires before `whenReady` on a cold launch from a link
 * (the most common case), so those are queued rather than dropped.
 */
export function onDeepLink(handler: (url: URL) => void): { ready: () => void } {
  const queue: string[] = [];
  let isReady = false;

  const deliver = (raw: string) => {
    if (!raw.startsWith(`${SCHEME}://`)) return;
    if (!isReady) return void queue.push(raw);
    try {
      handler(new URL(raw));
    } catch {
      console.warn("Ignoring malformed deep link", raw);
    }
  };

  app.on("open-url", (event, url) => {
    event.preventDefault();
    deliver(url);
  });
  app.on("second-instance", (_event, argv) => {
    const url = argv.find((arg) => arg.startsWith(`${SCHEME}://`));
    if (url) deliver(url);
  });
  const launchUrl = process.argv.find((arg) => arg.startsWith(`${SCHEME}://`));
  if (launchUrl) deliver(launchUrl);

  return {
    ready() {
      isReady = true;
      queue.splice(0).forEach(deliver);
    },
  };
}

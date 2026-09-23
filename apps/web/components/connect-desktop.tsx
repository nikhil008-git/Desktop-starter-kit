"use client";

import { useState } from "react";

import { API_URL } from "@/lib/auth-client";
import type { User } from "@/lib/session";

const SCHEME = process.env.NEXT_PUBLIC_DESKTOP_SCHEME ?? "starterkit";

type State =
  | { step: "ready" }
  | { step: "working" }
  | { step: "sent"; code: string }
  | { step: "error"; message: string };

/**
 * One explicit click before the app is handed a code.
 *
 * Minting the code on page load would let any page that links here sign a
 * visitor's desktop app in without them noticing. The button is the consent.
 */
export function ConnectDesktop({ user, challenge }: { user: User; challenge: string }) {
  const [state, setState] = useState<State>({ step: "ready" });

  async function connect() {
    setState({ step: "working" });
    const res = await fetch(`${API_URL}/api/desktop/code`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challenge }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setState({ step: "error", message: body.error ?? "Could not create a sign-in code" });
    }
    const { code } = (await res.json()) as { code: string };
    setState({ step: "sent", code });

    // Hands the URL to the OS, which opens whichever app registered the scheme.
    window.location.href = `${SCHEME}://auth/callback?code=${encodeURIComponent(code)}`;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 text-center">
      {state.step === "sent" ? (
        <>
          <h1 className="text-2xl font-semibold">Back to the app</h1>
          <p className="text-sm text-neutral-500">
            Your browser should have asked to open the desktop app. If nothing happened, paste this
            code into the app instead:
          </p>
          <code className="rounded-lg bg-neutral-100 p-3 text-xs break-all select-all dark:bg-neutral-900">
            {state.code}
          </code>
          <p className="text-xs text-neutral-500">You can close this tab.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Connect the desktop app</h1>
          <p className="text-sm text-neutral-500">
            Sign the app in as <strong>{user.email}</strong>?
          </p>
          <button
            onClick={connect}
            disabled={state.step === "working"}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {state.step === "working" ? "Connecting..." : "Connect desktop app"}
          </button>
          {state.step === "error" && <p className="text-sm text-red-600">{state.message}</p>}
        </>
      )}
    </main>
  );
}

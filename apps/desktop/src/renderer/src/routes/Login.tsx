import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Step = "welcome" | "waiting";

/**
 * Welcome, then Connecting, then the browser, then back here to /app.
 *
 * The app never sees a password. It opens the website, and the website sends
 * back a one-time code through a `starterkit://` link that main receives.
 */
export function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");

  // Main tells us when the deep link has been handled.
  useEffect(
    () =>
      window.api.auth.onChange((event) => {
        if (event.kind === "signed-in") navigate("/app", { replace: true });
        else setError(event.message);
      }),
    [navigate],
  );

  async function begin() {
    setError(null);
    setStep("waiting");
    await window.api.auth.signIn();
  }

  async function cancel() {
    await window.api.auth.cancelSignIn();
    setStep("welcome");
    setError(null);
    setCode("");
  }

  async function submitCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const result = await window.api.auth.submitCode(code);
    // Success navigates through the `onChange` event above, like a deep link.
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        {step === "welcome" ? (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold">Welcome</h1>
              <p className="text-sm text-neutral-500">
                Connect your account to get started. You'll sign in with your browser.
              </p>
            </div>
            <button
              onClick={begin}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-white dark:bg-white dark:text-neutral-900"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold">Connecting...</h1>
              <p className="text-sm text-neutral-500">
                Finish signing in in your browser. This window will update on its own.
              </p>
            </div>

            <form onSubmit={submitCode} className="flex w-full flex-col gap-2">
              <p className="text-xs text-neutral-500">Browser didn't open the app? Paste the code it shows:</p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste code"
                  className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm select-text dark:border-neutral-700"
                />
                <button
                  disabled={!code.trim()}
                  className="rounded-lg border border-neutral-300 px-3 text-sm disabled:opacity-40 dark:border-neutral-700"
                >
                  Submit
                </button>
              </div>
            </form>

            <div className="flex gap-4 text-sm">
              <button onClick={begin} className="text-neutral-500 hover:underline">
                Open browser again
              </button>
              <button onClick={cancel} className="text-neutral-500 hover:underline">
                Cancel
              </button>
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

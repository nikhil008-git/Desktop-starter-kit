import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import type { AuthState, AuthUser } from "../../../shared/contract";
import { LoadingScreen } from "./LoadingScreen";

const UserContext = createContext<AuthUser | null>(null);

/** The signed-in user, inside a ProtectedRoute. */
export function useUser(): AuthUser {
  const user = useContext(UserContext);
  if (!user) throw new Error("useUser() used outside <ProtectedRoute>");
  return user;
}

/**
 * Renders its children only for a signed-in user.
 *
 * It asks main rather than checking a token itself: the token never reaches
 * the renderer, and the renderer cannot make network requests anyway. Main
 * reads the token from the keychain and calls /api/me with it.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // `cancelled` guards against StrictMode's double effect in dev, and against
    // an answer arriving after the user has already navigated away.
    window.api.auth.me().then((next) => !cancelled && setState(next));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (!state) return <LoadingScreen />;

  if (state.status === "signed-out") return <Navigate to="/login" replace />;

  if (state.status === "offline") {
    // Not a redirect to /login: the user *is* signed in, the server is just
    // unreachable. Sending them to sign in again would not help.
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-neutral-500">{state.message}</p>
        <button
          onClick={() => {
            setState(null);
            setAttempt((n) => n + 1);
          }}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return <UserContext.Provider value={state.user}>{children}</UserContext.Provider>;
}

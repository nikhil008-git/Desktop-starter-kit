import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { LoadingScreen } from "./LoadingScreen";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    async function check() {
      // Main reads the token from the keychain and calls /api/me with it.
      // The renderer cannot do either: it has no Node, and its CSP blocks
      // the network.
      const state = await window.api.auth.me();

      setAuthenticated(state.status === "signed-in");
      setChecking(false);
    }

    check();
  }, []);

  if (checking) return <LoadingScreen />;

  return authenticated ? children : <Navigate to="/login" replace />;
}

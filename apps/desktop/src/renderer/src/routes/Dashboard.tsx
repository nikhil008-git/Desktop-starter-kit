import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { AuthUser } from "../../../shared/contract";

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    window.api.auth.me().then((state) => {
      if (state.status === "signed-in") setUser(state.user);
    });
  }, []);

  async function signOut() {
    await window.api.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">You're in{user ? `, ${user.name}` : ""}!</h1>
        <p className="text-sm text-neutral-500">{user?.email}</p>
      </div>
      <p className="max-w-sm text-sm text-neutral-500">
        This is your desktop app's home. Build from here. Every call to your API goes through{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">window.api</code>.
      </p>
      <button
        onClick={signOut}
        className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
      >
        Sign out
      </button>
    </div>
  );
}

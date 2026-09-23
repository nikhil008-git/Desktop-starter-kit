"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

/** Signs out the browser only. Desktop apps keep their own tokens. */
export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
    >
      Sign out
    </button>
  );
}

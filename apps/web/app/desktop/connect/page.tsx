import { redirect } from "next/navigation";

import { ConnectDesktop } from "@/components/connect-desktop";
import { getUser } from "@/lib/session";

/**
 * Where the desktop app's "Sign in" button lands.
 *
 * Signed out: go and sign in, then come straight back here, with the
 * `challenge` intact, since the code minted below is bound to it.
 */
export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const { challenge } = await searchParams;
  const here = `/desktop/connect${challenge ? `?challenge=${encodeURIComponent(challenge)}` : ""}`;

  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(here)}`);

  if (!challenge) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-6 text-center">
        <h1 className="text-xl font-semibold">Start from the app</h1>
        <p className="text-sm text-neutral-500">
          Open the desktop app and choose Sign in. It will bring you back here.
        </p>
      </main>
    );
  }

  return <ConnectDesktop user={user} challenge={challenge} />;
}

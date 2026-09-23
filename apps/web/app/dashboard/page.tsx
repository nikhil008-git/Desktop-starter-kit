import { redirect } from "next/navigation";

import { DeviceList } from "@/components/device-list";
import { SignOutButton } from "@/components/sign-out-button";
import { getUser } from "@/lib/session";

/** The protected page. Checked on the server, so it never renders signed out. */
export default async function Dashboard() {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/dashboard");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Hi, {user.name}</h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Your devices</h2>
        <p className="text-sm text-neutral-500">
          Desktop apps signed in to this account. Open the app and choose Sign in to add one.
        </p>
        <DeviceList />
      </section>
    </main>
  );
}

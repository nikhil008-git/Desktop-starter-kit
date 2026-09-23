import Link from "next/link";

import { getUser } from "@/lib/session";

export default async function Home() {
  const user = await getUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight">Desktop Starter Kit</h1>
      <p className="text-neutral-500">
        Electron + Next.js + Express + Prisma + Better Auth, in one Turborepo.
      </p>
      <div className="flex gap-3">
        {user ? (
          <Link href="/dashboard" className="rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-neutral-900">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/sign-in" className="rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-white dark:text-neutral-900">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-lg border border-neutral-300 px-4 py-2 dark:border-neutral-700">
              Create account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

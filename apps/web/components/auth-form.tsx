"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

/**
 * Sign in and sign up share one form.
 *
 * `?next=` carries the user back to where they were headed, in particular
 * /desktop/connect, whose `?challenge=` must survive the detour or the
 * desktop app can never redeem the code.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setPending(true);
    setError(null);

    const { error } =
      mode === "sign-up"
        ? await authClient.signUp.email({ email, password, name: String(form.get("name")) })
        : await authClient.signIn.email({ email, password });

    setPending(false);
    if (error) return setError(error.message ?? "Something went wrong");

    // `refresh` as well as `push`: server components cached the signed-out
    // render, and would otherwise show it again.
    router.push(next);
    router.refresh();
  }

  const other = mode === "sign-in" ? "sign-up" : "sign-in";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">{mode === "sign-in" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "sign-up" && <Field name="name" label="Name" type="text" autoComplete="name" />}
        <Field name="email" label="Email" type="email" autoComplete="email" />
        <Field
          name="password"
          label="Password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          minLength={8}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={pending}
          className="mt-2 rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        >
          {pending ? "..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-neutral-500">
        {mode === "sign-in" ? "No account yet? " : "Already have one? "}
        <Link href={`/${other}?next=${encodeURIComponent(next)}`} className="underline">
          {mode === "sign-in" ? "Create one" : "Sign in"}
        </Link>
      </p>
    </main>
  );
}

function Field(props: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const { label, ...input } = props;
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        required
        {...input}
        className="rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700"
      />
    </label>
  );
}

/** Only same-site paths. `?next=https://evil.example` would be an open redirect. */
function safeNext(next: string | null): string {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

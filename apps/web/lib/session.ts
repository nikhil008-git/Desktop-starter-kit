import "server-only";
import { cookies } from "next/headers";

import { API_URL } from "./auth-client";

export type User = { id: string; email: string; name: string };

/**
 * The signed-in user, for a server component, or null.
 *
 * The session cookie was set by the API, but cookies are scoped to a host,
 * not a port, so on localhost this site receives it too. It is forwarded to
 * the API, which is the only thing that can say whether it is valid. In
 * production the same holds for `app.example.com` and `api.example.com` once
 * Better Auth's cookie domain is set to `.example.com`.
 */
export async function getUser(): Promise<User | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;

  const res = await fetch(`${API_URL}/api/me`, {
    headers: { cookie },
    // Per request, never cached: a cached "signed in" outlives a sign-out.
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { user: User };
  return body.user;
}

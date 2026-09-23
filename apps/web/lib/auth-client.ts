import { createAuthClient } from "better-auth/react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Better Auth lives on the API, not on this site, so the client is pointed
// there. `credentials: "include"` makes the browser send and store the
// session cookie on a request to another origin.
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: { credentials: "include" },
});

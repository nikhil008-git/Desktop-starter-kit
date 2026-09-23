import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes, URL-safe. Used for both pairing codes and device tokens. */
export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

/** What the database stores in place of a secret. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * The PKCE check: does this verifier hash to the challenge sent earlier?
 *
 * Base64url of the raw digest, the same encoding the desktop app uses when it
 * makes the challenge. Hex on one side and base64 on the other never match,
 * and every pairing then fails with no hint why.
 */
export function challengeOf(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

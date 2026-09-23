import { Router } from "express";
import { prisma } from "@starter/db";

import { requireUser, sessionOnly } from "../middleware/require-user.js";
import { challengeOf, randomToken, sha256 } from "../lib/tokens.js";

export const desktop = Router();

/** How long a pairing code in a `starterkit://` link can be redeemed. */
const CODE_TTL_MS = 5 * 60 * 1000;

/**
 * Step 1: the website, signed in, asks for a one-time pairing code.
 *
 * `challenge` came from the desktop app through the URL it opened. It is the
 * hash of a secret the app kept, so only that app can redeem this code.
 */
desktop.post("/code", requireUser, sessionOnly, async (req, res) => {
  const challenge = req.body?.challenge;
  if (typeof challenge !== "string" || challenge.length < 32) {
    return res.status(400).json({ error: "Missing challenge. Start from the desktop app" });
  }

  const code = randomToken();
  await prisma.desktopCode.create({
    data: {
      codeHash: sha256(code),
      userId: req.user!.id,
      challenge,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  res.json({ code });
});

/**
 * Step 2: the desktop app swaps the code (plus its verifier) for a token.
 *
 * No auth middleware: the code and verifier together *are* the credential.
 */
desktop.post("/token", async (req, res) => {
  const { code, verifier, deviceName } = req.body ?? {};
  if (typeof code !== "string" || typeof verifier !== "string") {
    return res.status(400).json({ error: "Missing code or verifier" });
  }

  const row = await prisma.desktopCode.findUnique({ where: { codeHash: sha256(code) } });

  // Delete before checking anything else. A code is single-use whether this
  // attempt succeeds or not, so a guessed verifier gets exactly one try.
  if (row) await prisma.desktopCode.delete({ where: { codeHash: row.codeHash } });

  if (!row || row.expiresAt < new Date()) {
    return res.status(400).json({ error: "That sign-in link has expired. Try again from the app." });
  }
  if (challengeOf(verifier) !== row.challenge) {
    return res.status(400).json({ error: "This link was meant for a different app window." });
  }

  const token = randomToken();
  await prisma.deviceToken.create({
    data: {
      userId: row.userId,
      tokenHash: sha256(token),
      name: typeof deviceName === "string" ? deviceName.slice(0, 100) : null,
    },
  });

  // The only time the raw token exists outside the desktop app.
  res.json({ token });
});

/** The desktop app signing itself out. Revokes only this machine's token. */
desktop.post("/sign-out", requireUser, async (req, res) => {
  if (req.authMethod !== "desktop") return res.status(400).json({ error: "Not a desktop token" });
  await prisma.deviceToken.delete({ where: { id: req.deviceId! } });
  res.json({ ok: true });
});

/** The website's "Your devices" list. */
desktop.get("/devices", requireUser, sessionOnly, async (req, res) => {
  const devices = await prisma.deviceToken.findMany({
    where: { userId: req.user!.id },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(devices);
});

/** Revoke one device from the website, for a lost laptop say. */
desktop.delete("/devices/:id", requireUser, sessionOnly, async (req, res) => {
  // `deleteMany` with the userId in the filter, not `delete` by id alone:
  // otherwise anyone signed in could revoke anyone's device by guessing ids.
  const { count } = await prisma.deviceToken.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.id },
  });
  if (count === 0) return res.status(404).json({ error: "No such device" });
  res.json({ ok: true });
});

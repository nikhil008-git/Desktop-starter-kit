import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { prisma } from "@starter/db";

import { auth } from "../auth.js";
import { sha256 } from "../lib/tokens.js";

export type AuthUser = { id: string; email: string; name: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** How this request proved who it is. Some routes only accept one. */
      authMethod?: "session" | "desktop";
      /** Set when `authMethod` is "desktop": the DeviceToken row's id. */
      deviceId?: string;
    }
  }
}

/**
 * One gate for both clients.
 *
 * - The website sends Better Auth's session cookie.
 * - The desktop app sends `Authorization: Bearer <device token>`.
 *
 * A request carries one or the other. Either way the route after this sees the
 * same `req.user`, and does not care which client asked.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Web: Better Auth session cookie.
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (session?.user) {
      req.user = { id: session.user.id, email: session.user.email, name: session.user.name };
      req.authMethod = "session";
      return next();
    }

    // Desktop: Bearer device token.
    const token = bearerToken(req);
    if (token) {
      const device = await prisma.deviceToken.findUnique({
        where: { tokenHash: sha256(token) },
        include: { user: true },
      });
      if (device) {
        req.user = { id: device.user.id, email: device.user.email, name: device.user.name };
        req.authMethod = "desktop";
        req.deviceId = device.id;
        // Fire and forget: "last used" on the devices page is nice to have,
        // and not worth making every request wait on a write.
        void prisma.deviceToken
          .update({ where: { id: device.id }, data: { lastUsedAt: new Date() } })
          .catch(() => {});
        return next();
      }
    }

    return res.status(401).json({ error: "Unauthorized" });
  } catch (error) {
    next(error);
  }
}

/**
 * Only a browser session may pass.
 *
 * Minting a pairing code or revoking other devices is account management. A
 * stolen device token should not be able to create more device tokens.
 */
export function sessionOnly(req: Request, res: Response, next: NextFunction) {
  if (req.authMethod !== "session") {
    return res.status(403).json({ error: "Sign in on the website to do this" });
  }
  next();
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

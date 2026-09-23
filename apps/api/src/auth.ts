import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@starter/db";

import { env } from "./env.js";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  baseURL: env.apiUrl,
  // Better Auth rejects a state-changing request whose Origin it does not
  // trust. The site is on another port, so without this every sign-in from
  // it fails with 403 "Invalid origin".
  trustedOrigins: [env.webUrl],
  emailAndPassword: {
    enabled: true,
  },
});

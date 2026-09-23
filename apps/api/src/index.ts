import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth.js";
import { env } from "./env.js";
import { requireUser } from "./middleware/require-user.js";
import { desktop } from "./routes/desktop.js";

const app = express();

// `credentials: true` so the browser sends the session cookie cross-port;
// that also forbids `origin: "*"`, so the site is named exactly.
// The desktop app is not a browser, so CORS never applies to it.
app.use(cors({ origin: env.webUrl, credentials: true }));

// Better Auth reads the raw request body itself. Mounted *before*
// `express.json()`. The other way round, the body is already consumed and
// every sign-in hangs waiting for it.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

/** Who am I? Works for the website (cookie) and the desktop app (Bearer). */
app.get("/api/me", requireUser, (req, res) => {
  res.json({ user: req.user, via: req.authMethod });
});

app.use("/api/desktop", desktop);

app.listen(env.port, () => {
  console.log(`API on ${env.apiUrl}`);
});

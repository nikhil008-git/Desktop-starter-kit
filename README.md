# Desktop Starter Kit

A starting point for a desktop app with accounts: an Electron app, a Next.js
website and an Express API, all in one Turborepo and sharing one Better Auth
user system.

The desktop app never sees a password. It signs in through the browser, the
same way VS Code, Slack and Figma do, and gets its own revocable token for
the machine it runs on.

## Stack

| Layer    | Tech                                            |
| -------- | ----------------------------------------------- |
| Desktop  | Electron 44, React 19, Vite, React Router       |
| Website  | Next.js 16 (App Router), React 19               |
| API      | Express 5, Better Auth                          |
| Database | Prisma 6, SQLite (Postgres is a one-line swap)  |
| Styling  | Tailwind CSS 4                                  |
| Monorepo | npm workspaces, Turborepo                       |

## Quick start

Requires Node 20 or newer.

```bash
git clone https://github.com/nikhil008-git/Desktop-starter-kit.git
cd Desktop-starter-kit
npm install
npm run dev
```

That starts all three apps:

| App     | Where                   |
| ------- | ----------------------- |
| API     | http://localhost:4000   |
| Website | http://localhost:3000   |
| Desktop | Opens as a window       |

Then create an account on the website and click **Continue** in the desktop
app.

On the first run, `npm install` creates the env files, and `npm run dev`
creates the SQLite database and fetches the Electron binary before starting
anything.

### Environment files

Each app has a `.env.example`. On `npm install`, `scripts/setup-env.mjs`
copies each one to the real env file and fills in a random
`BETTER_AUTH_SECRET`. It never overwrites a file that already exists, so
edit the generated files freely:

| File                  | Holds                                          |
| --------------------- | ---------------------------------------------- |
| `packages/db/.env`    | `DATABASE_URL`                                 |
| `apps/api/.env`       | Port, auth secret, API and website URLs        |
| `apps/web/.env.local` | API URL, desktop URL scheme                    |
| `apps/desktop/.env`   | API and website URLs, read by the main process |

## Project layout

```
apps/
  api/        Express API: Better Auth, the auth middleware, desktop sign-in routes
  web/        Next.js site: sign in, sign up, dashboard, "connect desktop" page
  desktop/    Electron app: main process, preload bridge, React renderer
packages/
  db/         Prisma schema and client. Only apps/api imports it.
```

Two rules keep the apps independent:

- **Only the API touches the database.** The website and the desktop app call
  the API over HTTP. A database URL shipped inside a desktop app can be read
  by anyone who unzips it.
- **The apps share no code.** The HTTP endpoints are the contract between
  them.

## How sign-in works

### Website

Standard Better Auth. Signing in sets a session cookie, and the browser sends
it with every request.

### Desktop app

The desktop app cannot use the website's cookie, since that lives in the
browser. It gets its own token instead, through the browser:

```
 Desktop app                     Browser                        API
 -----------                     -------                        ---
 [Continue]
 makes a secret "verifier",
 opens the browser with only
 its hash, the "challenge"  -->  /desktop/connect?challenge=...
                                 signs in if needed
                                 [Connect desktop app]  ------>  POST /api/desktop/code
                                                                 stores challenge,
                                                        <------  returns one-time code
                                 opens starterkit://auth/callback?code=...
 the OS hands the link
 to the desktop app
 POST /api/desktop/token  ----------------------------------->  checks hash(verifier)
   { code, verifier }                                            matches the challenge,
                                                                 deletes the code
 stores the token in the  <-----------------------------------  returns a device token
 OS keychain                                                     (stores only its hash)
```

Why this shape:

- **The link carries a code, not the token.** Custom-scheme URLs can end up
  in system logs, and another app can register the same scheme. The code is
  worthless without the verifier, which never left the desktop app. This is
  PKCE, the standard fix for exactly this problem.
- **Codes are single use and expire after five minutes.** A failed attempt
  burns the code too, so a guessed verifier gets one try.
- **Only a hash of each token is stored.** A leaked database contains
  nothing that can be sent as a Bearer token.
- **Each machine gets its own token.** The website lists them under "Your
  devices", and signing one out leaves the others and the browser session
  alone.

If the browser cannot open the app (this happens in development), the
connect page shows the code and the desktop app has a box to paste it into.

### The auth middleware

`apps/api/src/middleware/require-user.ts` accepts either credential and puts
the same user on `req.user`:

| Client  | Sends                              | Checked against             | `req.authMethod` |
| ------- | ---------------------------------- | --------------------------- | ---------------- |
| Website | `better-auth.session_token` cookie | Better Auth `session` table | `"session"`      |
| Desktop | `Authorization: Bearer <token>`    | `device_token.tokenHash`    | `"desktop"`      |

Routes do not care which client called them:

```ts
app.get("/api/projects", requireUser, async (req, res) => {
  res.json(await prisma.project.findMany({ where: { userId: req.user!.id } }));
});
```

Account management routes (creating codes, listing and revoking devices) add
`sessionOnly`, so a stolen device token cannot create more device tokens.

## API

| Method   | Path                       | Auth              | Purpose                              |
| -------- | -------------------------- | ----------------- | ------------------------------------ |
| `*`      | `/api/auth/*`              | none              | Better Auth (sign up, sign in, etc.) |
| `GET`    | `/api/me`                  | session or device | The signed-in user                   |
| `POST`   | `/api/desktop/code`        | session           | Create a one-time pairing code       |
| `POST`   | `/api/desktop/token`       | code + verifier   | Exchange a code for a device token   |
| `POST`   | `/api/desktop/sign-out`    | device            | Revoke the calling device's token    |
| `GET`    | `/api/desktop/devices`     | session           | List signed-in devices               |
| `DELETE` | `/api/desktop/devices/:id` | session           | Revoke one device                    |

## The desktop app

An Electron app runs as separate processes:

| Process  | Folder                       | Runs     | Job                                              |
| -------- | ---------------------------- | -------- | ------------------------------------------------ |
| Main     | `apps/desktop/src/main`      | Node.js  | Windows, deep links, the token, every API call   |
| Preload  | `apps/desktop/src/preload`   | Bridge   | Exposes a small, typed `window.api` to React     |
| Renderer | `apps/desktop/src/renderer`  | Chromium | The React UI                                     |

The renderer is treated like an untrusted web page: no Node.js, no access to
the token, and a Content Security Policy of `connect-src 'self'`, so it
cannot reach the network at all. It asks main for everything through
`window.api`.

### Adding a feature

Every call from the UI to the API takes the same three steps:

1. **`src/shared/contract.ts`**: add a channel name to `IPC`.
2. **`src/main/index.ts`**: handle it, calling the API with the stored token.
   ```ts
   ipcMain.handle(IPC.projects, () => apiFetch("/api/projects"));
   ```
3. **`src/preload/index.ts`**: expose it.
   ```ts
   projects: () => ipcRenderer.invoke(IPC.projects),
   ```

React then calls `await window.api.projects()`, fully typed.

### Protected routes

`ProtectedRoute` asks main who is signed in, shows a loading screen while it
waits, then renders the page or redirects to `/login`. Main does the token
part: it reads the token from the keychain and calls `/api/me` with it.

```tsx
const state = await window.api.auth.me();
setAuthenticated(state.status === "signed-in");
```

```tsx
<Route
  path="/app"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

The app uses `HashRouter` because a built Electron app loads from `file://`,
where browser-style paths never match a route.

## Where things live

| Concern                               | File                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| Better Auth config                    | `apps/api/src/auth.ts`                                       |
| Cookie-or-token middleware            | `apps/api/src/middleware/require-user.ts`                    |
| Code and device token routes          | `apps/api/src/routes/desktop.ts`                             |
| Database tables                       | `packages/db/prisma/schema.prisma`                           |
| Sign-in and sign-up form              | `apps/web/components/auth-form.tsx`                          |
| Server-side session check             | `apps/web/lib/session.ts`                                    |
| "Connect desktop app" page            | `apps/web/components/connect-desktop.tsx`                    |
| Deep link handling                    | `apps/desktop/src/main/deep-link.ts`                         |
| PKCE, token exchange, sign-out        | `apps/desktop/src/main/auth.ts`                              |
| Keychain-backed token storage         | `apps/desktop/src/main/token-store.ts`                       |
| Every network call the app makes      | `apps/desktop/src/main/api.ts`                               |
| IPC channel names and types           | `apps/desktop/src/shared/contract.ts`                        |
| What the UI is allowed to call        | `apps/desktop/src/preload/index.ts`                          |
| `ProtectedRoute`                      | `apps/desktop/src/renderer/src/components/ProtectedRoute.tsx` |

## Scripts

| Command                 | What it does                                   |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Sync the database, then start all three apps   |
| `npm run dev:api`       | Start only the API                             |
| `npm run dev:web`       | Start only the website                         |
| `npm run dev:desktop`   | Start only the desktop app                     |
| `npm run build`         | Build the website and the desktop app          |
| `npm run typecheck`     | Typecheck every package                        |
| `npm run db:push`       | Apply the Prisma schema to the database        |
| `npm run db:studio`     | Browse the database in Prisma Studio           |

## Going to production

- **Domains and cookies.** Put the website and the API on subdomains of one
  domain, such as `app.example.com` and `api.example.com`. Then enable
  Better Auth's cross-subdomain cookies so the Next.js server can read the
  session:
  ```ts
  advanced: { crossSubDomainCookies: { enabled: true, domain: ".example.com" } }
  ```
- **Postgres.** Set `provider = "postgresql"` in `schema.prisma` and
  `provider: "postgresql"` in `apps/api/src/auth.ts`, then point `DATABASE_URL` at your
  database.
- **Packaging.** Add `electron-builder` and register the `starterkit` scheme
  under `protocols` in its config. Deep links are most reliable in a packaged
  app.
- **Code signing.** macOS needs an Apple Developer ID and notarization, or
  users see "app is damaged". Windows needs a code-signing certificate.
- **Your own scheme.** Rename `starterkit` in `apps/desktop/src/main/config.ts`
  and `NEXT_PUBLIC_DESKTOP_SCHEME` in the website's env to something unique
  to your app.

## Notes

- npm 11 skips dependency install scripts unless they are listed under
  `allowScripts` in the root `package.json`. Prisma's are listed, because
  without them the first query fails with "Query engine library not found".
- Electron 44 downloads its binary on first launch, but electron-vite checks
  for it earlier and fails with "Electron uninstall". The desktop app's
  `predev` script fetches it first.
- `npm audit` reports advisories in a dependency of the Prisma CLI, which
  only runs during development. The fix npm suggests downgrades Prisma, so
  do not run `npm audit fix --force`.


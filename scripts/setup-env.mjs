// Creates each app's env file from its .env.example, once.
//
// The real env files are gitignored, so a fresh clone has none and the API
// refuses to boot without BETTER_AUTH_SECRET. Running this on `npm install`
// is what lets a clone go straight to `npm run dev`. Existing files are never
// touched, so it is safe to run again.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const files = [
  ["packages/db/.env.example", "packages/db/.env"],
  ["apps/api/.env.example", "apps/api/.env"],
  ["apps/web/.env.example", "apps/web/.env.local"],
  ["apps/desktop/.env.example", "apps/desktop/.env"],
];

for (const [example, target] of files) {
  if (existsSync(target) || !existsSync(example)) continue;
  const contents = readFileSync(example, "utf8").replace(
    "change-me-to-a-long-random-string",
    randomBytes(32).toString("base64"),
  );
  writeFileSync(target, contents);
  console.log(`Created ${target}`);
}

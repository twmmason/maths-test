// Fails the deploy if any private API key from .env / .env.local (or anything
// that looks like a Google API key) ends up in the built dist/ bundle.
//
// Exception: keys in .env.production are deliberately public — they are
// referrer-restricted to rocketmaths.web.app and locked to a single API
// (Map Tiles / Generative Language), so they are safe to ship in the bundle.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error("[check-no-secrets] dist/ not found — run the build first.");
  process.exit(1);
}

function parseEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// Allowed: the referrer-restricted public keys used for production builds.
const allowed = new Set(
  Object.values(parseEnv(join(root, ".env.production"))).filter((v) => v.length >= 12)
);

// Collect private key values from local env files (never committed).
const secrets = [];
for (const envFile of [".env", ".env.local", ".env.production.local"]) {
  const vars = parseEnv(join(root, envFile));
  for (const value of Object.values(vars)) {
    for (const v of value.split(",")) {
      const val = v.trim();
      if (val.length >= 12 && !val.startsWith("your-") && !allowed.has(val)) secrets.push(val);
    }
  }
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const googleKeyPattern = /AIza[0-9A-Za-z_-]{30,}/g;
let failed = false;

for (const file of walk(dist)) {
  if (/\.(png|jpg|jpeg|webp|woff2?|exr|bin|ico|gif)$/i.test(file)) continue;
  const content = readFileSync(file, "utf8");
  for (const secret of secrets) {
    if (content.includes(secret)) {
      console.error(`[check-no-secrets] LEAK: private env value found in ${file}`);
      failed = true;
    }
  }
  for (const m of content.match(googleKeyPattern) ?? []) {
    if (!allowed.has(m)) {
      console.error(`[check-no-secrets] LEAK: unexpected Google-style API key "${m.slice(0, 8)}…" found in ${file}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error("[check-no-secrets] Aborting deploy — secrets present in build output.");
  process.exit(1);
}
console.log("[check-no-secrets] OK — no private API keys found in dist/.");
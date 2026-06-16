#!/usr/bin/env node
// Provision a RoboAI LIBS API bearer token via the passwordless OTP flow and
// write it into .env.local. Run it with: pnpm get-token
//
// Flow: enter your email -> the API emails you a verification link -> click it,
// copy the access token it returns, and paste that token here -> it's saved to
// .env.local. (You can also paste the link itself and let the script verify it.)
//
// Zero dependencies: uses Node's built-in fetch and readline (Node 18+).

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const ENV_FILE = ".env.local";
const DEFAULT_TARGET = "https://libs.roboai.fi";

// The browser talks to the dev server's /api (proxied by Vite), but this script
// runs in Node and needs the real, absolute backend URL. Default to the public
// host; override with ROBOAI_API_URL, or API_PROXY_TARGET — the same var the dev
// proxy reads — to stay aligned with `pnpm dev`.
function resolveApiUrl() {
  if (process.env.ROBOAI_API_URL) return process.env.ROBOAI_API_URL.replace(/\/+$/, "");
  return `${(process.env.API_PROXY_TARGET || DEFAULT_TARGET).replace(/\/+$/, "")}/api`;
}

async function setEnvVars(updates) {
  const lines = existsSync(ENV_FILE) ? (await readFile(ENV_FILE, "utf8")).split("\n") : [];
  for (const [key, value] of Object.entries(updates)) {
    const idx = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  await writeFile(ENV_FILE, `${lines.join("\n").replace(/\n+$/, "")}\n`);
}

// Accept either a full verification link (extract its ?token=...) or, as a
// fallback, a tok_... access token pasted directly.
function parsePasted(pasted) {
  const s = pasted.trim();
  if (s.startsWith("tok_")) return { kind: "access", value: s };
  const m = s.match(/[?&]token=([^&\s]+)/);
  return { kind: "link", value: m ? decodeURIComponent(m[1]) : s };
}

// fetch with a friendly message when the API can't be reached at all (DNS,
// timeout, refused) — otherwise Node prints an unhandled-rejection stack trace.
async function apiFetch(base, path, opts) {
  try {
    return await fetch(`${base}${path}`, opts);
  } catch (err) {
    throw new Error(
      `Could not reach the API at ${base} — check the backend URL (ROBOAI_API_URL / API_PROXY_TARGET) and your network.` +
        (err?.cause?.code ? ` (${err.cause.code})` : ""),
    );
  }
}

async function main() {
  const rl = createInterface({ input, output });
  try {
    const base = resolveApiUrl();
    console.log(`Using API: ${base}\n`);

    const email = (await rl.question("Email for the verification link: ")).trim();
    if (!email) {
      console.error("No email entered.");
      process.exit(1);
    }

    const otpRes = await apiFetch(base, "/v1/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!otpRes.ok) {
      console.error(`\nOTP request failed (HTTP ${otpRes.status}). ${await otpRes.text()}`);
      process.exit(1);
    }

    console.log("\nA verification link was emailed to you. Open the email and click the");
    console.log("link, then copy the access token it returns and paste it here.\n");
    const { kind, value } = parsePasted(await rl.question("Access token: "));

    let token = value;
    if (kind === "link") {
      const verifyRes = await apiFetch(
        base,
        `/v1/auth/otp/verify?token=${encodeURIComponent(value)}`,
      );
      if (!verifyRes.ok) {
        console.error(
          `\nVerify failed (HTTP ${verifyRes.status}) — the link may be expired or already used.`,
        );
        process.exit(1);
      }
      token = (await verifyRes.json()).access_token;
    }
    if (!token) {
      console.error("\nNo access token was returned.");
      process.exit(1);
    }

    // The browser uses the dev proxy (same-origin /api), not the absolute URL.
    await setEnvVars({ VITE_API_BASE: "/api", VITE_API_TOKEN: token });
    console.log(`\n✓ Saved to ${ENV_FILE} (token …${token.slice(-4)}).`);
    console.log("  Start the app with `pnpm dev` (restart it if already running).");
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(`\n${err.message || err}`);
  process.exit(1);
});

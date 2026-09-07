/**
 * Checks which mailboxes the service account may act as.
 *
 * Domain-wide delegation is authorised per Google Workspace tenant. If
 * northlygroup.com is a separate tenant from waveroomtv.com, delegation granted
 * in one does not apply to the other and draft creation will fail.
 *
 * Read-only: lists drafts, creates nothing.
 *
 * Run: node scripts/check-gmail-impersonation.cjs [email ...]
 */
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("=");
    if (eq < 1 || line.startsWith("#")) continue;
    const key = line.slice(0, eq);
    let value = line.slice(eq + 1).trim();
    const q = value[0];
    if ((q === "'" || q === '"') && value[value.length - 1] === q) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

async function check(subject) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/gmail.compose"],
    clientOptions: { subject },
  });

  try {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.drafts.list({ userId: "me", maxResults: 1 });
    const count = res.data.drafts ? res.data.drafts.length : 0;
    console.log(`  OK      ${subject}  (drafts endpoint reachable, ${count} listed)`);
    return true;
  } catch (err) {
    const detail =
      err.response?.data?.error_description ||
      err.response?.data?.error ||
      err.message;
    console.log(`  FAILED  ${subject}`);
    console.log(`          ${String(detail).slice(0, 160)}`);
    return false;
  }
}

async function main() {
  const subjects =
    process.argv.slice(2).length > 0
      ? process.argv.slice(2)
      : [
          process.env.GOOGLE_IMPERSONATE_USER || "info@waveroomtv.com",
          "asad@northlygroup.com",
        ];

  console.log("service account: " + credentials.client_email);
  console.log("checking Gmail impersonation:");
  console.log("");

  const results = [];
  for (const subject of subjects) {
    results.push([subject, await check(subject)]);
  }

  console.log("");
  const ok = results.filter(([, r]) => r).map(([s]) => s);
  const bad = results.filter(([, r]) => !r).map(([s]) => s);
  if (ok.length) console.log("can draft as: " + ok.join(", "));
  if (bad.length) console.log("cannot draft as: " + bad.join(", "));
}

main().catch((e) => {
  console.error("FAILED: " + e.message);
  process.exit(1);
});

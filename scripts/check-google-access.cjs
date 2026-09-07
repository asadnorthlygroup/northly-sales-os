/**
 * Verifies the Google service account can authenticate and see the Drive
 * folders the agreement generator needs.
 *
 * Run: node scripts/check-google-access.cjs
 *
 * Prints only non-secret metadata. Never logs the private key.
 */
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

function loadServiceAccount() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local not found. Copy .env.example and fill it in.");
  }
  const raw = fs.readFileSync(envPath, "utf8");
  const line = raw
    .split(/\r?\n/)
    .find((l) => l.startsWith("GOOGLE_SERVICE_ACCOUNT_KEY="));
  if (!line) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not present in .env.local");

  let value = line.slice("GOOGLE_SERVICE_ACCOUNT_KEY=".length).trim();
  if (!value) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is empty");

  const quote = value[0];
  if ((quote === "'" || quote === '"') && value[value.length - 1] === quote) {
    value = value.slice(1, -1);
  }

  try {
    return JSON.parse(value);
  } catch (err) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Put the whole key file on " +
        "one line wrapped in single quotes. Original error: " + err.message
    );
  }
}

async function main() {
  const creds = loadServiceAccount();
  console.log("service account: " + creds.client_email);
  console.log("project:         " + creds.project_id);
  console.log("");

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents",
    ],
  });

  const client = await auth.getClient();
  await client.getAccessToken();
  console.log("auth:  ok — access token acquired");

  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.list({
    pageSize: 25,
    fields: "files(id,name,mimeType)",
    q: "trashed = false",
  });
  const files = res.data.files || [];
  console.log("drive: ok — " + files.length + " item(s) shared with this account");

  for (const f of files) {
    const kind = f.mimeType.startsWith("application/vnd.google-apps.")
      ? f.mimeType.replace("application/vnd.google-apps.", "")
      : f.mimeType;
    console.log("   - " + f.name + "  [" + kind + "]");
  }

  if (files.length === 0) {
    console.log("");
    console.log("Nothing is shared with the service account yet.");
    console.log("Share the Sales Materials folder in Drive with:");
    console.log("   " + creds.client_email + "   (Editor)");
  }
}

main().catch((err) => {
  console.error("FAILED: " + err.message);
  process.exit(1);
});

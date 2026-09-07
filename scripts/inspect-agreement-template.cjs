/**
 * Dumps the structure of the IO / agreement Google Doc template.
 *
 * The agreement is built almost entirely from tables, so the generator fills
 * cells rather than doing string replacement. This prints each table's shape
 * and the text already in it, which is how we decide what to parameterise.
 *
 * Run: node scripts/inspect-agreement-template.cjs [documentId]
 */
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const DEFAULT_DOC_ID = "1XmbFXYNsbGDYNKyNT3AVeNJkJ9sXhhAISWuSVLgs5YQ";

function loadServiceAccount() {
  const raw = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
  const line = raw
    .split(/\r?\n/)
    .find((l) => l.startsWith("GOOGLE_SERVICE_ACCOUNT_KEY="));
  let value = line.slice("GOOGLE_SERVICE_ACCOUNT_KEY=".length).trim();
  const quote = value[0];
  if ((quote === "'" || quote === '"') && value[value.length - 1] === quote) {
    value = value.slice(1, -1);
  }
  return JSON.parse(value);
}

/** Flattens a Docs structural element down to its plain text. */
function textOf(element) {
  if (!element) return "";
  if (element.paragraph) {
    return (element.paragraph.elements || [])
      .map((e) => (e.textRun ? e.textRun.content : ""))
      .join("");
  }
  return "";
}

function cellText(cell) {
  return (cell.content || [])
    .map(textOf)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const documentId = process.argv[2] || DEFAULT_DOC_ID;
  const auth = new google.auth.GoogleAuth({
    credentials: loadServiceAccount(),
    scopes: ["https://www.googleapis.com/auth/documents.readonly"],
  });
  const docs = google.docs({ version: "v1", auth });

  const { data: doc } = await docs.documents.get({ documentId });
  console.log("title: " + doc.title);
  console.log("documentId: " + documentId);
  console.log("");

  const body = doc.body.content || [];
  let tableIndex = 0;

  for (const element of body) {
    if (element.paragraph) {
      const t = textOf(element).trim();
      if (t) console.log("PARA: " + t.slice(0, 110));
      continue;
    }
    if (!element.table) continue;

    tableIndex += 1;
    const rows = element.table.tableRows || [];
    const cols = rows[0] ? (rows[0].tableCells || []).length : 0;
    console.log("");
    console.log(
      `TABLE ${tableIndex} — ${rows.length} rows x ${cols} cols  (startIndex ${element.startIndex})`
    );
    rows.forEach((row, r) => {
      const cells = (row.tableCells || []).map(cellText);
      const preview = cells.map((c) => (c.length > 34 ? c.slice(0, 31) + "..." : c));
      console.log(`   r${r}: ` + JSON.stringify(preview));
    });
  }

  console.log("");
  console.log(`total tables: ${tableIndex}`);
}

main().catch((err) => {
  console.error("FAILED: " + (err.errors ? JSON.stringify(err.errors) : err.message));
  process.exit(1);
});

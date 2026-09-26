import fs from "node:fs";
import path from "node:path";
import { qbVerifyConnection } from "@/lib/quickbooks";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const eq = line.indexOf("="); if (eq < 1 || line.startsWith("#")) continue;
    const k = line.slice(0, eq); let v = line.slice(eq + 1).trim();
    const q = v[0]; if ((q === "'" || q === '"') && v[v.length - 1] === q) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnvLocal();

const maybe = process.env.RUN_QBO_TESTS ? describe : describe.skip;

maybe("quickbooks connectivity", () => {
  jest.setTimeout(60_000);
  it("reports whether the stored token still works", async () => {
    const status = await qbVerifyConnection();
    console.log("QBO_STATUS=" + JSON.stringify(status));
    expect(status).toBeDefined();
  });
});

import {
  buildMimeMessage,
  encodeHeader,
  makeBoundary,
  toBase64Url,
  type DraftMessage,
} from "@/lib/gmail-draft";

const message = (overrides: Partial<DraftMessage> = {}): DraftMessage => ({
  to: "carter@snowbank.capital",
  from: "asif@northlygroup.com",
  subject: "Invoice + Agreement — Oakberry / Intro Campaign",
  body: "Hey Carter,\n\nAs promised, I've attached the agreement and invoice.",
  attachments: [
    { filename: "Agreement - Oakberry.pdf", content: Buffer.from("agreement-bytes") },
    { filename: "Invoice 1820.pdf", content: Buffer.from("invoice-bytes") },
  ],
  ...overrides,
});

describe("encodeHeader", () => {
  it("leaves plain ASCII alone", () => {
    expect(encodeHeader("Invoice 1820")).toBe("Invoice 1820");
  });

  it("encodes non-ASCII so an em dash does not corrupt the subject", () => {
    const encoded = encodeHeader("Invoice — Oakberry");
    expect(encoded).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
    const payload = encoded.slice("=?UTF-8?B?".length, -2);
    expect(Buffer.from(payload, "base64").toString("utf8")).toBe("Invoice — Oakberry");
  });
});

describe("buildMimeMessage", () => {
  it("sets the envelope headers", () => {
    const raw = buildMimeMessage(message(), "BOUNDARY");
    expect(raw).toContain("To: carter@snowbank.capital");
    expect(raw).toContain("From: asif@northlygroup.com");
    expect(raw).toContain('Content-Type: multipart/mixed; boundary="BOUNDARY"');
  });

  it("uses CRLF line endings as MIME requires", () => {
    const raw = buildMimeMessage(message(), "BOUNDARY");
    expect(raw).toContain("\r\n");
    expect(raw.split("\r\n").length).toBeGreaterThan(10);
  });

  it("includes the body as the first part", () => {
    const raw = buildMimeMessage(message(), "BOUNDARY");
    const bodyPart = raw.indexOf("Hey Carter,");
    const firstAttachment = raw.indexOf("Agreement - Oakberry.pdf");
    expect(bodyPart).toBeGreaterThan(-1);
    expect(bodyPart).toBeLessThan(firstAttachment);
  });

  it("attaches both PDFs with filenames", () => {
    const raw = buildMimeMessage(message(), "BOUNDARY");
    expect(raw).toContain('filename="Agreement - Oakberry.pdf"');
    expect(raw).toContain('filename="Invoice 1820.pdf"');
    expect((raw.match(/Content-Disposition: attachment/g) ?? []).length).toBe(2);
  });

  it("base64 encodes attachment bytes", () => {
    const raw = buildMimeMessage(message(), "BOUNDARY");
    expect(raw).toContain(Buffer.from("agreement-bytes").toString("base64"));
  });

  it("wraps long base64 so no line exceeds the MIME limit", () => {
    const big = Buffer.alloc(5000, 0x41);
    const raw = buildMimeMessage(
      message({ attachments: [{ filename: "big.pdf", content: big }] }),
      "BOUNDARY"
    );
    for (const line of raw.split("\r\n")) {
      expect(line.length).toBeLessThanOrEqual(998);
    }
  });

  it("terminates with the closing boundary", () => {
    const raw = buildMimeMessage(message(), "BOUNDARY");
    expect(raw.trimEnd().endsWith("--BOUNDARY--")).toBe(true);
  });

  it("handles a message with no attachments", () => {
    const raw = buildMimeMessage(message({ attachments: [] }), "BOUNDARY");
    expect(raw).toContain("Hey Carter,");
    expect(raw).not.toContain("Content-Disposition: attachment");
  });
});

describe("makeBoundary", () => {
  it("is stable for a given seed and distinct across seeds", () => {
    expect(makeBoundary("abc")).toBe(makeBoundary("abc"));
    expect(makeBoundary("abc")).not.toBe(makeBoundary("def"));
  });
});

describe("toBase64Url", () => {
  it("uses the URL-safe alphabet without padding", () => {
    const encoded = toBase64Url("hello>world??~");
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });

  it("round-trips back to the original message", () => {
    const raw = buildMimeMessage(message(), "BOUNDARY");
    const decoded = Buffer.from(
      toBase64Url(raw).replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");
    expect(decoded).toBe(raw);
  });
});

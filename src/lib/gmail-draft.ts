/**
 * Northly Group — Gmail draft creation.
 *
 * Creates a draft in the AE's own mailbox with both PDFs attached. It never
 * sends: the AE reads the draft and presses send, so a person stays on the
 * last step before anything reaches a client.
 *
 * Requires domain-wide delegation with the gmail.compose scope, which grants
 * draft creation only — it cannot send on its own.
 */

import { google } from "googleapis";
import { loadServiceAccountCredentials, GOOGLE_SCOPES } from "./google-auth";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  mimeType?: string;
}

export interface DraftMessage {
  to: string;
  from: string;
  subject: string;
  body: string;
  attachments: MailAttachment[];
}

/** RFC 2047 encoding, so accented names and dashes survive the subject line. */
export function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

/** A boundary that cannot collide with the encoded content around it. */
export function makeBoundary(seed = Date.now().toString(36)): string {
  return `----northly_${seed}`;
}

/**
 * Assembles a multipart/mixed MIME message.
 * Pure, so the structure can be asserted without calling Gmail.
 */
export function buildMimeMessage(message: DraftMessage, boundary = makeBoundary()): string {
  const lines: string[] = [
    `To: ${message.to}`,
    `From: ${message.from}`,
    `Subject: ${encodeHeader(message.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    message.body,
  ];

  for (const attachment of message.attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType ?? "application/pdf"}; name="${attachment.filename}"`,
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      // Gmail rejects unwrapped base64 beyond 998 characters per line.
      attachment.content.toString("base64").replace(/(.{76})/g, "$1\r\n")
    );
  }

  lines.push(`--${boundary}--`, "");
  return lines.join("\r\n");
}

/** Gmail wants the message base64url encoded, without padding. */
export function toBase64Url(raw: string): string {
  return Buffer.from(raw, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Creates the draft in the AE's mailbox, impersonating them so it appears in
 * their own Drafts folder and sends from their address.
 */
export async function createGmailDraft(
  message: DraftMessage
): Promise<{ draftId: string; webLink: string }> {
  const auth = new google.auth.GoogleAuth({
    credentials: loadServiceAccountCredentials(),
    scopes: GOOGLE_SCOPES,
    clientOptions: { subject: message.from },
  });

  const gmail = google.gmail({ version: "v1", auth: auth as never });
  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: toBase64Url(buildMimeMessage(message)) } },
  });

  const draftId = res.data.id!;
  return {
    draftId,
    webLink: `https://mail.google.com/mail/u/0/#drafts?compose=${draftId}`,
  };
}

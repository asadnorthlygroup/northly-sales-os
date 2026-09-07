/**
 * Northly Group — Google service account auth.
 *
 * One service account drives the agreement generator. It needs Docs and Drive
 * scopes, and access to whatever folder the IO template lives in.
 *
 * The key is read from GOOGLE_SERVICE_ACCOUNT_KEY as a single-line JSON string.
 * Never log its value.
 */

import { google } from "googleapis";
import type { GoogleAuth } from "google-auth-library";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.compose",
];

/**
 * A service account has no Drive storage of its own, so a file it creates in
 * a personal My Drive folder fails with a quota error. It must act as a real
 * user in the domain, which requires domain-wide delegation.
 *
 * Set GOOGLE_IMPERSONATE_USER to the account that should own generated
 * agreements, e.g. info@waveroomtv.com.
 */
export function impersonatedUser(): string {
  const user = process.env.GOOGLE_IMPERSONATE_USER?.trim();
  if (!user) {
    throw new Error(
      "GOOGLE_IMPERSONATE_USER is not set. A service account cannot own Drive " +
        "files, so it must impersonate a real user in the domain. Enable " +
        "domain-wide delegation for the service account, then set this to the " +
        "account that should own generated agreements."
    );
  }
  return user;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}

/**
 * Parses the service account key from the environment.
 * Throws a message an operator can act on, never one containing key material.
 */
export function loadServiceAccountCredentials(
  raw: string | undefined = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
): ServiceAccountCredentials {
  if (!raw || raw.trim() === "") {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not set. Add the service account JSON to " +
        ".env.local on one line, wrapped in single quotes."
    );
  }

  let value = raw.trim();
  const quote = value[0];
  if ((quote === "'" || quote === '"') && value[value.length - 1] === quote) {
    value = value.slice(1, -1);
  }

  let parsed: Partial<ServiceAccountCredentials>;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. It must be the whole key " +
        "file on one line, wrapped in single quotes, with the \\n sequences in " +
        "private_key left as they are."
    );
  }

  if (!parsed.client_email || !parsed.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY parsed but is missing client_email or private_key. " +
        "Re-download the JSON key from Google Cloud."
    );
  }

  return parsed as ServiceAccountCredentials;
}

let cached: GoogleAuth | null = null;

/**
 * Returns a shared auth client for the service account, impersonating the
 * configured user so created files are owned by the domain rather than by the
 * service account, which has no storage.
 */
export function googleAuth(): GoogleAuth {
  if (!cached) {
    const credentials = loadServiceAccountCredentials();
    cached = new google.auth.GoogleAuth({
      credentials,
      scopes: GOOGLE_SCOPES,
      clientOptions: { subject: impersonatedUser() },
    }) as unknown as GoogleAuth;
  }
  return cached;
}

/** Clears the cached client. Used by diagnostics that change env at runtime. */
export function resetGoogleAuth(): void {
  cached = null;
}

export function docsClient() {
  return google.docs({ version: "v1", auth: googleAuth() as never });
}

export function driveClient() {
  return google.drive({ version: "v3", auth: googleAuth() as never });
}

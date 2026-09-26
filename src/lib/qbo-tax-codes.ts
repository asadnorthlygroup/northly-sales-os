/**
 * Northly Group — QuickBooks tax code resolution.
 *
 * Canadian QuickBooks rejects an invoice whose lines do not reference a real
 * TaxCode from that company file:
 *
 *   Business Validation Error: Make sure all your transactions have a
 *   GST/HST rate before you save.   (code 6000)
 *
 * TaxCode ids differ per company, so they are looked up by name at runtime
 * rather than hardcoded. When a province's code is missing the error names
 * exactly what to create in QuickBooks.
 */

import { qbFetch } from "./quickbooks";
import type { Province } from "./invoice-pricing";

export interface QboTaxCode {
  id: string;
  name: string;
  active: boolean;
}

/**
 * Names a company file might use for each province, most specific first.
 * Matching is case-insensitive and ignores spaces, slashes and dashes, so
 * "GST/HST BC", "GST-HST-BC" and "gst hst bc" all match.
 */
export const PROVINCE_TAX_CODE_NAMES: Record<Province, string[]> = {
  AB: ["GST AB", "GST", "GST only"],
  BC: ["GST/PST BC", "GST PST BC", "PST BC", "GST BC", "GST/HST BC"],
  MB: ["GST/RST MB", "GST RST MB", "RST MB", "GST MB", "GST/PST MB"],
  NB: ["HST NB"],
  NL: ["HST NL"],
  NS: ["HST NS"],
  NT: ["GST NT", "GST", "GST only"],
  NU: ["GST NU", "GST", "GST only"],
  ON: ["HST ON"],
  PE: ["HST PE"],
  QC: ["GST QC", "GST", "GST only"],
  SK: ["GST/PST SK", "GST PST SK", "PST SK", "GST SK"],
  YT: ["GST YT", "GST", "GST only"],
};

export const ZERO_RATED_NAMES = ["Zero-rated", "Zero rated", "GST/HST ZR", "ZR"];

/** Normalises a tax code name so punctuation and spacing do not matter. */
export function normaliseName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Finds the first candidate name present among the company's codes. */
export function matchTaxCode(
  candidates: readonly string[],
  codes: readonly QboTaxCode[]
): QboTaxCode | undefined {
  const active = codes.filter((c) => c.active);
  for (const candidate of candidates) {
    const target = normaliseName(candidate);
    const hit = active.find((c) => normaliseName(c.name) === target);
    if (hit) return hit;
  }
  return undefined;
}

export class MissingTaxCodeError extends Error {
  constructor(what: string, tried: readonly string[], available: readonly QboTaxCode[]) {
    super(
      `QuickBooks has no tax code for ${what}. Looked for: ${tried.join(", ")}. ` +
        `The company file has: ${available.filter((c) => c.active).map((c) => c.name).join(", ") || "none"}. ` +
        `Create the missing sales tax rate in QuickBooks, then try again.`
    );
    this.name = "MissingTaxCodeError";
  }
}

export function taxCodeForProvince(
  province: Province,
  codes: readonly QboTaxCode[]
): QboTaxCode {
  const candidates = PROVINCE_TAX_CODE_NAMES[province];
  const hit = matchTaxCode(candidates, codes);
  if (!hit) throw new MissingTaxCodeError(province, candidates, codes);
  return hit;
}

export function zeroRatedTaxCode(codes: readonly QboTaxCode[]): QboTaxCode {
  const hit = matchTaxCode(ZERO_RATED_NAMES, codes);
  if (!hit) throw new MissingTaxCodeError("zero-rated lines", ZERO_RATED_NAMES, codes);
  return hit;
}

let cache: QboTaxCode[] | null = null;

/** Reads the company's tax codes. Cached for the life of the process. */
export async function fetchTaxCodes(force = false): Promise<QboTaxCode[]> {
  if (cache && !force) return cache;

  const res = await qbFetch(
    `/query?query=${encodeURIComponent("SELECT * FROM TaxCode MAXRESULTS 200")}&minorversion=70`
  );
  if (!res.ok) {
    throw new Error(`Could not read QuickBooks tax codes: ${await res.text()}`);
  }

  const raw = (await res.json())?.QueryResponse?.TaxCode ?? [];
  cache = raw.map((c: { Id: string; Name: string; Active?: boolean }) => ({
    id: String(c.Id),
    name: String(c.Name),
    active: c.Active !== false,
  }));
  return cache!;
}

export function resetTaxCodeCache(): void {
  cache = null;
}

/**
 * Whether the company file lets the caller set its own invoice numbers.
 *
 * With custom transaction numbers ON, QuickBooks does not assign a DocNumber,
 * so there is no invoice number for the agreement to carry. The whole flow
 * depends on QuickBooks minting it, so this is checked before anything is
 * created rather than discovered afterwards.
 */
let numberingCache: boolean | null = null;

export async function customTxnNumbersEnabled(force = false): Promise<boolean> {
  if (numberingCache !== null && !force) return numberingCache;
  const res = await qbFetch("/preferences?minorversion=70");
  if (!res.ok) {
    throw new Error(`Could not read QuickBooks preferences: ${await res.text()}`);
  }
  const prefs = (await res.json())?.Preferences;
  numberingCache = prefs?.SalesFormsPrefs?.CustomTxnNumbers === true;
  return numberingCache;
}

export class CustomNumberingError extends Error {
  constructor() {
    super(
      "QuickBooks is set to custom transaction numbers, so it will not assign an " +
        "invoice number. The agreement has to print the number QuickBooks mints, so " +
        "nothing was created. In QuickBooks go to Settings, Account and settings, " +
        "Sales, Sales form content, and turn off Custom transaction numbers."
    );
    this.name = "CustomNumberingError";
  }
}

/** Throws unless QuickBooks will assign invoice numbers itself. */
export async function assertAutoNumbering(): Promise<void> {
  if (await customTxnNumbersEnabled()) throw new CustomNumberingError();
}

export function resetNumberingCache(): void {
  numberingCache = null;
}

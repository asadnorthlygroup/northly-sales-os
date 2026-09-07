/**
 * Northly Group — Agreement document generator.
 *
 * Copies the IO template, fills its tables from a priced deal, removes the
 * sections the deal does not use, and exports a PDF.
 *
 * Index discipline. Every edit shifts the indices of everything after it, so
 * edits run in two passes and each pass applies in descending index order:
 *
 *   pass 1  structural — delete unused tables and surplus item rows
 *   (re-fetch the document, because every index has moved)
 *   pass 2  text — clear and fill cells
 *
 * Doing it in one pass, or in ascending order, silently corrupts the document.
 */

import type { docs_v1 } from "googleapis";
import { docsClient, driveClient } from "./google-auth";
import {
  customerRows,
  orderDetailsRow,
  serviceRows,
  summaryRows,
  surplusItemRowCount,
  type AgreementInput,
} from "./agreement-rows";

/** Zero-based table positions in the IO template. */
export const TEMPLATE_TABLES = {
  customer: 0,
  orderDetails: 1,
  services: 2,
  storyServices: 3,
  billingSchedule: 4,
  terms: 5,
  signatures: 6,
} as const;

/** Row index of the first line item in the Services table. Row 0 is headers. */
const FIRST_ITEM_ROW = 1;

export interface GenerateOptions {
  templateDocumentId: string;
  /** Drive folder the generated agreement is created in. */
  targetFolderId?: string;
  documentName: string;
  /** Story Services and Billing Schedule are removed unless asked for. */
  includeStoryServices?: boolean;
  includeBillingSchedule?: boolean;
}

export interface GeneratedAgreement {
  documentId: string;
  webViewLink: string;
}

interface TableRef {
  index: number;
  startIndex: number;
  endIndex: number;
  table: docs_v1.Schema$Table;
}

/** Collects every top-level table with its document range, in order. */
export function findTables(doc: docs_v1.Schema$Document): TableRef[] {
  const out: TableRef[] = [];
  for (const element of doc.body?.content ?? []) {
    if (!element.table) continue;
    out.push({
      index: out.length,
      startIndex: element.startIndex!,
      endIndex: element.endIndex!,
      table: element.table,
    });
  }
  return out;
}

/**
 * The range holding a cell's text. A cell always keeps one paragraph, so the
 * deletable span stops one short of the cell end.
 */
export function cellTextRange(
  cell: docs_v1.Schema$StructuralElement | docs_v1.Schema$TableCell
): { startIndex: number; endIndex: number } | null {
  const start = (cell as docs_v1.Schema$TableCell).startIndex;
  const end = (cell as docs_v1.Schema$TableCell).endIndex;
  if (start === undefined || start === null || end === undefined || end === null) return null;
  const from = start + 1;
  const to = end - 1;
  return to > from ? { startIndex: from, endIndex: to } : null;
}

/** Insertion point for new text in a cell, once it has been cleared. */
export function cellInsertIndex(cell: docs_v1.Schema$TableCell): number {
  return cell.startIndex! + 1;
}

/** Columns in a table, taken from its widest row. */
export function tableColumnCount(table: docs_v1.Schema$Table): number {
  return (table.tableRows ?? []).reduce(
    (max, row) => Math.max(max, (row.tableCells ?? []).length),
    0
  );
}

/**
 * Counts trailing rows whose first cell spans the full width.
 *
 * The template ends the Services table with a merged "Total Following reach"
 * note. Its other cells exist in the API model but are hidden by the merge, so
 * anything written into them silently disappears — which is how the grand
 * total went missing. Summary rows must stop before these.
 */
export function countTrailingFullWidthRows(table: docs_v1.Schema$Table): number {
  const rows = table.tableRows ?? [];
  const columns = tableColumnCount(table);
  if (columns === 0) return 0;

  let count = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    const first = (rows[i].tableCells ?? [])[0];
    const span = first?.tableCellStyle?.columnSpan ?? 1;
    if (span >= columns) count += 1;
    else break;
  }
  return count;
}

/**
 * Builds the text requests for one table, cell by cell.
 * Values shorter than the row are skipped, leaving those cells untouched.
 */
function fillTableRequests(
  table: docs_v1.Schema$Table,
  values: (string | null)[][]
): { index: number; requests: docs_v1.Schema$Request[] }[] {
  const edits: { index: number; requests: docs_v1.Schema$Request[] }[] = [];
  const rows = table.tableRows ?? [];

  values.forEach((rowValues, rowIndex) => {
    if (!rowValues) return;
    const row = rows[rowIndex];
    if (!row) return;
    const cells = row.tableCells ?? [];

    rowValues.forEach((value, columnIndex) => {
      if (value === null || value === undefined) return;
      const cell = cells[columnIndex];
      if (!cell) return;

      const requests: docs_v1.Schema$Request[] = [];
      const range = cellTextRange(cell);
      if (range) {
        requests.push({ deleteContentRange: { range } });
      }
      if (value !== "") {
        requests.push({
          insertText: { location: { index: cellInsertIndex(cell) }, text: value },
        });
      }
      if (requests.length > 0) {
        edits.push({ index: cell.startIndex!, requests });
      }
    });
  });

  return edits;
}

/** Applies edits highest-index-first so earlier indices stay valid. */
function orderedRequests(
  edits: { index: number; requests: docs_v1.Schema$Request[] }[]
): docs_v1.Schema$Request[] {
  return edits
    .slice()
    .sort((a, b) => b.index - a.index)
    .flatMap((e) => e.requests);
}

async function batchUpdate(documentId: string, requests: docs_v1.Schema$Request[]) {
  if (requests.length === 0) return;
  await docsClient().documents.batchUpdate({
    documentId,
    requestBody: { requests },
  });
}

/**
 * Copies the template, fills it from the deal, and returns the new document.
 */
export async function generateAgreement(
  input: AgreementInput,
  options: GenerateOptions
): Promise<GeneratedAgreement> {
  // Fail before touching Drive if the deal cannot fit the template.
  const surplus = surplusItemRowCount(input.lines.length);

  const drive = driveClient();
  const docs = docsClient();

  const copy = await drive.files.copy({
    fileId: options.templateDocumentId,
    requestBody: {
      name: options.documentName,
      ...(options.targetFolderId ? { parents: [options.targetFolderId] } : {}),
    },
    fields: "id, webViewLink",
  });

  const documentId = copy.data.id!;

  const summary = summaryRows(input.totals);

  // ---- pass 1a: drop unused tables --------------------------------------
  {
    const { data: doc } = await docs.documents.get({ documentId });
    const tables = findTables(doc);
    const drops: { index: number; requests: docs_v1.Schema$Request[] }[] = [];

    const dropTable = (position: number) => {
      const ref = tables[position];
      if (!ref) return;
      drops.push({
        index: ref.startIndex,
        requests: [
          {
            deleteContentRange: {
              range: { startIndex: ref.startIndex, endIndex: ref.endIndex },
            },
          },
        ],
      });
    };

    if (!options.includeBillingSchedule) dropTable(TEMPLATE_TABLES.billingSchedule);
    if (!options.includeStoryServices) dropTable(TEMPLATE_TABLES.storyServices);

    await batchUpdate(documentId, orderedRequests(drops));
  }

  // ---- pass 1b: remove surplus item rows, bottom-up ----------------------
  if (surplus > 0) {
    const { data: doc } = await docs.documents.get({ documentId });
    const services = findTables(doc)[TEMPLATE_TABLES.services];
    if (services) {
      const requests: docs_v1.Schema$Request[] = [];
      // Descending row index: deleting a lower row never invalidates a higher one.
      for (let i = surplus - 1; i >= 0; i -= 1) {
        requests.push({
          deleteTableRow: {
            tableCellLocation: {
              tableStartLocation: { index: services.startIndex },
              rowIndex: FIRST_ITEM_ROW + input.lines.length + i,
              columnIndex: 0,
            },
          },
        });
      }
      await batchUpdate(documentId, requests);
    }
  }

  // ---- pass 1c: add summary rows the template does not have --------------
  // The template ships 3 summary rows. A discounted credit card deal needs 5
  // (Saving, Subtotal, Tax, Processing Fee, Total).
  {
    const { data: doc } = await docs.documents.get({ documentId });
    const services = findTables(doc)[TEMPLATE_TABLES.services];
    if (services) {
      const firstSummaryRow = FIRST_ITEM_ROW + input.lines.length;
      const footerRows = countTrailingFullWidthRows(services.table);
      const summaryEnd = (services.table.tableRows?.length ?? 0) - footerRows;
      const existing = summaryEnd - firstSummaryRow;
      const missing = summary.length - existing;
      const requests: docs_v1.Schema$Request[] = [];
      for (let i = 0; i < missing; i += 1) {
        requests.push({
          insertTableRow: {
            tableCellLocation: {
              tableStartLocation: { index: services.startIndex },
              rowIndex: firstSummaryRow,
              columnIndex: 0,
            },
            insertBelow: false,
          },
        });
      }
      await batchUpdate(documentId, requests);
    }
  }

  // ---- pass 2: text ------------------------------------------------------
  {
    const { data: doc } = await docs.documents.get({ documentId });
    const tables = findTables(doc);
    const edits: { index: number; requests: docs_v1.Schema$Request[] }[] = [];

    const customer = tables[TEMPLATE_TABLES.customer];
    if (customer) {
      edits.push(...fillTableRequests(customer.table, customerRows(input)));
    }

    const order = tables[TEMPLATE_TABLES.orderDetails];
    if (order) {
      edits.push(...fillTableRequests(order.table, [null as never, orderDetailsRow(input)]));
    }

    const services = tables[TEMPLATE_TABLES.services];
    if (services) {
      const rows = serviceRows(input);
      const values: (string | null)[][] = [null as never];
      for (const row of rows) {
        values.push([row.item, row.description, row.price, row.spacer, row.quantity, row.fee]);
      }

      // Summary rows sit below the item rows and above any merged footer row.
      const footerRows = countTrailingFullWidthRows(services.table);
      const summaryEnd = (services.table.tableRows?.length ?? 0) - footerRows;
      const firstSummaryRow = FIRST_ITEM_ROW + rows.length;

      summary.forEach((entry, i) => {
        const rowIndex = firstSummaryRow + i;
        if (rowIndex >= summaryEnd) return;
        while (values.length < rowIndex) values.push(null as never);
        // Column 0 is cleared across the summary block. The template ships an
        // example "Early Signing Incentive" there; carrying it over would
        // commit us to deliverables nobody agreed to.
        const firstColumn = i === 0 ? input.specialConditions ?? "" : "";
        values[rowIndex] = [firstColumn, "", "", null, entry.label, entry.value];
      });

      edits.push(...fillTableRequests(services.table, values));
    }

    await batchUpdate(documentId, orderedRequests(edits));
  }

  return {
    documentId,
    webViewLink: copy.data.webViewLink ?? `https://docs.google.com/document/d/${documentId}/edit`,
  };
}

/** Exports a generated agreement as PDF bytes. */
export async function exportAgreementPdf(documentId: string): Promise<Buffer> {
  const res = await driveClient().files.export(
    { fileId: documentId, mimeType: "application/pdf" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

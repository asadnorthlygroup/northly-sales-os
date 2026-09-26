import {
  cellTextRange,
  countTrailingFullWidthRows,
  tableColumnCount,
} from "@/lib/agreement-doc";

const cell = (columnSpan?: number) => ({
  startIndex: 0,
  endIndex: 2,
  ...(columnSpan ? { tableCellStyle: { columnSpan } } : {}),
});

const row = (spans: (number | undefined)[]) => ({
  tableCells: spans.map((s) => cell(s)),
});

describe("tableColumnCount", () => {
  it("takes the widest row", () => {
    expect(tableColumnCount({ tableRows: [row([1, 1]), row([1, 1, 1, 1, 1, 1])] })).toBe(6);
  });

  it("returns zero for an empty table", () => {
    expect(tableColumnCount({ tableRows: [] })).toBe(0);
  });
});

describe("countTrailingFullWidthRows", () => {
  it("finds the merged footer row the template ends with", () => {
    // Row 9 of the Services table is 'Total Following reach', merged across
    // all six columns. Writing into its hidden cells loses the grand total.
    const table = {
      tableRows: [
        row([1, 1, 1, 1, 1, 1]),
        row([4, 1, 1, 1, 1, 1]),
        row([6, 1, 1, 1, 1, 1]),
      ],
    };
    expect(countTrailingFullWidthRows(table)).toBe(1);
  });

  it("counts several trailing merged rows", () => {
    const table = {
      tableRows: [row([1, 1, 1]), row([3, 1, 1]), row([3, 1, 1])],
    };
    expect(countTrailingFullWidthRows(table)).toBe(2);
  });

  it("returns zero when the last row is a normal row", () => {
    const table = { tableRows: [row([6, 1, 1, 1, 1, 1]), row([1, 1, 1, 1, 1, 1])] };
    expect(countTrailingFullWidthRows(table)).toBe(0);
  });

  it("stops at the first non-merged row rather than scanning the whole table", () => {
    const table = {
      tableRows: [row([3, 1, 1]), row([1, 1, 1]), row([3, 1, 1])],
    };
    expect(countTrailingFullWidthRows(table)).toBe(1);
  });
});

describe("cellTextRange", () => {
  it("spans the text but leaves the cell's final paragraph intact", () => {
    expect(cellTextRange({ startIndex: 10, endIndex: 20 })).toEqual({
      startIndex: 11,
      endIndex: 19,
    });
  });

  it("returns null for an empty cell, so nothing is deleted", () => {
    expect(cellTextRange({ startIndex: 10, endIndex: 12 })).toBeNull();
  });
});

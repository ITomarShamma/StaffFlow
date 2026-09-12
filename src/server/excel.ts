// Formatted Excel export (decision 2026-09-12). A CSV is plain text: it can never carry a
// title, a grouped header, borders, a totals row or a print layout, so opened in Excel it
// looks like raw data. Managers open these reports in Excel and print them, so the
// professional export is a real .xlsx. Formatting only: every figure comes from the domain.

import ExcelJS from "exceljs";

export interface SheetColumn<R> {
  header: string;
  /** Adjacent columns sharing a group get one merged cell above their own headers. */
  group?: string;
  width: number;
  kind: "text" | "int" | "dec";
  value: (row: R) => string | number;
  /** Value for the totals row; omitted = empty cell. */
  total?: (rows: readonly R[]) => number;
}

export interface SheetSpec<R> {
  sheetName: string;
  title: string;
  org: string;
  /** One line under the title: date, coverage, head count, issue time. */
  meta: string;
  columns: readonly SheetColumn<R>[];
  rows: readonly R[];
  totalLabel: string;
  /** Excel header/footer codes allowed, e.g. "&P" for the page number. */
  footer: string;
}

// The same restrained palette as the printed documents: navy for structure, grey for rules.
const NAVY = "FF1B2A4A";
const INK = "FF14161C";
const MUTED = "FF5C616B";
const LINE = "FFD3D8E2";
const SUB = "FFE9EDF4";
const ZEBRA = "FFF6F7FA";
const TOTAL = "FFEEF0F8";
const WHITE = "FFFFFFFF";
const FONT = "Arial";

const thin = { style: "thin" as const, color: { argb: LINE } };
const box = { top: thin, left: thin, bottom: thin, right: thin };

type Cell = ExcelJS.Cell;

function fill(argb: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function head(cell: Cell, text: string, bg: string, fg: string): void {
  cell.value = text;
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: fg } };
  cell.fill = fill(bg);
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true, readingOrder: "rtl" };
  cell.border = box;
}

export async function buildWorkbook<R>(spec: SheetSpec<R>): Promise<Buffer> {
  const n = spec.columns.length;
  const grouped = spec.columns.some((c) => c.group);
  const hTop = 5;
  const hBottom = grouped ? 6 : 5;

  const wb = new ExcelJS.Workbook();
  wb.creator = "StaffFlow";
  wb.created = new Date();

  const ws = wb.addWorksheet(spec.sheetName, {
    // Right-to-left, gridlines off (the borders do that work), the header rows and the
    // name column frozen so they stay visible while scrolling.
    views: [{ rightToLeft: true, showGridLines: false, state: "frozen", xSplit: 1, ySplit: hBottom }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
    headerFooter: { oddFooter: spec.footer, evenFooter: spec.footer },
  });
  spec.columns.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));

  // ---- title block ----
  const line = (row: number, text: string, font: Partial<ExcelJS.Font>, height: number) => {
    ws.mergeCells(row, 1, row, n);
    const cell = ws.getCell(row, 1);
    cell.value = text;
    cell.font = { name: FONT, ...font };
    cell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
    ws.getRow(row).height = height;
  };
  line(1, spec.title, { size: 16, bold: true, color: { argb: NAVY } }, 30);
  line(2, spec.org, { size: 10, color: { argb: MUTED } }, 18);
  line(3, spec.meta, { size: 10, color: { argb: INK } }, 18);
  ws.getRow(4).height = 8;
  for (let c = 1; c <= n; c++) ws.getCell(3, c).border = { bottom: { style: "medium", color: { argb: NAVY } } };

  // ---- header: group row over column headers; ungrouped columns span both rows ----
  for (let i = 0; i < n; ) {
    const col = spec.columns[i]!;
    if (grouped && col.group) {
      let j = i;
      while (j + 1 < n && spec.columns[j + 1]!.group === col.group) j++;
      if (j > i) ws.mergeCells(hTop, i + 1, hTop, j + 1);
      head(ws.getCell(hTop, i + 1), col.group, NAVY, WHITE);
      for (let k = i + 1; k <= j; k++) ws.getCell(hTop, k + 1).border = box;
      for (let k = i; k <= j; k++) head(ws.getCell(hBottom, k + 1), spec.columns[k]!.header, SUB, INK);
      i = j + 1;
    } else {
      if (grouped) ws.mergeCells(hTop, i + 1, hBottom, i + 1);
      head(ws.getCell(hTop, i + 1), col.header, NAVY, WHITE);
      if (grouped) ws.getCell(hBottom, i + 1).border = box;
      i++;
    }
  }
  ws.getRow(hTop).height = 22;
  if (grouped) ws.getRow(hBottom).height = 20;

  // ---- body ----
  spec.rows.forEach((row, idx) => {
    const r = ws.getRow(hBottom + 1 + idx);
    r.height = 19;
    spec.columns.forEach((col, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = col.value(row);
      cell.font = { name: FONT, size: 10, bold: ci === 0, color: { argb: INK } };
      cell.alignment =
        col.kind === "text"
          ? { horizontal: "right", vertical: "middle", readingOrder: "rtl" }
          : { horizontal: "center", vertical: "middle" };
      if (col.kind === "int") cell.numFmt = "0";
      if (col.kind === "dec") cell.numFmt = "0.00";
      cell.border = box;
      if (idx % 2 === 1) cell.fill = fill(ZEBRA);
    });
  });

  // ---- totals ----
  if (spec.rows.length > 0) {
    const r = ws.getRow(hBottom + 1 + spec.rows.length);
    r.height = 21;
    spec.columns.forEach((col, ci) => {
      const cell = r.getCell(ci + 1);
      cell.value = ci === 0 ? spec.totalLabel : col.total ? col.total(spec.rows) : null;
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: NAVY } };
      cell.fill = fill(TOTAL);
      cell.alignment =
        ci === 0 ? { horizontal: "right", vertical: "middle", readingOrder: "rtl" } : { horizontal: "center", vertical: "middle" };
      if (col.kind === "int") cell.numFmt = "0";
      if (col.kind === "dec") cell.numFmt = "0.00";
      cell.border = { ...box, top: { style: "medium", color: { argb: NAVY } } };
    });
  }

  // Repeat the header rows on every printed page.
  ws.pageSetup.printTitlesRow = `${hTop}:${hBottom}`;

  return Buffer.from(await wb.xlsx.writeBuffer());
}

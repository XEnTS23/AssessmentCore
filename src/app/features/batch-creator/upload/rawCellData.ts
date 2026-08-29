import { RawImportedRow, RawSheetRow, SourceCell } from "../core/rowTypes";

export interface SourceCellSeed {
  rawValue: unknown;
  rawText?: string;
  cellType?: string;
}

export interface MappedCellRead {
  mappedColumn?: string;
  found: boolean;
  rawValue?: unknown;
  rawText?: string;
}

export function sourceValueToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const richText = (value as any).richText;
    if (Array.isArray(richText)) {
      return richText.map((part) => String(part?.text ?? "")).join("");
    }
    if ("text" in (value as object)) {
      return String((value as any).text ?? "");
    }
    if ("result" in (value as object)) {
      return sourceValueToText((value as any).result);
    }
  }
  return String(value);
}

export function createRawImportedRow(
  rowNumber: number,
  seeds: Record<string, SourceCellSeed>,
): RawImportedRow {
  const cells: Record<string, Readonly<SourceCell>> = {};
  for (const [columnName, seed] of Object.entries(seeds)) {
    cells[columnName] = Object.freeze({
      columnName,
      rawValue: seed.rawValue,
      rawText: seed.rawText ?? sourceValueToText(seed.rawValue),
      rowNumber,
      cellType: seed.cellType,
    });
  }
  return Object.freeze({
    rowNumber,
    cells: Object.freeze(cells),
  });
}

export function getMappedCellText(
  sourceRow: RawImportedRow | undefined,
  mappedColumn: string | undefined,
): MappedCellRead {
  if (!mappedColumn) return { found: false };
  const cell = sourceRow?.cells[mappedColumn];
  if (!cell) return { mappedColumn, found: false };
  return {
    mappedColumn,
    found: true,
    rawValue: cell.rawValue,
    rawText: cell.rawText,
  };
}

export function rawImportedRowFromSheetRow(
  rawSheetRow: RawSheetRow,
): RawImportedRow {
  if (rawSheetRow.__rawImportedRow) return rawSheetRow.__rawImportedRow;
  const seeds: Record<string, SourceCellSeed> = {};
  for (const [columnName, rawValue] of Object.entries(rawSheetRow)) {
    if (columnName.startsWith("__")) continue;
    seeds[columnName] = {
      rawValue,
      rawText: sourceValueToText(rawValue),
    };
  }
  return createRawImportedRow(rawSheetRow.__sourceRowNumber || 0, seeds);
}

export function countPopulatedRawColumn(
  rows: readonly RawImportedRow[],
  columnName: string,
): number {
  return rows.filter((row) => {
    const value = row.cells[columnName]?.rawText;
    return typeof value === "string" && value.trim().length > 0;
  }).length;
}

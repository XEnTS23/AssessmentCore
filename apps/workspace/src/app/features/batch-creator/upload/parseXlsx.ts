import ExcelJS from "exceljs";
import {
  assertFileWithinBatchLimits,
  assertTabularDataWithinBatchLimits,
  BatchLimitError,
  BatchProcessingLimits,
} from "../core/batchLimits";
import { RawSheetRow } from "../core/rowTypes";
import {
  CanonicalColumnMapping,
  MappingMetadata,
  createCanonicalColumnMapping,
  getMappingMetadata,
} from "../normalization/canonicalColumnMapping";
import { createRawImportedRow, sourceValueToText } from "./rawCellData";
import { preflightXlsxArchive } from "./xlsxArchivePreflight";

export interface ParseXlsxOptions {
  file: File;
  limits?: Partial<BatchProcessingLimits>;
  onSuccess: (data: {
    columns: string[];
    rawRows: RawSheetRow[];
    mapping: CanonicalColumnMapping;
    mappingMetadata: MappingMetadata;
  }) => void;
  onError: (error: Error) => void;
}

export async function parseXlsx({
  file,
  limits,
  onSuccess,
  onError,
}: ParseXlsxOptions): Promise<void> {
  try {
    const resolvedLimits = assertFileWithinBatchLimits(file, limits);
    const arrayBuffer = await file.arrayBuffer();
    preflightXlsxArchive(arrayBuffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error("No worksheets found in the Excel file.");
    }

    if (worksheet.rowCount === 0) {
      throw new Error("The Excel file is empty.");
    }

    // Extract headers from the first row
    const headerRow = worksheet.getRow(1);
    const columns: string[] = [];
    const headerSet = new Set<string>();

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const colName = cell.text?.trim() || `Column_${colNumber}`;
      if (headerSet.has(colName)) {
        throw new Error(
          `Duplicate column header detected: "${colName}". Please ensure all column names are unique.`,
        );
      }
      headerSet.add(colName);
      // Ensure the columns array is padded if there are empty cells before
      columns[colNumber - 1] = colName;
    });

    // Fill in any undefined slots with default names
    for (let i = 0; i < columns.length; i++) {
      if (!columns[i]) {
        columns[i] = `Column_${i + 1}`;
      }
    }

    if (columns.length === 0) {
      throw new Error("No columns found in the Excel file.");
    }

    const mapping = createCanonicalColumnMapping(columns);
    const mappingMetadata = getMappingMetadata(mapping);

    assertTabularDataWithinBatchLimits(columns, [], resolvedLimits);

    const estimatedDataRows = Math.max(0, worksheet.actualRowCount - 1);
    if (estimatedDataRows > resolvedLimits.maxRows) {
      throw new BatchLimitError(
        "TOO_MANY_ROWS",
        `The file contains ${estimatedDataRows} data rows. Split it into batches of at most ${resolvedLimits.maxRows} rows.`,
        resolvedLimits.maxRows,
        estimatedDataRows,
      );
    }

    const rawRows: RawSheetRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rawRow: Record<string, unknown> = {};
      const sourceCells: Record<
        string,
        { rawValue: unknown; rawText: string; cellType: string }
      > = {};
      let isEmpty = true;

      for (let i = 0; i < columns.length; i++) {
        const colName = columns[i];
        const cell = row.getCell(i + 1);
        const rawValue = cell.value;
        const rawText = cell.text || sourceValueToText(rawValue);
        sourceCells[colName] = {
          rawValue,
          rawText,
          cellType: String(cell.type),
        };
        rawRow[colName] = rawText;
        if (rawText.trim() !== "") isEmpty = false;
      }

      if (!isEmpty) {
        rawRows.push({
          ...rawRow,
          __internalId: crypto.randomUUID(),
          __sourceRowNumber: rowNumber,
          __rawImportedRow: createRawImportedRow(rowNumber, sourceCells),
        });
      }
    });

    if (rawRows.length === 0) {
      throw new Error("The Excel file contains no data rows.");
    }

    assertTabularDataWithinBatchLimits(columns, rawRows, resolvedLimits);
    onSuccess({ columns, rawRows, mapping, mappingMetadata });
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

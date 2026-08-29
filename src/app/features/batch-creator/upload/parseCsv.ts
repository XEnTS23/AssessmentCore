import Papa from "papaparse";
import {
  assertFileWithinBatchLimits,
  assertTabularDataWithinBatchLimits,
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

export interface ParseCsvOptions {
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

export function parseCsv({
  file,
  limits,
  onSuccess,
  onError,
}: ParseCsvOptions): void {
  let resolvedLimits: BatchProcessingLimits;
  try {
    resolvedLimits = assertFileWithinBatchLimits(file, limits);
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: "greedy",
    complete: (results) => {
      try {
        const errors = results.errors;
        if (errors && errors.length > 0) {
          throw new Error(`CSV Parsing Error: ${errors[0].message}`);
        }

        const columns = results.meta.fields || [];

        if (columns.length === 0) {
          throw new Error("No columns found in the CSV file.");
        }

        const uniqueCols = new Set(columns);
        if (uniqueCols.size !== columns.length) {
          throw new Error(
            "Duplicate column headers detected. Please ensure all column names are unique.",
          );
        }

        const mapping = createCanonicalColumnMapping(columns);
        const mappingMetadata = getMappingMetadata(mapping);
        const rawRows: RawSheetRow[] = results.data.map(
          (row: any, index: number) => {
            const rowNumber = index + 2;
            const seeds = Object.fromEntries(
              columns.map((column) => [
                column,
                {
                  rawValue: row[column],
                  rawText: sourceValueToText(row[column]),
                  cellType: "String",
                },
              ]),
            );
            return {
              ...row,
              __internalId: crypto.randomUUID(),
              __sourceRowNumber: rowNumber,
              __rawImportedRow: createRawImportedRow(rowNumber, seeds),
            };
          },
        );

        if (rawRows.length === 0) {
          throw new Error("The CSV file contains no data rows.");
        }

        assertTabularDataWithinBatchLimits(columns, rawRows, resolvedLimits);
        onSuccess({ columns, rawRows, mapping, mappingMetadata });
      } catch (err: any) {
        onError(err);
      }
    },
    error: (err) => {
      onError(new Error(err.message));
    },
  });
}

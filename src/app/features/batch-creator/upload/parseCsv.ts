import Papa from 'papaparse';
import { RawSheetRow } from '../core/rowTypes';

export interface ParseCsvOptions {
  file: File;
  onSuccess: (data: { columns: string[]; rawRows: RawSheetRow[] }) => void;
  onError: (error: Error) => void;
}

export function parseCsv({ file, onSuccess, onError }: ParseCsvOptions): void {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: 'greedy',
    complete: (results) => {
      try {
        const errors = results.errors;
        if (errors && errors.length > 0) {
          throw new Error(`CSV Parsing Error: ${errors[0].message}`);
        }

        const columns = results.meta.fields || [];
        
        if (columns.length === 0) {
          throw new Error('No columns found in the CSV file.');
        }

        const uniqueCols = new Set(columns);
        if (uniqueCols.size !== columns.length) {
          throw new Error('Duplicate column headers detected. Please ensure all column names are unique.');
        }

        const rawRows: RawSheetRow[] = results.data.map((row: any, index: number) => {
          return {
            ...row,
            __internalId: crypto.randomUUID(),
            __sourceRowNumber: index + 2 // +1 for 1-based, +1 for header row
          };
        });

        if (rawRows.length === 0) {
          throw new Error('The CSV file contains no data rows.');
        }

        onSuccess({ columns, rawRows });
      } catch (err: any) {
        onError(err);
      }
    },
    error: (err) => {
      onError(new Error(err.message));
    }
  });
}

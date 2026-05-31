import ExcelJS from 'exceljs';
import { RawSheetRow } from '../core/rowTypes';

export interface ParseXlsxOptions {
  file: File;
  onSuccess: (data: { columns: string[]; rawRows: RawSheetRow[] }) => void;
  onError: (error: Error) => void;
}

export async function parseXlsx({ file, onSuccess, onError }: ParseXlsxOptions): Promise<void> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('No worksheets found in the Excel file.');
    }

    if (worksheet.rowCount === 0) {
      throw new Error('The Excel file is empty.');
    }

    // Extract headers from the first row
    const headerRow = worksheet.getRow(1);
    const columns: string[] = [];
    const headerSet = new Set<string>();

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const colName = cell.text?.trim() || `Column_${colNumber}`;
      if (headerSet.has(colName)) {
        throw new Error(`Duplicate column header detected: "${colName}". Please ensure all column names are unique.`);
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
      throw new Error('No columns found in the Excel file.');
    }

    const rawRows: RawSheetRow[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rawRow: Record<string, any> = {};
      let isEmpty = true;

      for (let i = 0; i < columns.length; i++) {
        const colName = columns[i];
        const cell = row.getCell(i + 1);
        
        let value = cell.value;
        
        // Handle rich text
        if (value && typeof value === 'object' && 'richText' in value) {
          value = value.richText.map((rt: any) => rt.text).join('');
        } else if (value && typeof value === 'object' && 'text' in value) {
          // Handle hyperlinks
          value = value.text;
        }

        // Convert to string for consistency with CSV
        const strValue = value === null || value === undefined ? '' : String(value).trim();
        rawRow[colName] = strValue;

        if (strValue !== '') {
          isEmpty = false;
        }
      }

      // Only add row if it's not completely empty
      if (!isEmpty) {
        rawRows.push({
          ...rawRow,
          __internalId: crypto.randomUUID(),
          __sourceRowNumber: rowNumber
        });
      }
    });

    if (rawRows.length === 0) {
      throw new Error('The Excel file contains no data rows.');
    }

    onSuccess({ columns, rawRows });
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

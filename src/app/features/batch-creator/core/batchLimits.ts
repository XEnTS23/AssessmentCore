export interface BatchProcessingLimits {
  maxFileBytes: number;
  maxRows: number;
  maxColumns: number;
  maxCellCharacters: number;
  maxTotalCharacters: number;
  processingChunkSize: number;
}

export type BatchLimitCode =
  | "FILE_TOO_LARGE"
  | "TOO_MANY_ROWS"
  | "TOO_MANY_COLUMNS"
  | "HEADER_TOO_LARGE"
  | "CELL_TOO_LARGE"
  | "TOTAL_CONTENT_TOO_LARGE"
  | "INVALID_LIMIT_CONFIGURATION";

export class BatchLimitError extends Error {
  constructor(
    public readonly code: BatchLimitCode,
    message: string,
    public readonly limit: number,
    public readonly actual: number,
    public readonly location?: { rowNumber?: number; column?: string },
  ) {
    super(message);
    this.name = "BatchLimitError";
  }
}

export const DEFAULT_BATCH_PROCESSING_LIMITS: Readonly<BatchProcessingLimits> =
  Object.freeze({
    maxFileBytes: 25 * 1024 * 1024,
    maxRows: 10_000,
    maxColumns: 250,
    maxCellCharacters: 100_000,
    maxTotalCharacters: 20_000_000,
    processingChunkSize: 100,
  });

export interface BatchShapeMetrics {
  rows: number;
  columns: number;
  totalCharacters: number;
  largestCellCharacters: number;
}

export function formatByteCount(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex += 1;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function resolveBatchProcessingLimits(
  overrides: Partial<BatchProcessingLimits> = {},
): BatchProcessingLimits {
  const limits = {
    ...DEFAULT_BATCH_PROCESSING_LIMITS,
    ...overrides,
  };

  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new BatchLimitError(
        "INVALID_LIMIT_CONFIGURATION",
        `${name} must be a positive safe integer.`,
        1,
        value,
      );
    }
  }

  return limits;
}

export function assertFileWithinBatchLimits(
  file: Pick<File, "name" | "size">,
  overrides: Partial<BatchProcessingLimits> = {},
): BatchProcessingLimits {
  const limits = resolveBatchProcessingLimits(overrides);
  if (file.size > limits.maxFileBytes) {
    throw new BatchLimitError(
      "FILE_TOO_LARGE",
      `${file.name || "The selected file"} is ${formatByteCount(file.size)}. The maximum upload size is ${formatByteCount(limits.maxFileBytes)}.`,
      limits.maxFileBytes,
      file.size,
    );
  }
  return limits;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
}

export function assertTabularDataWithinBatchLimits(
  columns: string[],
  rows: Array<Record<string, unknown>>,
  overrides: Partial<BatchProcessingLimits> = {},
): BatchShapeMetrics {
  const limits = resolveBatchProcessingLimits(overrides);

  if (columns.length > limits.maxColumns) {
    throw new BatchLimitError(
      "TOO_MANY_COLUMNS",
      `The file contains ${columns.length} columns. The maximum supported column count is ${limits.maxColumns}.`,
      limits.maxColumns,
      columns.length,
    );
  }
  if (rows.length > limits.maxRows) {
    throw new BatchLimitError(
      "TOO_MANY_ROWS",
      `The file contains ${rows.length} data rows. Split it into batches of at most ${limits.maxRows} rows.`,
      limits.maxRows,
      rows.length,
    );
  }

  let totalCharacters = 0;
  let largestCellCharacters = 0;

  columns.forEach((column, index) => {
    if (column.length > limits.maxCellCharacters) {
      throw new BatchLimitError(
        "HEADER_TOO_LARGE",
        `Column header ${index + 1} contains ${column.length} characters. The maximum is ${limits.maxCellCharacters}.`,
        limits.maxCellCharacters,
        column.length,
        { rowNumber: 1, column },
      );
    }
    totalCharacters += column.length;
  });

  rows.forEach((row, rowIndex) => {
    columns.forEach((column) => {
      const length = cellText(row[column]).length;
      largestCellCharacters = Math.max(largestCellCharacters, length);
      if (length > limits.maxCellCharacters) {
        throw new BatchLimitError(
          "CELL_TOO_LARGE",
          `Row ${rowIndex + 2}, column "${column}" contains ${length} characters. The maximum per cell is ${limits.maxCellCharacters}.`,
          limits.maxCellCharacters,
          length,
          { rowNumber: rowIndex + 2, column },
        );
      }
      totalCharacters += length;
      if (totalCharacters > limits.maxTotalCharacters) {
        throw new BatchLimitError(
          "TOTAL_CONTENT_TOO_LARGE",
          `The parsed cell content exceeds ${limits.maxTotalCharacters.toLocaleString()} characters. Split the file into smaller batches.`,
          limits.maxTotalCharacters,
          totalCharacters,
          { rowNumber: rowIndex + 2, column },
        );
      }
    });
  });

  return {
    rows: rows.length,
    columns: columns.length,
    totalCharacters,
    largestCellCharacters,
  };
}

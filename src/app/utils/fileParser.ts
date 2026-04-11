import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParsedFileData {
  columns: string[];
  rows: Record<string, any>[];
  fileName: string;
  fileType: 'xlsx' | 'csv';
}

export interface RawQuestion {
  [key: string]: any;
  id?: string;
}

/**
 * Strip leading formula-injection characters from a cell value.
 * Mitigates CVE-2023-30533 (xlsx formula injection) — when an exported file
 * is opened in Excel/Sheets, a cell starting with =, +, -, or @ can execute
 * arbitrary formulas. Stripping the prefix is safe because question bank data
 * should never legitimately start with these characters.
 */
function sanitizeCellValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.replace(/^[=+\-@]+/, '');
}

function sanitizeRow(row: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    sanitized[key] = sanitizeCellValue(row[key]);
  }
  return sanitized;
}

/**
 * Parse uploaded file (XLSX or CSV) and extract columns and rows
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
  const fileName = file.name;
  const fileType = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') ? 'xlsx' : 'csv';

  if (fileType === 'xlsx') {
    return parseXlsx(file, fileName);
  } else {
    return parseCsv(file, fileName);
  }
}

/**
 * Parse XLSX file
 */
function parseXlsx(file: File, fileName: string): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(data, { type: 'array' });

        // Try each sheet in order; use the first one that has at least 1 data row.
        let jsonData: Record<string, any>[] = [];
        let usedSheet = '';
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const candidate = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
          if (candidate.length > 0) {
            jsonData = candidate;
            usedSheet = sheetName;
            break;
          }
        }

        if (jsonData.length === 0) {
          const tried = workbook.SheetNames.join(', ') || '(none)';
          reject(new Error(`No data found in the sheet. Tried: ${tried}. Make sure the file has at least one row of data below the header.`));
          return;
        }

        console.log(`[fileParser] Using sheet "${usedSheet}" (${jsonData.length} rows)`);

        // Extract columns from first row
        const columns = Object.keys(jsonData[0]);

        // Add compatibility id fallback, but preserve whether source id was explicitly missing.
        const rows = jsonData.map((rawRow, index) => {
          const row = sanitizeRow(rawRow);
          const idKey = Object.keys(row).find((key) => key.toLowerCase() === 'id');
          const sourceIdRaw = idKey ? row[idKey] : undefined;
          const sourceIdNormalized = sourceIdRaw == null ? '' : String(sourceIdRaw).trim();
          const explicitIdMissing = sourceIdNormalized.length === 0;

          return {
            ...row,
            id: explicitIdMissing ? `row_${index}` : sourceIdRaw,
            __sourceRowNumber: index + 1,
            __sourceIdRaw: sourceIdRaw ?? '',
            __explicitIdMissing: explicitIdMissing,
          };
        });

        resolve({
          columns,
          rows,
          fileName,
          fileType: 'xlsx',
        });
      } catch (error) {
        reject(new Error(`Failed to parse XLSX file: ${error}`));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse CSV file
 */
function parseCsv(file: File, fileName: string): Promise<ParsedFileData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rows = results.data as Record<string, any>[];

        if (rows.length === 0) {
          reject(new Error('No data found in the CSV file'));
          return;
        }

        const columns = results.meta.fields || Object.keys(rows[0]);

        // Add compatibility id fallback, but preserve whether source id was explicitly missing.
        const rowsWithId = rows.map((rawRow, index) => {
          const row = sanitizeRow(rawRow);
          const idKey = Object.keys(row).find((key) => key.toLowerCase() === 'id');
          const sourceIdRaw = idKey ? row[idKey] : undefined;
          const sourceIdNormalized = sourceIdRaw == null ? '' : String(sourceIdRaw).trim();
          const explicitIdMissing = sourceIdNormalized.length === 0;

          return {
            ...row,
            id: explicitIdMissing ? `row_${index}` : sourceIdRaw,
            __sourceRowNumber: index + 1,
            __sourceIdRaw: sourceIdRaw ?? '',
            __explicitIdMissing: explicitIdMissing,
          };
        });

        resolve({
          columns,
          rows: rowsWithId,
          fileName,
          fileType: 'csv',
        });
      },
      error: (error: any) => {
        reject(new Error(`Failed to parse CSV file: ${error.message}`));
      },
    });
  });
}

/**
 * Detect which columns are likely question/answer related based on column names
 */
export function detectQuestionColumns(columns: string[]): {
  questionCol?: string;
  answerCol?: string;
  optionCols?: string[];
  typeCol?: string;
  difficultyCol?: string;
  solutionCol?: string;
  pointsCol?: string;
  titleCol?: string;
  subjectCol?: string;
  topicCol?: string;
  toleranceCol?: string;
  orderCol?: string;
  imageCol?: string;
} {
  const lowerColumns = columns.map(c => c.toLowerCase());

  const result: {
    questionCol?: string;
    answerCol?: string;
    optionCols?: string[];
    typeCol?: string;
    difficultyCol?: string;
    solutionCol?: string;
    pointsCol?: string;
    titleCol?: string;
    [key: string]: any;
  } = {};

  // Detect title column
  const titlePatterns = ['title', 'item_title', 'question_title', 'label', 'name'];
  result.titleCol = columns[lowerColumns.findIndex(c => titlePatterns.some(p => c.includes(p)))];

  // Detect question column
  // When both "Question Text" and "Question Type" exist, prefer "Question Text"
  const questionPatterns = ['question', 'query', 'problem', 'stem', 'text'];
  let foundIndex = lowerColumns.findIndex(c => questionPatterns.some(p => c.includes(p)));
  
  // If found "question" but it's "question type", check if "question text" also exists
  if (foundIndex >= 0 && lowerColumns[foundIndex].includes('question') && lowerColumns[foundIndex].includes('type')) {
    // Look for "question text" specifically
    const textVariant = lowerColumns.findIndex((c, idx) => idx !== foundIndex && (c.includes('question') && c.includes('text')));
    if (textVariant >= 0) {
      foundIndex = textVariant;
    }
  }
  
  result.questionCol = foundIndex >= 0 ? columns[foundIndex] : undefined;

  // Detect answer/correct answer column
  const answerPatterns = ['answer', 'correct'];
  result.answerCol = columns[lowerColumns.findIndex(c => answerPatterns.some(p => c.includes(p)))];

  // Detect option columns (A-H or Option 1-8, etc.)
  const optionCols: string[] = [];
  columns.forEach(col => {
    const trimmed = col.trim();
    if (
      /^option[\s_-]*[a-h]$/i.test(trimmed) ||
      /^opt[\s_-]*[a-h]$/i.test(trimmed) ||
      /^choice[\s_-]*[a-h]$/i.test(trimmed) ||
      /^[a-h]$/i.test(trimmed) ||
      /^option[\s_-]*[1-8]$/i.test(trimmed) ||
      /^opt[\s_-]*[1-8]$/i.test(trimmed) ||
      /^choice[\s_-]*[1-8]$/i.test(trimmed) ||
      /^[1-8]$/.test(trimmed)
    ) {
      optionCols.push(col);
    }
  });
  result.optionCols = optionCols.length > 0 ? optionCols : undefined;

  // Detect question type column
  const typePatterns = ['type', 'qtype', 'questiontype'];
  result.typeCol = columns[lowerColumns.findIndex(c => typePatterns.some(p => c.includes(p)))];

  // Detect difficulty column
  const diffPatterns = ['difficulty', 'level', 'difficulty_level'];
  result.difficultyCol = columns[lowerColumns.findIndex(c => diffPatterns.some(p => c.includes(p)))];

  // Detect solution column
  const solutionPatterns = ['solution', 'explanation', 'remark'];
  result.solutionCol = columns[lowerColumns.findIndex(c => solutionPatterns.some(p => c.includes(p)))];

  // Detect points column - includes 'grade' now
  const pointsPatterns = ['points', 'marks', 'score', 'weight', 'grade'];
  result.pointsCol = columns[lowerColumns.findIndex(c => pointsPatterns.some(p => c.includes(p)))];

  // Detect subject column
  const subjectPatterns = ['subject', 'category', 'domain'];
  result.subjectCol = columns[lowerColumns.findIndex(c => subjectPatterns.some(p => c.includes(p)))];

  // Detect topic column
  const topicPatterns = ['topic', 'subtopic', 'unit', 'chapter'];
  result.topicCol = columns[lowerColumns.findIndex(c => topicPatterns.some(p => c.includes(p)))];

  // Detect tolerance column (for numeric questions)
  const tolerancePatterns = ['tolerance', 'margin', 'tolerance_value'];
  result.toleranceCol = columns[lowerColumns.findIndex(c => tolerancePatterns.some(p => c.includes(p)))];

  // Detect order column (for ordering interaction)
  // Prefer explicit order-item columns over generic order metadata fields.
  const preferredOrderPatterns = [
    'order_items',
    'order items',
    'ordering_items',
    'ordering items',
    'sequence_items',
    'sequence items',
    'arrange_items',
    'arrange items',
  ];
  const preferredOrderIndex = lowerColumns.findIndex((c) => preferredOrderPatterns.some((p) => c === p || c.includes(p)));

  if (preferredOrderIndex >= 0) {
    result.orderCol = columns[preferredOrderIndex];
  } else {
    const orderPatterns = ['order', 'sequence', 'arrange'];
    result.orderCol = columns[lowerColumns.findIndex((c) => orderPatterns.some((p) => c.includes(p)))];
  }

  // Detect image/diagram column (for media support)
  const imagePatterns = ['image', 'img', 'picture', 'media', 'figure', 'graphic', 'diagram', 'illustration'];
  result.imageCol = columns[lowerColumns.findIndex(c => imagePatterns.some(p => c.includes(p)))];

  return result;
}

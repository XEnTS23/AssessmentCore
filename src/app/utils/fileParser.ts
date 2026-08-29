import ExcelJS from "exceljs";
import Papa from "papaparse";

export interface ParsedFileData {
  columns: string[];
  rows: Record<string, any>[];
  fileName: string;
  fileType: "xlsx" | "csv";
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
  if (typeof value !== "string") return value;
  return value.replace(/^[=+\-@]+/, "");
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
  const fileType =
    fileName.endsWith(".xlsx") || fileName.endsWith(".xls") ? "xlsx" : "csv";

  if (fileType === "xlsx") {
    return parseXlsx(file, fileName);
  } else {
    return parseCsv(file, fileName);
  }
}

/**
 * Normalize an ExcelJS cell value to a simple JS primitive.
 * Handles rich text, hyperlinks, formula results, errors, and dates.
 */
function normalizeCellValue(cell: ExcelJS.Cell): unknown {
  const val = cell.value;
  if (val == null) return undefined;

  // Rich text → concatenate all text runs
  if (typeof val === "object" && "richText" in val) {
    return (val as ExcelJS.CellRichTextValue).richText
      .map((r) => r.text)
      .join("");
  }

  // Hyperlink → return the display text or the hyperlink itself
  if (typeof val === "object" && "hyperlink" in val) {
    return (
      (val as ExcelJS.CellHyperlinkValue).text ||
      (val as ExcelJS.CellHyperlinkValue).hyperlink
    );
  }

  // Formula → return the computed result
  if (typeof val === "object" && "formula" in val) {
    return (val as ExcelJS.CellFormulaValue).result ?? "";
  }

  // Error → return empty string
  if (typeof val === "object" && "error" in val) {
    return "";
  }

  // Date → ISO string
  if (val instanceof Date) {
    return val.toISOString();
  }

  return val;
}

/**
 * Parse XLSX file using ExcelJS
 */
async function parseXlsx(
  file: File,
  fileName: string,
): Promise<ParsedFileData> {
  const arrayBuffer = await file.arrayBuffer();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // Try each sheet in order; use the first one that has at least 1 data row.
  let jsonData: Record<string, any>[] = [];
  let usedSheet = "";

  for (const worksheet of workbook.worksheets) {
    if (!worksheet || worksheet.rowCount < 2) continue; // need header + at least 1 data row

    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      headers[colNumber] = String(
        normalizeCellValue(cell) ?? `Column${colNumber}`,
      ).trim();
    });

    if (headers.filter(Boolean).length === 0) continue;

    const rows: Record<string, any>[] = [];
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header row

      const rowObj: Record<string, any> = {};
      let hasValue = false;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (!header) return;
        const val = normalizeCellValue(cell);
        if (val !== undefined && val !== "") {
          rowObj[header] = val;
          hasValue = true;
        }
      });

      if (hasValue) rows.push(rowObj);
    });

    if (rows.length > 0) {
      jsonData = rows;
      usedSheet = worksheet.name;
      break;
    }
  }

  if (jsonData.length === 0) {
    const tried =
      workbook.worksheets.map((ws) => ws.name).join(", ") || "(none)";
    throw new Error(
      `No data found in the sheet. Tried: ${tried}. Make sure the file has at least one row of data below the header.`,
    );
  }

  if (import.meta.env.DEV) {
    console.log(
      `[fileParser] Using sheet "${usedSheet}" (${jsonData.length} rows)`,
    );
  }

  // Extract columns from first row
  const columns = Object.keys(jsonData[0]);

  // Add compatibility id fallback, but preserve whether source id was explicitly missing.
  const rows = jsonData.map((rawRow, index) => {
    const row = sanitizeRow(rawRow);
    const idKey = Object.keys(row).find((key) => key.toLowerCase() === "id");
    const sourceIdRaw = idKey ? row[idKey] : undefined;
    const sourceIdNormalized =
      sourceIdRaw == null ? "" : String(sourceIdRaw).trim();
    const explicitIdMissing = sourceIdNormalized.length === 0;

    return {
      ...row,
      id: explicitIdMissing ? `row_${index}` : sourceIdRaw,
      __sourceRowNumber: index + 1,
      __sourceIdRaw: sourceIdRaw ?? "",
      __explicitIdMissing: explicitIdMissing,
    };
  });

  return {
    columns,
    rows,
    fileName,
    fileType: "xlsx",
  };
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
          reject(new Error("No data found in the CSV file"));
          return;
        }

        const columns = results.meta.fields || Object.keys(rows[0]);

        // Add compatibility id fallback, but preserve whether source id was explicitly missing.
        const rowsWithId = rows.map((rawRow, index) => {
          const row = sanitizeRow(rawRow);
          const idKey = Object.keys(row).find(
            (key) => key.toLowerCase() === "id",
          );
          const sourceIdRaw = idKey ? row[idKey] : undefined;
          const sourceIdNormalized =
            sourceIdRaw == null ? "" : String(sourceIdRaw).trim();
          const explicitIdMissing = sourceIdNormalized.length === 0;

          return {
            ...row,
            id: explicitIdMissing ? `row_${index}` : sourceIdRaw,
            __sourceRowNumber: index + 1,
            __sourceIdRaw: sourceIdRaw ?? "",
            __explicitIdMissing: explicitIdMissing,
          };
        });

        resolve({
          columns,
          rows: rowsWithId,
          fileName,
          fileType: "csv",
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
  subtopicCol?: string;
  toleranceCol?: string;
  orderCol?: string;
  imageCol?: string;
  bloomCol?: string;
  negativeMarksCol?: string;
  tagsCol?: string;
  gradeCol?: string;
  languageCol?: string;
  examCol?: string;
} {
  const lowerColumns = columns.map((c) => c.toLowerCase());

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
  const titlePatterns = [
    "title",
    "item_title",
    "question_title",
    "label",
    "name",
  ];
  result.titleCol =
    columns[
      lowerColumns.findIndex((c) => titlePatterns.some((p) => c.includes(p)))
    ];

  // Detect question column
  // When both "Question Text" and "Question Type" exist, prefer "Question Text"
  const questionPatterns = ["question", "query", "problem", "stem", "text"];
  let foundIndex = lowerColumns.findIndex((c) =>
    questionPatterns.some((p) => c.includes(p)),
  );

  // If found "question" but it's "question type", check if "question text" also exists
  if (
    foundIndex >= 0 &&
    lowerColumns[foundIndex].includes("question") &&
    lowerColumns[foundIndex].includes("type")
  ) {
    // Look for "question text" specifically
    const textVariant = lowerColumns.findIndex(
      (c, idx) =>
        idx !== foundIndex && c.includes("question") && c.includes("text"),
    );
    if (textVariant >= 0) {
      foundIndex = textVariant;
    }
  }

  result.questionCol = foundIndex >= 0 ? columns[foundIndex] : undefined;

  // Detect answer/correct answer column
  // Prefer explicit exact matches or obvious correct answer fields
  const preferredAnswerPatterns = [
    "correct_answer",
    "correct answer",
    "answer_key",
    "answer key",
    "correct option",
  ];
  let ansIdx = lowerColumns.findIndex((c) =>
    preferredAnswerPatterns.some((p) => c === p || c.includes(p)),
  );

  if (ansIdx < 0) {
    // Fallback: match 'answer' or 'correct', but exclude 'answer type', 'is_correct', etc.
    const answerPatterns = ["answer", "correct"];
    ansIdx = lowerColumns.findIndex((c) => {
      if (
        c.includes("type") ||
        c.includes("is_correct") ||
        c.includes("incorrect") ||
        c.includes("format")
      )
        return false;
      return answerPatterns.some((p) => c.includes(p));
    });
  }
  result.answerCol = ansIdx >= 0 ? columns[ansIdx] : undefined;

  // Detect option columns (A-H or Option 1-8, etc.)
  const optionCols: string[] = [];
  columns.forEach((col) => {
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
  const typePatterns = ["type", "qtype", "questiontype"];
  result.typeCol =
    columns[
      lowerColumns.findIndex((c) => typePatterns.some((p) => c.includes(p)))
    ];

  // Detect difficulty column
  const diffPatterns = ["difficulty", "level", "difficulty_level"];
  result.difficultyCol =
    columns[
      lowerColumns.findIndex((c) => diffPatterns.some((p) => c.includes(p)))
    ];

  // Detect solution column
  const solutionPatterns = ["solution", "explanation", "remark"];
  result.solutionCol =
    columns[
      lowerColumns.findIndex((c) => solutionPatterns.some((p) => c.includes(p)))
    ];

  // Detect points column - includes 'grade' now
  const pointsPatterns = ["points", "marks", "score", "weight", "grade"];
  result.pointsCol =
    columns[
      lowerColumns.findIndex((c) => pointsPatterns.some((p) => c.includes(p)))
    ];

  // Detect subject column
  const subjectPatterns = ["subject", "category", "domain"];
  result.subjectCol =
    columns[
      lowerColumns.findIndex((c) => subjectPatterns.some((p) => c.includes(p)))
    ];

  // Detect topic column (exclude subtopic — detected separately)
  const topicPatterns = ["topic", "unit", "chapter"];
  result.topicCol =
    columns[
      lowerColumns.findIndex((c) => {
        if (
          c.includes("subtopic") ||
          c.includes("sub_topic") ||
          c.includes("sub topic")
        )
          return false;
        return topicPatterns.some((p) => c.includes(p));
      })
    ];

  // Detect subtopic column
  const subtopicPatterns = ["subtopic", "sub_topic", "sub topic"];
  result.subtopicCol =
    columns[
      lowerColumns.findIndex((c) => subtopicPatterns.some((p) => c.includes(p)))
    ];

  // Detect tolerance column (for numeric questions)
  const tolerancePatterns = ["tolerance", "margin", "tolerance_value"];
  result.toleranceCol =
    columns[
      lowerColumns.findIndex((c) =>
        tolerancePatterns.some((p) => c.includes(p)),
      )
    ];

  // Detect order column (for ordering interaction)
  // Prefer explicit order-item columns over generic order metadata fields.
  const preferredOrderPatterns = [
    "order_items",
    "order items",
    "ordering_items",
    "ordering items",
    "sequence_items",
    "sequence items",
    "arrange_items",
    "arrange items",
  ];
  const preferredOrderIndex = lowerColumns.findIndex((c) =>
    preferredOrderPatterns.some((p) => c === p || c.includes(p)),
  );

  if (preferredOrderIndex >= 0) {
    result.orderCol = columns[preferredOrderIndex];
  } else {
    // Fallback: match generic order/sequence/arrange patterns, but exclude columns
    // that are clearly sequence *metadata* (e.g. Question_Sequence_ID, sequence_number)
    // rather than ordering-item data.
    const orderPatterns = ["order", "sequence", "arrange"];
    const metadataSuffixes = [
      "_id",
      " id",
      "_no",
      " no",
      "_number",
      " number",
      "_num",
      " num",
      "_seq",
      "sequenceid",
      "sequenceno",
    ];
    result.orderCol =
      columns[
        lowerColumns.findIndex((c) => {
          if (metadataSuffixes.some((s) => c.includes(s))) return false;
          return orderPatterns.some((p) => c.includes(p));
        })
      ];
  }

  // Detect image/diagram column (for media support)
  const imagePatterns = [
    "image",
    "img",
    "picture",
    "media",
    "figure",
    "graphic",
    "diagram",
    "illustration",
  ];
  result.imageCol =
    columns[
      lowerColumns.findIndex((c) => imagePatterns.some((p) => c.includes(p)))
    ];

  // Detect Bloom's taxonomy column
  const bloomPatterns = [
    "bloom",
    "taxonomy",
    "cognitive",
    "cognitive_level",
    "thinking_skill",
  ];
  result.bloomCol =
    columns[
      lowerColumns.findIndex((c) => bloomPatterns.some((p) => c.includes(p)))
    ];

  // Detect negative marks column (exclude plain 'marks' — already caught by points)
  const negativeMarksPatterns = [
    "negative_mark",
    "negative mark",
    "negmark",
    "neg_mark",
    "penalty",
    "negative_score",
    "negative score",
  ];
  result.negativeMarksCol =
    columns[
      lowerColumns.findIndex((c) =>
        negativeMarksPatterns.some((p) => c.includes(p)),
      )
    ];

  // Detect tags/keywords column
  const tagsPatterns = ["tags", "keywords", "keyword", "label"];
  result.tagsCol =
    columns[
      lowerColumns.findIndex((c) => {
        if (c.includes("option") || c.includes("choice")) return false;
        return tagsPatterns.some((p) => c.includes(p));
      })
    ];

  // Detect grade/class level column (exclude 'grade' if already matched by points)
  const gradePatterns = [
    "class",
    "grade_level",
    "grade level",
    "standard",
    "year_group",
  ];
  result.gradeCol =
    columns[
      lowerColumns.findIndex((c) => gradePatterns.some((p) => c.includes(p)))
    ];

  // Detect language column
  const languagePatterns = ["language", "lang", "medium"];
  result.languageCol =
    columns[
      lowerColumns.findIndex((c) => languagePatterns.some((p) => c.includes(p)))
    ];

  // Detect exam/source column
  const examPatterns = [
    "exam",
    "source",
    "paper",
    "exam_name",
    "exam name",
    "test_name",
    "pyq",
    "previous_year",
  ];
  result.examCol =
    columns[
      lowerColumns.findIndex((c) => examPatterns.some((p) => c.includes(p)))
    ];

  return result;
}

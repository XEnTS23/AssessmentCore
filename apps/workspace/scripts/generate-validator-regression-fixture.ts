import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { parseXlsx } from "../src/app/features/batch-creator/upload/parseXlsx";

export const FIXTURE_VERSION = "1.0.0";
export const FIXTURE_PATH = path.resolve(
  "test/fixtures/validator-regression-fixture.xlsx",
);
export const EXPECTATIONS_PATH = path.resolve(
  "test/fixtures/validator-regression-expectations.json",
);

export const REQUIRED_HEADERS = [
  "Question_ID",
  "Question_Type",
  "Question_Stem",
  "Option_A",
  "Option_B",
  "Option_C",
  "Option_D",
  "Correct_Answer",
  "Numerical_Answer",
  "Tolerance",
  "Answer_Unit",
  "Explanation",
  "Subject",
  "Chapter",
  "Topic",
  "Difficulty",
  "Positive_Marks",
  "Negative_Marks",
  "Partial_Marking_Rule",
  "Image_Required",
  "Image_File_Name",
  "Image_Source",
  "Expected_Time_sec",
  "Language",
  "Copyright_Status",
  "Source_Reference",
  "Teacher_Version",
  "Submitted_At",
  "Last_Updated_At",
] as const;

type Header = (typeof REQUIRED_HEADERS)[number];
type FixtureRow = Record<Header, string | number>;
type Severity = "BLOCK" | "REVIEW" | "WARNING" | "INFO" | "ENGINE_DEFECT";

interface RowExpectation {
  requiredCanonicalProblems: string[];
  forbiddenCanonicalProblems: string[];
  allowedAdditionalCanonicalProblems: string[];
  expectedSeverityByProblem: Record<string, Severity>;
}

export interface RegressionExpectationManifest {
  fixtureVersion: string;
  requiredHeaders: string[];
  rows: Record<string, RowExpectation>;
}

const validSubmitted = "2026-07-19T10:00:00Z";
const validUpdated = "2026-07-20T10:00:00Z";

function baseRow(id: string): FixtureRow {
  return {
    Question_ID: id,
    Question_Type: "MCQ",
    Question_Stem: `Which statement correctly identifies the deterministic regression case ${id}?`,
    Option_A: "The first statement is correct",
    Option_B: "The second statement is correct",
    Option_C: "The third statement is correct",
    Option_D: "The fourth statement is correct",
    Correct_Answer: "A",
    Numerical_Answer: "",
    Tolerance: "",
    Answer_Unit: "",
    Explanation:
      "The first statement follows directly from the supplied regression conditions.",
    Subject: "Physics",
    Chapter: "Kinematics",
    Topic: "Motion",
    Difficulty: "Medium",
    Positive_Marks: 4,
    Negative_Marks: 0,
    Partial_Marking_Rule: "",
    Image_Required: "No",
    Image_File_Name: "",
    Image_Source: "",
    Expected_Time_sec: 60,
    Language: "en",
    Copyright_Status: "Teacher Created",
    Source_Reference: "Created by faculty",
    Teacher_Version: "v1",
    Submitted_At: validSubmitted,
    Last_Updated_At: validUpdated,
  };
}

function numericRow(id: string, answer: string): FixtureRow {
  return {
    ...baseRow(id),
    Question_Type: "NUMERICAL",
    Option_A: "",
    Option_B: "",
    Option_C: "",
    Option_D: "",
    Correct_Answer: "",
    Numerical_Answer: answer,
    Tolerance: 0,
    Explanation:
      "The numerical value is obtained by substituting the supplied quantities.",
  };
}

function expectation(
  required: string[] = [],
  severity: Record<string, Severity> = {},
  options: {
    forbidden?: string[];
    allowed?: string[];
  } = {},
): RowExpectation {
  return {
    requiredCanonicalProblems: required,
    forbiddenCanonicalProblems: options.forbidden || [],
    allowedAdditionalCanonicalProblems: options.allowed || [],
    expectedSeverityByProblem: severity,
  };
}

function add(
  rows: FixtureRow[],
  manifestRows: Record<string, RowExpectation>,
  row: FixtureRow,
  rowExpectation: RowExpectation,
): void {
  rows.push(row);
  manifestRows[String(row.Question_ID)] = rowExpectation;
}

export function createFixtureDefinition(): {
  rows: FixtureRow[];
  manifest: RegressionExpectationManifest;
} {
  const rows: FixtureRow[] = [];
  const manifestRows: Record<string, RowExpectation> = {};

  add(rows, manifestRows, baseRow("REG-BASE-001"), expectation([], {}, {}));

  add(
    rows,
    manifestRows,
    {
      ...baseRow("REG-ENC-001"),
      Question_Stem: "The value of x\uFFFD in this deterministic equation is:",
    },
    expectation(["BROKEN_ENCODING"], { BROKEN_ENCODING: "BLOCK" }),
  );
  add(
    rows,
    manifestRows,
    {
      ...baseRow("REG-ENC-002"),
      Explanation: "Using the supplied relation E = h\uFFFD gives the result.",
    },
    expectation(["BROKEN_ENCODING"], { BROKEN_ENCODING: "BLOCK" }),
  );
  add(
    rows,
    manifestRows,
    {
      ...baseRow("REG-ENC-CONTROL"),
      Question_Stem:
        "For the valid Unicode math x\u00B2 + y\u00B2 = 4, which statement is correct?",
    },
    expectation([], {}, { forbidden: ["BROKEN_ENCODING"] }),
  );

  const copyrightCases = [
    ["REG-COPY-001", "Unknown", "Screenshot from coaching material"],
    ["REG-COPY-002", "Unverified", "Scanned textbook page"],
    ["REG-COPY-003", "Unknown", "Copied from question bank PDF"],
    ["REG-COPY-004", "Unverified", "Previous examination paper screenshot"],
    ["REG-COPY-005", "Unknown", "Website content"],
  ] as const;
  for (const [id, status, source] of copyrightCases) {
    add(
      rows,
      manifestRows,
      {
        ...baseRow(id),
        Copyright_Status: status,
        Source_Reference: source,
      },
      expectation(["COPYRIGHT_UNVERIFIED"], {
        COPYRIGHT_UNVERIFIED: "BLOCK",
      }),
    );
  }
  add(
    rows,
    manifestRows,
    baseRow("REG-COPY-CONTROL"),
    expectation([], {}, { forbidden: ["COPYRIGHT_UNVERIFIED"] }),
  );

  const subjectCases = [
    ["REG-SUBJ-001", "Chemistry", "Dual Nature of Matter"],
    ["REG-SUBJ-002", "Mathematics", "Periodic Classification"],
    ["REG-SUBJ-003", "Physics", "Permutations and Combinations"],
  ] as const;
  for (const [id, subject, chapter] of subjectCases) {
    add(
      rows,
      manifestRows,
      { ...baseRow(id), Subject: subject, Chapter: chapter },
      expectation(["WRONG_SUBJECT_TAG"], { WRONG_SUBJECT_TAG: "REVIEW" }),
    );
  }

  for (const id of ["REG-VERS-001", "REG-VERS-002", "REG-VERS-003"]) {
    add(
      rows,
      manifestRows,
      {
        ...baseRow(id),
        Teacher_Version: "final_final_latest2",
        Submitted_At: "2026-07-20T10:00:00Z",
        Last_Updated_At: "2026-07-19T10:00:00Z",
      },
      expectation(["VERSION_TIMESTAMP_CONFLICT"], {
        VERSION_TIMESTAMP_CONFLICT: "REVIEW",
      }),
    );
  }
  add(
    rows,
    manifestRows,
    baseRow("REG-VERS-CONTROL"),
    expectation([], {}, { forbidden: ["VERSION_TIMESTAMP_CONFLICT"] }),
  );

  for (const [id, answer] of [
    ["REG-UNIT-001", "9.8 m/s\u00B2"],
    ["REG-UNIT-002", "3 mol"],
    ["REG-UNIT-003", "8 m"],
  ] as const) {
    add(
      rows,
      manifestRows,
      numericRow(id, answer),
      expectation(
        ["UNIT_EMBEDDED_IN_NUMERIC_ANSWER"],
        { UNIT_EMBEDDED_IN_NUMERIC_ANSWER: "BLOCK" },
        { allowed: ["NUMERIC_ANSWER_NOT_NUMERIC"] },
      ),
    );
  }
  for (const [id, answer] of [
    ["REG-UNIT-CONTROL-001", "1e-3"],
    ["REG-UNIT-CONTROL-002", "-4.5"],
    ["REG-UNIT-CONTROL-003", ".5"],
  ] as const) {
    add(
      rows,
      manifestRows,
      numericRow(id, answer),
      expectation([], {}, { forbidden: ["UNIT_EMBEDDED_IN_NUMERIC_ANSWER"] }),
    );
  }

  const inactiveCases = [
    ["REG-INACTIVE-001", "SCQ", "42"],
    ["REG-INACTIVE-002", "MSQ", "42"],
    ["REG-INACTIVE-003", "ASSERTION_REASON", "42"],
    ["REG-INACTIVE-004", "MATRIX_MATCH", "42"],
    ["REG-INACTIVE-005", "Hotspot", "42"],
  ] as const;
  for (const [id, type, numericalAnswer] of inactiveCases) {
    const row = {
      ...baseRow(id),
      Question_Type: type,
      Numerical_Answer: numericalAnswer,
      Correct_Answer: type === "MSQ" ? "A,B" : "A",
    };
    const allowed =
      type === "MATRIX_MATCH"
        ? ["UNSUPPORTED_TYPE_FOR_TARGET_EXPORT", "MATRIX_MATCH_INCOMPLETE"]
        : type === "Hotspot"
          ? [
              "UNSUPPORTED_TYPE_FOR_TARGET_EXPORT",
              "HOTSPOT_CONFIGURATION_INCOMPLETE",
            ]
          : [];
    add(
      rows,
      manifestRows,
      row,
      expectation(
        ["INACTIVE_FIELD_CONTAINS_DATA"],
        { INACTIVE_FIELD_CONTAINS_DATA: "REVIEW" },
        { allowed },
      ),
    );
  }

  return {
    rows,
    manifest: {
      fixtureVersion: FIXTURE_VERSION,
      requiredHeaders: [...REQUIRED_HEADERS],
      rows: manifestRows,
    },
  };
}

async function parseGeneratedWorkbook() {
  const bytes = fs.readFileSync(FIXTURE_PATH);
  const file = new File([bytes], path.basename(FIXTURE_PATH), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await new Promise<Parameters<ParseXlsxOptions["onSuccess"]>[0]>(
    (resolve, reject) => {
      void parseXlsx({ file, onSuccess: resolve, onError: reject });
    },
  );
}

type ParseXlsxOptions = Parameters<typeof parseXlsx>[0];

export async function generateValidatorRegressionFixture(): Promise<void> {
  const { rows, manifest } = createFixtureDefinition();
  fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AssessmentCore deterministic fixture generator";
  workbook.created = new Date("2026-07-25T00:00:00.000Z");
  workbook.modified = new Date("2026-07-25T00:00:00.000Z");
  workbook.calcProperties.fullCalcOnLoad = false;
  const worksheet = workbook.addWorksheet("Validator Regression");
  worksheet.addRow([...REQUIRED_HEADERS]);
  for (const fixtureRow of rows) {
    worksheet.addRow(
      REQUIRED_HEADERS.map((header) => fixtureRow[header] ?? ""),
    );
  }
  const workbookBuffer = await workbook.xlsx.writeBuffer();
  const archive = await JSZip.loadAsync(workbookBuffer);
  const stableArchiveDate = new Date("2026-07-25T00:00:00.000Z");
  for (const entry of Object.values(archive.files)) {
    entry.date = stableArchiveDate;
  }
  const deterministicWorkbook = await archive.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "DOS",
  });
  fs.writeFileSync(FIXTURE_PATH, deterministicWorkbook);
  fs.writeFileSync(
    EXPECTATIONS_PATH,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  const parsed = await parseGeneratedWorkbook();
  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !parsed.columns.includes(header),
  );
  if (missingHeaders.length) {
    throw new Error(
      `Generated fixture is missing headers: ${missingHeaders.join(", ")}`,
    );
  }
  const rowsById = new Map(
    parsed.rawRows.map((rawRow) => [String(rawRow.Question_ID), rawRow]),
  );
  for (const rowId of Object.keys(manifest.rows)) {
    if (!rowsById.has(rowId))
      throw new Error(`Generated fixture is missing row ${rowId}`);
  }
  const rawText = (rowId: string, column: string) =>
    rowsById.get(rowId)?.__rawImportedRow?.cells[column]?.rawText || "";
  if (!rawText("REG-ENC-001", "Question_Stem").includes("\uFFFD")) {
    throw new Error(
      "REG-ENC-001 U+FFFD was not preserved after XLSX read-back",
    );
  }
  if (!rawText("REG-ENC-002", "Explanation").includes("\uFFFD")) {
    throw new Error(
      "REG-ENC-002 U+FFFD was not preserved after XLSX read-back",
    );
  }
  const copyrightPopulation = parsed.rawRows.filter((row) =>
    rawText(String(row.Question_ID), "Copyright_Status").trim(),
  ).length;
  const versionPopulation = parsed.rawRows.filter(
    (row) =>
      rawText(String(row.Question_ID), "Teacher_Version").trim() &&
      rawText(String(row.Question_ID), "Submitted_At").trim() &&
      rawText(String(row.Question_ID), "Last_Updated_At").trim(),
  ).length;
  if (copyrightPopulation === 0 || versionPopulation === 0) {
    throw new Error(
      "Generated fixture lost copyright or version raw populations",
    );
  }
  const activeUnits = ["REG-UNIT-001", "REG-UNIT-002", "REG-UNIT-003"].filter(
    (id) => rawText(id, "Numerical_Answer").trim(),
  ).length;
  const inactive = Object.keys(manifest.rows).filter(
    (id) =>
      id.startsWith("REG-INACTIVE-") && rawText(id, "Numerical_Answer").trim(),
  ).length;
  if (activeUnits !== 3 || inactive !== 5) {
    throw new Error(
      `Raw mutation population mismatch: active units ${activeUnits}/3, inactive numerical ${inactive}/5`,
    );
  }

  console.log(
    JSON.stringify({
      fixturePath: FIXTURE_PATH,
      expectationsPath: EXPECTATIONS_PATH,
      fixtureVersion: FIXTURE_VERSION,
      rowCount: parsed.rawRows.length,
      mappingHash: parsed.mappingMetadata.hash,
      copyrightPopulation,
      versionPopulation,
      activeUnitBearingNumericalRows: activeUnits,
      inactiveNumericalAnswerRows: inactive,
      encodingReadBack: ["REG-ENC-001", "REG-ENC-002"],
    }),
  );
}

generateValidatorRegressionFixture().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

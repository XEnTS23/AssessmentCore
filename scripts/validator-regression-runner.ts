import fs from "node:fs";
import path from "node:path";
import {
  QuestionRow,
  RawSheetRow,
} from "../src/app/features/batch-creator/core/rowTypes";
import { normalizeRow } from "../src/app/features/batch-creator/normalization/normalizeRow";
import { getMappingMetadata } from "../src/app/features/batch-creator/normalization/canonicalColumnMapping";
import { parseXlsx } from "../src/app/features/batch-creator/upload/parseXlsx";
import { getCanonicalProblem } from "../src/app/features/batch-creator/validation/issueDeduplicator";
import { getDefaultRuleRegistry } from "../src/app/features/batch-creator/validation/ruleRegistry";
import {
  RuleExecutionDiagnostic,
  ValidationEngine,
} from "../src/app/features/batch-creator/validation/validationEngine";

export const VALIDATOR_BUILD = "5.0.0-regression-fixture-stable";
export const RULE_SET_VERSION = "5.0.0";
export const NORMALIZER_VERSION = "1.7.0";
export const REGRESSION_FIXTURE_VERSION = "1.0.0";

export const DEFAULT_FIXTURE_PATH = path.resolve(
  "test/fixtures/validator-regression-fixture.xlsx",
);
export const DEFAULT_EXPECTATIONS_PATH = path.resolve(
  "test/fixtures/validator-regression-expectations.json",
);

export const TARGET_PROBLEMS = [
  "BROKEN_ENCODING",
  "COPYRIGHT_UNVERIFIED",
  "WRONG_SUBJECT_TAG",
  "VERSION_TIMESTAMP_CONFLICT",
  "UNIT_EMBEDDED_IN_NUMERIC_ANSWER",
  "INACTIVE_FIELD_CONTAINS_DATA",
] as const;

export const TARGET_EXPECTED_COUNTS: Record<
  (typeof TARGET_PROBLEMS)[number],
  number
> = {
  BROKEN_ENCODING: 2,
  COPYRIGHT_UNVERIFIED: 5,
  WRONG_SUBJECT_TAG: 3,
  VERSION_TIMESTAMP_CONFLICT: 3,
  UNIT_EMBEDDED_IN_NUMERIC_ANSWER: 3,
  INACTIVE_FIELD_CONTAINS_DATA: 5,
};

type ExpectedSeverity =
  | "BLOCK"
  | "REVIEW"
  | "WARNING"
  | "INFO"
  | "ENGINE_DEFECT";

export interface RegressionRowExpectation {
  requiredCanonicalProblems: string[];
  forbiddenCanonicalProblems: string[];
  allowedAdditionalCanonicalProblems: string[];
  expectedSeverityByProblem: Record<string, ExpectedSeverity>;
}

export interface RegressionExpectationManifest {
  fixtureVersion: string;
  requiredHeaders: string[];
  rows: Record<string, RegressionRowExpectation>;
}

export interface RowExpectationResult {
  rowId: string;
  expectedProblems: string[];
  actualProblems: string[];
  missingRequired: string[];
  forbiddenViolations: string[];
  unexpectedAdditional: string[];
  severityViolations: string[];
}

export interface ProblemCoverage {
  canonicalProblem: string;
  expectedRowIds: string[];
  applicableRowIds: string[];
  detectedRowIds: string[];
  missedRowIds: string[];
  falsePositiveRowIds: string[];
}

export interface RawMutationProof {
  encodingReadBackRowIds: string[];
  copyrightPopulation: number;
  sourceReferencePopulation: number;
  teacherVersionPopulation: number;
  submittedAtPopulation: number;
  lastUpdatedAtPopulation: number;
  activeUnitBearingNumericalRowIds: string[];
  inactiveNumericalAnswerRowIds: string[];
}

export interface ValidatorRegressionRun {
  fixturePath: string;
  expectationsPath: string;
  manifest: RegressionExpectationManifest;
  columns: string[];
  mapping: Record<string, unknown>;
  ingestionMappingHash: string;
  reportMappingHash: string;
  rows: QuestionRow[];
  rawRows: RawSheetRow[];
  rowResults: RowExpectationResult[];
  coverage: ProblemCoverage[];
  rawProof: RawMutationProof;
  diagnostics: Record<string, RuleExecutionDiagnostic>;
  batchIssues: ReturnType<ValidationEngine["getBatchIssues"]>;
}

function canonicalProblemForIssue(
  issue: QuestionRow["issues"][number],
): string {
  return issue.canonicalProblem || getCanonicalProblem(issue.ruleId);
}

function rowId(row: QuestionRow): string {
  return row.metadata.questionId || `source-row-${row.sourceRowNumber}`;
}

function list(values: string[]): string {
  return values.length ? `[${values.join(", ")}]` : "[]";
}

async function ingestWorkbook(fixturePath: string) {
  const bytes = fs.readFileSync(fixturePath);
  const file = new File([bytes], path.basename(fixturePath), {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return await new Promise<
    Parameters<Parameters<typeof parseXlsx>[0]["onSuccess"]>[0]
  >((resolve, reject) => {
    void parseXlsx({ file, onSuccess: resolve, onError: reject });
  });
}

function readRawText(
  rawRowsById: Map<string, RawSheetRow>,
  id: string,
  column: string,
): string {
  return rawRowsById.get(id)?.__rawImportedRow?.cells[column]?.rawText || "";
}

const VALID_SEVERITIES = new Set([
  "BLOCK",
  "REVIEW",
  "WARNING",
  "INFO",
  "ENGINE_DEFECT",
]);

export function validateManifest(
  manifestRawJson: string,
  workbookRowIds: string[],
): { manifest: RegressionExpectationManifest; errors: string[] } {
  const errors: string[] = [];

  // Check for duplicate IDs in manifest rows object raw keys
  const idMatches = manifestRawJson.match(/"REG-[A-Z0-9-]+"\s*:/g) || [];
  const seenJsonIds = new Set<string>();
  for (const match of idMatches) {
    const id = match.replace(/"/g, "").replace(/\s*:/, "");
    if (seenJsonIds.has(id)) {
      errors.push(`Manifest contains duplicate row ID: ${id}`);
    }
    seenJsonIds.add(id);
  }

  let manifest: RegressionExpectationManifest;
  try {
    manifest = JSON.parse(manifestRawJson) as RegressionExpectationManifest;
  } catch (err: any) {
    errors.push(`Manifest is not valid JSON: ${err.message}`);
    return { manifest: {} as any, errors };
  }

  if (!manifest || typeof manifest !== "object" || !manifest.rows) {
    errors.push("Invalid manifest format: missing rows object");
    return { manifest, errors };
  }

  const expectedRowIds = Object.keys(manifest.rows);

  // Validate each row expectation structure
  for (const [id, rowExpectation] of Object.entries(manifest.rows)) {
    if (!rowExpectation || typeof rowExpectation !== "object") {
      errors.push(`Row expectation for ${id} is not an object`);
      continue;
    }

    // Missing arrays check
    if (!Array.isArray(rowExpectation.requiredCanonicalProblems)) {
      errors.push(`Row ${id} is missing array requiredCanonicalProblems`);
    }
    if (!Array.isArray(rowExpectation.forbiddenCanonicalProblems)) {
      errors.push(`Row ${id} is missing array forbiddenCanonicalProblems`);
    }
    if (!Array.isArray(rowExpectation.allowedAdditionalCanonicalProblems)) {
      errors.push(
        `Row ${id} is missing array allowedAdditionalCanonicalProblems`,
      );
    }

    // Unknown severities check
    if (
      !rowExpectation.expectedSeverityByProblem ||
      typeof rowExpectation.expectedSeverityByProblem !== "object"
    ) {
      errors.push(`Row ${id} is missing expectedSeverityByProblem object`);
    } else {
      for (const [problem, severity] of Object.entries(
        rowExpectation.expectedSeverityByProblem,
      )) {
        if (!VALID_SEVERITIES.has(String(severity).toUpperCase())) {
          errors.push(
            `Row ${id} problem ${problem} has unknown severity: ${severity}`,
          );
        }
      }
    }
  }

  // Unknown workbook rows check (workbook rows missing in manifest sidecar)
  const manifestRowIdSet = new Set(expectedRowIds);
  const unknownWorkbookRows = workbookRowIds.filter(
    (id) => !manifestRowIdSet.has(id),
  );
  if (unknownWorkbookRows.length > 0) {
    errors.push(
      `Workbook contains unknown rows missing in manifest: ${unknownWorkbookRows.join(", ")}`,
    );
  }

  // Missing expected rows check (manifest rows missing in workbook)
  const workbookRowIdSet = new Set(workbookRowIds);
  const missingExpectedRows = expectedRowIds.filter(
    (id) => !workbookRowIdSet.has(id),
  );
  if (missingExpectedRows.length > 0) {
    errors.push(
      `Manifest contains expected rows missing in workbook: ${missingExpectedRows.join(", ")}`,
    );
  }

  return { manifest, errors };
}

export async function runValidatorRegressionFixture(
  fixturePath = DEFAULT_FIXTURE_PATH,
  expectationsPath = DEFAULT_EXPECTATIONS_PATH,
): Promise<ValidatorRegressionRun> {
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Regression fixture does not exist: ${fixturePath}`);
  }
  if (!fs.existsSync(expectationsPath)) {
    throw new Error(
      `Regression expectation manifest does not exist: ${expectationsPath}`,
    );
  }

  const rawManifestJson = fs.readFileSync(expectationsPath, "utf8");
  const parsed = await ingestWorkbook(fixturePath);
  const rawRowsById = new Map(
    parsed.rawRows.map((row) => [String(row.Question_ID), row]),
  );
  const workbookRowIds = [...rawRowsById.keys()];

  const { manifest, errors: manifestErrors } = validateManifest(
    rawManifestJson,
    workbookRowIds,
  );
  const errors: string[] = [...manifestErrors];

  if (manifest.fixtureVersion !== REGRESSION_FIXTURE_VERSION) {
    errors.push(
      `Fixture version mismatch: expected ${REGRESSION_FIXTURE_VERSION}, received ${manifest.fixtureVersion}`,
    );
  }

  const missingHeaders = (manifest.requiredHeaders || []).filter(
    (header) => !parsed.columns.includes(header),
  );
  if (missingHeaders.length) {
    errors.push(`Required fixture headers missing: ${list(missingHeaders)}`);
  }
  if (parsed.columns.includes("Known_Issue_Tag")) {
    errors.push(
      "Known_Issue_Tag must not be stored in the regression workbook",
    );
  }

  const reportMappingHash = getMappingMetadata(parsed.mapping).hash;
  if (parsed.mappingMetadata.hash !== reportMappingHash) {
    errors.push(
      `Mapping hash mismatch: ingestion=${parsed.mappingMetadata.hash}, report=${reportMappingHash}`,
    );
  }

  const expectedRowIds = Object.keys(manifest.rows || {});

  const normalizedRows = parsed.rawRows.map((rawRow) =>
    normalizeRow(rawRow, parsed.mapping),
  );
  const registry = getDefaultRuleRegistry();
  const engine = new ValidationEngine(registry);
  const rows = engine.validateBatch(normalizedRows, {
    allRows: normalizedRows,
    columnMapping: parsed.mapping,
    diagnosticMode: true,
  });
  const rowsById = new Map(rows.map((row) => [rowId(row), row]));

  const rowResults: RowExpectationResult[] = [];
  for (const expectedId of expectedRowIds) {
    const expectation = manifest.rows[expectedId];
    const row = rowsById.get(expectedId);
    if (!row) continue;
    const actualProblems = [
      ...new Set(row.issues.map((issue) => canonicalProblemForIssue(issue))),
    ].sort();
    const missingRequired = expectation.requiredCanonicalProblems.filter(
      (problem) => !actualProblems.includes(problem),
    );
    const forbiddenViolations = expectation.forbiddenCanonicalProblems.filter(
      (problem) => actualProblems.includes(problem),
    );
    const permitted = new Set([
      ...expectation.requiredCanonicalProblems,
      ...expectation.allowedAdditionalCanonicalProblems,
    ]);
    const unexpectedAdditional = actualProblems.filter(
      (problem) => !permitted.has(problem),
    );
    const severityViolations: string[] = [];
    for (const [problem, severity] of Object.entries(
      expectation.expectedSeverityByProblem,
    )) {
      const matching = row.issues.filter(
        (issue) => canonicalProblemForIssue(issue) === problem,
      );
      if (
        matching.length > 0 &&
        !matching.some((issue) => issue.severity.toUpperCase() === severity)
      ) {
        severityViolations.push(
          `${problem}: expected ${severity}, actual ${list(
            matching.map((issue) => issue.severity.toUpperCase()),
          )}`,
        );
      }
    }
    rowResults.push({
      rowId: expectedId,
      expectedProblems: [...expectation.requiredCanonicalProblems],
      actualProblems,
      missingRequired,
      forbiddenViolations,
      unexpectedAdditional,
      severityViolations,
    });
  }

  const coverage: ProblemCoverage[] = TARGET_PROBLEMS.map(
    (canonicalProblem) => {
      const expected = expectedRowIds.filter((id) =>
        manifest.rows[id].requiredCanonicalProblems.includes(canonicalProblem),
      );
      const detected = rows
        .filter((row) =>
          row.issues.some(
            (issue) => canonicalProblemForIssue(issue) === canonicalProblem,
          ),
        )
        .map(rowId);
      return {
        canonicalProblem,
        expectedRowIds: expected,
        applicableRowIds: [...expected],
        detectedRowIds: detected.filter((id) => expected.includes(id)),
        missedRowIds: expected.filter((id) => !detected.includes(id)),
        falsePositiveRowIds: detected.filter((id) => !expected.includes(id)),
      };
    },
  );

  for (const item of coverage) {
    const expectedCount =
      TARGET_EXPECTED_COUNTS[
        item.canonicalProblem as keyof typeof TARGET_EXPECTED_COUNTS
      ];
    if (item.expectedRowIds.length !== expectedCount) {
      errors.push(
        `${item.canonicalProblem} manifest expected ${item.expectedRowIds.length}, required ${expectedCount}`,
      );
    }
    if (item.missedRowIds.length) {
      errors.push(
        `${item.canonicalProblem} missed rows: ${list(item.missedRowIds)}`,
      );
    }
    if (item.falsePositiveRowIds.length) {
      errors.push(
        `${item.canonicalProblem} false-positive rows: ${list(item.falsePositiveRowIds)}`,
      );
    }
    const emittedRows = rows
      .filter((row) =>
        row.issues.some(
          (issue) => canonicalProblemForIssue(issue) === item.canonicalProblem,
        ),
      )
      .map(rowId);
    if (item.detectedRowIds.length > 0 && emittedRows.length === 0) {
      errors.push(
        `${item.canonicalProblem} coverage detected rows but final emitted rows were empty`,
      );
    }
    for (const detectedId of item.detectedRowIds) {
      if (!emittedRows.includes(detectedId)) {
        errors.push(
          `${item.canonicalProblem} detected row ${detectedId} lacks the final canonical problem`,
        );
      }
    }
  }

  for (const result of rowResults) {
    if (result.missingRequired.length) {
      errors.push(
        `${result.rowId} missing required: ${list(result.missingRequired)}`,
      );
    }
    if (result.forbiddenViolations.length) {
      errors.push(
        `${result.rowId} forbidden issue violations: ${list(result.forbiddenViolations)}`,
      );
    }
    if (result.unexpectedAdditional.length) {
      errors.push(
        `${result.rowId} unexpected additional issues: ${list(result.unexpectedAdditional)}`,
      );
    }
    if (result.severityViolations.length) {
      errors.push(
        `${result.rowId} severity violations: ${list(result.severityViolations)}`,
      );
    }
  }

  const encodingReadBackRowIds = [
    ["REG-ENC-001", "Question_Stem"],
    ["REG-ENC-002", "Explanation"],
  ]
    .filter(([id, column]) =>
      readRawText(rawRowsById, id, column).includes("\uFFFD"),
    )
    .map(([id]) => id);
  if (encodingReadBackRowIds.length !== 2) {
    errors.push(
      `Raw encoding read-back proof failed: ${list(encodingReadBackRowIds)}`,
    );
  }
  const populated = (column: string) =>
    workbookRowIds.filter((id) => readRawText(rawRowsById, id, column).trim())
      .length;
  const activeUnitBearingNumericalRowIds = [
    "REG-UNIT-001",
    "REG-UNIT-002",
    "REG-UNIT-003",
  ].filter((id) => readRawText(rawRowsById, id, "Numerical_Answer").trim());
  const inactiveNumericalAnswerRowIds = expectedRowIds.filter(
    (id) =>
      id.startsWith("REG-INACTIVE-") &&
      readRawText(rawRowsById, id, "Numerical_Answer").trim(),
  );
  if (activeUnitBearingNumericalRowIds.length !== 3) {
    errors.push(
      `Active unit-bearing numerical rows ${activeUnitBearingNumericalRowIds.length}/3`,
    );
  }
  if (inactiveNumericalAnswerRowIds.length !== 5) {
    errors.push(
      `Inactive Numerical_Answer rows ${inactiveNumericalAnswerRowIds.length}/5`,
    );
  }
  const rawProof: RawMutationProof = {
    encodingReadBackRowIds,
    copyrightPopulation: populated("Copyright_Status"),
    sourceReferencePopulation: populated("Source_Reference"),
    teacherVersionPopulation: populated("Teacher_Version"),
    submittedAtPopulation: populated("Submitted_At"),
    lastUpdatedAtPopulation: populated("Last_Updated_At"),
    activeUnitBearingNumericalRowIds,
    inactiveNumericalAnswerRowIds,
  };
  for (const [field, count] of Object.entries(rawProof).filter(
    ([, value]) => typeof value === "number",
  )) {
    if (count === 0) errors.push(`Raw field population is zero for ${field}`);
  }

  const batchIssues = engine.getBatchIssues();
  if (rows.some((row) => row.issues.some((issue) => issue.scope === "batch"))) {
    errors.push("A batch-level issue was attached to a row");
  }
  if (errors.length) {
    throw new Error(
      `Validator regression fixture failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return {
    fixturePath,
    expectationsPath,
    manifest,
    columns: parsed.columns,
    mapping: parsed.mapping as Record<string, unknown>,
    ingestionMappingHash: parsed.mappingMetadata.hash,
    reportMappingHash,
    rows,
    rawRows: parsed.rawRows,
    rowResults,
    coverage,
    rawProof,
    diagnostics: engine.getExecutionDiagnostics(),
    batchIssues,
  };
}

export function renderValidatorRegressionReport(
  run: ValidatorRegressionRun,
): string {
  const lines = [
    "# AssessmentCore Validator Regression Fixture Report",
    "",
    "## Run Metadata",
    `- Validator Build: ${VALIDATOR_BUILD}`,
    `- Rule Set Version: ${RULE_SET_VERSION}`,
    `- Normalizer Version: ${NORMALIZER_VERSION}`,
    `- Regression Fixture Version: ${REGRESSION_FIXTURE_VERSION}`,
    `- Fixture: ${run.fixturePath}`,
    `- Expectation Manifest: ${run.expectationsPath}`,
    `- Mapping Hash Used by Ingestion: ${run.ingestionMappingHash}`,
    `- Mapping Hash Used by Report: ${run.reportMappingHash}`,
    "",
    "## Raw Field Population and Mutation Read-Back",
    `- Copyright_Status populated: ${run.rawProof.copyrightPopulation}/${run.rows.length}`,
    `- Source_Reference populated: ${run.rawProof.sourceReferencePopulation}/${run.rows.length}`,
    `- Teacher_Version populated: ${run.rawProof.teacherVersionPopulation}/${run.rows.length}`,
    `- Submitted_At populated: ${run.rawProof.submittedAtPopulation}/${run.rows.length}`,
    `- Last_Updated_At populated: ${run.rawProof.lastUpdatedAtPopulation}/${run.rows.length}`,
    `- Raw U+FFFD read-back row IDs: ${list(run.rawProof.encodingReadBackRowIds)}`,
    `- Active unit-bearing numerical rows: ${run.rawProof.activeUnitBearingNumericalRowIds.length}`,
    `- Active unit-bearing numerical row IDs: ${list(run.rawProof.activeUnitBearingNumericalRowIds)}`,
    `- Inactive Numerical_Answer rows: ${run.rawProof.inactiveNumericalAnswerRowIds.length}`,
    `- Inactive Numerical_Answer row IDs: ${list(run.rawProof.inactiveNumericalAnswerRowIds)}`,
    "",
    "## Final-Issue Coverage",
    "",
  ];

  for (const coverage of run.coverage) {
    lines.push(
      `### ${coverage.canonicalProblem}`,
      `- Expected row IDs: ${list(coverage.expectedRowIds)}`,
      `- Applicable row IDs: ${list(coverage.applicableRowIds)}`,
      `- Detected row IDs: ${list(coverage.detectedRowIds)}`,
      `- Missed row IDs: ${list(coverage.missedRowIds)}`,
      `- False-positive row IDs: ${list(coverage.falsePositiveRowIds)}`,
      "",
    );
  }

  lines.push(
    "## Per-Row Integrity",
    "",
    "| Row ID | Expected | Actual Final Canonical Problems | Missed | Forbidden Issue Violations | Unexpected Additional Issues |",
    "|---|---|---|---|---|---|",
  );
  for (const result of run.rowResults) {
    lines.push(
      `| ${result.rowId} | ${list(result.expectedProblems)} | ${list(result.actualProblems)} | ${list(result.missingRequired)} | ${list(result.forbiddenViolations)} | ${list(result.unexpectedAdditional)} |`,
    );
  }

  lines.push("", "## Control-Row Results");
  for (const result of run.rowResults.filter(
    (item) =>
      item.rowId.includes("CONTROL") || item.expectedProblems.length === 0,
  )) {
    lines.push(
      `- ${result.rowId}: actual=${list(result.actualProblems)}; forbidden=${list(result.forbiddenViolations)}; unexpected=${list(result.unexpectedAdditional)}`,
    );
  }

  lines.push("", "## Batch-Level Issues");
  if (!run.batchIssues.length) {
    lines.push("- None");
  } else {
    for (const issue of run.batchIssues) {
      lines.push(
        `- ${issue.ruleId} / ${issue.severity.toUpperCase()}: ${issue.message}`,
      );
    }
  }

  lines.push(
    "",
    "## Source-Rule / Canonical-Problem Diagnostics",
    "",
    "| Source Rule | Pre-dedup Emitted | Suppressed | Final Rows Under Same Rule ID | Canonical Problem | Final Rows Under Canonical Problem |",
    "|---|---:|---:|---:|---|---:|",
  );
  for (const sourceRule of Object.keys(run.diagnostics).sort()) {
    const diagnostic = run.diagnostics[sourceRule];
    const canonicalProblem = getCanonicalProblem(sourceRule);
    const finalSameRule = run.rows.filter((row) =>
      row.issues.some((issue) => issue.ruleId === sourceRule),
    ).length;
    const finalCanonical = run.rows.filter((row) =>
      row.issues.some(
        (issue) => canonicalProblemForIssue(issue) === canonicalProblem,
      ),
    ).length;
    lines.push(
      `| ${sourceRule} | ${diagnostic.issuesEmitted} | ${diagnostic.issuesSuppressed} | ${finalSameRule} | ${canonicalProblem} | ${finalCanonical} |`,
    );
  }

  return `${lines.join("\n")}\n`;
}

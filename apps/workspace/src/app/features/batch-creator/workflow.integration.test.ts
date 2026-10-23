import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_CONFIG } from "./configuration/defaultExportConfig";
import type { RawSheetRow } from "./core/rowTypes";
import { buildAndPackage } from "./export/packageBuilder";
import {
  applyManualEditorState,
  buildRowFromEditor,
  rowToEditorState,
} from "./fixing/manualFixEngine";
import { addOptionalAuthoringSection } from "./fixing/manualFixSections";
import { normalizeRow } from "./normalization/normalizeRow";
import type { ColumnMapping } from "./normalization/normalizeAnswer";
import {
  clearRecentWorkflowEvents,
  getRecentWorkflowEvents,
} from "./observability/workflowTelemetry";
import { getDefaultRuleRegistry } from "./validation/ruleRegistry";
import { ValidationEngine } from "./validation/validationEngine";

const mapping: ColumnMapping = {
  questionId: "Question ID",
  type: "Type",
  stem: "Question",
  options: ["Option A", "Option B", "Option C", "Option D"],
  correctAnswer: "Answer",
  explanation: "Explanation",
};

function rawQuestion(): RawSheetRow {
  return {
    __internalId: "workflow-row-1",
    __sourceRowNumber: 2,
    "Question ID": "STEM-001",
    Type: "MCQ",
    Question: "Solve $x + 1 = 2",
    "Option A": "x = 1",
    "Option B": "x = 2",
    "Option C": "x = 3",
    "Option D": "x = 4",
    Answer: "A",
    Explanation: "Subtract one from both sides.",
  };
}

beforeEach(clearRecentWorkflowEvents);

describe("batch creator business workflow", () => {
  it("validates an imported STEM question, manually repairs it, revalidates, and exports it", async () => {
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const normalized = normalizeRow(rawQuestion(), mapping);
    const initiallyValidated = engine.validateBatch([normalized], {
      allRows: [normalized],
      columnMapping: mapping,
    });

    expect(initiallyValidated[0].issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonicalProblem: "MALFORMED_LATEX_DELIMITER",
        }),
      ]),
    );
    expect(initiallyValidated[0].status).not.toBe("valid");

    const editor = rowToEditorState(initiallyValidated[0]);
    editor.stem = "Solve $x + 1 = 2$.";
    editor.explanation = "";
    editor.sections = editor.sections.filter(
      (section) => section.type !== "explanation",
    );
    editor.sections = addOptionalAuthoringSection(
      editor.sections,
      "instructions",
    ).map((section) =>
      section.type === "instructions"
        ? { ...section, content: "Use algebraic reasoning." }
        : section,
    );
    const candidate = buildRowFromEditor(initiallyValidated[0], editor);
    const saved = applyManualEditorState(
      initiallyValidated[0],
      editor,
      engine,
      {
        allRows: [candidate],
        columnMapping: mapping,
      },
    );

    expect(saved.row.status).toBe("valid");
    expect(
      saved.row.issues.some(
        (issue) => issue.ruleId === "LATEX_STEM_DELIMITER_VALID",
      ),
    ).toBe(false);
    expect(saved.row.history.at(-1)?.action).toBe("manual_editor_save");

    const packageResult = await buildAndPackage(
      [saved.row],
      structuredClone(DEFAULT_EXPORT_CONFIG),
    );
    expect(packageResult.isDownloadReady).toBe(true);
    expect(packageResult.validatedArtifacts).toHaveLength(1);

    const artifact = packageResult.validatedArtifacts[0];
    expect(artifact.mimeType).toBe("application/json");
    expect(String(artifact.data)).toContain("Solve $x + 1 = 2$.");
    const exportedQuestion = JSON.parse(String(artifact.data)).questions[0];
    expect(exportedQuestion.componentOrder).toEqual([
      "question",
      "response",
      "metadata",
      "instructions",
    ]);
    expect(exportedQuestion.authoringComponents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "instructions",
          content: "Use algebraic reasoning.",
        }),
      ]),
    );
    expect(
      exportedQuestion.authoringComponents.some(
        (component: { type: string }) => component.type === "explanation",
      ),
    ).toBe(false);

    const buildEvents = getRecentWorkflowEvents().filter(
      (event) => event.stage === "build",
    );
    expect(buildEvents.map((event) => event.name)).toEqual([
      "operation_started",
      "operation_completed",
    ]);
    expect(buildEvents[1].metrics.artifacts).toBe(1);
  });

  it("keeps the export gate authoritative when a stale invalid row bypasses UI state", async () => {
    const normalized = normalizeRow(rawQuestion(), mapping);
    if (
      normalized.normalizedQuestion &&
      "stem" in normalized.normalizedQuestion
    ) {
      normalized.normalizedQuestion.stem = "";
    }
    normalized.status = "valid";
    normalized.issues = [];

    const packageResult = await buildAndPackage(
      [normalized],
      structuredClone(DEFAULT_EXPORT_CONFIG),
    );

    expect(packageResult.isDownloadReady).toBe(false);
    expect(
      packageResult.validationErrors.some(
        (error) => error.code === "EXPORT_READINESS_BLOCKED",
      ),
    ).toBe(true);
    expect(getRecentWorkflowEvents().at(-1)).toMatchObject({
      stage: "build",
      name: "operation_failed",
      code: "EXPORT_READINESS_BLOCKED",
    });
  });

  it("persists saved manual fixes when navigating across wizard stages", () => {
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const normalized = normalizeRow(rawQuestion(), mapping);
    const validated = engine.validateBatch([normalized], {
      allRows: [normalized],
      columnMapping: mapping,
    });

    const editor = rowToEditorState(validated[0]);
    editor.stem = "Solve $x + 1 = 2$.";
    const candidate = buildRowFromEditor(validated[0], editor);
    const saved = applyManualEditorState(validated[0], editor, engine, {
      allRows: [candidate],
      columnMapping: mapping,
    });

    // Simulate storing processed rows in wizard state
    const wizardProcessedRows = [saved.row];

    // Verify saved row retains updated stem and valid status
    expect(wizardProcessedRows[0].status).toBe("valid");
    if (
      wizardProcessedRows[0].normalizedQuestion &&
      "stem" in wizardProcessedRows[0].normalizedQuestion
    ) {
      expect(wizardProcessedRows[0].normalizedQuestion.stem).toBe(
        "Solve $x + 1 = 2$.",
      );
    }
  });
});

import { describe, expect, it } from "vitest";
import type { QuestionRow } from "../core/rowTypes";
import { ValidationEngine } from "../validation/validationEngine";
import { getDefaultRuleRegistry } from "../validation/ruleRegistry";
import { buildCorrectedSheet } from "../export/correctedSheetBuilder";
import {
  applyManualEditorState,
  buildRowFromEditor,
  rowToEditorState,
} from "./manualFixEngine";

function createRow(): QuestionRow {
  return {
    id: "rich-editor-row",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem: "Choose the answer.",
      options: [
        { id: "A", label: "A", text: "First" },
        { id: "B", label: "B", text: "Second" },
      ],
      correctAnswerId: "A",
    },
    metadata: { questionId: "Q-1" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
  };
}

describe("rich Manual Fix row editing", () => {
  it("builds an ORDER question with synchronized rich content and delivery settings", () => {
    const row = createRow();
    const editor = rowToEditorState(row);
    editor.type = "ORDER";
    editor.stem = "Order the values $x^2$, $x^3$.";
    editor.explanation = "The graph is increasing for $x > 1$.";
    editor.correctSequenceIds = ["B", "A"];
    editor.options = [editor.options[1], editor.options[0]];
    editor.metadata.subject = "Mathematics";
    editor.marks = 4;
    editor.negativeMarks = -1;
    editor.timeLimitSeconds = 90;
    editor.mediaReferences = [
      {
        id: "graph-1",
        publicUrlSource: "https://example.com/graph.png",
        role: "question_stem",
        altText: "Increasing curve on Cartesian axes",
        contentType: "graph",
      },
    ];

    const updated = buildRowFromEditor(row, editor);

    expect(updated.normalizedQuestion).toMatchObject({
      type: "ORDER",
      correctSequenceIds: ["B", "A"],
    });
    expect(updated.mediaReferences[0]).toMatchObject({
      contentType: "graph",
      status: "pending",
    });
    expect(updated.metadata).toMatchObject({
      mediaUrl: "https://example.com/graph.png",
      subject: "Mathematics",
      negativeMarks: -1,
    });
    expect(updated.mathReferences).toHaveLength(3);
    expect(updated.scoringConfig.marks).toBe(4);
    expect(updated.timeLimitConfig?.timeLimitSeconds).toBe(90);
  });

  it("validates media failures as part of the same atomic save", () => {
    const row = createRow();
    const editor = rowToEditorState(row);
    editor.mediaReferences = [
      {
        id: "bad-media",
        publicUrlSource: "javascript:alert(1)",
        role: "question_stem",
        altText: "",
        contentType: "diagram",
      },
    ];
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const candidate = buildRowFromEditor(row, editor);
    const result = applyManualEditorState(row, editor, engine, {
      allRows: [candidate],
      columnMapping: {},
    });

    expect(result.row.status).toBe("rejected");
    expect(result.row.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "MEDIA_URL_INVALID_FORMAT",
          evidence: expect.objectContaining({ mediaId: "bad-media" }),
        }),
      ]),
    );
  });

  it("rejects invalid scoring and timing values from the editor", () => {
    const row = createRow();
    const editor = rowToEditorState(row);
    editor.marks = 0;
    editor.negativeMarks = 1;
    editor.timeLimitSeconds = -5;
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const candidate = buildRowFromEditor(row, editor);
    const result = applyManualEditorState(row, editor, engine, {
      allRows: [candidate],
      columnMapping: {},
    });

    expect(result.row.status).toBe("rejected");
    expect(
      result.row.issues.map((issue) => issue.canonicalProblem || issue.ruleId),
    ).toEqual(
      expect.arrayContaining([
        "POSITIVE_MARKS_INVALID",
        "NEGATIVE_MARKS_INVALID",
        "TIME_LIMIT_INVALID",
      ]),
    );
  });

  it("preserves rich fields in corrected-sheet output", () => {
    const row = createRow();
    const editor = rowToEditorState(row);
    editor.timeLimitSeconds = 60;
    editor.stem = "Evaluate $x^2$.";
    editor.mediaReferences = [
      {
        id: "diagram-1",
        publicUrlSource: "https://example.com/diagram.png",
        role: "explanation",
        altText: "Worked solution diagram",
        contentType: "diagram",
      },
    ];

    const output = buildCorrectedSheet([buildRowFromEditor(row, editor)]);

    expect(output.data).toContain("media_references");
    expect(output.data).toContain("math_reference_count");
    expect(output.data).toContain("time_limit_seconds");
    expect(output.data).toContain("https://example.com/diagram.png");
  });
  it("removes deleted card-owned assets while retaining imported media", () => {
    const row = createRow();
    const editor = rowToEditorState(row);
    editor.stem =
      'Choose the answer.<img src="https://example.com/owned.png" alt="Owned" />';
    editor.mediaReferences = [
      {
        id: "owned",
        publicUrlSource: "https://example.com/owned.png",
        role: "question_stem",
        altText: "Owned",
        contentType: "image",
        ownerId: "question",
      },
      {
        id: "imported",
        publicUrlSource: "https://example.com/imported.png",
        role: "question_stem",
        altText: "Imported",
        contentType: "image",
      },
    ];

    expect(
      buildRowFromEditor(row, editor).mediaReferences.map((ref) => ref.id),
    ).toEqual(["owned", "imported"]);

    editor.stem = "Choose the answer.";
    expect(
      buildRowFromEditor(row, editor).mediaReferences.map((ref) => ref.id),
    ).toEqual(["imported"]);
  });
});

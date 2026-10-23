import { describe, expect, it } from "vitest";
import type { QuestionRow } from "../core/rowTypes";
import { buildCorrectedSheet } from "../export/correctedSheetBuilder";
import { buildRowFromEditor, rowToEditorState } from "./manualFixEngine";
import {
  addOptionalAuthoringSection,
  moveAuthoringSection,
  reorderAuthoringSections,
} from "./manualFixSections";

function createRow(explanation?: string): QuestionRow {
  return {
    id: "section-row",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem: "Choose one.",
      options: [
        { id: "A", label: "A", text: "One" },
        { id: "B", label: "B", text: "Two" },
      ],
      correctAnswerId: "A",
      explanation,
    },
    metadata: { questionId: "Q-SECTION" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
  };
}

describe("Manual Fix authoring sections", () => {
  it("migrates a legacy explanation into an optional section", () => {
    const editor = rowToEditorState(createRow("Because one is correct."));

    expect(editor.sections.map((section) => section.type)).toEqual([
      "question",
      "response",
      "metadata",
      "explanation",
    ]);
    expect(
      editor.sections.find((section) => section.type === "explanation")
        ?.content,
    ).toBe("Because one is correct.");
  });

  it("persists section order and feedback without losing legacy explanation", () => {
    const row = createRow();
    const editor = rowToEditorState(row);
    editor.sections = addOptionalAuthoringSection(
      editor.sections,
      "explanation",
    );
    editor.sections = addOptionalAuthoringSection(
      editor.sections,
      "feedback_incorrect",
    );
    editor.explanation = "One is the first counting number.";
    editor.sections = editor.sections.map((section) =>
      section.type === "feedback_incorrect"
        ? { ...section, content: "Review the counting sequence." }
        : section,
    );
    editor.sections = reorderAuthoringSections(
      editor.sections,
      "metadata",
      "question",
    );

    const saved = buildRowFromEditor(row, editor);
    const reopened = rowToEditorState(saved);

    expect(saved.manualFixSections?.map((section) => section.type)).toEqual([
      "metadata",
      "question",
      "response",
      "explanation",
      "feedback_incorrect",
    ]);
    expect(saved.normalizedQuestion).toMatchObject({
      explanation: "One is the first counting number.",
    });
    expect(
      reopened.sections.find((section) => section.type === "feedback_incorrect")
        ?.content,
    ).toBe("Review the counting sequence.");
    expect(buildCorrectedSheet([saved]).data).toContain("feedback_incorrect");
  });

  it("supports keyboard-accessible one-step section movement", () => {
    const sections = rowToEditorState(createRow()).sections;
    const moved = moveAuthoringSection(sections, "metadata", -1);

    expect(moved.map((section) => section.id)).toEqual([
      "question",
      "metadata",
      "response",
    ]);
    expect(moveAuthoringSection(moved, "question", -1)).toBe(moved);
  });
  it("persists ordered conditional feedback rules", () => {
    const row = createRow();
    const editor = rowToEditorState(row);
    editor.sections = addOptionalAuthoringSection(
      editor.sections,
      "conditional_feedback",
    );
    editor.sections = editor.sections.map((section) =>
      section.type === "conditional_feedback"
        ? {
            ...section,
            conditionalFeedbackRules: [
              {
                id: "rule-b",
                priority: 0,
                condition: { operator: "choice_selected", optionId: "B" },
                content: "B is a common misconception.",
              },
            ],
          }
        : section,
    );

    const saved = buildRowFromEditor(row, editor);
    const reopened = rowToEditorState(saved);
    const conditionalSection = reopened.sections.find(
      (section) => section.type === "conditional_feedback",
    );

    expect(conditionalSection?.conditionalFeedbackRules).toEqual([
      {
        id: "rule-b",
        priority: 0,
        condition: { operator: "choice_selected", optionId: "B" },
        content: "B is a common misconception.",
      },
    ]);
    expect(buildCorrectedSheet([saved]).data).toContain("conditional_feedback");
  });
});

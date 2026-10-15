import { describe, expect, it } from "vitest";
import type { QuestionRow } from "../core/rowTypes";
import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";
import { renderStudentPreviewHtml } from "./studentPreviewEngine";

function createPreviewRow(): QuestionRow {
  return {
    id: "preview-feedback-row",
    sourceRowNumber: 2,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem: "Choose one.",
      options: [
        { id: "A", label: "A", text: "Correct choice" },
        { id: "B", label: "B", text: "Distractor" },
      ],
      correctAnswerId: "A",
    },
    metadata: { questionId: "Q-FEEDBACK" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
    manualFixSections: [
      { id: "question", type: "question" },
      { id: "response", type: "response" },
      { id: "metadata", type: "metadata" },
      {
        id: "correct-feedback",
        type: "feedback_correct",
        content: "Well done.",
      },
      {
        id: "incorrect-feedback",
        type: "feedback_incorrect",
        content: "Review this topic.",
      },
      {
        id: "conditional-feedback",
        type: "conditional_feedback",
        conditionalFeedbackRules: [
          {
            id: "rule-b",
            priority: 0,
            condition: { operator: "choice_selected", optionId: "B" },
            content: "Option B confuses cause and effect.",
          },
        ],
      },
    ],
  };
}

describe("student preview conditional feedback", () => {
  it("embeds response-specific rules and preserves general fallbacks", () => {
    const html = renderStudentPreviewHtml(
      createPreviewRow(),
      DEFAULT_EXPORT_CONFIG,
    );

    expect(html).toContain("Option B confuses cause and effect.");
    expect(html).toContain("Review this topic.");
    expect(html).toContain("Well done.");
    expect(html).toContain("matchesFeedbackRule");
    expect(html).toContain("conditionalMatch ? conditionalMatch.content");
  });

  it("uses block containers for tables in stems and choices", () => {
    const row = createPreviewRow();
    if (row.normalizedQuestion?.type !== "MCQ") {
      throw new Error("Expected an MCQ preview fixture.");
    }
    const table =
      '<table><colgroup><col style="width: 120px;" /></colgroup><tbody><tr><td>Cell</td></tr></tbody></table>';
    const editorWrappedTable = `<div>${table}</div>`;
    row.normalizedQuestion.stem = editorWrappedTable;
    row.normalizedQuestion.options[0].text = editorWrappedTable;

    const html = renderStudentPreviewHtml(row, DEFAULT_EXPORT_CONFIG);

    expect(html).toContain(
      '<div class="stem"><table><colgroup><col style="width: 120px" />',
    );
    expect(html).toContain(
      '<div class="option-content"><table><colgroup><col style="width: 120px" />',
    );
    expect(html).not.toContain('<p class="stem"><table>');
    expect(html).not.toContain("&lt;div&gt;");
  });

  it("uses authored image dimensions without adding a duplicate metadata image", () => {
    const row = createPreviewRow();
    if (row.normalizedQuestion?.type !== "MCQ") {
      throw new Error("Expected an MCQ preview fixture.");
    }
    const url = "https://example.com/diagram.png";
    row.metadata.mediaUrl = url;
    row.normalizedQuestion.stem =
      `Inspect <img src="${url}" alt="Diagram" style="width: 360px; height: 200px;" />`;

    const html = renderStudentPreviewHtml(row, DEFAULT_EXPORT_CONFIG);

    expect(html.split(url)).toHaveLength(2);
    expect(html).toContain("width: 360px");
    expect(html).toContain("height: 200px");

    row.normalizedQuestion.stem = "Inspect the separate diagram.";
    const legacyHtml = renderStudentPreviewHtml(row, DEFAULT_EXPORT_CONFIG);
    expect(legacyHtml).toContain(`${url}?t=`);
    expect(legacyHtml).toContain('alt="Question Media"');
  });
});

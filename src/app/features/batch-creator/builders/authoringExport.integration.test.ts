import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";
import type { ExportConfig } from "../core/exportTypes";
import type { QuestionRow } from "../core/rowTypes";
import { buildJsonExport } from "./jsonBuilder";
import { buildQti21Export } from "./qti21Builder";
import { buildQti30Export } from "./qti30Builder";

function config(target: ExportConfig["target"]): ExportConfig {
  return { ...structuredClone(DEFAULT_EXPORT_CONFIG), target };
}

function editedRow(): QuestionRow {
  return {
    id: "manual-build-row",
    sourceRowNumber: 7,
    rawRow: { Question: "Original imported stem" },
    normalizedQuestion: {
      type: "MCQ",
      stem: "Edited question stem",
      options: [
        { id: "A", label: "A", text: "Edited option A" },
        { id: "B", label: "B", text: "Edited option B" },
      ],
      correctAnswerId: "A",
      explanation: "Legacy explanation that was deleted as a card",
    },
    metadata: {
      questionId: "Q-MANUAL-EDIT",
      subject: "Edited subject",
      topic: "Edited topic",
    },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 4, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
    manualFixSections: [
      { id: "metadata", type: "metadata" },
      { id: "question", type: "question" },
      { id: "response", type: "response" },
      {
        id: "instructions",
        type: "instructions",
        content: "Read every option carefully.",
      },
      {
        id: "conditional",
        type: "conditional_feedback",
        conditionalFeedbackRules: [
          {
            id: "rule-b",
            priority: 0,
            condition: { operator: "choice_selected", optionId: "B" },
            content: "Option B reflects the common misconception.",
          },
        ],
      },
      {
        id: "incorrect",
        type: "feedback_incorrect",
        content: "Review the key distinction.",
      },
      {
        id: "correct",
        type: "feedback_correct",
        content: "Correct reasoning.",
      },
    ],
  };
}

function numericEditedRow(): QuestionRow {
  return {
    id: "numeric-manual-row",
    sourceRowNumber: 8,
    rawRow: {},
    normalizedQuestion: {
      type: "TEXT_ENTRY",
      stem: "Enter the measured value.",
      mode: "numeric",
      acceptedAnswers: ["10"],
      numericTolerance: 0,
      units: "cm",
      caseSensitive: false,
      trimPolicy: "trim",
    },
    metadata: { questionId: "Q-NUMERIC-MANUAL" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 2, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
    manualFixSections: [
      { id: "question", type: "question" },
      { id: "response", type: "response" },
      { id: "metadata", type: "metadata" },
      {
        id: "conditional",
        type: "conditional_feedback",
        conditionalFeedbackRules: [
          {
            id: "low-range",
            priority: 0,
            condition: { operator: "numeric_range", min: 0, max: 9.99 },
            content: "Your value is below the expected measurement.",
          },
        ],
      },
    ],
  };
}
function manifestXml(result: ReturnType<typeof buildQti21Export>): string {
  const manifest = result.artifacts.find(
    (artifact) => artifact.fileName === "imsmanifest.xml",
  );
  expect(manifest).toBeDefined();
  return manifest?.data as string;
}

function itemXml(result: ReturnType<typeof buildQti21Export>): string {
  const item = result.artifacts.find((artifact) =>
    artifact.fileName.startsWith("item_"),
  );
  expect(item).toBeDefined();
  expect(typeof item?.data).toBe("string");
  return item?.data as string;
}

describe("Manual Fix revision build integration", () => {
  it("serializes edited, added, removed, and reordered components to JSON", () => {
    const result = buildJsonExport([editedRow()], config("json"));
    expect(result.success).toBe(true);
    const payload = JSON.parse(result.artifacts[0].data as string);
    const question = payload.questions[0];

    expect(question.stem).toBe("Edited question stem");
    expect(question.options.map((option: { id: string }) => option.id)).toEqual(
      ["A", "B"],
    );
    expect(question.correctAnswerId).toBe("A");
    expect(question.metadata.subject).toBe("Edited subject");
    expect(question.scoring.marks).toBe(4);
    expect(question.componentOrder).toEqual([
      "metadata",
      "question",
      "response",
      "instructions",
      "conditional_feedback",
      "feedback_incorrect",
      "feedback_correct",
    ]);
    expect(
      question.authoringComponents.some(
        (component: { type: string }) => component.type === "explanation",
      ),
    ).toBe(false);
    expect(question.authoringComponents[0]).toMatchObject({
      type: "metadata",
      position: 0,
      required: true,
    });
    expect(
      question.authoringSections[4].conditionalFeedbackRules[0],
    ).toMatchObject({
      id: "rule-b",
      condition: { operator: "choice_selected", optionId: "B" },
    });
  });

  it("builds Manual Fix sections and conditional rules into QTI 2.1", () => {
    const result = buildQti21Export([editedRow()], config("qti_2_1"));
    expect(result.success).toBe(true);
    const xml = itemXml(result);
    const manifest = manifestXml(result);

    expect(xml).toContain("Edited question stem");
    expect(xml).toContain("Edited option A");
    expect(xml).not.toContain("Option C");
    expect(xml).toContain("Read every option carefully.");
    expect(xml).toContain("Option B reflects the common misconception.");
    expect(xml).toContain("Review the key distinction.");
    expect(xml).toContain("Correct reasoning.");
    expect(xml).toContain('identifier="CONDITIONAL_1"');
    expect(xml).toContain('<baseValue baseType="identifier">B</baseValue>');
    expect(xml).not.toContain("Legacy explanation that was deleted as a card");
    expect(manifest).toContain("<ac:subject>Edited subject</ac:subject>");
    expect(manifest).toContain(
      "<ac:componentOrder>metadata,question,response,instructions,conditional_feedback,feedback_incorrect,feedback_correct</ac:componentOrder>",
    );
  });

  it("builds the same authoritative components into QTI 3.0", () => {
    const result = buildQti30Export([editedRow()], config("qti_3_0"));
    expect(result.success).toBe(true);
    const xml = itemXml(result);
    const manifest = manifestXml(result);

    expect(xml).toContain("Edited question stem");
    expect(xml).toContain("Read every option carefully.");
    expect(xml).toContain('identifier="CONDITIONAL_1"');
    expect(xml).toContain(
      '<qti-base-value base-type="identifier">B</qti-base-value>',
    );
    expect(xml).toContain("Review the key distinction.");
    expect(xml).not.toContain("Legacy explanation that was deleted as a card");
    expect(manifest).toContain("<ac:topic>Edited topic</ac:topic>");
    expect(manifest).toContain("<ac:marks>4</ac:marks>");
  });

  it("preserves safe Manual Fix image and table dimensions in both QTI builds", () => {
    const row = editedRow();
    if (!row.normalizedQuestion || row.normalizedQuestion.type !== "MCQ") {
      throw new Error("Expected MCQ fixture");
    }
    row.normalizedQuestion.stem = [
      "Inspect the diagram.",
      '<img src="https://example.com/diagram.png" alt="Geometry diagram" title="Scaled diagram" style="width: 420px; height: 240px; max-width: 90%; object-fit: contain;" />',
      '<table style="border-collapse: collapse; width: 360px;"><tbody><tr style="height: 48px;"><td style="width: 180px; padding: 8px;">A</td><td style="width: 180px; padding: 8px;">B</td></tr></tbody></table>',
    ].join("");

    for (const xml of [
      itemXml(buildQti21Export([row], config("qti_2_1"))),
      itemXml(buildQti30Export([row], config("qti_3_0"))),
    ]) {
      expect(xml).toContain('<img src="https://example.com/diagram.png"');
      expect(xml).toContain('title="Scaled diagram"');
      expect(xml).toContain("width: 420px");
      expect(xml).toContain("height: 240px");
      expect(xml).toContain("max-width: 90%");
      expect(xml).toContain("object-fit: contain");
      expect(xml).toContain("<table");
      expect(xml).toContain("width: 360px");
      expect(xml).toContain("height: 48px");
      expect(xml).toContain("width: 180px");
    }
  });

  it("translates numeric response conditions into both QTI dialects", () => {
    const qti21 = itemXml(
      buildQti21Export([numericEditedRow()], config("qti_2_1")),
    );
    const qti30 = itemXml(
      buildQti30Export([numericEditedRow()], config("qti_3_0")),
    );

    expect(qti21).toContain("Your value is below the expected measurement.");
    expect(qti21).toContain("<gte>");
    expect(qti21).toContain("<lte>");
    expect(qti30).toContain("<qti-gte>");
    expect(qti30).toContain("<qti-lte>");
    expect(qti30).toContain('identifier="CONDITIONAL_1"');
  });

  it("generates a clean, untruncated plain-text title attribute without HTML tags or ellipsis", () => {
    const row = editedRow();
    row.normalizedQuestion = {
      type: "MCQ",
      stem: 'What is the capital of India?<div><table border="1"><tr><td>Details</td></tr></table></div>',
      options: [
        { id: "A", label: "A", text: "New Delhi" },
        { id: "B", label: "B", text: "Mumbai" },
      ],
      correctAnswerId: "A",
    };

    const qti30Result = buildQti30Export([row], config("qti_3_0"));
    const xml30 = itemXml(qti30Result);
    expect(xml30).toContain('title="What is the capital of India? Details"');
    expect(xml30).not.toContain("&lt;div&gt;");
    expect(xml30).not.toContain("…");

    const qti21Result = buildQti21Export([row], config("qti_2_1"));
    const xml21 = itemXml(qti21Result);
    expect(xml21).toContain('title="What is the capital of India? Details"');
    expect(xml21).not.toContain("&lt;div&gt;");
    expect(xml21).not.toContain("…");
  });

  it("replaces non-breaking space characters in XML indentation with standard spaces", () => {
    const row = editedRow();
    row.normalizedQuestion = {
      type: "MCQ",
      stem: "Sample question stem",
      options: [
        { id: "A", label: "A", text: "Option A" },
        { id: "B", label: "B", text: "Option B" },
      ],
      correctAnswerId: "A",
    };

    const qti30Result = buildQti30Export([row], config("qti_3_0"));
    const xml30 = itemXml(qti30Result);
    expect(xml30).not.toContain("\u00A0");

    const qti21Result = buildQti21Export([row], config("qti_2_1"));
    const xml21 = itemXml(qti21Result);
    expect(xml21).not.toContain("\u00A0");
  });
});

import { describe, expect, it } from "vitest";
import { REQUIRED_MEDIA_MISSING, MEDIA_REFERENCE_NOT_FOUND } from "./media.rules";
import { QuestionRow } from "../core/rowTypes";

function createMockRow(overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: "test-row-1",
    sourceRowNumber: 1,
    rawRow: {},
    normalizedQuestion: {
      type: "MCQ",
      stem: "What is 2 + 2?",
      options: [
        { id: "A", label: "A", text: "4" },
        { id: "B", label: "B", text: "5" },
      ],
      correctAnswerId: "A",
    },
    metadata: { questionId: "Q1" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 1 },
    history: [],
    status: "valid",
    issues: [],
    ...overrides,
  };
}

describe("Media Validation Rules - Optional Media Behavior", () => {
  it("treats REQUIRED_MEDIA_MISSING as a non-blocking warning", () => {
    const row = createMockRow({
      rawRow: { Image_Required: "Yes" },
    });
    const issues = REQUIRED_MEDIA_MISSING.validate(row, {} as any);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("REQUIRED_MEDIA_MISSING");
    expect(issues[0].severity).toBe("warning");
    expect(issues[0].blocksExport).toBe(false);
  });

  it("treats MEDIA_REFERENCE_NOT_FOUND as a non-blocking review item", () => {
    const row = createMockRow({
      rawRow: { Image_File_Name: "missing_diagram.png" },
    });
    const context = { packageAssets: ["other_image.png"] };
    const issues = MEDIA_REFERENCE_NOT_FOUND.validate(row, context as any);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("MEDIA_REFERENCE_NOT_FOUND");
    expect(issues[0].severity).toBe("review");
    expect(issues[0].blocksExport).toBe(false);
  });

  it("does not report REQUIRED_MEDIA_MISSING when Image_Required is No or empty", () => {
    const rowNo = createMockRow({ rawRow: { Image_Required: "No" } });
    const rowEmpty = createMockRow({ rawRow: {} });
    expect(REQUIRED_MEDIA_MISSING.validate(rowNo, {} as any)).toHaveLength(0);
    expect(REQUIRED_MEDIA_MISSING.validate(rowEmpty, {} as any)).toHaveLength(0);
  });
});

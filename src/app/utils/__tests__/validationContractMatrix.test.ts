import { describe, expect, it } from "vitest";
import {
  validateAllQuestions,
  type QuestionData,
  type ValidationStatus,
} from "../questionValidator";

const mapping = {
  questionCol: "Question",
  answerCol: "Answer",
  optionCols: ["Option A", "Option B", "Option C", "Option D"],
  typeCol: "Type",
  toleranceCol: "Tolerance",
  orderCol: "Order Items",
};

function row(id: string, data: Record<string, unknown>): QuestionData {
  return { id, ...data } as QuestionData;
}

interface ContractCase {
  name: string;
  data: QuestionData;
  expectedStatus: ValidationStatus;
  expectedIssue?: string;
}

const contractCases: ContractCase[] = [
  {
    name: "accepts a clean MCQ",
    data: row("matrix-mcq-valid", {
      Type: "mcq",
      Question: "What is 2 + 2?",
      "Option A": "3",
      "Option B": "4",
      Answer: "B",
    }),
    expectedStatus: "valid",
  },
  {
    name: "rejects an MCQ answer that cannot map to an option",
    data: row("matrix-mcq-invalid", {
      Type: "mcq",
      Question: "Choose a primary color.",
      "Option A": "Red",
      "Option B": "Blue",
      Answer: "Green",
    }),
    expectedStatus: "rejected",
    expectedIssue: "ANSWER_NOT_IN_OPTIONS",
  },
  {
    name: "accepts comma-delimited MSQ answers because the parser accepts commas",
    data: row("matrix-msq-valid", {
      Type: "msq",
      Question: "Select the vowels.",
      "Option A": "A",
      "Option B": "E",
      "Option C": "B",
      Answer: "A,B",
    }),
    expectedStatus: "valid",
  },
  {
    name: "rejects mixed MSQ delimiters",
    data: row("matrix-msq-mixed", {
      Type: "msq",
      Question: "Select all three values.",
      "Option A": "One",
      "Option B": "Two",
      "Option C": "Three",
      Answer: "A,B|C",
    }),
    expectedStatus: "rejected",
    expectedIssue: "INVALID_ANSWER_FORMAT",
  },
  {
    name: "rejects text-entry questions that contain choice options",
    data: row("matrix-text-options", {
      Type: "text_entry",
      Question: "Enter the chemical symbol for water.",
      "Option A": "H2O",
      Answer: "H2O",
    }),
    expectedStatus: "rejected",
    expectedIssue: "TEXT_ENTRY_WITH_OPTIONS",
  },
  {
    name: "rejects an invalid numeric answer",
    data: row("matrix-numeric-invalid", {
      Type: "numeric",
      Question: "Enter twelve as a number.",
      Answer: "twelve",
      Tolerance: "0",
    }),
    expectedStatus: "rejected",
    expectedIssue: "INVALID_NUMERIC_ANSWER",
  },
  {
    name: "rejects a missing question stem",
    data: row("matrix-missing-stem", {
      Type: "mcq",
      Question: "   ",
      "Option A": "One",
      "Option B": "Two",
      Answer: "A",
    }),
    expectedStatus: "rejected",
    expectedIssue: "MISSING_STEM",
  },
];

describe("validation contract matrix", () => {
  it.each(contractCases)("$name", ({ data, expectedStatus, expectedIssue }) => {
    const result = validateAllQuestions([data], mapping)[0];
    expect(result.status).toBe(expectedStatus);
    if (expectedIssue) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: expectedIssue }),
        ]),
      );
    }
  });

  it("normalizes recoverable whitespace before canonical validation", () => {
    const result = validateAllQuestions(
      [
        row("matrix-normalized", {
          Type: "  MCQ  ",
          Question: "  Capital   of France?  ",
          "Option A": "  Paris  ",
          "Option B": "London",
          Answer: " option a ",
        }),
      ],
      mapping,
    )[0];

    expect(result.status).toBe("valid");
    expect(result.canonicalItem?.stem).toBe("Capital of France?");
    expect(result.canonicalItem?.choices[0].text).toBe("Paris");
    expect(result.rawData.Question).toBe("  Capital   of France?  ");
  });

  it("preserves punctuation inside order tokens when a delimiter is configured", () => {
    const result = validateAllQuestions(
      [
        row("matrix-order-punctuation", {
          Type: "order",
          Question: "Arrange the phases.",
          "Order Items": "Research, Design|Build|Test",
          Answer: "Research, Design|Build|Test",
        }),
      ],
      { ...mapping, orderDelimiter: "|" },
      { exportTargets: ["json"] },
    )[0];

    expect(result.status).toBe("valid");
    expect(result.canonicalItem?.orderItems).toEqual([
      "Research, Design",
      "Build",
      "Test",
    ]);
  });

  it("marks only subsequent exact duplicates for review", () => {
    const results = validateAllQuestions(
      [
        row("matrix-duplicate-1", {
          Type: "text_entry",
          Question: "Name the largest planet.",
          Answer: "Jupiter",
        }),
        row("matrix-duplicate-2", {
          Type: "text_entry",
          Question: "Name the largest planet.",
          Answer: "Jupiter",
        }),
      ],
      mapping,
    );

    expect(results[0].status).toBe("valid");
    expect(results[1].status).toBe("caution");
    expect(results[1].issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATE_EXACT" }),
      ]),
    );
  });
});

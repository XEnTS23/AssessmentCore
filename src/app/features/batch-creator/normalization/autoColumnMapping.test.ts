import { describe, expect, it } from "vitest";
import { inferColumnMapping } from "./autoColumnMapping";

describe("autoColumnMapping canonical inference assertions", () => {
  it("correctly maps test1.xlsx headers without invalid boolean-to-url bindings", () => {
    const headers = [
      "Submission_ID",
      "Mock_Test_ID",
      "Teacher_Name",
      "Teacher_Email",
      "Subject",
      "Chapter",
      "Topic",
      "Question_No",
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
      "Explanation_Format",
      "Difficulty",
      "Positive_Marks",
      "Negative_Marks",
      "Partial_Marking_Rule",
      "Expected_Time_sec",
      "Language",
      "Image_Required",
      "Image_File_Name",
      "Image_Source",
    ];

    const mapping = inferColumnMapping(headers);

    expect(mapping.questionId).toBe("Question_ID");
    expect(mapping.stem).toBe("Question_Stem");
    expect(mapping.options).toEqual([
      "Option_A",
      "Option_B",
      "Option_C",
      "Option_D",
    ]);
    expect(mapping.correctAnswer).toBe("Correct_Answer");
    expect(mapping.acceptedAnswers).toBe("Numerical_Answer");
    expect(mapping.type).toBe("Question_Type");
    expect(mapping.explanation).toBe("Explanation");
    expect(mapping.subject).toBe("Subject");
    expect(mapping.chapter).toBe("Chapter");
    expect(mapping.topic).toBe("Topic");
    expect(mapping.difficulty).toBe("Difficulty");
    expect(mapping.marks).toBe("Positive_Marks");
    expect(mapping.negativeMarks).toBe("Negative_Marks");
    expect(mapping.partialMarkingRule).toBe("Partial_Marking_Rule");
    expect(mapping.mediaRequired).toBe("Image_Required");
    expect(mapping.mediaFileName).toBe("Image_File_Name");
    expect(mapping.mediaSource).toBe("Image_Source");
    expect(mapping.tolerance).toBe("Tolerance");
    expect(mapping.units).toBe("Answer_Unit");
    expect(mapping.timeLimitSeconds).toBe("Expected_Time_sec");
    expect(mapping.language).toBe("Language");

    // CRITICAL: Ensure boolean/yes-no media headers are NEVER assigned to mediaUrl, section, or sourceExam
    expect(mapping.mediaUrl).toBeUndefined();
    expect(mapping.section).toBeUndefined();
    expect(mapping.sourceExam).toBeUndefined();
  });
});

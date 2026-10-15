import { describe, expect, it } from "vitest";
import type { ConditionalFeedbackRule } from "../core/authoringTypes";
import {
  getConditionalFeedbackRuleProblem,
  matchesConditionalFeedbackCondition,
  resolveConditionalFeedback,
} from "./conditionalFeedback";

function rule(
  id: string,
  priority: number,
  condition: ConditionalFeedbackRule["condition"],
  content = `Feedback ${id}`,
): ConditionalFeedbackRule {
  return { id, priority, condition, content };
}

describe("conditional feedback matching", () => {
  it("matches a selected incorrect option for both single and multiple choice", () => {
    const condition = { operator: "choice_selected" as const, optionId: "B" };

    expect(matchesConditionalFeedbackCondition(condition, "B")).toBe(true);
    expect(matchesConditionalFeedbackCondition(condition, ["A", "B"])).toBe(
      true,
    );
    expect(matchesConditionalFeedbackCondition(condition, ["A", "C"])).toBe(
      false,
    );
  });

  it("supports exact, contains, case-sensitive, and numeric comparisons", () => {
    expect(
      matchesConditionalFeedbackCondition(
        { operator: "equals", value: "Photosynthesis" },
        " photosynthesis ",
      ),
    ).toBe(true);
    expect(
      matchesConditionalFeedbackCondition(
        { operator: "contains", value: "mito" },
        "Mitochondria",
      ),
    ).toBe(true);
    expect(
      matchesConditionalFeedbackCondition(
        { operator: "equals", value: "Na", caseSensitive: true },
        "NA",
      ),
    ).toBe(false);
    expect(
      matchesConditionalFeedbackCondition(
        { operator: "numeric_range", min: 4, max: 6 },
        "5",
      ),
    ).toBe(true);
    expect(
      matchesConditionalFeedbackCondition(
        { operator: "greater_than", value: "10" },
        "11",
      ),
    ).toBe(true);
  });

  it("returns the first matching rule by priority", () => {
    const rules = [
      rule("later", 2, { operator: "contains", value: "cell" }),
      rule("first", 0, { operator: "equals", value: "cell" }),
      rule("empty", -1, { operator: "equals", value: "cell" }, ""),
    ];

    expect(resolveConditionalFeedback(rules, "cell")?.id).toBe("first");
    expect(resolveConditionalFeedback(rules, "unmatched")).toBeUndefined();
  });

  it("reports incomplete and invalid rules", () => {
    expect(
      getConditionalFeedbackRuleProblem(
        rule("missing-option", 0, {
          operator: "choice_selected",
          optionId: "Z",
        }),
        ["A", "B"],
      ),
    ).toBe("The selected option no longer exists.");
    expect(
      getConditionalFeedbackRuleProblem(
        rule("range", 0, { operator: "numeric_range", min: 10, max: 5 }),
      ),
    ).toBe("Minimum cannot be greater than maximum.");
  });
});

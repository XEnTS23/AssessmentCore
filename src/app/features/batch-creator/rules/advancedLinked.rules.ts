import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import {
  HotspotQuestion,
  MatrixMatchQuestion,
  OrderQuestion,
} from "../core/questionTypes";

function createIssue(
  rule: Pick<ValidationRule, "id" | "category" | "severity">,
  rowId: string,
  message: string,
  field?: string,
  evidence?: Record<string, unknown>,
  options?: Partial<ValidationIssue>,
): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    rowId,
    category: rule.category,
    severity: rule.severity,
    message,
    field,
    evidence,
    blocksExport:
      rule.severity === "block" || rule.severity === "engine_defect",
    ...options,
  };
}

export const MATRIX_MATCH_INCOMPLETE: ValidationRule = {
  id: "MATRIX_MATCH_INCOMPLETE",
  name: "Matrix Match Incomplete",
  category: "structural",
  severity: "block",
  priority: 95,
  appliesTo: ["MATRIX_MATCH", "UNSUPPORTED"],
  validate(row) {
    const q = row.normalizedQuestion as MatrixMatchQuestion | any;
    const rawType = String(q?.rawType || "")
      .toUpperCase()
      .replace(/[_-]+/g, " ");
    if (
      q?.type === "MATRIX_MATCH" ||
      (q?.type === "UNSUPPORTED" && rawType === "MATRIX MATCH")
    ) {
      if (
        !q.leftEntities ||
        q.leftEntities.length === 0 ||
        !q.rightEntities ||
        q.rightEntities.length === 0
      ) {
        return [
          createIssue(
            this,
            row.id,
            "Matrix-match interaction requires non-empty left and right entity columns.",
            "matrix",
          ),
        ];
      }
    }
    return [];
  },
};

export const HOTSPOT_CONFIGURATION_INCOMPLETE: ValidationRule = {
  id: "HOTSPOT_CONFIGURATION_INCOMPLETE",
  name: "Hotspot Configuration Incomplete",
  category: "structural",
  severity: "block",
  priority: 95,
  appliesTo: ["HOTSPOT", "UNSUPPORTED"],
  validate(row) {
    const q = row.normalizedQuestion as HotspotQuestion | any;
    const rawType = String(q?.rawType || "")
      .toUpperCase()
      .replace(/[_-]+/g, " ");
    if (
      q?.type === "HOTSPOT" ||
      (q?.type === "UNSUPPORTED" && rawType === "HOTSPOT")
    ) {
      const imageUrl =
        q.imageUrl || q.mediaFields?.mediaUrl || q.mediaFields?.mediaFileName;
      if (!imageUrl || !q.regions || q.regions.length === 0) {
        return [
          createIssue(
            this,
            row.id,
            "Hotspot interaction requires a background image URL and at least one coordinate region.",
            "hotspot",
          ),
        ];
      }
    }
    return [];
  },
};

export const ORDER_SEQUENCE_INVALID: ValidationRule = {
  id: "ORDER_SEQUENCE_INVALID",
  name: "Order Sequence Invalid",
  category: "structural",
  severity: "block",
  priority: 95,
  appliesTo: ["ORDER"],
  validate(row) {
    const q = row.normalizedQuestion as OrderQuestion;
    if (q?.type === "ORDER") {
      if (!q.correctSequenceIds || q.correctSequenceIds.length === 0) {
        return [
          createIssue(
            this,
            row.id,
            "Ordering question is missing correct sequence.",
            "correctSequenceIds",
          ),
        ];
      }
      if (q.options && q.correctSequenceIds.length !== q.options.length) {
        return [
          createIssue(
            this,
            row.id,
            `Correct sequence length (${q.correctSequenceIds.length}) must equal options count (${q.options.length}).`,
            "correctSequenceIds",
          ),
        ];
      }
    }
    return [];
  },
};

export const PASSAGE_LINK_BROKEN: ValidationRule = {
  id: "PASSAGE_LINK_BROKEN",
  name: "Passage Link Broken",
  category: "content_quality",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row, context) {
    const passageId =
      (row.metadata as any)?.passageId || (row.metadata as any)?.passageRef;
    if (passageId) {
      const passageExists = context.allRows.some(
        (r) =>
          (r.metadata as any)?.isPassage &&
          (r.metadata as any)?.passageId === passageId,
      );
      if (!passageExists && !(context as any).passageStore?.has?.(passageId)) {
        return [
          createIssue(
            this,
            row.id,
            `Question references passage '${passageId}', but no such passage object exists in the batch.`,
            "passageId",
            { passageId },
          ),
        ];
      }
    }
    return [];
  },
};

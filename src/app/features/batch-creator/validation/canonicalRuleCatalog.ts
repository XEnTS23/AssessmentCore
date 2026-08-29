import canonicalRuleMarkdown from "../../../../../Canonical_Data_Extraction.md?raw";

import type { IssueCategory, IssueSeverity } from "../core/issueTypes";

export type CanonicalRuleStage =
  | "Academic Review"
  | "Accessibility Review"
  | "Batch Review"
  | "Compliance Review"
  | "Content Integrity"
  | "Ingestion"
  | "Iteration QA"
  | "Normalization"
  | "Normalized Item"
  | "Package Validation"
  | "Policy Validation"
  | "Response Contract"
  | "Target Preflight";

export interface CanonicalRuleSpec {
  number: number;
  category: string;
  id: string;
  stage: CanonicalRuleStage;
  defaultSeverity: "Block" | "Review" | "Warning" | "Info";
  blocksExport: boolean;
  field: string;
  exactTrigger: string;
  messageTemplate: string;
  requiredEvidence: string;
  safeAutoFix?: string;
  waiverAllowed: boolean;
  nature: string;
  sourceBasis: string;
  priority: "P0" | "P1" | "P2";
  implementationReadiness: string;
  verificationResult: string;
  prerequisites: string;
  requiredReasonCodes: string;
  version: string;
  sourceImplementationStatus: string;
}

function cleanCell(value: string | undefined): string {
  const cleaned = (value || "").trim();
  return cleaned.toLowerCase() === "nan" ? "" : cleaned;
}

/**
 * The source is an exported Markdown table. Two message cells intentionally
 * contain a literal pipe, so parse fixed columns from both ends and fold any
 * overflow back into the message column.
 */
function parseRuleLine(line: string): string[] {
  const cells = line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());

  const expectedCellCount = 24;
  if (cells.length < expectedCellCount) {
    throw new Error(
      `Canonical validation row has ${cells.length} cells; expected ${expectedCellCount}.`,
    );
  }
  if (cells.length === expectedCellCount) return cells;

  const overflow = cells.length - expectedCellCount;
  const messageEnd = 8 + overflow;
  return [
    ...cells.slice(0, 8),
    cells.slice(8, messageEnd + 1).join("|"),
    ...cells.slice(messageEnd + 1),
  ];
}

function parseCanonicalRule(line: string): CanonicalRuleSpec {
  const cells = parseRuleLine(line).map(cleanCell);
  const number = Number(cells[0]);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`Invalid canonical validation rule number: ${cells[0]}`);
  }

  return {
    number,
    category: cells[1],
    id: cells[2],
    stage: cells[3] as CanonicalRuleStage,
    defaultSeverity: cells[4] as CanonicalRuleSpec["defaultSeverity"],
    blocksExport: cells[5].toLowerCase() === "yes",
    field: cells[6],
    exactTrigger: cells[7],
    messageTemplate: cells[8],
    requiredEvidence: cells[9],
    safeAutoFix: cells[10] || undefined,
    waiverAllowed: cells[11].toLowerCase() === "yes",
    nature: cells[12],
    sourceBasis: cells[13],
    priority: cells[14] as CanonicalRuleSpec["priority"],
    implementationReadiness: cells[15],
    verificationResult: cells[16],
    prerequisites: cells[17],
    requiredReasonCodes: cells[18],
    version: cells[22],
    sourceImplementationStatus: cells[23],
  };
}

export const canonicalRuleCatalog: readonly CanonicalRuleSpec[] = Object.freeze(
  canonicalRuleMarkdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map(parseCanonicalRule),
);

if (canonicalRuleCatalog.length !== 155) {
  throw new Error(
    `Canonical validation catalog must contain 155 rules; found ${canonicalRuleCatalog.length}.`,
  );
}

const duplicateRuleIds = canonicalRuleCatalog
  .map((rule) => rule.id)
  .filter((id, index, ids) => ids.indexOf(id) !== index);
if (duplicateRuleIds.length > 0) {
  throw new Error(
    `Canonical validation catalog contains duplicate IDs: ${duplicateRuleIds.join(", ")}`,
  );
}

export const canonicalRuleById = new Map(
  canonicalRuleCatalog.map((rule) => [rule.id, rule] as const),
);

export function canonicalSeverity(
  severity: CanonicalRuleSpec["defaultSeverity"],
): IssueSeverity {
  switch (severity) {
    case "Block":
      return "block";
    case "Review":
      return "review";
    case "Warning":
      return "warning";
    case "Info":
      return "info";
  }
}

export function canonicalPriority(
  priority: CanonicalRuleSpec["priority"],
): number {
  return priority === "P0" ? 300 : priority === "P1" ? 200 : 100;
}

export function canonicalIssueCategory(spec: CanonicalRuleSpec): IssueCategory {
  if (spec.stage === "Ingestion" || spec.stage === "Normalization") {
    return "ingestion";
  }
  if (spec.stage === "Package Validation") return "export_assembly";
  if (spec.stage === "Target Preflight") return "export_readiness";
  if (spec.category === "Media" || spec.category === "Media security") {
    return "media";
  }
  if (spec.category === "Metadata" || spec.category === "Identifiers") {
    return "metadata";
  }
  if (
    spec.category === "Scoring" ||
    spec.category === "Numeric" ||
    spec.category === "Numeric & scoring" ||
    spec.category === "Units"
  ) {
    return "scoring";
  }
  if (spec.category === "Rendering" || spec.category === "Math") {
    return "rendering";
  }
  if (
    spec.stage === "Academic Review" ||
    spec.stage === "Accessibility Review"
  ) {
    return "academic_consistency";
  }
  if (spec.category === "Type suspicion") return "type_suspicion";
  if (spec.category === "Structural") return "structural";
  return "content_quality";
}

export function canonicalRuleName(id: string): string {
  return id
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

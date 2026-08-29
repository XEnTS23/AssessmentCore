import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";
import {
  normalizeCopyrightStatus,
  parseTimestamp,
} from "../normalization/normalizeMetadata";

const CHAPTER_SUBJECT_TAXONOMY: Record<string, string> = {
  // Physics
  "current electricity": "Physics",
  kinematics: "Physics",
  "work, energy and power": "Physics",
  oscillations: "Physics",
  waves: "Physics",
  "ray optics": "Physics",
  "dual nature of matter": "Physics",
  "moving charges and magnetism": "Physics",
  "rotational motion": "Physics",

  // Chemistry
  "chemical bonding": "Chemistry",
  "coordination compounds": "Chemistry",
  "periodic classification": "Chemistry",
  electrochemistry: "Chemistry",
  solutions: "Chemistry",
  "some basic concepts of chemistry": "Chemistry",
  equilibrium: "Chemistry",
  "chemical kinetics": "Chemistry",
  "organic chemistry": "Chemistry",

  // Mathematics
  "quadratic equations": "Mathematics",
  "integral calculus": "Mathematics",
  "matrices and determinants": "Mathematics",
  probability: "Mathematics",
  "vector algebra": "Mathematics",
  "coordinate geometry": "Mathematics",
  "permutations and combinations": "Mathematics",
  "complex numbers": "Mathematics",
  "differential calculus": "Mathematics",
  "sequences and series": "Mathematics",

  // NOTE: "thermodynamics" is intentionally omitted because it appears under
  // both Physics and Chemistry in the fixture. Adding it would cause
  // false-positive WRONG_SUBJECT_TAG issues.
};

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

export const COPYRIGHT_UNVERIFIED: ValidationRule = {
  id: "COPYRIGHT_UNVERIFIED",
  name: "Copyright Unverified",
  category: "metadata",
  severity: "block",
  priority: 92,
  appliesTo: "all",
  validate(row, context) {
    const statusColumn = context.columnMapping.copyrightStatus;
    const referenceColumn = context.columnMapping.sourceReference;
    const rawCopyrightStatus =
      row.metadata.rawCopyrightStatus ??
      (statusColumn ? row.raw?.cells[statusColumn]?.rawText : undefined) ??
      (row.rawRow.Copyright_Status as string | undefined) ??
      (row.rawRow.Copyright as string | undefined);
    const rawSourceReference =
      row.metadata.rawSourceReference ??
      (referenceColumn
        ? row.raw?.cells[referenceColumn]?.rawText
        : undefined) ??
      (row.rawRow.Source_Reference as string | undefined) ??
      (row.rawRow.Source as string | undefined) ??
      row.metadata.sourceReference;
    const normalizedCopyrightStatus =
      normalizeCopyrightStatus(rawCopyrightStatus) ??
      normalizeCopyrightStatus(row.metadata.copyrightStatus);
    const sourceText = String(rawSourceReference || "");
    const indicators = [
      "screenshot",
      "coaching material",
      "textbook",
      "book",
      "website",
      "pdf",
      "question bank",
      "previous paper",
      "scanned",
      "copied",
    ];
    const matchedIndicators = indicators.filter((indicator) =>
      sourceText.toLowerCase().includes(indicator),
    );
    const statusIsUnverified =
      normalizedCopyrightStatus === "unknown" ||
      normalizedCopyrightStatus === "unverified" ||
      !normalizedCopyrightStatus;
    const policyMode =
      context.exportConfig?.copyrightPolicy ||
      (context.exportConfig?.rightsApprovalRequired
        ? "approval_required"
        : "production");
    const policyRequiresApproval =
      context.exportConfig?.rightsApprovalRequired === true ||
      context.exportConfig?.copyrightPolicy === "approval_required";
    const approvedStatuses = new Set([
      "approved",
      "teacher_created",
      "licensed",
      "public_domain",
      "permission_granted",
    ]);

    if (
      (statusIsUnverified && matchedIndicators.length > 0) ||
      (policyRequiresApproval &&
        !approvedStatuses.has(String(normalizedCopyrightStatus)))
    ) {
      return [
        createIssue(
          this,
          row.id,
          `Copyright status '${rawCopyrightStatus || "missing"}' is not approved for source '${rawSourceReference || "unspecified"}'.`,
          "copyrightStatus",
          {
            sourceColumnStatus: statusColumn,
            sourceColumnReference: referenceColumn,
            rawCopyrightStatus,
            normalizedCopyrightStatus,
            rawSourceReference,
            matchedIndicators,
            policyMode,
          },
          {
            allowedCorrections: [
              {
                actionId: "upload_permission",
                label: "Upload permission or licence",
                mode: "manual_only",
              },
              {
                actionId: "confirm_teacher_created",
                label: "Confirm teacher-created content",
                mode: "manual_only",
              },
              {
                actionId: "add_attribution",
                label: "Add attribution",
                mode: "manual_only",
              },
              {
                actionId: "replace_content",
                label: "Replace content",
                mode: "manual_only",
              },
              {
                actionId: "exclude_from_export",
                label: "Exclude from export",
                mode: "manual_only",
              },
            ],
          },
        ),
      ];
    }
    return [];
  },
};

export const AMBIGUOUS_MEDIA_FILENAME: ValidationRule = {
  id: "AMBIGUOUS_MEDIA_FILENAME",
  name: "Ambiguous Media Filename",
  category: "media",
  severity: "review",
  priority: 85,
  appliesTo: "all",
  validate(row) {
    const fileName =
      (row.rawRow as any)?.Image_File_Name ??
      (row.rawRow as any)?.mediaFileName;
    if (fileName && typeof fileName === "string") {
      const genericNames = [
        "image1.png",
        "image.png",
        "final.png",
        "diagram-new.png",
        "test.png",
        "figure1.png",
      ];
      const lower = fileName.trim().toLowerCase();
      if (
        genericNames.includes(lower) ||
        /^image\d+\.(?:png|jpg|jpeg)$/i.test(lower)
      ) {
        return [
          createIssue(
            this,
            row.id,
            `Media filename '${fileName}' is generic or ambiguous. Re-link with unique asset name to prevent collisions.`,
            "mediaFileName",
            { fileName },
          ),
        ];
      }
    }
    return [];
  },
};

export const WRONG_SUBJECT_TAG: ValidationRule = {
  id: "WRONG_SUBJECT_TAG",
  name: "Wrong Subject Tag",
  category: "metadata",
  severity: "review",
  priority: 80,
  appliesTo: "all",
  validate(row) {
    const subject = row.metadata?.subject?.trim();
    const chapter = row.metadata?.chapter?.trim();
    if (!subject || !chapter) return [];

    const expectedSubject = CHAPTER_SUBJECT_TAXONOMY[chapter.toLowerCase()];
    if (
      expectedSubject &&
      expectedSubject.toLowerCase() !== subject.toLowerCase()
    ) {
      return [
        createIssue(
          this,
          row.id,
          `Chapter '${chapter}' belongs to ${expectedSubject}, but the row is tagged as '${subject}'.`,
          "subject",
          { subject, chapter, expectedSubject, taxonomyMatch: "deterministic" },
          {
            allowedCorrections: [
              {
                actionId: "change_subject",
                label: `Change subject to ${expectedSubject}`,
                mode: "suggested",
                proposedValue: expectedSubject,
              },
              {
                actionId: "review_chapter",
                label: "Review chapter assignment",
                mode: "manual_only",
              },
            ],
          },
        ),
      ];
    }
    return [];
  },
};

export const NONSTANDARD_DIFFICULTY: ValidationRule = {
  id: "NONSTANDARD_DIFFICULTY",
  name: "Non-Standard Difficulty Tag",
  category: "metadata",
  severity: "warning",
  priority: 75,
  appliesTo: "all",
  validate(row) {
    const diff = row.metadata?.difficulty?.trim();
    if (diff) {
      const approved = ["Easy", "Medium", "Hard"];
      if (!approved.includes(diff)) {
        return [
          createIssue(
            this,
            row.id,
            `Difficulty rating '${diff}' is non-standard. Expected one of: Easy, Medium, Hard.`,
            "difficulty",
            { difficulty: diff },
            {
              allowedCorrections: [
                {
                  actionId: "set_easy",
                  label: "Change to Easy",
                  mode: "suggested",
                  proposedValue: "Easy",
                },
                {
                  actionId: "set_medium",
                  label: "Change to Medium",
                  mode: "suggested",
                  proposedValue: "Medium",
                },
                {
                  actionId: "set_hard",
                  label: "Change to Hard",
                  mode: "suggested",
                  proposedValue: "Hard",
                },
              ],
            },
          ),
        ];
      }
    }
    return [];
  },
};

export const VERSION_TIMESTAMP_CONFLICT: ValidationRule = {
  id: "VERSION_TIMESTAMP_CONFLICT",
  name: "Version Timestamp Conflict",
  category: "metadata",
  severity: "review",
  priority: 85,
  appliesTo: "all",
  validate(row, context) {
    const submittedColumn = context.columnMapping.submittedAt;
    const updatedColumn = context.columnMapping.lastUpdatedAt;
    const versionColumn = context.columnMapping.teacherVersion;
    const rawSubmittedAt =
      row.metadata.rawSubmittedAt ??
      (submittedColumn
        ? row.raw?.cells[submittedColumn]?.rawText
        : undefined) ??
      (row.rawRow.Submitted_At as string | undefined) ??
      (row.rawRow.Submitted_Date as string | undefined) ??
      (row.metadata.submittedAt instanceof Date
        ? row.metadata.submittedAt.toISOString()
        : row.metadata.submittedAt);
    const rawLastUpdatedAt =
      row.metadata.rawLastUpdatedAt ??
      (updatedColumn ? row.raw?.cells[updatedColumn]?.rawText : undefined) ??
      (row.rawRow.Last_Updated_At as string | undefined) ??
      (row.rawRow.Updated_At as string | undefined) ??
      (row.rawRow.Updated_Date as string | undefined) ??
      (row.metadata.lastUpdatedAt instanceof Date
        ? row.metadata.lastUpdatedAt.toISOString()
        : row.metadata.lastUpdatedAt);
    const rawTeacherVersion =
      row.metadata.rawTeacherVersion ??
      (versionColumn ? row.raw?.cells[versionColumn]?.rawText : undefined) ??
      (row.rawRow.Teacher_Version as string | undefined) ??
      (row.rawRow.Version as string | undefined) ??
      row.metadata.teacherVersion ??
      "unlabelled";
    const submitted =
      row.metadata.submittedTimestamp ?? parseTimestamp(rawSubmittedAt);
    const updated =
      row.metadata.lastUpdatedTimestamp ?? parseTimestamp(rawLastUpdatedAt);
    if (!submitted?.valid || !updated?.valid) return [];

    if (updated.parsedValue!.getTime() < submitted.parsedValue!.getTime()) {
      return [
        createIssue(
          this,
          row.id,
          `Version '${rawTeacherVersion}' was last updated at ${rawLastUpdatedAt}, before it was submitted at ${rawSubmittedAt}.`,
          "lastUpdatedAt",
          {
            sourceColumnVersion: versionColumn,
            sourceColumnSubmittedAt: submittedColumn,
            sourceColumnLastUpdatedAt: updatedColumn,
            rawTeacherVersion,
            rawSubmittedAt,
            rawLastUpdatedAt,
            submittedAt: rawSubmittedAt,
            lastUpdatedAt: rawLastUpdatedAt,
            submittedParser: submitted.parser,
            updatedParser: updated.parser,
          },
        ),
      ];
    }
    return [];
  },
};

export const PARTIAL_MARKING_AMBIGUOUS_PROSE: ValidationRule = {
  id: "PARTIAL_MARKING_AMBIGUOUS_PROSE",
  name: "Partial Marking Ambiguous Prose",
  category: "scoring",
  severity: "block",
  priority: 90,
  appliesTo: "all",
  validate(row) {
    const rawPartial =
      (row.rawRow as any)?.Partial_Marking_Rule ??
      (row.rawRow as any)?.partialMarkingRule;
    if (rawPartial && typeof rawPartial === "string") {
      const lower = rawPartial.trim().toLowerCase();
      if (
        lower.includes("depending on closeness") ||
        lower.includes("teacher discretion") ||
        lower.includes("approximate credit")
      ) {
        return [
          createIssue(
            this,
            row.id,
            `Partial marking rule '${rawPartial}' is ambiguous and non-deterministic for automated scoring.`,
            "partialMarkingRule",
            { rawPartial },
          ),
        ];
      }
    }
    return [];
  },
};

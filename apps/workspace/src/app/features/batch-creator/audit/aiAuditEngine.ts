import { QuestionRow } from "../core/rowTypes";
import { RowPatch } from "../core/fixTypes";
import {
  Question,
  McqQuestion,
  MsqQuestion,
  TextEntryQuestion,
} from "../core/questionTypes";

// ─── AI Audit Types ──────────────────────────────────────────────────

export interface AiAuditResult {
  rowId: string;
  status: "passed" | "warning" | "failed";
  categories: string[]; // e.g. ['grammar', 'clarity', 'logic']
  message: string;
  suggestedFix?: RowPatch;
  userAction: "none" | "accepted" | "ignored" | "edited";
}

export interface AiAuditPayload {
  rowId: string;
  type: string;
  stem: string;
  options?: Array<{ label: string; text: string }>;
  answer: any;
  explanation?: string;
  mediaNote?: string;
}

// ─── Payload Generation ──────────────────────────────────────────────

/**
 * Strips out unnecessary metadata and IDs to create a lightweight payload
 * for the AI model to review for clarity, grammar, and logic.
 */
export function buildAuditPayload(row: QuestionRow): AiAuditPayload | null {
  const q = row.normalizedQuestion;
  if (!q || q.type === "UNKNOWN") return null;

  const payload: AiAuditPayload = {
    rowId: row.id,
    type: q.type,
    stem: q.stem || "",
    answer: null,
  };

  if ("explanation" in q && q.explanation) {
    payload.explanation = q.explanation;
  }

  if (row.mediaReferences && row.mediaReferences.length > 0) {
    payload.mediaNote = `Question references ${row.mediaReferences.length} media file(s). Assume they exist.`;
  }

  if (q.type === "MCQ") {
    payload.options = q.options.map((o) => ({ label: o.label, text: o.text }));
    payload.answer = q.correctAnswerId
      ? q.options.find((o) => o.id === q.correctAnswerId)?.label ||
        q.correctAnswerId
      : null;
  } else if (q.type === "MSQ") {
    payload.options = q.options.map((o) => ({ label: o.label, text: o.text }));
    payload.answer = q.correctAnswerIds.map(
      (id) => q.options.find((o) => o.id === id)?.label || id,
    );
  } else if (q.type === "TEXT_ENTRY") {
    payload.answer = {
      mode: q.mode,
      acceptedAnswers: q.acceptedAnswers,
      tolerance: q.numericTolerance,
    };
  }

  return payload;
}

// ─── Mock AI Call ────────────────────────────────────────────────────

/**
 * Simulates a call to an AI endpoint for auditing.
 * In a real implementation, this would POST to your backend AI service.
 */
export async function simulateAiAudit(
  payload: AiAuditPayload,
): Promise<AiAuditResult> {
  // Simulate network delay (500ms - 1500ms)
  await new Promise((resolve) =>
    setTimeout(resolve, 500 + Math.random() * 1000),
  );

  // Very basic mock logic for demonstration
  const textToCheck =
    `${payload.stem} ${payload.options?.map((o) => o.text).join(" ")}`.toLowerCase();

  const result: AiAuditResult = {
    rowId: payload.rowId,
    status: "passed",
    categories: [],
    message: "Looks good.",
    userAction: "none",
  };

  // Mock grammar issue
  if (
    textToCheck.includes("their is") ||
    (textToCheck.includes("there is") && payload.stem.includes("are"))
  ) {
    result.status = "warning";
    result.categories.push("grammar");
    result.message =
      "Possible grammatical error. Consider checking subject-verb agreement.";
  }

  // Mock clarity issue (too long)
  if (payload.stem.length > 300 && !textToCheck.includes("passage")) {
    result.status = "warning";
    result.categories.push("clarity");
    result.message =
      "Stem is quite long. Consider breaking it down for better readability.";
  }

  // Mock logic issue (all of the above)
  if (
    payload.options?.some((o) =>
      o.text.toLowerCase().includes("all of the above"),
    )
  ) {
    result.status = "warning";
    result.categories.push("formatting");
    result.message =
      '"All of the above" can be problematic if options are randomized in the LMS.';
  }

  // Mock specific fail case for demo (if stem contains the word "ambiguous")
  if (textToCheck.includes("ambiguous")) {
    result.status = "failed";
    result.categories.push("logic");
    result.message =
      "The phrasing is highly ambiguous and might confuse students.";

    // Provide a suggested fix if possible
    result.suggestedFix = {
      rowId: payload.rowId,
      changes: [
        {
          path: "normalizedQuestion.stem",
          before: payload.stem,
          after: payload.stem.replace(/ambiguous/gi, "clear"),
        },
      ],
    };
  }

  return result;
}

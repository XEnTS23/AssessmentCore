import type { QuestionRow } from "../core/rowTypes";
import type { EditorFormState } from "./manualFixEngine";
import { buildRowFromEditor } from "./manualFixEngine";
import type { ValidationContext } from "../validation/validationEngine";
import { ValidationEngine } from "../validation/validationEngine";

export const MANUAL_FIX_VALIDATION_DEBOUNCE_MS = 400;

export type DraftValidationPhase =
  | "idle"
  | "validating"
  | "valid"
  | "invalid"
  | "error";

export interface DraftValidationState {
  phase: DraftValidationPhase;
  rowId: string | null;
  rowStatus?: QuestionRow["status"];
  issues: QuestionRow["issues"];
  validatedAt?: number;
  errorMessage?: string;
}

export interface ManualFixDraftValidationInput {
  row: QuestionRow;
  editorState: EditorFormState;
  engine: ValidationEngine;
  context: ValidationContext;
}

export const EMPTY_DRAFT_VALIDATION: DraftValidationState = {
  phase: "idle",
  rowId: null,
  issues: [],
};

export function draftValidationStateFromRow(
  row: QuestionRow,
): DraftValidationState {
  return {
    phase: row.status === "valid" ? "valid" : "invalid",
    rowId: row.id,
    rowStatus: row.status,
    issues: row.issues,
    validatedAt: Date.now(),
  };
}

/** Revalidates a row against a context containing that exact row revision. */
export function revalidateRowInBatch(
  row: QuestionRow,
  engine: ValidationEngine,
  context: ValidationContext,
): QuestionRow {
  const rowExists = context.allRows.some(
    (candidate) => candidate.id === row.id,
  );
  const allRows = rowExists
    ? context.allRows.map((candidate) =>
        candidate.id === row.id ? row : candidate,
      )
    : [...context.allRows, row];

  return engine.validateRow(row, { ...context, allRows });
}

/** Builds and validates an unsaved editor draft without mutating saved state. */
export function validateManualFixDraft({
  row,
  editorState,
  engine,
  context,
}: ManualFixDraftValidationInput): QuestionRow {
  const draftRow = buildRowFromEditor(row, editorState);

  return revalidateRowInBatch(draftRow, engine, context);
}

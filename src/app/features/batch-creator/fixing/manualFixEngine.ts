import { QuestionRow } from '../core/rowTypes';
import { ValidationEngine, ValidationContext } from '../validation/validationEngine';
import { FixSuggestion, RowPatch } from '../core/fixTypes';
import { applyPatch } from './patchEngine';
import { Question, McqQuestion, MsqQuestion, TextEntryQuestion, OrderQuestion, Option } from '../core/questionTypes';

// ─── Manual Fix Engine ──────────────────────────────────────────────

/**
 * Apply a manual field edit to a QuestionRow, revalidate, and return
 * the updated row.  All edits are tracked in the row's history.
 */
export function applyManualEdit(
  row: QuestionRow,
  fieldPath: string,
  newValue: unknown,
  engine: ValidationEngine,
  context: ValidationContext,
): { row: QuestionRow; success: boolean; issuesDelta: number } {
  const patch: RowPatch = {
    rowId: row.id,
    changes: [{
      path: fieldPath,
      before: getNestedValue(row, fieldPath),
      after: newValue,
    }],
  };

  const result = applyPatch(row, patch, engine, context);

  return {
    row: result.patchedRow,
    success: result.success,
    issuesDelta: result.issuesAfter - result.issuesBefore,
  };
}

/**
 * Apply a FixSuggestion to a row.  Re-validates automatically.
 */
export function applySuggestion(
  row: QuestionRow,
  suggestion: FixSuggestion,
  engine: ValidationEngine,
  context: ValidationContext,
): { row: QuestionRow; success: boolean; issuesDelta: number } {
  const result = applyPatch(row, suggestion.patch, engine, context);

  return {
    row: result.patchedRow,
    success: result.success,
    issuesDelta: result.issuesAfter - result.issuesBefore,
  };
}

/**
 * Build a complete updated Question from the editor form state.
 * This is called when the user clicks "Save" in the editor.
 */
export function buildQuestionFromEditor(
  original: Question | undefined,
  editorState: EditorFormState,
): Question {
  const type = editorState.type;

  if (type === 'MCQ') {
    return {
      type: 'MCQ',
      stem: editorState.stem,
      options: editorState.options.map((o, i) => ({
        id: o.id || crypto.randomUUID(),
        label: String.fromCharCode(65 + i),
        text: o.text,
      })),
      correctAnswerId: editorState.correctAnswerId,
      explanation: editorState.explanation || undefined,
    } as McqQuestion;
  }

  if (type === 'MSQ') {
    return {
      type: 'MSQ',
      stem: editorState.stem,
      options: editorState.options.map((o, i) => ({
        id: o.id || crypto.randomUUID(),
        label: String.fromCharCode(65 + i),
        text: o.text,
      })),
      correctAnswerIds: editorState.correctAnswerIds,
      explanation: editorState.explanation || undefined,
    } as MsqQuestion;
  }

  if (type === 'ORDER') {
    return {
      type: 'ORDER',
      stem: editorState.stem,
      options: editorState.options.map((o, i) => ({
        id: o.id || crypto.randomUUID(),
        label: String.fromCharCode(65 + i),
        text: o.text,
      })),
      correctSequenceIds: editorState.correctSequenceIds,
      explanation: editorState.explanation || undefined,
    } as OrderQuestion;
  }

  if (type === 'TEXT_ENTRY') {
    return {
      type: 'TEXT_ENTRY',
      stem: editorState.stem,
      mode: editorState.textEntryMode || 'text',
      acceptedAnswers: editorState.acceptedAnswers,
      numericTolerance: editorState.numericTolerance,
      units: editorState.units || undefined,
      caseSensitive: editorState.caseSensitive,
      trimPolicy: editorState.trimPolicy,
      explanation: editorState.explanation || undefined,
    } as TextEntryQuestion;
  }

  return { type: 'UNKNOWN', rawStem: editorState.stem };
}

// ─── Editor Form State ──────────────────────────────────────────────

export interface EditorFormState {
  type: string;
  stem: string;
  explanation: string;

  // MCQ / MSQ / ORDER
  options: Array<{ id: string; text: string }>;
  correctAnswerId: string;       // MCQ
  correctAnswerIds: string[];    // MSQ
  correctSequenceIds: string[];  // ORDER

  // TEXT_ENTRY
  textEntryMode: 'text' | 'numeric' | 'formula';
  acceptedAnswers: string[];
  numericTolerance?: number;
  units: string;
  caseSensitive: boolean;
  trimPolicy: 'trim' | 'none';
}

/**
 * Initialize EditorFormState from an existing Question.
 */
export function questionToEditorState(q: Question | undefined): EditorFormState {
  const base: EditorFormState = {
    type: q?.type || 'UNKNOWN',
    stem: '',
    explanation: '',
    options: [],
    correctAnswerId: '',
    correctAnswerIds: [],
    correctSequenceIds: [],
    textEntryMode: 'text',
    acceptedAnswers: [],
    numericTolerance: undefined,
    units: '',
    caseSensitive: false,
    trimPolicy: 'trim',
  };

  if (!q) return base;

  if ('stem' in q) base.stem = q.stem || '';
  if ('rawStem' in q) base.stem = q.rawStem || '';
  if ('explanation' in q) base.explanation = q.explanation || '';

  if (q.type === 'MCQ') {
    base.options = q.options.map(o => ({ id: o.id, text: o.text }));
    base.correctAnswerId = q.correctAnswerId;
  }

  if (q.type === 'MSQ') {
    base.options = q.options.map(o => ({ id: o.id, text: o.text }));
    base.correctAnswerIds = [...q.correctAnswerIds];
  }

  if (q.type === 'ORDER') {
    base.options = q.options.map(o => ({ id: o.id, text: o.text }));
    base.correctSequenceIds = [...q.correctSequenceIds];
  }

  if (q.type === 'TEXT_ENTRY') {
    base.textEntryMode = q.mode;
    base.acceptedAnswers = [...q.acceptedAnswers];
    base.numericTolerance = q.numericTolerance;
    base.units = q.units || '';
    base.caseSensitive = q.caseSensitive;
    base.trimPolicy = q.trimPolicy;
  }

  return base;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getNestedValue(obj: any, path: string): unknown {
  const segments = path.split('.');
  let current = obj;
  for (const seg of segments) {
    const bracketMatch = seg.match(/^([^\[]+)\[(\d+)\]$/);
    if (bracketMatch) {
      current = current?.[bracketMatch[1]]?.[Number(bracketMatch[2])];
    } else {
      current = current?.[seg];
    }
  }
  return current;
}

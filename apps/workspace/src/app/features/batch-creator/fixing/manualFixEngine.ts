import { QuestionRow } from "../core/rowTypes";
import {
  ValidationEngine,
  ValidationContext,
} from "../validation/validationEngine";
import { FixSuggestion, PatchFailureReason, RowPatch } from "../core/fixTypes";
import { applyPatch } from "./patchEngine";
import {
  Question,
  McqQuestion,
  MsqQuestion,
  TextEntryQuestion,
  OrderQuestion,
  Option,
} from "../core/questionTypes";
import type { MediaContentType, MediaRole } from "../core/mediaTypes";
import { validateMediaUrl } from "../media/mediaValidator";
import {
  canonicalizeEditorMathMarkup,
  extractMathReferences,
} from "./richContentEditing";
import {
  type AuthoringSection,
  isRequiredAuthoringSection,
  REQUIRED_AUTHORING_SECTIONS,
} from "../core/authoringTypes";

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
    changes: [
      {
        path: fieldPath,
        before: getNestedValue(row, fieldPath),
        after: newValue,
      },
    ],
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
): {
  row: QuestionRow;
  success: boolean;
  issuesDelta: number;
  failureReason?: PatchFailureReason;
} {
  const result = applyPatch(row, suggestion.patch, engine, context);

  if (!result.success) {
    return {
      row,
      success: false,
      issuesDelta: 0,
      failureReason: result.failureReason,
    };
  }

  const triggerIssuesBefore = row.issues.filter(
    (issue) => issue.ruleId === suggestion.ruleId,
  ).length;
  const triggerIssuesAfter = result.patchedRow.issues.filter(
    (issue) => issue.ruleId === suggestion.ruleId,
  ).length;
  if (triggerIssuesBefore === 0 || triggerIssuesAfter >= triggerIssuesBefore) {
    return {
      row,
      success: false,
      issuesDelta: 0,
      failureReason: "target_issue_not_resolved",
    };
  }

  return {
    row: result.patchedRow,
    success: true,
    issuesDelta: result.issuesAfter - result.issuesBefore,
  };
}

/**
 * Build a complete updated Question from the editor form state.
 * This is called when the user clicks "Save" in the editor.
 */
function canonicalizeEditorFormState(
  editorState: EditorFormState,
): EditorFormState {
  return {
    ...editorState,
    stem: canonicalizeEditorMathMarkup(editorState.stem),
    explanation: canonicalizeEditorMathMarkup(editorState.explanation),
    options: editorState.options.map((option) => ({
      ...option,
      text: canonicalizeEditorMathMarkup(option.text),
    })),
    acceptedAnswers: editorState.acceptedAnswers.map((answer) =>
      canonicalizeEditorMathMarkup(answer),
    ),
    sections: editorState.sections.map((section) => ({
      ...section,
      content: canonicalizeEditorMathMarkup(section.content || ""),
      conditionalFeedbackRules: section.conditionalFeedbackRules?.map(
        (rule) => ({
          ...rule,
          content: canonicalizeEditorMathMarkup(rule.content),
        }),
      ),
    })),
  };
}

export function buildQuestionFromEditor(
  original: Question | undefined,
  inputState: EditorFormState,
): Question {
  const editorState = canonicalizeEditorFormState(inputState);
  const type = editorState.type;

  if (type === "MCQ") {
    return {
      type: "MCQ",
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

  if (type === "MSQ") {
    return {
      type: "MSQ",
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

  if (type === "ORDER") {
    return {
      type: "ORDER",
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

  if (type === "TEXT_ENTRY") {
    return {
      type: "TEXT_ENTRY",
      stem: editorState.stem,
      mode: editorState.textEntryMode || "text",
      acceptedAnswers: editorState.acceptedAnswers,
      numericTolerance: editorState.numericTolerance,
      units: editorState.units || undefined,
      caseSensitive: editorState.caseSensitive,
      trimPolicy: editorState.trimPolicy,
      explanation: editorState.explanation || undefined,
    } as TextEntryQuestion;
  }

  return { type: "UNKNOWN", rawStem: editorState.stem };
}

// ─── Editor Form State ──────────────────────────────────────────────

export interface EditorFormState {
  type: string;
  stem: string;
  explanation: string;

  // MCQ / MSQ / ORDER
  options: Array<{ id: string; text: string }>;
  correctAnswerId: string; // MCQ
  correctAnswerIds: string[]; // MSQ
  correctSequenceIds: string[]; // ORDER

  // TEXT_ENTRY
  textEntryMode: "text" | "numeric" | "formula";
  acceptedAnswers: string[];
  numericTolerance?: number;
  units: string;
  caseSensitive: boolean;
  trimPolicy: "trim" | "none";

  // Row-level content and delivery settings
  mediaReferences: EditorMediaReference[];
  metadata: EditorMetadataState;
  marks: number;
  negativeMarks?: number;
  timeLimitSeconds?: number;
  imageRequired?: boolean;
  sections: AuthoringSection[];
}

export interface EditorMediaReference {
  id: string;
  publicUrlSource: string;
  role: MediaRole;
  altText: string;
  contentType: MediaContentType;
  ownerId?: string;
}

export interface EditorMetadataState {
  questionId: string;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
  language: string;
}

/**
 * Initialize EditorFormState from an existing Question.
 */
export function questionToEditorState(
  q: Question | undefined,
): EditorFormState {
  const base: EditorFormState = {
    type: q?.type || "UNKNOWN",
    stem: "",
    explanation: "",
    options: [],
    correctAnswerId: "",
    correctAnswerIds: [],
    correctSequenceIds: [],
    textEntryMode: "text",
    acceptedAnswers: [],
    numericTolerance: undefined,
    units: "",
    caseSensitive: false,
    trimPolicy: "trim",
    mediaReferences: [],
    metadata: {
      questionId: "",
      subject: "",
      chapter: "",
      topic: "",
      difficulty: "",
      language: "",
    },
    marks: 1,
    negativeMarks: undefined,
    timeLimitSeconds: undefined,
    sections: REQUIRED_AUTHORING_SECTIONS.map((section) => ({ ...section })),
  };

  if (!q) return base;

  if ("stem" in q) base.stem = q.stem || "";
  if ("rawStem" in q) base.stem = q.rawStem || "";
  if ("explanation" in q) base.explanation = q.explanation || "";

  if (q.type === "MCQ") {
    base.options = q.options.map((o) => ({ id: o.id, text: o.text }));
    base.correctAnswerId = q.correctAnswerId;
  }

  if (q.type === "MSQ") {
    base.options = q.options.map((o) => ({ id: o.id, text: o.text }));
    base.correctAnswerIds = [...q.correctAnswerIds];
  }

  if (q.type === "ORDER") {
    base.options = q.options.map((o) => ({ id: o.id, text: o.text }));
    base.correctSequenceIds = [...q.correctSequenceIds];
  }

  if (q.type === "TEXT_ENTRY") {
    base.textEntryMode = q.mode;
    base.acceptedAnswers = [...q.acceptedAnswers];
    base.numericTolerance = q.numericTolerance;
    base.units = q.units || "";
    base.caseSensitive = q.caseSensitive;
    base.trimPolicy = q.trimPolicy;
  }

  return base;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Initialize the complete Manual Fix form from a validated row. */
export function rowToEditorState(row: QuestionRow): EditorFormState {
  const state = questionToEditorState(row.normalizedQuestion);
  const rowMedia =
    row.mediaReferences?.length > 0
      ? row.mediaReferences
      : row.metadata?.mediaUrl
        ? [
            {
              id: `metadata-media-${row.id}`,
              publicUrlSource: row.metadata.mediaUrl,
              role: "question_stem" as const,
              status: "pending" as const,
              altText: "",
              contentType: "image" as const,
            },
          ]
        : [];

  state.mediaReferences = rowMedia.map((reference) => ({
    id: reference.id,
    publicUrlSource: reference.publicUrlSource,
    role: reference.role,
    altText: reference.altText || "",
    contentType: reference.contentType || "image",
    ownerId: reference.ownerId,
  }));
  state.metadata = {
    questionId: row.metadata?.questionId || "",
    subject: row.metadata?.subject || "",
    chapter: row.metadata?.chapter || "",
    topic: row.metadata?.topic || "",
    difficulty: row.metadata?.difficulty || "",
    language: row.metadata?.language || "",
  };
  state.marks = row.scoringConfig?.marks ?? 1;
  state.negativeMarks = row.metadata?.negativeMarks;
  state.timeLimitSeconds = row.timeLimitConfig?.timeLimitSeconds;

  const rawReq =
    (row.rawRow as any)?.Image_Required ?? (row.rawRow as any)?.mediaRequired;
  state.imageRequired =
    rawReq === true ||
    rawReq === 1 ||
    String(rawReq).trim().toLowerCase() === "yes" ||
    String(rawReq).trim().toLowerCase() === "true" ||
    row.issues?.some((i) => i.ruleId === "REQUIRED_MEDIA_UNRESOLVED");

  const persistedSections = row.manualFixSections?.map((section) => ({
    ...section,
  }));
  if (persistedSections?.length) {
    const sectionTypes = new Set(
      persistedSections.map((section) => section.type),
    );
    state.sections = [
      ...persistedSections,
      ...REQUIRED_AUTHORING_SECTIONS.filter(
        (required) => !sectionTypes.has(required.type),
      ).map((section) => ({ ...section })),
    ];
    const persistedExplanation = state.sections.find(
      (section) => section.type === "explanation",
    );
    if (persistedExplanation?.content !== undefined) {
      state.explanation = persistedExplanation.content;
    }
  } else if (state.explanation.trim()) {
    state.sections = [
      ...state.sections,
      { id: "explanation", type: "explanation", content: state.explanation },
    ];
  }

  return state;
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Build a complete row revision from the Manual Fix form without mutation. */
export function buildRowFromEditor(
  row: QuestionRow,
  inputState: EditorFormState,
): QuestionRow {
  const editorState = canonicalizeEditorFormState(inputState);
  const normalizedQuestion = buildQuestionFromEditor(
    row.normalizedQuestion,
    editorState,
  );
  const previousMediaById = new Map(
    (row.mediaReferences || []).map((reference) => [reference.id, reference]),
  );
  const authoringContentByOwner = new Map<string, string>([
    ["question", editorState.stem],
  ]);
  editorState.sections.forEach((section) => {
    if (!isRequiredAuthoringSection(section.type)) {
      authoringContentByOwner.set(
        section.id,
        section.type === "explanation"
          ? editorState.explanation
          : section.content || "",
      );
    }
    (section.conditionalFeedbackRules || []).forEach((rule) =>
      authoringContentByOwner.set(rule.id, rule.content),
    );
  });
  const ownedAssetStillExists = (reference: EditorMediaReference) => {
    if (!reference.ownerId) return true;
    const ownerContent = authoringContentByOwner.get(reference.ownerId);
    if (ownerContent === undefined) return false;
    const source = reference.publicUrlSource.trim();
    return (
      ownerContent.includes(source) ||
      ownerContent.includes(source.replace(/&/g, "&amp;"))
    );
  };
  const mediaReferences = editorState.mediaReferences
    .filter(
      (reference) =>
        reference.publicUrlSource.trim() !== "" &&
        ownedAssetStillExists(reference),
    )
    .map((reference) => {
      const publicUrlSource = reference.publicUrlSource.trim();
      const previous = previousMediaById.get(reference.id);
      const hasBlockingUrlIssue = validateMediaUrl(
        publicUrlSource,
        reference.contentType,
      ).some((issue) => issue.severity === "block");

      return {
        id: reference.id || crypto.randomUUID(),
        publicUrlSource,
        resolvedUrl:
          previous?.publicUrlSource === publicUrlSource
            ? previous.resolvedUrl
            : undefined,
        role: reference.role,
        status: hasBlockingUrlIssue
          ? ("failed" as const)
          : previous?.publicUrlSource === publicUrlSource &&
              previous.status === "resolved"
            ? ("resolved" as const)
            : ("pending" as const),
        altText: optionalText(reference.altText),
        contentType: reference.contentType,
        ownerId: reference.ownerId,
      };
    });

  const primaryMedia = mediaReferences.find(
    (reference) => reference.role === "question_stem",
  );
  const metadata = {
    ...row.metadata,
    questionId: optionalText(editorState.metadata.questionId),
    subject: optionalText(editorState.metadata.subject),
    chapter: optionalText(editorState.metadata.chapter),
    topic: optionalText(editorState.metadata.topic),
    difficulty: optionalText(editorState.metadata.difficulty),
    language: optionalText(editorState.metadata.language),
    negativeMarks: editorState.negativeMarks,
    mediaUrl: primaryMedia?.publicUrlSource,
  };

  const mathValues = [
    editorState.stem,
    editorState.explanation,
    ...editorState.sections.flatMap((section) => [
      section.type === "explanation" ? "" : section.content || "",
      ...(section.conditionalFeedbackRules || []).map((rule) => rule.content),
    ]),
    ...editorState.options.map((option) => option.text),
    ...editorState.acceptedAnswers,
  ];

  const updatedRawRow = row.rawRow ? { ...row.rawRow } : {};
  if (editorState.imageRequired === false) {
    (updatedRawRow as any).Image_Required = "No";
    (updatedRawRow as any).mediaRequired = "No";
  } else if (editorState.imageRequired === true) {
    (updatedRawRow as any).Image_Required = "Yes";
    (updatedRawRow as any).mediaRequired = "Yes";
  }

  return {
    ...row,
    rawRow: updatedRawRow,
    normalizedQuestion,
    metadata,
    mediaReferences,
    mathReferences: extractMathReferences(mathValues),
    scoringConfig: {
      ...row.scoringConfig,
      marks: editorState.marks,
    },
    timeLimitConfig:
      editorState.timeLimitSeconds === undefined
        ? undefined
        : { timeLimitSeconds: editorState.timeLimitSeconds },
    manualFixSections: editorState.sections.map((section) =>
      section.type === "explanation"
        ? { ...section, content: editorState.explanation }
        : { ...section },
    ),
  };
}

/** Apply all Manual Fix fields atomically, then validate the exact row revision. */
export function applyManualEditorState(
  row: QuestionRow,
  editorState: EditorFormState,
  engine: ValidationEngine,
  context: ValidationContext,
): { row: QuestionRow; success: boolean; issuesDelta: number } {
  const updated = buildRowFromEditor(row, editorState);
  const revision: QuestionRow = {
    ...updated,
    history: [
      ...row.history,
      {
        timestamp: new Date().toISOString(),
        action: "manual_editor_save",
        previousState: {
          normalizedQuestion: row.normalizedQuestion,
          metadata: row.metadata,
          mediaReferences: row.mediaReferences,
          scoringConfig: row.scoringConfig,
          timeLimitConfig: row.timeLimitConfig,
          manualFixSections: row.manualFixSections,
        },
      },
    ],
  };
  const allRows = context.allRows.some((candidate) => candidate.id === row.id)
    ? context.allRows.map((candidate) =>
        candidate.id === row.id ? revision : candidate,
      )
    : [...context.allRows, revision];
  const validated = engine.validateRow(revision, { ...context, allRows });

  return {
    row: validated,
    success: true,
    issuesDelta: validated.issues.length - row.issues.length,
  };
}

function getNestedValue(obj: any, path: string): unknown {
  const segments = path.split(".");
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

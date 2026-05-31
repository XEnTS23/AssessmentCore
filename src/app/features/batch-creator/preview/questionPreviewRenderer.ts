/**
 * Question Preview Renderer
 *
 * Produces a lightweight plain-text or HTML-string summary of a QuestionRow
 * for display inside the Build & Preview stage.  This is intentionally kept
 * separate from React so it can be unit-tested without a DOM.
 */

import { QuestionRow } from '../core/rowTypes';
import { McqQuestion, MsqQuestion, TextEntryQuestion, OrderQuestion, Question } from '../core/questionTypes';

export interface QuestionPreview {
  /** Row source number (1-based) */
  rowNumber: number;
  /** Stable question ID */
  questionId: string;
  /** Human-readable type label */
  typeLabel: string;
  /** Raw stem text */
  stem: string;
  /** Option lines for MCQ / MSQ (empty for TEXT_ENTRY) */
  optionLines: Array<{ label: string; text: string; isCorrect: boolean }>;
  /** Accepted answer labels/texts */
  answerSummary: string;
  /** Score value */
  marks: number;
  /** Any issues to surface in the preview pane */
  issueCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  MCQ: 'Multiple Choice (Single)',
  MSQ: 'Multiple Select',
  TEXT_ENTRY: 'Text / Numeric Entry',
  ORDER: 'Ordering',
  UNKNOWN: 'Unknown',
};

export function renderQuestionPreview(row: QuestionRow): QuestionPreview {
  const q = row.normalizedQuestion;
  const qid = row.metadata?.questionId || row.id;

  if (!q || q.type === 'UNKNOWN') {
    return {
      rowNumber: row.sourceRowNumber,
      questionId: qid,
      typeLabel: 'Unknown',
      stem: (q as any)?.rawStem || '',
      optionLines: [],
      answerSummary: '—',
      marks: row.scoringConfig?.marks ?? 0,
      issueCount: row.issues?.length ?? 0,
    };
  }

  const stem = (q as any).stem ?? '';

  if (q.type === 'MCQ') {
    const mcq = q as McqQuestion;
    return {
      rowNumber: row.sourceRowNumber,
      questionId: qid,
      typeLabel: TYPE_LABELS['MCQ'],
      stem,
      optionLines: mcq.options.map(o => ({
        label: o.label,
        text: o.text,
        isCorrect: o.id === mcq.correctAnswerId,
      })),
      answerSummary: mcq.options.find(o => o.id === mcq.correctAnswerId)?.label ?? mcq.correctAnswerId,
      marks: row.scoringConfig?.marks ?? 1,
      issueCount: row.issues?.length ?? 0,
    };
  }

  if (q.type === 'MSQ') {
    const msq = q as MsqQuestion;
    const correctSet = new Set(msq.correctAnswerIds);
    return {
      rowNumber: row.sourceRowNumber,
      questionId: qid,
      typeLabel: TYPE_LABELS['MSQ'],
      stem,
      optionLines: msq.options.map(o => ({
        label: o.label,
        text: o.text,
        isCorrect: correctSet.has(o.id),
      })),
      answerSummary: msq.options.filter(o => correctSet.has(o.id)).map(o => o.label).join(', '),
      marks: row.scoringConfig?.marks ?? 1,
      issueCount: row.issues?.length ?? 0,
    };
  }

  if (q.type === 'TEXT_ENTRY') {
    const te = q as TextEntryQuestion;
    return {
      rowNumber: row.sourceRowNumber,
      questionId: qid,
      typeLabel: TYPE_LABELS['TEXT_ENTRY'],
      stem,
      optionLines: [],
      answerSummary: te.acceptedAnswers.slice(0, 3).join(' / ') || '—',
      marks: row.scoringConfig?.marks ?? 1,
      issueCount: row.issues?.length ?? 0,
    };
  }

  if (q.type === 'ORDER') {
    const order = q as OrderQuestion;
    const seqSet = new Set(order.correctSequenceIds);
    return {
      rowNumber: row.sourceRowNumber,
      questionId: qid,
      typeLabel: TYPE_LABELS['ORDER'],
      stem,
      optionLines: order.options.map((o, i) => ({
        label: String(i + 1), // Using numbers instead of labels to indicate position
        text: o.text,
        isCorrect: true, // We don't really have "correct options" vs "incorrect options", they are all part of the sequence.
      })),
      // Sort the options by their order in the correct sequence for the summary
      answerSummary: order.correctSequenceIds
        .map(seqId => order.options.find(o => o.id === seqId)?.label ?? seqId)
        .join(' ➔ '),
      marks: row.scoringConfig?.marks ?? 1,
      issueCount: row.issues?.length ?? 0,
    };
  }

  return {
    rowNumber: row.sourceRowNumber,
    questionId: qid,
    typeLabel: TYPE_LABELS[(q as Question).type] ?? 'Unknown',
    stem,
    optionLines: [],
    answerSummary: '—',
    marks: row.scoringConfig?.marks ?? 0,
    issueCount: row.issues?.length ?? 0,
  };
}

/** Render all rows to preview objects in one pass. */
export function renderAllPreviews(rows: QuestionRow[]): QuestionPreview[] {
  return rows.map(renderQuestionPreview);
}

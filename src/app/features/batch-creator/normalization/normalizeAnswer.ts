import { Question, Option, McqQuestion, MsqQuestion, TextEntryQuestion, OrderQuestion, UnknownQuestion } from '../core/questionTypes';

export interface ColumnMapping {
  type?: string;
  stem?: string;
  explanation?: string;
  options?: string[]; // Multiple columns mapped to option choices
  correctAnswer?: string;
  
  // Text entry specific
  acceptedAnswers?: string;
  tolerance?: string;
  units?: string;

  // Media
  mediaUrl?: string;

  // Metadata
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  marks?: string;
  negativeMarks?: string;
  section?: string;
  questionId?: string;
  sourceExam?: string;
  year?: string;
  language?: string;
  
  // Scoring / time
  timeLimitSeconds?: string;
}

/**
 * Basic text cleaner that doesn't destroy raw data but standardizes spacing
 */
const cleanStr = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

/**
 * Infers and normalizes the question type and its core answer fields
 */
export function normalizeAnswer(
  rawRow: Record<string, any>,
  mapping: ColumnMapping
): Question {
  const explicitType = mapping.type ? cleanStr(rawRow[mapping.type]).toUpperCase() : '';
  const stem = mapping.stem ? cleanStr(rawRow[mapping.stem]) : '';
  const explanation = mapping.explanation ? cleanStr(rawRow[mapping.explanation]) : undefined;
  
  const optionsMap = (mapping.options || [])
    .map(col => ({ col, val: cleanStr(rawRow[col]) }))
    .filter(o => o.val !== '');

  const answerRaw = mapping.correctAnswer ? cleanStr(rawRow[mapping.correctAnswer]) : '';

  // Determine type
  let inferredType = explicitType;
  if (!inferredType) {
    if (optionsMap.length > 0 && answerRaw.includes(',')) {
      // By default without explicit type, we still guess MSQ for comma-separated options.
      // (Unless they map 'order' type explicitly)
      inferredType = 'MSQ';
    } else if (optionsMap.length > 0 && answerRaw) {
      inferredType = 'MCQ';
    } else if (optionsMap.length === 0 && answerRaw) {
      inferredType = 'TEXT_ENTRY';
    } else {
      inferredType = 'UNKNOWN';
    }
  }

  // Map to structured Options
  const options: Option[] = optionsMap.map((o, idx) => {
    // Generate a stable ID based on index: A, B, C, D
    const label = String.fromCharCode(65 + idx);
    return {
      id: crypto.randomUUID(),
      label,
      text: o.val
    };
  });

  if (inferredType === 'MCQ' || inferredType === 'SINGLE') {
    // Try to match correctAnswer to an option label or text
    let correctAnswerId = '';
    const ansUpper = answerRaw.toUpperCase();
    
    // First try exact match on label (e.g. "A", "B")
    const matchByLabel = options.find(o => o.label === ansUpper);
    if (matchByLabel) {
      correctAnswerId = matchByLabel.id;
    } else {
      // Then try exact match on text
      const matchByText = options.find(o => o.text.toUpperCase() === ansUpper);
      if (matchByText) {
        correctAnswerId = matchByText.id;
      } else {
        // Fallback: Just use the raw answer string (validation will catch this later)
        correctAnswerId = answerRaw;
      }
    }

    return {
      type: 'MCQ',
      stem,
      options,
      correctAnswerId,
      explanation
    } as McqQuestion;
  }

  if (inferredType === 'MSQ' || inferredType === 'MULTIPLE') {
    const rawAnswers = answerRaw.split(/[,|;]/).map(s => s.trim().toUpperCase()).filter(s => s);
    const correctAnswerIds: string[] = [];

    for (const ans of rawAnswers) {
      const matchByLabel = options.find(o => o.label === ans);
      if (matchByLabel) {
        correctAnswerIds.push(matchByLabel.id);
      } else {
        const matchByText = options.find(o => o.text.toUpperCase() === ans);
        if (matchByText) {
          correctAnswerIds.push(matchByText.id);
        } else {
          correctAnswerIds.push(ans); // Fallback for validation to catch
        }
      }
    }

    return {
      type: 'MSQ',
      stem,
      options,
      correctAnswerIds,
      explanation
    } as MsqQuestion;
  }

  if (inferredType === 'ORDER' || inferredType === 'SEQUENCE' || inferredType === 'ORDERING') {
    const rawAnswers = answerRaw.split(/[,|;]/).map(s => s.trim().toUpperCase()).filter(s => s);
    const correctSequenceIds: string[] = [];

    for (const ans of rawAnswers) {
      const matchByLabel = options.find(o => o.label === ans);
      if (matchByLabel) {
        correctSequenceIds.push(matchByLabel.id);
      } else {
        const matchByText = options.find(o => o.text.toUpperCase() === ans);
        if (matchByText) {
          correctSequenceIds.push(matchByText.id);
        } else {
          correctSequenceIds.push(ans); // Fallback for validation to catch
        }
      }
    }

    return {
      type: 'ORDER',
      stem,
      options,
      correctSequenceIds,
      explanation
    } as OrderQuestion;
  }

  if (inferredType === 'TEXT_ENTRY' || inferredType === 'NUMERIC' || inferredType === 'TEXT') {
    // Determine mode based on type string or content
    let mode: 'text' | 'numeric' | 'formula' = 'text';
    if (inferredType === 'NUMERIC') mode = 'numeric';
    
    // Check if numeric content
    if (mode === 'text' && !isNaN(Number(answerRaw)) && answerRaw !== '') {
      mode = 'numeric';
    }

    const acceptedAnswersRaw = mapping.acceptedAnswers ? cleanStr(rawRow[mapping.acceptedAnswers]) : answerRaw;
    const acceptedAnswers = acceptedAnswersRaw 
      ? acceptedAnswersRaw.split(/[,|;]/).map(s => s.trim()).filter(s => s) 
      : [];

    const toleranceRaw = mapping.tolerance ? cleanStr(rawRow[mapping.tolerance]) : '';
    const numericTolerance = toleranceRaw && !isNaN(Number(toleranceRaw)) ? Number(toleranceRaw) : undefined;
    
    const units = mapping.units ? cleanStr(rawRow[mapping.units]) : undefined;

    return {
      type: 'TEXT_ENTRY',
      stem,
      mode,
      acceptedAnswers,
      numericTolerance,
      units,
      caseSensitive: false,
      trimPolicy: 'trim',
      explanation
    } as TextEntryQuestion;
  }

  return {
    type: 'UNKNOWN',
    rawStem: stem
  } as UnknownQuestion;
}

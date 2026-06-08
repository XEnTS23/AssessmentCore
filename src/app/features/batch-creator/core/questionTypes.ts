export interface Option {
  id: string;
  label: string;
  text: string;
}

export interface McqQuestion {
  type: 'MCQ';
  stem: string;
  options: Option[];
  correctAnswerId: string;
  explanation?: string;
}

export interface MsqQuestion {
  type: 'MSQ';
  stem: string;
  options: Option[];
  correctAnswerIds: string[];
  explanation?: string;
}

export interface OrderQuestion {
  type: 'ORDER';
  stem: string;
  options: Option[];
  correctSequenceIds: string[];
  explanation?: string;
}

export interface TextEntryQuestion {
  type: 'TEXT_ENTRY';
  stem: string;
  mode: 'text' | 'numeric' | 'formula';
  acceptedAnswers: string[];
  numericTolerance?: number;
  units?: string;
  caseSensitive: boolean;
  trimPolicy: 'trim' | 'none';
  explanation?: string;
}

export interface UnknownQuestion {
  type: 'UNKNOWN';
  rawStem?: string;
  options?: Option[];
}

export type Question = McqQuestion | MsqQuestion | TextEntryQuestion | OrderQuestion | UnknownQuestion;

export interface QuestionMetadata {
  subject?: string;
  chapter?: string;
  topic?: string;
  difficulty?: string;
  marks?: number;
  negativeMarks?: number;
  section?: string;
  questionId?: string;
  sourceExam?: string;
  year?: string;
  language?: string;
  mediaUrl?: string;
  customFields?: Record<string, string>;
}

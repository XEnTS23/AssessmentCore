export type CopyrightStatus =
  | "approved"
  | "teacher_created"
  | "licensed"
  | "public_domain"
  | "permission_granted"
  | "unknown"
  | "unverified";

export interface ParsedTimestamp {
  rawValue: string;
  valid: boolean;
  parsedValue?: Date;
  parser?: string;
  error?: string;
}

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
  copyrightStatus?: CopyrightStatus | string;
  sourceReference?: string;
  teacherVersion?: string;
  submittedAt?: Date | string;
  lastUpdatedAt?: Date | string;
  rawCopyrightStatus?: string;
  rawSourceReference?: string;
  rawTeacherVersion?: string;
  rawSubmittedAt?: string;
  rawLastUpdatedAt?: string;
  submittedTimestamp?: ParsedTimestamp;
  lastUpdatedTimestamp?: ParsedTimestamp;
  customFields?: Record<string, string>;
}

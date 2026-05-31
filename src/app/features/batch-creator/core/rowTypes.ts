import { Question } from './questionTypes';
import { QuestionMetadata } from './metadataTypes';
import { MediaReference } from './mediaTypes';
import { MathReference } from './mathTypes';
import { ScoringConfig } from './scoringTypes';
import { ValidationIssue } from './issueTypes';

export interface RowHistoryEntry {
  timestamp: string;
  action: string;
  previousState?: any;
}

export type RawSheetRow = {
  __internalId: string;
  __sourceRowNumber: number;
} & Record<string, any>;


export interface QuestionRow {
  id: string;
  sourceRowNumber: number;
  rawRow: Record<string, any>;
  normalizedQuestion?: Question;
  metadata: QuestionMetadata;
  mediaReferences: MediaReference[];
  mathReferences: MathReference[];
  scoringConfig: ScoringConfig;
  timeLimitConfig?: {
    timeLimitSeconds?: number;
  };
  history: RowHistoryEntry[];
  status: 'raw' | 'normalized' | 'rejected' | 'needs_review' | 'caution' | 'valid';
  issues: ValidationIssue[];
}

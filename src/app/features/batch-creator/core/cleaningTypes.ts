import { QuestionRow } from './rowTypes';

// ─── Cleaning Log ────────────────────────────────────────────────────

export interface CleaningLog {
  rowId: string;
  field: string;
  action: string;
  before: string;
  after: string;
  reversible: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// ─── Cleaning Metrics ────────────────────────────────────────────────

export interface CleaningMetrics {
  totalRowsProcessed: number;
  totalFieldsCleaned: number;
  pass1Changes: number;
  pass2Changes: number;
  /** Breakdown of action counts, e.g. { 'invisible_char_removal': 12, ... } */
  actionBreakdown: Record<string, number>;
}

// ─── Cleaning Result ─────────────────────────────────────────────────

export interface CleaningResult {
  rows: QuestionRow[];
  logs: CleaningLog[];
  metrics: CleaningMetrics;
}

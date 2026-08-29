import {
  CanonicalQuestionType,
  Question,
  TypeResolution,
} from "./questionTypes";
import { QuestionMetadata } from "./metadataTypes";
import { MediaReference } from "./mediaTypes";
import { MathReference } from "./mathTypes";
import { ScoringConfig } from "./scoringTypes";
import { ValidationIssue } from "./issueTypes";
import { AuthoringSection } from "./authoringTypes";

export interface RowHistoryEntry {
  timestamp: string;
  action: string;
  previousState?: any;
}

export interface SourceCell {
  columnName: string;
  rawValue: unknown;
  rawText?: string;
  rowNumber: number;
  cellType?: string;
}

export interface RawImportedRow {
  rowNumber: number;
  cells: Readonly<Record<string, Readonly<SourceCell>>>;
}

export type RawSheetRow = {
  __internalId: string;
  __sourceRowNumber: number;
  __rawImportedRow?: RawImportedRow;
} & Record<string, any>;

export interface NormalizationAuditEntry {
  field: string;
  rawValue: unknown;
  normalizedValue: unknown;
  ruleId: string;
  confidence?: number;
  actorType: "user" | "system";
  actorId?: string;
  timestamp: string;
}

export interface QuestionRow {
  id: string;
  sourceRowNumber: number;
  rawRow: Record<string, any>;
  raw?: RawImportedRow;
  normalizedQuestion?: Question;
  rawType?: string;
  canonicalType?: CanonicalQuestionType;
  typeResolution?: TypeResolution;
  metadata: QuestionMetadata;
  mediaReferences: MediaReference[];
  mathReferences: MathReference[];
  scoringConfig: ScoringConfig;
  timeLimitConfig?: {
    timeLimitSeconds?: number;
  };
  history: RowHistoryEntry[];
  normalizationAudit?: NormalizationAuditEntry[];
  status:
    | "raw"
    | "normalized"
    | "rejected"
    | "needs_review"
    | "caution"
    | "valid";
  issues: ValidationIssue[];
  skippedRules?: Array<{ ruleId: string; missingPrerequisites: string[] }>;
  skippedRuleIds?: string[];
  /**
   * Authoring-only layout and optional learner content created in Manual Fix.
   * Required sections are included so their editor order survives reopening.
   */
  manualFixSections?: AuthoringSection[];
}

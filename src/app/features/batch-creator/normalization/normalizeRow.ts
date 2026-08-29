import { RawSheetRow, QuestionRow, RowHistoryEntry } from "../core/rowTypes";
import { ColumnMapping, normalizeAnswer } from "./normalizeAnswer";
import { normalizeMetadata } from "./normalizeMetadata";
import { ScoringConfig } from "../core/scoringTypes";
import { rawImportedRowFromSheetRow } from "../upload/rawCellData";

export function normalizeRow(
  rawSheetRow: RawSheetRow,
  mapping: ColumnMapping,
): QuestionRow {
  // 1. Normalize the question structure (MCQ, MSQ, TEXT_ENTRY, or UNKNOWN)
  const normalizedQuestion = normalizeAnswer(rawSheetRow, mapping);

  // 2. Normalize metadata from the immutable source-cell representation.
  const raw = rawImportedRowFromSheetRow(rawSheetRow);
  const metadata = normalizeMetadata(rawSheetRow, mapping, raw);

  // 2.5 Ensure questionId exists (required for export readiness)
  if (!metadata.questionId) {
    const sourceRowNumber = rawSheetRow.__sourceRowNumber || 0;
    metadata.questionId = `Q_${sourceRowNumber}_${crypto.randomUUID().slice(0, 4)}`;
  }

  // 3. Handle scoring configuration
  const scoringConfig: ScoringConfig = {
    marks: metadata.marks ?? 1, // default only when the source value is missing
    partialMarking: false, // default partial marking
  };

  // 4. Handle time limit
  let timeLimitConfig: { timeLimitSeconds?: number } | undefined;
  if (mapping.timeLimitSeconds && rawSheetRow[mapping.timeLimitSeconds]) {
    const parsedTime = Number(rawSheetRow[mapping.timeLimitSeconds]);
    if (!isNaN(parsedTime)) {
      timeLimitConfig = { timeLimitSeconds: parsedTime };
    }
  }

  // 5. Construct row history
  const history: RowHistoryEntry[] = [
    {
      timestamp: new Date().toISOString(),
      action: "Row normalized from raw sheet data",
      previousState: null,
    },
  ];

  // 6. Build the final QuestionRow
  const rowId = rawSheetRow.__internalId || crypto.randomUUID();
  const sourceRowNumber = rawSheetRow.__sourceRowNumber || 0;

  // We strip internal properties when storing rawRow in QuestionRow
  // Since they are technically required by RawSheetRow type, we can cast
  const cleanRawRow: any = { ...rawSheetRow };
  delete cleanRawRow.__internalId;
  delete cleanRawRow.__sourceRowNumber;
  delete cleanRawRow.__rawImportedRow;

  return {
    id: rowId,
    sourceRowNumber,
    rawRow: cleanRawRow,
    raw,
    normalizedQuestion,
    rawType: normalizedQuestion.rawType,
    canonicalType: normalizedQuestion.canonicalType,
    typeResolution: normalizedQuestion.typeResolution,
    metadata,
    mediaReferences: [], // Extracting media happens in a later stage
    mathReferences: [], // Extracting math happens in a later stage
    scoringConfig,
    timeLimitConfig,
    history,
    status: "normalized",
    issues: [],
  };
}

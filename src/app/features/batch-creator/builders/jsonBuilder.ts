import { QuestionRow } from "../core/rowTypes";
import { ExportConfig } from "../core/exportTypes";
import {
  buildExportAuthoringComponents,
  getExportAuthoringSections,
} from "./shared/authoringSectionMapper";
import {
  BuildResult,
  GeneratedArtifact,
  BuildWarning,
  BuildError,
} from "../core/buildTypes";

export interface JsonBuilderOptions {
  debug?: boolean;
}

export function buildJsonExport(
  rows: QuestionRow[],
  config: ExportConfig,
  options: JsonBuilderOptions = {},
): BuildResult {
  const warnings: BuildWarning[] = [];
  const errors: BuildError[] = [];

  const questions = rows
    .map((row) => {
      // Basic required validation before serialization
      if (
        row.status === "rejected" ||
        row.normalizedQuestion?.type === "UNKNOWN"
      ) {
        errors.push({
          code: "INVALID_ROW_STATE",
          message: `Row ${row.sourceRowNumber} cannot be exported in its current state (${row.status}).`,
          rowId: row.id,
        });
        return null;
      }

      const q = row.normalizedQuestion!;
      const authoringSections = getExportAuthoringSections(row);
      const authoringComponents = buildExportAuthoringComponents(row);

      // Construct the serialized question object
      const serialized: any = {
        id: row.metadata.questionId || row.id,
        sourceRowNumber: row.sourceRowNumber,
        type: q.type,
        stem: q.stem,
        metadata: config.metadataMode === "exclude" ? {} : row.metadata,
        mediaReferences: row.mediaReferences,
        mathReferences: row.mathReferences,
        scoring: row.scoringConfig,
        timeLimit: row.timeLimitConfig,
        authoringSections,
        componentOrder: authoringComponents.map((component) => component.type),
        authoringComponents,
      };

      if ("explanation" in q && q.explanation) {
        serialized.explanation = q.explanation;
      }

      if (q.type === "MCQ") {
        serialized.options = q.options;
        serialized.correctAnswerId = q.correctAnswerId;
      } else if (q.type === "MSQ") {
        serialized.options = q.options;
        serialized.correctAnswerIds = q.correctAnswerIds;
      } else if (q.type === "ORDER") {
        serialized.options = q.options;
        serialized.correctSequenceIds = q.correctSequenceIds;
      } else if (q.type === "TEXT_ENTRY") {
        serialized.textEntryMode = q.mode;
        serialized.acceptedAnswers = q.acceptedAnswers;
        serialized.numericTolerance = q.numericTolerance;
        serialized.units = q.units;
        serialized.caseSensitive = q.caseSensitive;
        serialized.trimPolicy = q.trimPolicy;
      }

      if (options.debug) {
        serialized._debug = {
          rawRow: row.rawRow,
          history: row.history,
          issues: row.issues,
        };
      }

      return serialized;
    })
    .filter(Boolean); // Remove nulls

  if (errors.length > 0) {
    return {
      success: false,
      artifacts: [],
      warnings,
      errors,
    };
  }

  const exportPayload = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    config: {
      target: config.target,
      scoringMode: config.scoring.mode,
      mediaMode: config.mediaMode,
      mathMode: config.mathMode,
    },
    questions,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const sizeBytes = new Blob([jsonString]).size;

  const artifact: GeneratedArtifact = {
    fileName: `assessment_export_${Date.now()}.json`,
    mimeType: "application/json",
    data: jsonString,
    sizeBytes,
  };

  return {
    success: true,
    artifacts: [artifact],
    warnings,
    errors,
  };
}

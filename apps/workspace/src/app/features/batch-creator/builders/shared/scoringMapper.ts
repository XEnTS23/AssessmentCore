import { ExportConfig } from "../../core/exportTypes";
import { ScoringConfig } from "../../core/scoringTypes";
import { QuestionMetadata } from "../../core/metadataTypes";

// ─── Scoring mapper (shared) ────────────────────────────────────────────────
//
// Maps the internal ScoringConfig to primitive values suitable for embedding
// in QTI responseDeclaration / outcomeDeclaration blocks.
//
// Both QTI 2.1 and 3.0 share the same conceptual model here; the caller is
// responsible for assembling the actual XML elements.

export interface MappedScoring {
  /** The raw marks value for a correct answer. */
  correctScore: number;
  /** The penalty score (positive number; caller negates it where needed). */
  penalty: number;
  /** Whether partial credit is enabled. */
  partialMarking: boolean;
  /** Default map value (0 for a correctly-attempted item). */
  defaultValue: number;
}

/**
 * Canonical scoring contract used by the QTI 2.1 builder.
 *
 * All values are signed and final — the builder does not need to
 * re-interpret or negate them.
 */
export interface CanonicalScoring {
  /** Score awarded for a correct answer (e.g. 4). */
  correctScore: number;
  /** Score assigned for an incorrect answer (e.g. -1). Always signed. */
  incorrectScore: number;
  /** Minimum possible score for the item (e.g. -1). */
  minimumScore: number;
  /** Maximum possible score for the item (e.g. 4). */
  maximumScore: number;
  /** Scoring mode. */
  mode: "all-or-nothing" | "partial" | "manual";
}

/**
 * Legacy scoring mapper — used by the QTI 3.0 builder.
 */
export function mapScoring(
  scoringConfig: ScoringConfig,
  exportConfig: ExportConfig,
): MappedScoring {
  const correctScore = scoringConfig.marks ?? 1;
  const negMarking = exportConfig.scoring.negativeMarking;
  const penalty = negMarking.enabled ? (negMarking.globalValue ?? 0) : 0;
  const partialMarking =
    exportConfig.scoring.mode === "advanced" &&
    exportConfig.scoring.partialMarking.enabled;

  return {
    correctScore,
    penalty,
    partialMarking,
    defaultValue: 0,
  };
}

/**
 * Resolve a canonical scoring contract from row and export configuration.
 *
 * Key design decisions:
 *   • `incorrectScore` is the final signed value the builder emits.
 *     The penalty convention is converted once here — never double-negated.
 *   • All four values are validated to be finite.
 *   • `minimumScore` is the floor: min(0, incorrectScore, scoreFloor).
 *   • `maximumScore` equals the correct score.
 */
export function resolveCanonicalScoring(
  scoringConfig: ScoringConfig,
  metadata: QuestionMetadata,
  exportConfig: ExportConfig,
): CanonicalScoring {
  const correctScore = scoringConfig.marks ?? 1;

  // Determine incorrect score:
  // Priority: per-item metadata.negativeMarks > global config > 0
  let incorrectScore = 0;
  if (exportConfig.scoring.negativeMarking.enabled) {
    if (
      exportConfig.scoring.negativeMarking.valueSource === "metadata" &&
      metadata.negativeMarks != null
    ) {
      // metadata.negativeMarks is stored as a positive magnitude or
      // a negative signed value — normalize to a negative signed value
      const raw = metadata.negativeMarks;
      incorrectScore = raw > 0 ? -raw : raw;
    } else {
      const globalPenalty =
        exportConfig.scoring.negativeMarking.globalValue ?? 0;
      // globalValue is stored as a positive magnitude
      incorrectScore = globalPenalty > 0 ? -globalPenalty : 0;
    }
  }

  const partialMarking =
    exportConfig.scoring.mode === "advanced" &&
    exportConfig.scoring.partialMarking.enabled;

  const mode: CanonicalScoring["mode"] = partialMarking
    ? "partial"
    : "all-or-nothing";

  const scoreFloor = exportConfig.scoring.scoreFloor ?? 0;
  const minimumScore = Math.min(0, incorrectScore, scoreFloor);
  const maximumScore = correctScore;

  // Validate all values are finite
  const values = { correctScore, incorrectScore, minimumScore, maximumScore };
  for (const [key, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `Scoring value "${key}" is not finite: ${value}. Cannot produce valid QTI.`,
      );
    }
  }

  return {
    correctScore,
    incorrectScore,
    minimumScore,
    maximumScore,
    mode,
  };
}

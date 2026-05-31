import { ExportConfig } from '../../core/exportTypes';
import { ScoringConfig } from '../../core/scoringTypes';

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

export function mapScoring(scoringConfig: ScoringConfig, exportConfig: ExportConfig): MappedScoring {
  const correctScore = scoringConfig.marks ?? 1;
  const negMarking = exportConfig.scoring.negativeMarking;
  const penalty = negMarking.enabled
    ? (negMarking.globalValue ?? 0)
    : 0;
  const partialMarking =
    exportConfig.scoring.mode === 'advanced' && exportConfig.scoring.partialMarking.enabled;

  return {
    correctScore,
    penalty,
    partialMarking,
    defaultValue: 0,
  };
}

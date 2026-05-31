export type ScoringMode = 'basic' | 'advanced';
export type PartialMarkingStrategy = 'none' | 'proportional' | 'right_minus_wrong' | 'custom';

export interface ExportScoringConfig {
  mode: ScoringMode;
  partialMarking: {
    enabled: boolean;
    strategy: PartialMarkingStrategy;
  };
  negativeMarking: {
    enabled: boolean;
    valueSource: 'metadata' | 'global';
    globalValue?: number;
  };
  scoreFloor?: number;
}

export interface ScoringConfig {
  marks: number;
  partialMarking: boolean;
}

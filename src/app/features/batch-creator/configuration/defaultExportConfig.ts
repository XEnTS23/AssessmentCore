import { ExportConfig } from '../core/exportTypes';

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  target: 'json',
  packageStructure: 'assessment',
  feedbackMode: 'post_attempt',
  shuffleOptions: true,
  mediaMode: 'keep_public_url',
  mathMode: 'latex',
  metadataMode: 'include_all',
  timeLimitMode: 'none',
  scoring: {
    mode: 'basic',
    partialMarking: {
      enabled: false,
      strategy: 'none'
    },
    negativeMarking: {
      enabled: false,
      valueSource: 'global',
      globalValue: 0
    },
    scoreFloor: 0
  },
  enableLatexDelimiterAutoRepair: true
};

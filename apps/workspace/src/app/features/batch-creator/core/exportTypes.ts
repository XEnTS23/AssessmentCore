import { ExportScoringConfig } from "./scoringTypes";

export type ExportTarget = "qti_2_1" | "qti_3_0" | "json" | "custom_lms";
export type MediaMode =
  | "keep_public_url"
  | "download_and_package"
  | "upload_to_storage"
  | "custom_lms_reference"
  | "base64_inline";
export type MathMode = "latex" | "mathml" | "mathjax";
export type MetadataMode =
  | "include_all"
  | "include_selected"
  | "exclude"
  | "strict_mapping";

export interface ExportConfig {
  target: ExportTarget;
  packageStructure: "bank" | "assessment";
  feedbackMode: "post_attempt" | "hints" | "strip";
  shuffleOptions: boolean;
  mediaMode: MediaMode;
  mathMode: MathMode;
  scoring: ExportScoringConfig;
  metadataMode: MetadataMode;
  timeLimitMode: "none" | "per_question" | "global";
  timeLimitValue?: number;
  enableLatexDelimiterAutoRepair?: boolean;
}

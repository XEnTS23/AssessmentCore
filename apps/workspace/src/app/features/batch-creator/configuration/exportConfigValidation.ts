import { ExportConfig } from "../core/exportTypes";

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateExportConfig(
  config: ExportConfig,
): ConfigValidationResult {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  // Target specific checks
  if (config.target === "qti_2_1" && config.mediaMode === "keep_public_url") {
    result.warnings.push(
      "QTI 2.1 prefers packaged media. Keeping public URLs might break on some older LMS platforms.",
    );
  }

  // Scoring logic checks
  if (config.scoring.negativeMarking.enabled) {
    if (
      config.scoring.negativeMarking.valueSource === "global" &&
      (config.scoring.negativeMarking.globalValue === undefined ||
        config.scoring.negativeMarking.globalValue < 0)
    ) {
      result.errors.push(
        "Global negative marking is enabled but no valid positive penalty value is set.",
      );
      result.isValid = false;
    }
  }

  if (config.timeLimitMode !== "none" && !config.timeLimitValue) {
    result.errors.push("Time limit mode is set but no value is provided.");
    result.isValid = false;
  }

  return result;
}

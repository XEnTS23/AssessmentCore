import { ValidationRule } from "../validation/validationEngine";
import { QuestionRow } from "../core/rowTypes";
import { ValidationIssue } from "../core/issueTypes";

function createIssue(
  rule: Pick<ValidationRule, "id" | "category" | "severity">,
  rowId: string,
  message: string,
  field?: string,
  evidence?: Record<string, unknown>,
  options?: Partial<ValidationIssue>,
): ValidationIssue {
  return {
    id: crypto.randomUUID(),
    ruleId: rule.id,
    rowId,
    category: rule.category,
    severity: rule.severity,
    message,
    field,
    evidence,
    blocksExport:
      rule.severity === "block" || rule.severity === "engine_defect",
    ...options,
  };
}

export const REQUIRED_MEDIA_MISSING: ValidationRule = {
  id: "REQUIRED_MEDIA_MISSING",
  name: "Required Media Missing",
  category: "media",
  severity: "warning",
  priority: 95,
  appliesTo: "all",
  validate(row) {
    const rawReq =
      (row.rawRow as any)?.Image_Required ?? (row.rawRow as any)?.mediaRequired;
    const isRequired =
      rawReq === true ||
      rawReq === 1 ||
      String(rawReq).trim().toLowerCase() === "yes" ||
      String(rawReq).trim().toLowerCase() === "true";

    if (isRequired) {
      const fileName =
        (row.rawRow as any)?.Image_File_Name ??
        (row.rawRow as any)?.mediaFileName;
      const mediaUrl =
        (row.rawRow as any)?.Image_URL ?? (row.rawRow as any)?.mediaUrl;
      const hasRefs = row.mediaReferences && row.mediaReferences.length > 0;

      if (!fileName && !mediaUrl && !hasRefs) {
        return [
          createIssue(
            this,
            row.id,
            "Image is flagged as required for this question, but no file name or asset URL is attached. Media is optional, so this question can still be exported.",
            "mediaRequired",
            undefined,
            { blocksExport: false },
          ),
        ];
      }
    }
    return [];
  },
};

export const MEDIA_REFERENCE_NOT_FOUND: ValidationRule = {
  id: "MEDIA_REFERENCE_NOT_FOUND",
  name: "Media Reference Not Found",
  category: "media",
  severity: "review",
  priority: 90,
  appliesTo: "all",
  validate(row, context) {
    const fileName =
      (row.rawRow as any)?.Image_File_Name ??
      (row.rawRow as any)?.mediaFileName;
    if (fileName && typeof fileName === "string" && fileName.trim() !== "") {
      const packageAssets = (context as any).packageAssets as
        | string[]
        | undefined;
      if (packageAssets && Array.isArray(packageAssets)) {
        const found = packageAssets.some(
          (asset) => asset.toLowerCase() === fileName.trim().toLowerCase(),
        );
        if (!found) {
          return [
            createIssue(
              this,
              row.id,
              `Referenced media asset '${fileName}' was not found in the uploaded package bundle. Media is optional, so this question can still be exported.`,
              "mediaFileName",
              { fileName, availableAssets: packageAssets },
              { blocksExport: false },
            ),
          ];
        }
      }
    }
    return [];
  },
};

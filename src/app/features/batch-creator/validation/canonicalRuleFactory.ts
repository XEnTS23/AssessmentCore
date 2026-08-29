import type { ValidationIssue } from "../core/issueTypes";
import type { QuestionRow } from "../core/rowTypes";
import { analyzeLatexDelimiters } from "./latexDelimiterValidator";
import {
  canonicalIssueCategory,
  canonicalPriority,
  canonicalRuleName,
  canonicalSeverity,
  type CanonicalRuleSpec,
} from "./canonicalRuleCatalog";
import type {
  CanonicalRuleEvaluation,
  ValidationContext,
  ValidationRule,
} from "./validationEngine";

type Evaluation = CanonicalRuleEvaluation | undefined;
type LocalEvaluator = (
  row: QuestionRow,
  context: ValidationContext,
) => Evaluation;

const POLICY_NATURE = /policy-dependent/i;
const TARGET_NATURE = /target-dependent/i;
const HEURISTIC_NATURE = /heuristic|\bAI\b|symbolic|unit parser/i;

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function rawValue(row: QuestionRow, ...aliases: string[]): unknown {
  const wanted = new Set(aliases.map(normalizedKey));
  const match = Object.entries(row.rawRow || {}).find(([key]) =>
    wanted.has(normalizedKey(key)),
  );
  return match?.[1];
}

function nested(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!isRecord(value)) return undefined;
    return value[key];
  }, source);
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null);
}

function rowData(row: QuestionRow, ...paths: string[]): unknown {
  for (const path of paths) {
    const value = nested(row, path);
    if (value !== undefined && value !== null) return value;
    const raw = rawValue(row, path, path.split(".").at(-1) || path);
    if (raw !== undefined && raw !== null) return raw;
  }
  return undefined;
}

function boolValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  const normalized = asText(value).toLowerCase();
  if (["true", "yes", "1", "required"].includes(normalized)) return true;
  if (["false", "no", "0", "optional"].includes(normalized)) return false;
  return undefined;
}

function triggered(
  values: Record<string, unknown> = {},
  evidence: Record<string, unknown> = values,
  field?: string,
): CanonicalRuleEvaluation {
  return { triggered: true, values, evidence, field };
}

function notTriggered(): CanonicalRuleEvaluation {
  return { triggered: false };
}

function explicitEvaluation(
  ruleId: string,
  row: QuestionRow,
  context: ValidationContext,
): Evaluation {
  const rowEvaluations = (row as any).canonicalEvaluations;
  return firstDefined(
    rowEvaluations?.[ruleId],
    context.canonicalEvaluations?.[row.id]?.[ruleId],
    context.canonicalEvaluations?.["*"]?.[ruleId],
    nested(context.packageSnapshot, `evaluations.${ruleId}`),
    nested(context.iterationSnapshot, `evaluations.${ruleId}`),
  ) as Evaluation;
}

function replacePlaceholders(
  template: string,
  values: Record<string, unknown>,
): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
    const value = values[key];
    if (Array.isArray(value)) return value.join(", ");
    return value === undefined || value === null || value === ""
      ? "unknown"
      : String(value);
  });
}

function issueFromEvaluation(
  spec: CanonicalRuleSpec,
  row: QuestionRow,
  evaluation: CanonicalRuleEvaluation,
): ValidationIssue {
  const values = {
    ...(evaluation.evidence || {}),
    ...(evaluation.values || {}),
  };
  return {
    id: crypto.randomUUID(),
    ruleId: spec.id,
    rowId: row.id,
    category: canonicalIssueCategory(spec),
    severity: canonicalSeverity(spec.defaultSeverity),
    scope: spec.stage === "Package Validation" ? "package" : "row",
    field: evaluation.field || spec.field || undefined,
    message: replacePlaceholders(spec.messageTemplate, values),
    evidence: {
      ...(evaluation.evidence || {}),
      ...(evaluation.confidence === undefined
        ? {}
        : { confidence: evaluation.confidence }),
      ...(evaluation.sourceReference
        ? { sourceReference: evaluation.sourceReference }
        : {}),
      ...(evaluation.reasonCode ? { reasonCode: evaluation.reasonCode } : {}),
      canonicalRuleVersion: spec.version,
      canonicalStage: spec.stage,
    },
    blocksExport: spec.blocksExport,
  };
}

function allRichText(row: QuestionRow): Array<[string, string]> {
  const question = row.normalizedQuestion as any;
  const fields: Array<[string, unknown]> = [
    ["stem", question?.stem || question?.rawStem],
    ["explanation", question?.explanation],
    ...asArray(question?.options).map(
      (option, index) =>
        [`options[${index}].text`, option?.text] as [string, unknown],
    ),
    ...asArray(question?.acceptedAnswers).map(
      (answer, index) =>
        [`acceptedAnswers[${index}]`, answer] as [string, unknown],
    ),
    ...asArray(row.manualFixSections).map(
      (section, index) =>
        [`manualFixSections[${index}].content`, section.content] as [
          string,
          unknown,
        ],
    ),
  ];
  return fields
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .filter(([, value]) => value.length > 0);
}

function interactionData(row: QuestionRow): any[] {
  const question = row.normalizedQuestion as any;
  return asArray(
    firstDefined(
      question?.interactions,
      (row as any).interactions,
      rawValue(row, "Interactions"),
    ),
  );
}

function tableData(row: QuestionRow): any[] {
  const question = row.normalizedQuestion as any;
  return asArray(
    firstDefined(
      question?.tables,
      (row as any).tables,
      rawValue(row, "Tables"),
    ),
  );
}

function policyValue(context: ValidationContext, key: string): unknown {
  return firstDefined(
    context.policyProfile?.[key],
    context.exportConfig?.[key],
  );
}

const localEvaluators: Record<string, LocalEvaluator> = {
  ALT_TEXT_MISSING(row) {
    const media = row.mediaReferences.find((asset: any) => {
      const meaningful =
        asset.decorative !== true && asset.role !== "decorative";
      const imageLike =
        !asset.contentType ||
        ["image", "graph", "diagram", "equation_image"].includes(
          asset.contentType,
        );
      return meaningful && imageLike && !asText(asset.altText);
    }) as any;
    return media
      ? triggered(
          { fileName: media.fileName || media.publicUrlSource || media.id },
          { assetId: media.id, role: media.role },
          "mediaReferences",
        )
      : notTriggered();
  },

  INTERACTION_LABEL_MISSING(row) {
    const interaction = interactionData(row).find(
      (item) =>
        !asText(item?.accessibleLabel || item?.ariaLabel || item?.prompt),
    );
    return interaction
      ? triggered(
          { elementId: interaction.id || "interaction" },
          { interaction },
        )
      : notTriggered();
  },

  INTERACTIVE_ELEMENT_LABEL_MISSING(row) {
    const interaction = interactionData(row).find(
      (item) =>
        !asText(
          item?.accessibleName ||
            item?.accessibleLabel ||
            item?.ariaLabel ||
            item?.instruction,
        ),
    );
    return interaction
      ? triggered(
          { elementId: interaction.id || "interaction" },
          { interaction },
        )
      : notTriggered();
  },

  TABLE_HEADERS_MISSING(row) {
    const table = tableData(row).find((candidate) => {
      const rows = asArray(candidate?.rows);
      const columns = asArray(candidate?.columns);
      return (
        rows.length > 1 &&
        columns.length > 1 &&
        !candidate?.hasHeaders &&
        asArray(candidate?.rowHeaders).length === 0 &&
        asArray(candidate?.columnHeaders).length === 0
      );
    });
    return table
      ? triggered({ tableId: table.id || "table" }, { tableId: table.id })
      : notTriggered();
  },

  DROP_TARGET_ACCEPTANCE_INCOMPLETE(row) {
    const targets = asArray(
      firstDefined(
        rowData(row, "normalizedQuestion.dropTargets"),
        (row as any).dropTargets,
      ),
    );
    const target = targets.find(
      (item) =>
        !asArray(item?.accepts).length ||
        !Number.isFinite(Number(item?.capacity)) ||
        !asArray(item?.correctAssignments).length,
    );
    if (!target) return notTriggered();
    const reason = !asArray(target.accepts).length
      ? "acceptance rules are missing"
      : !Number.isFinite(Number(target.capacity))
        ? "capacity is missing"
        : "correct assignment is missing";
    return triggered({ targetId: target.id || "target", reason }, { target });
  },

  FORMULA_ANSWER_PARSE_FAILED(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "TEXT_ENTRY" || question.mode !== "formula") {
      return notTriggered();
    }
    const answer = asArray(question.acceptedAnswers).find((value) => {
      const text = asText(value);
      return (
        !text ||
        analyzeLatexDelimiters(text).issues.length > 0 ||
        /\\(?:begin|end)\s*\{(?:document|script)\}/i.test(text)
      );
    });
    return answer !== undefined
      ? triggered(
          { answer, reason: "formula syntax could not be parsed" },
          { answer },
        )
      : notTriggered();
  },

  HOTSPOT_CORRECT_REGION_MISSING(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "HOTSPOT") return notTriggered();
    const regionIds = new Set(
      asArray(question.regions).map((region) => region.id),
    );
    const correct = asArray(
      firstDefined(
        question.correctRegionIds,
        rawValue(row, "Correct_Region_IDs"),
      ),
    );
    const missing = correct.filter((id) => !regionIds.has(id));
    return correct.length === 0 || missing.length > 0
      ? triggered(
          { missingIds: missing },
          { correctRegionIds: correct, regionIds: [...regionIds] },
        )
      : notTriggered();
  },

  HOTSPOT_IMAGE_MISSING(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "HOTSPOT") return notTriggered();
    const image = firstDefined(
      question.imageUrl,
      row.mediaReferences.find((asset) => asset.role === "question_stem")
        ?.resolvedUrl,
    );
    return asText(image) ? notTriggered() : triggered({}, { hotspot: true });
  },

  HOTSPOT_REGION_INVALID(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "HOTSPOT") return notTriggered();
    const seen = new Set<string>();
    const region = asArray(question.regions).find((candidate) => {
      const coords = asArray(candidate?.coords).map(Number);
      const invalid =
        !asText(candidate?.id) ||
        coords.length < 4 ||
        coords.some((value) => !Number.isFinite(value) || value < 0) ||
        seen.has(candidate?.id);
      seen.add(candidate?.id);
      return invalid;
    });
    return region
      ? triggered(
          {
            regionId: region.id || "unknown",
            reason: "coordinates or identifier are invalid",
          },
          { region },
        )
      : notTriggered();
  },

  INTERACTION_PROMPT_MISSING(row) {
    const question = row.normalizedQuestion as any;
    if (interactionData(row).length === 0) return notTriggered();
    return asText(question?.stem || question?.prompt)
      ? notTriggered()
      : triggered({ interactionType: question?.type || "configured" });
  },

  EXPLICIT_REFERENCE_UNRESOLVED(row) {
    const stem = asText((row.normalizedQuestion as any)?.stem);
    const references = [
      ...stem.matchAll(
        /\b(figure|fig\.?|table|passage|attachment|equation)\s+([A-Za-z0-9.-]+)/gi,
      ),
    ];
    if (references.length === 0) return notTriggered();
    const resources = new Set(
      row.mediaReferences.flatMap((asset: any) => [
        asText(asset.id).toLowerCase(),
        asText(asset.fileName).toLowerCase(),
        asText(asset.publicUrlSource).toLowerCase(),
      ]),
    );
    const missing = references.find((match) => {
      const reference = asText(match[2]).toLowerCase();
      return ![...resources].some((resource) => resource.includes(reference));
    });
    return missing
      ? triggered(
          { resourceType: missing[1], reference: missing[2] },
          { matchedText: missing[0] },
        )
      : notTriggered();
  },

  PASSAGE_EMPTY(row, context) {
    const passageId = asText(
      firstDefined(
        (row.metadata as any).passageId,
        rawValue(row, "Passage_ID"),
      ),
    );
    if (!passageId) return notTriggered();
    const passages = asArray((context as any).passages);
    const passage = passages.find((item) => asText(item?.id) === passageId);
    return passage && !asText(passage.content)
      ? triggered({ passageId }, { passageId })
      : notTriggered();
  },

  MATH_SYNTAX_INVALID(row) {
    for (const [fieldPath, value] of allRichText(row)) {
      const analysis = analyzeLatexDelimiters(value);
      if (analysis.issues.length > 0) {
        return triggered(
          { fieldPath, reason: analysis.issues[0].message },
          { fieldPath, issues: analysis.issues },
          fieldPath,
        );
      }
    }
    return notTriggered();
  },

  MATRIX_MATCH_RESPONSE_INVALID(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "MATRIX_MATCH") return notTriggered();
    const left = new Set(
      asArray(question.leftEntities).map((value) => asText(value)),
    );
    const right = new Set(
      asArray(question.rightEntities).map((value) => asText(value)),
    );
    const mappings = isRecord(question.matchMappings)
      ? question.matchMappings
      : {};
    const invalid =
      Object.keys(mappings).length === 0 ||
      Object.entries(mappings).some(
        ([leftId, rightIds]) =>
          !left.has(leftId) ||
          asArray(rightIds).length === 0 ||
          asArray(rightIds).some((rightId) => !right.has(asText(rightId))),
      );
    return invalid
      ? triggered({}, { left: [...left], right: [...right], mappings })
      : notTriggered();
  },

  MEDIA_CASE_COLLISION(row, context) {
    const assets = asArray(
      firstDefined(
        context.packageSnapshot?.assets,
        (context as any).packageAssets,
      ),
    );
    const grouped = new Map<string, string[]>();
    for (const asset of assets) {
      const file = asText(asset?.path || asset?.fileName || asset).normalize(
        "NFC",
      );
      if (!file) continue;
      const key = file.toLowerCase();
      grouped.set(key, [...(grouped.get(key) || []), file]);
    }
    const collision = [...grouped.values()].find(
      (files) => new Set(files).size > 1,
    );
    return collision
      ? triggered({ files: collision }, { files: collision })
      : notTriggered();
  },

  MEDIA_PATH_TRAVERSAL(row) {
    const reference = row.mediaReferences.find((asset: any) => {
      const path = asText(asset.fileName || asset.publicUrlSource);
      return (
        /(^|[\\/])\.\.([\\/]|$)/.test(path) ||
        /^[A-Za-z]:[\\/]/.test(path) ||
        /^[/\\]{1,2}/.test(path)
      );
    }) as any;
    const path = asText(reference?.fileName || reference?.publicUrlSource);
    return reference
      ? triggered({ path }, { assetId: reference.id, path })
      : notTriggered();
  },

  MEDIA_RESOURCE_UNRESOLVED(row, context) {
    const assets = new Set(
      asArray(
        firstDefined(
          context.packageSnapshot?.assets,
          (context as any).packageAssets,
        ),
      ).map((asset) =>
        asText(asset?.path || asset?.fileName || asset).toLowerCase(),
      ),
    );
    const reference = row.mediaReferences.find((asset: any) => {
      if (asset.status === "resolved") return false;
      const name = asText(
        asset.fileName || asset.publicUrlSource,
      ).toLowerCase();
      return name && !assets.has(name);
    }) as any;
    const value = asText(reference?.fileName || reference?.publicUrlSource);
    return reference
      ? triggered(
          { reference: value },
          { assetId: reference.id, reference: value },
        )
      : notTriggered();
  },

  REQUIRED_MEDIA_UNRESOLVED(row) {
    const required = boolValue(
      firstDefined(
        (row as any).mediaRequired,
        rawValue(row, "Image_Required", "Media_Required"),
      ),
    );
    if (required !== true) return notTriggered();
    const resolved = row.mediaReferences.find(
      (asset) => asset.status === "resolved" && asText(asset.resolvedUrl),
    );
    const reference = asText(
      rawValue(row, "Image_File_Name", "Media_File_Name"),
    );
    return resolved
      ? notTriggered()
      : triggered(
          { reference: reference || "required asset" },
          { required: true },
        );
  },

  MEDIA_REFERENCE_SECURITY_INVALID(row) {
    const asset = row.mediaReferences.find((candidate: any) => {
      const reference = asText(
        candidate.publicUrlSource || candidate.resolvedUrl,
      );
      if (!reference) return false;
      if (/^(?:javascript|file|vbscript):/i.test(reference)) return true;
      if (/^data:(?!image\/(?:png|gif|jpeg|webp);base64,)/i.test(reference))
        return true;
      if (/^[a-z]+:\/\/[^/]*@/i.test(reference)) return true;
      if (
        /https?:\/\/(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(
          reference,
        )
      )
        return true;
      return /(^|[\\/])\.\.([\\/]|$)/.test(reference);
    }) as any;
    const reference = asText(asset?.publicUrlSource || asset?.resolvedUrl);
    return asset
      ? triggered(
          { reference, reason: "forbidden or private media location" },
          { assetId: asset.id, reference },
        )
      : notTriggered();
  },

  YEAR_FORMAT_INVALID(row) {
    const year = asText(row.metadata?.year);
    return year && !/^\d{4}$/.test(year)
      ? triggered({ value: year }, { value: year }, "year")
      : notTriggered();
  },

  YEAR_RANGE_INVALID(row, context) {
    const year = asText(row.metadata?.year);
    if (!/^\d{4}$/.test(year)) return notTriggered();
    const minYear = Number(policyValue(context, "minYear"));
    const maxYear = Number(policyValue(context, "maxYear"));
    const value = Number(year);
    return value < minYear || value > maxYear
      ? triggered(
          { value, minYear, maxYear },
          { value, minYear, maxYear },
          "year",
        )
      : notTriggered();
  },

  LEADING_ZERO_EQUIVALENCE_MISSING(row, context) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "TEXT_ENTRY" || question.mode !== "numeric")
      return notTriggered();
    if (policyValue(context, "requireLeadingZeroVariants") !== true)
      return notTriggered();
    const answers = asArray(question.acceptedAnswers).map(asText);
    const answer = answers.find((value) => /^-?0\.\d+$/.test(value));
    if (!answer) return notTriggered();
    const withoutZero = answer.replace(/^(-?)0\./, "$1.");
    return answers.includes(withoutZero)
      ? notTriggered()
      : triggered(
          { withZero: answer, withoutZero },
          { acceptedAnswers: answers },
        );
  },

  ROUNDING_INSTRUCTION_MISSING(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "TEXT_ENTRY" || question.mode !== "numeric")
      return notTriggered();
    const policy = firstDefined(
      question.numericPolicy,
      (row as any).numericAnswerPolicy,
    );
    const stem = asText(question.stem);
    const nonExact =
      question.numericTolerance !== undefined ||
      asArray(question.acceptedAnswers).some((a) => /\.\d{3,}/.test(asText(a)));
    const instruction = /round|decimal place|significant figure/i.test(stem);
    return nonExact && !policy && !instruction
      ? triggered({}, { stem })
      : notTriggered();
  },

  NUMERIC_ROUNDING_POLICY_MISSING(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "TEXT_ENTRY" || question.mode !== "numeric")
      return notTriggered();
    return firstDefined(
      question.numericPolicy,
      (row as any).numericAnswerPolicy,
    )
      ? notTriggered()
      : triggered({}, { responseMode: question.mode });
  },

  SIGNIFICANT_FIGURES_POLICY_MISSING(row) {
    const question = row.normalizedQuestion as any;
    const requires = /significant\s+(?:figure|digit)/i.test(
      asText(question?.stem),
    );
    return requires &&
      !firstDefined(
        question?.significantFigures,
        (row as any).significantFigures,
      )
      ? triggered({}, { stem: question.stem })
      : notTriggered();
  },

  UNSAFE_MARKUP_ANY_FIELD(row) {
    const unsafe = allRichText(row).find(([, value]) =>
      /<script\b|\son[a-z]+\s*=|(?:href|src)\s*=\s*["']?\s*(?:javascript|vbscript):/i.test(
        value,
      ),
    );
    return unsafe
      ? triggered(
          { field: unsafe[0] },
          { field: unsafe[0], matchedValue: unsafe[1] },
          unsafe[0],
        )
      : notTriggered();
  },

  DATA_TABLE_OBJECT_MISMATCH(row) {
    const table = tableData(row).find(
      (candidate) =>
        candidate?.displayData !== undefined &&
        candidate?.dataTableObject !== undefined &&
        JSON.stringify(candidate.displayData) !==
          JSON.stringify(candidate.dataTableObject),
    );
    return table
      ? triggered(
          {
            tableId: table.id || "table",
            reason: "display and copyable data differ",
          },
          {
            displayData: table.displayData,
            dataTableObject: table.dataTableObject,
          },
        )
      : notTriggered();
  },

  NESTED_TABLE_UNSUPPORTED(row) {
    const table = tableData(row).find((candidate) => {
      const serialized = JSON.stringify(
        candidate?.rows || candidate?.content || "",
      );
      return (
        /<table\b[^>]*>[\s\S]*<table\b/i.test(serialized) ||
        candidate?.nested === true
      );
    });
    return table
      ? triggered({}, { tableId: table.id || "table" })
      : notTriggered();
  },

  INPUT_INSTRUCTION_CONTRADICTS_POLICY(row) {
    const question = row.normalizedQuestion as any;
    if (question?.type !== "TEXT_ENTRY") return notTriggered();
    const instruction = asText(
      firstDefined(
        question.inputInstructions,
        rawValue(row, "Input_Instructions"),
      ),
    );
    if (!instruction) return notTriggered();
    const requiresUnits = boolValue(question.unitPolicy === "required");
    const saysNoUnits = /do not (?:enter|include|type) (?:the )?units?/i.test(
      instruction,
    );
    if (requiresUnits && saysNoUnits) {
      return triggered(
        { instruction, policyField: "unitPolicy" },
        { instruction, unitPolicy: question.unitPolicy },
      );
    }
    return notTriggered();
  },
};

function appliesToFor(spec: CanonicalRuleSpec): ValidationRule["appliesTo"] {
  if (/^MCQ_/.test(spec.id)) return ["MCQ"];
  if (/^MSQ_/.test(spec.id)) return ["MSQ"];
  if (/^ORDER_/.test(spec.id)) return ["ORDER"];
  if (/^HOTSPOT_/.test(spec.id)) return ["HOTSPOT"];
  if (/^MATRIX_MATCH_/.test(spec.id)) return ["MATRIX_MATCH"];
  if (
    /^(TEXT_ENTRY_|NUMERIC_|INTEGER_|TOLERANCE_|ROUNDING_|TRAILING_ZERO_|LEADING_ZERO_|COMMA_FORMAT_|SIGNIFICANT_FIGURES_|FORMULA_|ALTERNATE_ANSWER_|ANSWER_RULE_|INPUT_INSTRUCTION_|UNIT_PLACEMENT_)/.test(
      spec.id,
    )
  ) {
    return ["TEXT_ENTRY"];
  }
  return "all";
}

function canonicalPrerequisites(
  spec: CanonicalRuleSpec,
  row: QuestionRow,
  context: ValidationContext,
  hasImplementation: boolean,
): string[] {
  const evaluation = explicitEvaluation(spec.id, row, context);
  if (evaluation) {
    if (!evaluation.triggered) return [];
    const missing: string[] = [];
    if (HEURISTIC_NATURE.test(spec.nature)) {
      if (
        !evaluation.evidence ||
        Object.keys(evaluation.evidence).length === 0
      ) {
        missing.push("heuristic evidence");
      }
      if (!Number.isFinite(evaluation.confidence)) missing.push("confidence");
      if (!asText(evaluation.sourceReference)) missing.push("source reference");
    }
    return missing;
  }

  if (spec.stage === "Package Validation" && !context.packageSnapshot) {
    return ["packageSnapshot"];
  }
  if (spec.stage === "Iteration QA" && !context.iterationSnapshot) {
    return ["iterationSnapshot"];
  }
  if (POLICY_NATURE.test(spec.nature)) {
    if (!context.policyProfile?.id || !context.policyProfile.version) {
      return ["policyProfile.id", "policyProfile.version"];
    }
  }
  if (TARGET_NATURE.test(spec.nature)) {
    if (!context.targetProfile?.id || !context.targetProfile.version) {
      return ["targetProfile.id", "targetProfile.version"];
    }
  }
  if (HEURISTIC_NATURE.test(spec.nature)) {
    return [`canonicalEvaluations.${row.id}.${spec.id}`];
  }
  if (
    !hasImplementation &&
    !localEvaluators[spec.id] &&
    spec.stage !== "Package Validation"
  ) {
    return [`canonicalEvaluations.${row.id}.${spec.id}`];
  }
  return [];
}

export function createCanonicalRule(
  spec: CanonicalRuleSpec,
  implementation?: ValidationRule,
): ValidationRule {
  const originalPrerequisites = implementation?.getMissingPrerequisites;

  return {
    id: spec.id,
    name: canonicalRuleName(spec.id),
    category: canonicalIssueCategory(spec),
    severity: canonicalSeverity(spec.defaultSeverity),
    priority: canonicalPriority(spec.priority),
    appliesTo: implementation?.appliesTo || appliesToFor(spec),
    requires: implementation?.requires,
    canonicalSpec: spec,
    implementationStatus: "implemented",
    implementationMode:
      implementation || localEvaluators[spec.id] ? "native" : "stage_adapter",
    getMissingPrerequisites(row, context) {
      return [
        ...(originalPrerequisites?.(row, context) || []),
        ...canonicalPrerequisites(spec, row, context, !!implementation),
      ];
    },
    validate(row, context) {
      const explicit = explicitEvaluation(spec.id, row, context);
      if (explicit) {
        return explicit.triggered
          ? [issueFromEvaluation(spec, row, explicit)]
          : [];
      }

      if (implementation) {
        return implementation.validate
          .call(this, row, context)
          .map((issue) => ({
            ...issue,
            ruleId: spec.id,
            category: canonicalIssueCategory(spec),
            severity: canonicalSeverity(spec.defaultSeverity),
            blocksExport: spec.blocksExport,
            evidence: {
              ...(issue.evidence || {}),
              canonicalRuleVersion: spec.version,
              canonicalStage: spec.stage,
            },
          }));
      }

      const evaluation = localEvaluators[spec.id]?.(row, context);
      return evaluation?.triggered
        ? [issueFromEvaluation(spec, row, evaluation)]
        : [];
    },
  };
}

export const locallyEvaluatedCanonicalRuleIds = Object.freeze(
  Object.keys(localEvaluators).sort(),
);

/**
 * QTI 2.1 Item-Bank Builder
 *
 * Generates compliant QTI 2.1 XML items and an imsmanifest.xml for an
 * item-bank package. Each question becomes a separate XML file.
 *
 * Structural requirements:
 *   • <prompt> lives inside <choiceInteraction>, never directly under <itemBody>
 *   • Identifiers are NFKC-normalized, collision-free, and never start with digits
 *   • Scoring produces distinct outcomes for unanswered / correct / incorrect
 *   • MAXSCORE and MINSCORE are declared for every automatically scored item
 *   • Feedback uses <modalFeedback> (not <feedbackBlock>) per QTI 2.1 spec
 *   • xml:lang is set on every <assessmentItem>
 *   • Schema declarations include xsi:schemaLocation
 *   • Manifest uses correct QTI 2.1 packaging schema
 */

import type {
  BuildError,
  BuildResult,
  BuildWarning,
  GeneratedArtifact,
} from "../core/buildTypes";
import type { ExportConfig } from "../core/exportTypes";
import type {
  McqQuestion,
  MsqQuestion,
  OrderQuestion,
  Question,
  TextEntryQuestion,
} from "../core/questionTypes";
import type { QuestionRow } from "../core/rowTypes";
import {
  buildAssessmentCoreManifestMetadata,
  buildQtiAuthoringSupport,
  type QtiAuthoringSupport,
} from "./shared/authoringSectionMapper";
import { renderRichContent } from "./shared/richContentRenderer";
import { escapeXml, xmlTitle, sanitizeXmlSpaces } from "./shared/xmlUtils";
import {
  resolveItemId,
  buildOptionIdMap,
  resolveOptionId,
  toQtiIdentifier,
  type OptionIdMap,
} from "./shared/identifierUtils";
import {
  resolveCanonicalScoring,
  type CanonicalScoring,
} from "./shared/scoringMapper";

// ─── Constants ──────────────────────────────────────────────────────────────

const QTI21_NS = "http://www.imsglobal.org/xsd/imsqti_v2p1";
const QTI21_SCHEMA_LOCATION =
  "http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/imsqti_v2p1.xsd";
const CP_NS = "http://www.imsglobal.org/xsd/imscp_v1p1";
const CP_SCHEMA_LOCATION =
  "http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/qtiv2p1_imscpv1p2_v1p0.xsd";

// ─── Built item result ──────────────────────────────────────────────────────

interface BuiltItem {
  xml: string;
  skippedRuleIds: string[];
  warnings: BuildWarning[];
}

// ─── Language resolution ────────────────────────────────────────────────────

function resolveLanguage(row: QuestionRow): string {
  const lang = row.metadata.language?.trim().toLowerCase();
  if (!lang) return "en";
  // Basic BCP-47 validation
  if (/^[a-z]{2,3}(-[a-z0-9]+)*$/i.test(lang)) return lang;
  return "en";
}

// ─── Score declarations ─────────────────────────────────────────────────────

function scoreDeclarations(scoring: CanonicalScoring): string {
  return `
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue><value>0</value></defaultValue>
  </outcomeDeclaration>
  <outcomeDeclaration identifier="MAXSCORE" cardinality="single" baseType="float">
    <defaultValue><value>${scoring.maximumScore}</value></defaultValue>
  </outcomeDeclaration>
  <outcomeDeclaration identifier="MINSCORE" cardinality="single" baseType="float">
    <defaultValue><value>${scoring.minimumScore}</value></defaultValue>
  </outcomeDeclaration>`;
}

// ─── Feedback declarations and processing ───────────────────────────────────

interface FeedbackContent {
  correct?: string;
  incorrect?: string;
  explanation?: string;
}

function feedbackDeclarations(feedback: FeedbackContent): string {
  let decl = "";
  if (feedback.correct || feedback.incorrect) {
    decl += `
  <outcomeDeclaration identifier="FEEDBACK_STATE" cardinality="single" baseType="identifier">
    <defaultValue><value>NONE</value></defaultValue>
  </outcomeDeclaration>`;
  }
  if (feedback.explanation) {
    decl += `
  <outcomeDeclaration identifier="EXPLANATION_STATE" cardinality="single" baseType="identifier">
    <defaultValue><value>HIDE</value></defaultValue>
  </outcomeDeclaration>`;
  }
  return decl;
}

function feedbackProcessing(
  feedback: FeedbackContent,
  config: ExportConfig,
): string {
  let processing = "";

  if (feedback.correct || feedback.incorrect) {
    processing += `
    <responseCondition>
      <responseIf>
        <isNull><variable identifier="RESPONSE"/></isNull>
        <setOutcomeValue identifier="FEEDBACK_STATE">
          <baseValue baseType="identifier">NONE</baseValue>
        </setOutcomeValue>
      </responseIf>
      <responseElseIf>
        <match><variable identifier="RESPONSE"/><correct identifier="RESPONSE"/></match>
        <setOutcomeValue identifier="FEEDBACK_STATE">
          <baseValue baseType="identifier">CORRECT</baseValue>
        </setOutcomeValue>
      </responseElseIf>
      <responseElse>
        <setOutcomeValue identifier="FEEDBACK_STATE">
          <baseValue baseType="identifier">INCORRECT</baseValue>
        </setOutcomeValue>
      </responseElse>
    </responseCondition>`;
  }

  if (feedback.explanation) {
    // Map feedbackMode to explanation visibility
    const showAlways =
      config.feedbackMode === "post_attempt" ||
      config.feedbackMode === "hints";
    if (showAlways) {
      processing += `
    <responseCondition>
      <responseIf>
        <not><isNull><variable identifier="RESPONSE"/></isNull></not>
        <setOutcomeValue identifier="EXPLANATION_STATE">
          <baseValue baseType="identifier">SHOW</baseValue>
        </setOutcomeValue>
      </responseIf>
    </responseCondition>`;
    }
    // feedbackMode === "strip" → explanation is omitted entirely upstream
  }

  return processing;
}

function feedbackModalBlocks(
  feedback: FeedbackContent,
  config: ExportConfig,
): string {
  let blocks = "";
  if (feedback.correct) {
    blocks += `
  <modalFeedback outcomeIdentifier="FEEDBACK_STATE" identifier="CORRECT" showHide="show">
    <p>${renderRichContent(feedback.correct, config.mathMode)}</p>
  </modalFeedback>`;
  }
  if (feedback.incorrect) {
    blocks += `
  <modalFeedback outcomeIdentifier="FEEDBACK_STATE" identifier="INCORRECT" showHide="show">
    <p>${renderRichContent(feedback.incorrect, config.mathMode)}</p>
  </modalFeedback>`;
  }
  if (feedback.explanation && config.feedbackMode !== "strip") {
    blocks += `
  <modalFeedback outcomeIdentifier="EXPLANATION_STATE" identifier="SHOW" showHide="show">
    <p>${renderRichContent(feedback.explanation, config.mathMode)}</p>
  </modalFeedback>`;
  }
  return blocks;
}

// ─── Extract feedback from authoring sections ───────────────────────────────

function extractFeedback(
  row: QuestionRow,
  config: ExportConfig,
): FeedbackContent {
  if (config.feedbackMode === "strip") return {};

  const sections = row.manualFixSections;
  const feedback: FeedbackContent = {};

  if (sections) {
    for (const section of sections) {
      if (
        section.type === "feedback_correct" &&
        section.content?.trim()
      ) {
        feedback.correct = section.content;
      }
      if (
        section.type === "feedback_incorrect" &&
        section.content?.trim()
      ) {
        feedback.incorrect = section.content;
      }
      if (section.type === "explanation" && section.content?.trim()) {
        feedback.explanation = section.content;
      }
    }
  }

  // Fall back to inline explanation ONLY if no manualFixSections are defined.
  // If sections are explicitly configured, the user's section choices are authoritative.
  if (
    !feedback.explanation &&
    !sections &&
    row.normalizedQuestion &&
    "explanation" in row.normalizedQuestion &&
    row.normalizedQuestion.explanation?.trim()
  ) {
    feedback.explanation = row.normalizedQuestion.explanation;
  }

  return feedback;
}

// ─── MCQ scoring processing ────────────────────────────────────────────────

function mcqScoreProcessing(scoring: CanonicalScoring): string {
  return `
    <responseCondition>
      <responseIf>
        <isNull><variable identifier="RESPONSE"/></isNull>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">0</baseValue>
        </setOutcomeValue>
      </responseIf>
      <responseElseIf>
        <match><variable identifier="RESPONSE"/><correct identifier="RESPONSE"/></match>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">${scoring.correctScore}</baseValue>
        </setOutcomeValue>
      </responseElseIf>
      <responseElse>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">${scoring.incorrectScore}</baseValue>
        </setOutcomeValue>
      </responseElse>
    </responseCondition>`;
}

// ─── MSQ scoring processing ────────────────────────────────────────────────

function msqAllOrNothingScoreProcessing(scoring: CanonicalScoring): string {
  // Compare entire selected set with entire correct set
  return `
    <responseCondition>
      <responseIf>
        <isNull><variable identifier="RESPONSE"/></isNull>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">0</baseValue>
        </setOutcomeValue>
      </responseIf>
      <responseElseIf>
        <match><variable identifier="RESPONSE"/><correct identifier="RESPONSE"/></match>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">${scoring.correctScore}</baseValue>
        </setOutcomeValue>
      </responseElseIf>
      <responseElse>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">${scoring.incorrectScore}</baseValue>
        </setOutcomeValue>
      </responseElse>
    </responseCondition>`;
}

function msqPartialCreditResponseDecl(
  q: MsqQuestion,
  optionMap: OptionIdMap,
  scoring: CanonicalScoring,
): string {
  const correctSet = new Set(q.correctAnswerIds);
  const perCorrect =
    q.correctAnswerIds.length > 0
      ? scoring.correctScore / q.correctAnswerIds.length
      : 0;
  const perIncorrect =
    q.options.length - q.correctAnswerIds.length > 0
      ? scoring.incorrectScore /
        (q.options.length - q.correctAnswerIds.length)
      : 0;

  const mappingEntries = q.options
    .map((opt) => {
      const qtiId = resolveOptionId(optionMap, opt.id);
      const value = correctSet.has(opt.id) ? perCorrect : perIncorrect;
      return `      <mapEntry mapKey="${escapeXml(qtiId)}" mappedValue="${value}"/>`;
    })
    .join("\n");

  return `  <responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="identifier">
    <correctResponse>${q.correctAnswerIds.map((id) => `<value>${escapeXml(resolveOptionId(optionMap, id))}</value>`).join("")}</correctResponse>
    <mapping defaultValue="0" lowerBound="${scoring.minimumScore}" upperBound="${scoring.maximumScore}">
${mappingEntries}
    </mapping>
  </responseDeclaration>`;
}

function msqPartialCreditScoreProcessing(): string {
  return `
    <responseCondition>
      <responseIf>
        <isNull><variable identifier="RESPONSE"/></isNull>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">0</baseValue>
        </setOutcomeValue>
      </responseIf>
      <responseElse>
        <setOutcomeValue identifier="SCORE">
          <mapResponse identifier="RESPONSE"/>
        </setOutcomeValue>
      </responseElse>
    </responseCondition>`;
}

// ─── Item wrapper ───────────────────────────────────────────────────────────

function wrapItem(
  row: QuestionRow,
  config: ExportConfig,
  responseDeclaration: string,
  interaction: string,
  scoreProcessing: string,
  feedback: FeedbackContent,
  authoring: QtiAuthoringSupport,
): BuiltItem {
  const itemId = resolveItemId(row.metadata.questionId, row.id);
  const q = row.normalizedQuestion as Exclude<Question, { type: "UNKNOWN" }>;
  const scoring = resolveCanonicalScoring(
    row.scoringConfig,
    row.metadata,
    config,
  );
  const lang = resolveLanguage(row);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="${QTI21_NS}"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="${QTI21_SCHEMA_LOCATION}"
  identifier="${escapeXml(itemId)}"
  title="${xmlTitle(q.stem)}"
  adaptive="false"
  timeDependent="false"
  xml:lang="${escapeXml(lang)}">
${responseDeclaration}
${scoreDeclarations(scoring)}${feedbackDeclarations(feedback)}${authoring.declarations}
  <itemBody>
    ${interaction}${authoring.body}
  </itemBody>
  <responseProcessing>
${scoreProcessing}${feedbackProcessing(feedback, config)}${authoring.processing}
  </responseProcessing>${feedbackModalBlocks(feedback, config)}
</assessmentItem>`;

  return { xml, skippedRuleIds: authoring.skippedRuleIds, warnings: [] };
}

// ─── MCQ item ───────────────────────────────────────────────────────────────

function generateMcqItem(
  row: QuestionRow,
  q: McqQuestion,
  config: ExportConfig,
): BuiltItem {
  const optionMap = buildOptionIdMap(q.options);
  const correctQtiId = resolveOptionId(optionMap, q.correctAnswerId);
  const scoring = resolveCanonicalScoring(
    row.scoringConfig,
    row.metadata,
    config,
  );

  const responseDeclaration = `  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse><value>${escapeXml(correctQtiId)}</value></correctResponse>
  </responseDeclaration>`;

  const choices = q.options
    .map(
      (option) =>
        `      <simpleChoice identifier="${escapeXml(resolveOptionId(optionMap, option.id))}">${renderRichContent(option.text, config.mathMode)}</simpleChoice>`,
    )
    .join("\n");

  const interaction = `<choiceInteraction responseIdentifier="RESPONSE" shuffle="${config.shuffleOptions ? "true" : "false"}" minChoices="1" maxChoices="1">
      <prompt><p>${renderRichContent(q.stem, config.mathMode)}</p></prompt>
${choices}
    </choiceInteraction>`;

  const feedback = extractFeedback(row, config);
  const authoring = buildQtiAuthoringSupport(row, config, "2.1");

  return wrapItem(
    row,
    config,
    responseDeclaration,
    interaction,
    mcqScoreProcessing(scoring),
    feedback,
    authoring,
  );
}

// ─── MSQ item ───────────────────────────────────────────────────────────────

function generateMsqItem(
  row: QuestionRow,
  q: MsqQuestion,
  config: ExportConfig,
): BuiltItem {
  const optionMap = buildOptionIdMap(q.options);
  const scoring = resolveCanonicalScoring(
    row.scoringConfig,
    row.metadata,
    config,
  );

  let responseDeclaration: string;
  let scoreProcXml: string;

  if (scoring.mode === "partial") {
    responseDeclaration = msqPartialCreditResponseDecl(
      q,
      optionMap,
      scoring,
    );
    scoreProcXml = msqPartialCreditScoreProcessing();
  } else {
    const correctValues = q.correctAnswerIds
      .map((id) => `<value>${escapeXml(resolveOptionId(optionMap, id))}</value>`)
      .join("");
    responseDeclaration = `  <responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="identifier">
    <correctResponse>${correctValues}</correctResponse>
  </responseDeclaration>`;
    scoreProcXml = msqAllOrNothingScoreProcessing(scoring);
  }

  const choices = q.options
    .map(
      (option) =>
        `      <simpleChoice identifier="${escapeXml(resolveOptionId(optionMap, option.id))}">${renderRichContent(option.text, config.mathMode)}</simpleChoice>`,
    )
    .join("\n");

  const minChoices = q.correctAnswerIds.length > 0 ? 1 : 0;
  const maxChoices = q.options.length;

  const interaction = `<choiceInteraction responseIdentifier="RESPONSE" shuffle="${config.shuffleOptions ? "true" : "false"}" minChoices="${minChoices}" maxChoices="${maxChoices}">
      <prompt><p>${renderRichContent(q.stem, config.mathMode)}</p></prompt>
${choices}
    </choiceInteraction>`;

  const feedback = extractFeedback(row, config);
  const authoring = buildQtiAuthoringSupport(row, config, "2.1");

  return wrapItem(
    row,
    config,
    responseDeclaration,
    interaction,
    scoreProcXml,
    feedback,
    authoring,
  );
}

// ─── TEXT_ENTRY item ────────────────────────────────────────────────────────

function generateTextEntryItem(
  row: QuestionRow,
  q: TextEntryQuestion,
  config: ExportConfig,
): BuiltItem {
  const scoring = resolveCanonicalScoring(
    row.scoringConfig,
    row.metadata,
    config,
  );

  const validAnswers = q.acceptedAnswers.filter(
    (a) => a != null && String(a).trim() !== "",
  );
  if (validAnswers.length === 0) {
    throw new Error("Text entry question has no accepted answers.");
  }

  const baseType = q.mode === "numeric" ? "float" : "string";
  const preferredAnswer = validAnswers[0];

  // correctResponse contains only the preferred answer
  let responseDeclaration = `  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="${baseType}">
    <correctResponse><value>${escapeXml(String(preferredAnswer))}</value></correctResponse>`;

  // Mapping with all accepted alternatives
  if (validAnswers.length > 1 || q.mode === "numeric") {
    const mappingEntries = validAnswers
      .map(
        (answer) =>
          `      <mapEntry mapKey="${escapeXml(String(answer))}" mappedValue="${scoring.correctScore}"${q.mode !== "numeric" ? ` caseSensitive="${q.caseSensitive ? "true" : "false"}"` : ""}/>`,
      )
      .join("\n");

    responseDeclaration += `
    <mapping defaultValue="${scoring.incorrectScore}" lowerBound="${scoring.minimumScore}" upperBound="${scoring.maximumScore}">
${mappingEntries}
    </mapping>`;
  }
  responseDeclaration += `
  </responseDeclaration>`;

  const expectedLength = Math.max(10, String(preferredAnswer).length + 2);

  // Text entry: <p>stem <textEntryInteraction .../></p> — no <prompt> wrapper
  const interaction = `<p>${renderRichContent(q.stem, config.mathMode)} <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="${expectedLength}"/></p>`;

  let scoreProcXml: string;
  if (validAnswers.length > 1 || q.mode === "numeric") {
    // Use mapping-based scoring
    scoreProcXml = `
    <responseCondition>
      <responseIf>
        <isNull><variable identifier="RESPONSE"/></isNull>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">0</baseValue>
        </setOutcomeValue>
      </responseIf>
      <responseElse>
        <setOutcomeValue identifier="SCORE">
          <mapResponse identifier="RESPONSE"/>
        </setOutcomeValue>
      </responseElse>
    </responseCondition>`;
  } else {
    // Single answer, use match
    scoreProcXml = mcqScoreProcessing(scoring);
  }

  const feedback = extractFeedback(row, config);
  const authoring = buildQtiAuthoringSupport(row, config, "2.1");

  return wrapItem(
    row,
    config,
    responseDeclaration,
    interaction,
    scoreProcXml,
    feedback,
    authoring,
  );
}

// ─── ORDER item ─────────────────────────────────────────────────────────────

function generateOrderItem(
  row: QuestionRow,
  q: OrderQuestion,
  config: ExportConfig,
): BuiltItem {
  const optionMap = buildOptionIdMap(q.options);
  const scoring = resolveCanonicalScoring(
    row.scoringConfig,
    row.metadata,
    config,
  );

  const correctValues = q.correctSequenceIds
    .map((id) => `<value>${escapeXml(resolveOptionId(optionMap, id))}</value>`)
    .join("");
  const responseDeclaration = `  <responseDeclaration identifier="RESPONSE" cardinality="ordered" baseType="identifier">
    <correctResponse>${correctValues}</correctResponse>
  </responseDeclaration>`;

  const choices = q.options
    .map(
      (option) =>
        `      <simpleChoice identifier="${escapeXml(resolveOptionId(optionMap, option.id))}">${renderRichContent(option.text, config.mathMode)}</simpleChoice>`,
    )
    .join("\n");

  const interaction = `<orderInteraction responseIdentifier="RESPONSE" shuffle="${config.shuffleOptions ? "true" : "false"}">
      <prompt><p>${renderRichContent(q.stem, config.mathMode)}</p></prompt>
${choices}
    </orderInteraction>`;

  const feedback = extractFeedback(row, config);
  const authoring = buildQtiAuthoringSupport(row, config, "2.1");

  return wrapItem(
    row,
    config,
    responseDeclaration,
    interaction,
    mcqScoreProcessing(scoring),
    feedback,
    authoring,
  );
}

// ─── Manifest builder ───────────────────────────────────────────────────────

function generateManifest(
  artifacts: GeneratedArtifact[],
  metadataByFileName: Map<string, string>,
): string {
  const seenPaths = new Set<string>();
  const resources = artifacts
    .filter(
      (artifact) =>
        artifact.fileName.endsWith(".xml") &&
        artifact.fileName !== "imsmanifest.xml",
    )
    .map((artifact) => {
      const path = artifact.fileName;

      // Validate path safety
      if (path.includes("..") || path.startsWith("/") || /^[a-z]:/i.test(path)) {
        throw new Error(
          `Unsafe manifest path detected: "${path}". Paths must be relative without traversal.`,
        );
      }
      if (seenPaths.has(path.toLowerCase())) {
        throw new Error(
          `Duplicate manifest path detected (case-insensitive): "${path}".`,
        );
      }
      seenPaths.add(path.toLowerCase());

      const resId = toQtiIdentifier(
        path.replace(".xml", ""),
        "RES_",
      );
      const metadata = metadataByFileName.get(path) || "";
      return `    <resource identifier="${escapeXml(resId)}" type="imsqti_item_xmlv2p1" href="${escapeXml(path)}">
      <metadata>${metadata}</metadata>
      <file href="${escapeXml(path)}"/>
    </resource>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="${CP_NS}"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ac="https://assessmentcore.app/ns/metadata/1.0"
  xsi:schemaLocation="${CP_SCHEMA_LOCATION}"
  identifier="MANIFEST-01">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations/>
  <resources>
${resources}
  </resources>
</manifest>`;
}

// ─── Item builder dispatch ──────────────────────────────────────────────────

function buildItem(
  row: QuestionRow,
  config: ExportConfig,
): BuiltItem | undefined {
  const question = row.normalizedQuestion;
  if (!question || question.type === "UNKNOWN") return undefined;
  if (question.type === "MCQ") return generateMcqItem(row, question, config);
  if (question.type === "MSQ") return generateMsqItem(row, question, config);
  if (question.type === "TEXT_ENTRY") {
    return generateTextEntryItem(row, question, config);
  }
  if (question.type === "ORDER") {
    return generateOrderItem(row, question, config);
  }
  return undefined;
}

// ─── Skipped-rule warning ───────────────────────────────────────────────────

function addSkippedRuleWarning(
  warnings: BuildWarning[],
  row: QuestionRow,
  support: Pick<QtiAuthoringSupport, "skippedRuleIds">,
) {
  if (!support.skippedRuleIds.length) return;
  warnings.push({
    code: "CONDITIONAL_FEEDBACK_RULE_SKIPPED",
    message: `${support.skippedRuleIds.length} conditional feedback rule(s) could not be represented for this QTI 2.1 interaction.`,
    rowId: row.id,
  });
}

// ─── Main export function ───────────────────────────────────────────────────

export function buildQti21Export(
  rows: QuestionRow[],
  config: ExportConfig,
): BuildResult {
  const artifacts: GeneratedArtifact[] = [];
  const warnings: BuildWarning[] = [];
  const errors: BuildError[] = [];
  const metadataByFileName = new Map<string, string>();

  // Item-bank guard: ensure no assessment hierarchy is generated
  if (config.packageStructure === "assessment") {
    // In assessment mode, this builder still only generates items + manifest.
    // Assessment hierarchy (assessmentTest, testPart, etc.) is NOT generated
    // by this builder — that belongs to a separate assessment-package builder.
    warnings.push({
      code: "ITEM_BANK_MODE_NOTICE",
      message:
        "QTI 2.1 item-bank export generates items and manifest only. No assessmentTest or testPart hierarchy is included.",
    });
  }

  for (const row of rows) {
    if (
      row.status === "rejected" ||
      row.normalizedQuestion?.type === "UNKNOWN"
    ) {
      errors.push({
        code: "INVALID_ROW_STATE",
        message: `Row ${row.sourceRowNumber} cannot be exported.`,
        rowId: row.id,
      });
      continue;
    }

    try {
      const built = buildItem(row, config);
      if (!built) continue;
      addSkippedRuleWarning(warnings, row, built);
      warnings.push(...built.warnings);
      const qid = resolveItemId(row.metadata.questionId, row.id);
      const fileName = `item_${qid}.xml`;
      const cleanXml = sanitizeXmlSpaces(built.xml);
      artifacts.push({
        fileName,
        mimeType: "application/xml",
        data: cleanXml,
        sizeBytes: new Blob([cleanXml]).size,
      });
      metadataByFileName.set(
        fileName,
        buildAssessmentCoreManifestMetadata(row),
      );
    } catch (error: any) {
      errors.push({
        code: "QTI_BUILD_ERROR",
        message: `Failed to build QTI XML for row ${row.sourceRowNumber}: ${error.message}`,
        rowId: row.id,
      });
    }
  }

  if (errors.length) return { success: false, artifacts: [], warnings, errors };

  try {
    const manifest = sanitizeXmlSpaces(
      generateManifest(artifacts, metadataByFileName),
    );
    artifacts.push({
      fileName: "imsmanifest.xml",
      mimeType: "application/xml",
      data: manifest,
      sizeBytes: new Blob([manifest]).size,
    });
  } catch (error: any) {
    errors.push({
      code: "MANIFEST_BUILD_ERROR",
      message: `Failed to build manifest: ${error.message}`,
    });
    return { success: false, artifacts: [], warnings, errors };
  }

  return { success: true, artifacts, warnings, errors };
}

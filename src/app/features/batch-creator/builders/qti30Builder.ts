/**
 * QTI 3.0 Builder
 *
 * Generates QTI 3.0 (IMS Global QTI v3) XML artifacts for MCQ, MSQ, and
 * TEXT_ENTRY question types.
 *
 * Key differences from QTI 2.1:
 * • XML namespace: https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/
 * • All element names are kebab-cased with a "qti-" prefix
 * • Custom responseProcessing maps scores securely.
 * • The manifest embeds native QTI 3.0 metadata schemas.
 */

import { QuestionRow } from '../core/rowTypes';
import { ExportConfig } from '../core/exportTypes';
import { BuildResult, GeneratedArtifact, BuildWarning, BuildError } from '../core/buildTypes';
import { McqQuestion, MsqQuestion, TextEntryQuestion, OrderQuestion } from '../core/questionTypes';

// ── Shared helpers ──────────────────────────────────────────────────────────
import { escapeXml, xmlTitle } from './shared/xmlUtils';
import { resolveItemId } from './shared/identifierUtils';
import { renderRichContent } from './shared/richContentRenderer';
import { mapScoring } from './shared/scoringMapper';

// ─── Namespace constants ────────────────────────────────────────────────────

const QTI3_NS = 'https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/';

function getFeedbackXml(q: { explanation?: string }, config: ExportConfig) {
  const hasFeedback = config.feedbackMode !== 'strip' && !!q.explanation;
  if (!hasFeedback) return { decl: '', body: '', proc: '' };

  const decl = `\n  <qti-outcome-declaration identifier="FEEDBACK" cardinality="single" base-type="identifier" />`;
  
  const label = config.feedbackMode === 'hints' ? 'Hint' : 'Explanation';
  const body = `\n    <qti-feedback-block outcome-identifier="FEEDBACK" identifier="SHOW" show-hide="show">
      <p><strong>${label}:</strong> ${renderRichContent(q.explanation!, config.mathMode)}</p>
    </qti-feedback-block>`;
    
  const proc = `\n    <qti-set-outcome-value identifier="FEEDBACK">
      <qti-base-value base-type="identifier">SHOW</qti-base-value>
    </qti-set-outcome-value>`;

  return { decl, body, proc };
}

// ─── MCQ ────────────────────────────────────────────────────────────────────

function buildMcqItem(row: QuestionRow, q: McqQuestion, config: ExportConfig): string {
  const id = resolveItemId(row.metadata.questionId, row.id);
  const { correctScore, penalty } = mapScoring(row.scoringConfig, config);
  const correctId = escapeXml(q.correctAnswerId);

  const choicesXml = q.options.map(opt => `
      <qti-simple-choice identifier="${escapeXml(opt.id)}">
        ${renderRichContent(opt.text, config.mathMode)}
      </qti-simple-choice>`).join('');

  const mappingEntriesXml = q.options.map(opt => {
    const isCorrect = opt.id === q.correctAnswerId;
    const value = isCorrect ? correctScore : (penalty > 0 ? -penalty : 0);
    if (value === 0) return '';
    return `
        <qti-map-entry map-key="${escapeXml(opt.id)}" mapped-value="${value}" />`;
  }).join('');

  const fb = getFeedbackXml(q, config);

  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="${QTI3_NS}"
  identifier="${id}"
  title="${xmlTitle(q.stem)}"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response>
      <qti-value>${correctId}</qti-value>
    </qti-correct-response>
    <qti-mapping default-value="0">${mappingEntriesXml}
    </qti-mapping>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0.0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>${fb.decl}

  <qti-item-body>
    <p>${renderRichContent(q.stem, config.mathMode)}</p>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="${config.shuffleOptions ? 'true' : 'false'}" max-choices="1">
      ${choicesXml}
    </qti-choice-interaction>${fb.body}
  </qti-item-body>

  <qti-response-processing>
    <qti-set-outcome-value identifier="SCORE">
      <qti-max>
        <qti-map-response identifier="RESPONSE" />
        <qti-base-value base-type="float">${config.scoring.scoreFloor ?? 0.0}</qti-base-value>
      </qti-max>
    </qti-set-outcome-value>${fb.proc}
  </qti-response-processing>

</qti-assessment-item>`;
}

// ─── MSQ ────────────────────────────────────────────────────────────────────

function buildMsqItem(row: QuestionRow, q: MsqQuestion, config: ExportConfig): string {
  const id = resolveItemId(row.metadata.questionId, row.id);
  const { correctScore, penalty, partialMarking } = mapScoring(row.scoringConfig, config);

  const correctIdSet = new Set(q.correctAnswerIds);
  const totalCorrect = q.correctAnswerIds.length;
  const totalIncorrect = q.options.length - totalCorrect;

  // Calculate values to prevent select-all exploits
  const perCorrectScore = partialMarking ? (correctScore / Math.max(1, totalCorrect)) : correctScore;
  const perIncorrectPenalty = penalty > 0
    ? penalty
    : (partialMarking && totalIncorrect > 0 ? (correctScore / totalIncorrect) : 0);

  const correctValuesXml = q.correctAnswerIds.map(cid =>
    `\n      <qti-value>${escapeXml(cid)}</qti-value>`).join('');

  const choicesXml = q.options.map(opt => `
      <qti-simple-choice identifier="${escapeXml(opt.id)}">
        ${renderRichContent(opt.text, config.mathMode)}
      </qti-simple-choice>`).join('');

  const mappingEntriesXml = q.options.map(opt => {
    const isCorrect = correctIdSet.has(opt.id);
    const value = isCorrect ? perCorrectScore : -perIncorrectPenalty;
    if (value === 0) return '';
    return `
        <qti-map-entry map-key="${escapeXml(opt.id)}" mapped-value="${value}" />`;
  }).join('');

  const fb = getFeedbackXml(q, config);

  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="${QTI3_NS}"
  identifier="${id}"
  title="${xmlTitle(q.stem)}"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
    <qti-correct-response>${correctValuesXml}
    </qti-correct-response>
    <qti-mapping default-value="0">${mappingEntriesXml}
    </qti-mapping>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0.0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>${fb.decl}

  <qti-item-body>
    <p>${renderRichContent(q.stem, config.mathMode)}</p>
    <qti-choice-interaction response-identifier="RESPONSE" shuffle="${config.shuffleOptions ? 'true' : 'false'}" max-choices="${q.options.length}">
      ${choicesXml}
    </qti-choice-interaction>${fb.body}
  </qti-item-body>

  <qti-response-processing>
    <qti-set-outcome-value identifier="SCORE">
      <qti-max>
        <qti-map-response identifier="RESPONSE" />
        <qti-base-value base-type="float">${config.scoring.scoreFloor ?? 0.0}</qti-base-value>
      </qti-max>
    </qti-set-outcome-value>${fb.proc}
  </qti-response-processing>

</qti-assessment-item>`;
}

// ─── ORDER ──────────────────────────────────────────────────────────────────

function buildOrderItem(row: QuestionRow, q: OrderQuestion, config: ExportConfig): string {
  const id = resolveItemId(row.metadata.questionId, row.id);
  const { correctScore } = mapScoring(row.scoringConfig, config);

  const correctValuesXml = q.correctSequenceIds.map(cid =>
    `\n      <qti-value>${escapeXml(cid)}</qti-value>`).join('');

  const choicesXml = q.options.map(opt => `
      <qti-simple-choice identifier="${escapeXml(opt.id)}">
        ${renderRichContent(opt.text, config.mathMode)}
      </qti-simple-choice>`).join('');

  const fb = getFeedbackXml(q, config);

  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="${QTI3_NS}"
  identifier="${id}"
  title="${xmlTitle(q.stem)}"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier">
    <qti-correct-response>${correctValuesXml}
    </qti-correct-response>
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0.0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>${fb.decl}

  <qti-item-body>
    <p>${renderRichContent(q.stem, config.mathMode)}</p>
    <qti-order-interaction response-identifier="RESPONSE" shuffle="${config.shuffleOptions ? 'true' : 'false'}">
      ${choicesXml}
    </qti-order-interaction>${fb.body}
  </qti-item-body>

  <qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-match>
          <qti-variable identifier="RESPONSE"/>
          <qti-correct identifier="RESPONSE"/>
        </qti-match>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">${correctScore}</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">${config.scoring.scoreFloor ?? 0.0}</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else>
    </qti-response-condition>${fb.proc}
  </qti-response-processing>

</qti-assessment-item>`;
}

// ─── TEXT_ENTRY ──────────────────────────────────────────────────────────────

function buildTextEntryItem(row: QuestionRow, q: TextEntryQuestion, config: ExportConfig): string {
  const id = resolveItemId(row.metadata.questionId, row.id);
  const { correctScore } = mapScoring(row.scoringConfig, config);
  const primaryAnswer = q.acceptedAnswers[0] ?? '';
  const baseType = q.mode === 'numeric' ? 'float' : 'string';
  const expectedLength = Math.max(10, primaryAnswer.length + 4);

  const isNumericTolerance = q.mode === 'numeric' && q.numericTolerance != null;

  const correctValuesXml = q.acceptedAnswers
    .filter(a => a)
    .map(a => `\n      <qti-value>${escapeXml(a)}</qti-value>`)
    .join('');

  // Standard string mapping
  const stringMappingXml = !isNumericTolerance ? `
    <qti-mapping default-value="0">
      <qti-map-entry map-key="${escapeXml(primaryAnswer)}" mapped-value="${correctScore}" case-sensitive="${q.caseSensitive}" />
    </qti-mapping>` : '';

  // Custom processing logic based on tolerance
  const responseProcessingXml = isNumericTolerance ? `
  <qti-response-processing>
    <qti-response-condition>
      <qti-response-if>
        <qti-and>
          <qti-gte>
            <qti-variable identifier="RESPONSE"/>
            <qti-base-value base-type="float">${Number(primaryAnswer) - (q.numericTolerance || 0)}</qti-base-value>
          </qti-gte>
          <qti-lte>
            <qti-variable identifier="RESPONSE"/>
            <qti-base-value base-type="float">${Number(primaryAnswer) + (q.numericTolerance || 0)}</qti-base-value>
          </qti-lte>
        </qti-and>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">${correctScore}</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-if>
      <qti-response-else>
        <qti-set-outcome-value identifier="SCORE">
          <qti-base-value base-type="float">0.0</qti-base-value>
        </qti-set-outcome-value>
      </qti-response-else>
    </qti-response-condition>
  </qti-response-processing>` : `
  <qti-response-processing>
    <qti-set-outcome-value identifier="SCORE">
      <qti-map-response identifier="RESPONSE" />
    </qti-set-outcome-value>
  </qti-response-processing>`;

  const fb = getFeedbackXml(q, config);

  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="${QTI3_NS}"
  identifier="${id}"
  title="${xmlTitle(q.stem)}"
  adaptive="false"
  time-dependent="false">

  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="${baseType}">
    <qti-correct-response>${correctValuesXml}
    </qti-correct-response>${stringMappingXml}
  </qti-response-declaration>

  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float">
    <qti-default-value>
      <qti-value>0.0</qti-value>
    </qti-default-value>
  </qti-outcome-declaration>${fb.decl}

  <qti-item-body>
    <p>${renderRichContent(q.stem, config.mathMode)}</p>
    <qti-text-entry-interaction response-identifier="RESPONSE" expected-length="${expectedLength}" />${fb.body}
  </qti-item-body>
${responseProcessingXml.replace('</qti-response-processing>', fb.proc + '\n  </qti-response-processing>')}
</qti-assessment-item>`;
}

// ─── Manifest ────────────────────────────────────────────────────────────────

function buildManifest(artifacts: GeneratedArtifact[], interactionTypeMap: Map<string, string>): string {
  const resourcesXml = artifacts
    .filter(a => a.fileName.endsWith('.xml') && a.fileName !== 'imsmanifest.xml')
    .map(a => {
      const resId = escapeXml(a.fileName.replace('.xml', ''));
      const href = escapeXml(a.fileName);
      const interactionType = interactionTypeMap.get(a.fileName) || 'choiceInteraction';

      return `
    <resource identifier="${resId}" type="imsqti_item_xmlv3p0" href="${href}">
      <metadata>
        <qti-metadata xmlns="${QTI3_NS}">
          <qti-interaction-types>
            <qti-interaction-type>${interactionType}</qti-interaction-type>
          </qti-interaction-types>
        </qti-metadata>
      </metadata>
      <file href="${href}" />
    </resource>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" identifier="MANIFEST-QTI30">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations />
  <resources>${resourcesXml}
  </resources>
</manifest>`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function buildQti30Export(rows: QuestionRow[], config: ExportConfig): BuildResult {
  const artifacts: GeneratedArtifact[] = [];
  const warnings: BuildWarning[] = [];
  const errors: BuildError[] = [];
  const interactionTypeMap = new Map<string, string>();

  // Safer encoding that works across Node and Browsers
  const encoder = new TextEncoder();

  for (const row of rows) {
    if (row.status === 'rejected' || row.normalizedQuestion?.type === 'UNKNOWN') {
      errors.push({
        code: 'INVALID_ROW_STATE',
        message: `Row ${row.sourceRowNumber} cannot be exported (status: ${row.status}).`,
        rowId: row.id,
      });
      continue;
    }

    const q = row.normalizedQuestion;
    if (!q) continue;

    if (q.type === 'TEXT_ENTRY' && q.mode === 'formula') {
      errors.push({
        code: 'QTI30_UNSUPPORTED_FORMULA_MODE',
        message: `Row ${row.sourceRowNumber}: formula mode text entry is not supported in QTI 3.0.`,
        rowId: row.id,
      });
      continue;
    }

    let xmlData = '';
    let interactionType = 'choiceInteraction';

    try {
      if (q.type === 'MCQ') {
        xmlData = buildMcqItem(row, q as McqQuestion, config);
        interactionType = 'choiceInteraction';
      } else if (q.type === 'MSQ') {
        xmlData = buildMsqItem(row, q as MsqQuestion, config);
        interactionType = 'choiceInteraction';
      } else if (q.type === 'ORDER') {
        xmlData = buildOrderItem(row, q as OrderQuestion, config);
        interactionType = 'orderInteraction';
      } else if (q.type === 'TEXT_ENTRY') {
        xmlData = buildTextEntryItem(row, q as TextEntryQuestion, config);
        interactionType = 'textEntryInteraction';
      } else {
        warnings.push({
          code: 'QTI30_UNSUPPORTED_TYPE',
          message: `Row ${row.sourceRowNumber}: question type "${(q as any).type}" is not supported. Skipped.`,
          rowId: row.id,
        });
        continue;
      }
    } catch (e: any) {
      errors.push({
        code: 'QTI30_BUILD_ERROR',
        message: `Failed to generate QTI 3.0 XML for row ${row.sourceRowNumber}: ${e?.message ?? e}`,
        rowId: row.id,
      });
      continue;
    }

    if (xmlData) {
      const qid = resolveItemId(row.metadata.questionId, row.id);
      const fileName = `item_${qid}.xml`;

      artifacts.push({
        fileName,
        mimeType: 'application/xml',
        data: xmlData,
        sizeBytes: encoder.encode(xmlData).length, // Iso-morphic byte size calculation
      });

      interactionTypeMap.set(fileName, interactionType);
    }
  }

  if (errors.length > 0) {
    return { success: false, artifacts: [], warnings, errors };
  }

  const manifestData = buildManifest(artifacts, interactionTypeMap);
  artifacts.push({
    fileName: 'imsmanifest.xml',
    mimeType: 'application/xml',
    data: manifestData,
    sizeBytes: encoder.encode(manifestData).length,
  });

  return { success: true, artifacts, warnings, errors };
}
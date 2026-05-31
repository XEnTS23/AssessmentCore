import { QuestionRow } from '../core/rowTypes';
import { ExportConfig } from '../core/exportTypes';
import { BuildResult, GeneratedArtifact, BuildWarning, BuildError } from '../core/buildTypes';
import { McqQuestion, MsqQuestion, TextEntryQuestion, OrderQuestion } from '../core/questionTypes';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function processMath(text: string, mathMode: string): string {
  // A naive pass-through for latex. Proper QTI mathml would require a full parser/converter.
  return escapeXml(text);
}

function getFeedbackXml21(q: { explanation?: string }, config: ExportConfig) {
  const hasFeedback = config.feedbackMode !== 'strip' && !!q.explanation;
  if (!hasFeedback) return { decl: '', body: '', proc: '' };

  const decl = `\n  <outcomeDeclaration identifier="FEEDBACK" cardinality="single" baseType="identifier" />`;
  
  const label = config.feedbackMode === 'hints' ? 'Hint' : 'Explanation';
  const body = `\n    <feedbackBlock outcomeIdentifier="FEEDBACK" identifier="SHOW" showHide="show">
      <p><strong>${label}:</strong> ${processMath(q.explanation!, config.mathMode)}</p>
    </feedbackBlock>`;
    
  const proc = `\n    <setOutcomeValue identifier="FEEDBACK">
      <baseValue baseType="identifier">SHOW</baseValue>
    </setOutcomeValue>`;

  return { decl, body, proc };
}

function generateMcqItem(row: QuestionRow, q: McqQuestion, config: ExportConfig): string {
  const qid = escapeXml(row.metadata.questionId || row.id);
  const score = row.scoringConfig.marks || 1;
  const correctId = escapeXml(q.correctAnswerId);

  let optionsXml = '';
  for (const opt of q.options) {
    optionsXml += `
      <simpleChoice identifier="${escapeXml(opt.id)}">
        ${processMath(opt.text, config.mathMode)}
      </simpleChoice>`;
  }

  const fb = getFeedbackXml21(q, config);

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="${qid}" title="${escapeXml(q.stem.substring(0, 50))}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse>
      <value>${correctId}</value>
    </correctResponse>
    <mapping defaultValue="0">
      <mapEntry mapKey="${correctId}" mappedValue="${score}"/>
    </mapping>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float" />${fb.decl}
  <itemBody>
    <prompt>${processMath(q.stem, config.mathMode)}</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="${config.shuffleOptions ? 'true' : 'false'}" maxChoices="1">
      ${optionsXml}
    </choiceInteraction>${fb.body}
  </itemBody>
  <responseProcessing>
    <setOutcomeValue identifier="SCORE">
      <mapResponse identifier="RESPONSE" />
    </setOutcomeValue>${fb.proc}
  </responseProcessing>
</assessmentItem>`;
}

function generateMsqItem(row: QuestionRow, q: MsqQuestion, config: ExportConfig): string {
  const qid = escapeXml(row.metadata.questionId || row.id);
  const score = row.scoringConfig.marks || 1;

  let correctResponsesXml = '';
  for (const cid of q.correctAnswerIds) {
    correctResponsesXml += `<value>${escapeXml(cid)}</value>\n      `;
  }

  let optionsXml = '';
  for (const opt of q.options) {
    optionsXml += `
      <simpleChoice identifier="${escapeXml(opt.id)}">
        ${processMath(opt.text, config.mathMode)}
      </simpleChoice>`;
  }

  const fb = getFeedbackXml21(q, config);

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="${qid}" title="${escapeXml(q.stem.substring(0, 50))}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="multiple" baseType="identifier">
    <correctResponse>
      ${correctResponsesXml.trim()}
    </correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float" />${fb.decl}
  <itemBody>
    <prompt>${processMath(q.stem, config.mathMode)}</prompt>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="${config.shuffleOptions ? 'true' : 'false'}" maxChoices="${q.options.length}">
      ${optionsXml}
    </choiceInteraction>${fb.body}
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct">
${fb.proc ? `    <responseCondition>
      <responseIf>
        <not><isNull><variable identifier="RESPONSE"/></isNull></not>
        ${fb.proc.trim()}
      </responseIf>
    </responseCondition>` : ''}
  </responseProcessing>
</assessmentItem>`;
}

function generateTextEntryItem(row: QuestionRow, q: TextEntryQuestion, config: ExportConfig): string {
  const qid = escapeXml(row.metadata.questionId || row.id);
  const score = row.scoringConfig.marks || 1;
  const answer = q.acceptedAnswers.length > 0 ? q.acceptedAnswers[0] : '';
  const baseType = q.mode === 'numeric' ? 'float' : 'string';

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="${qid}" title="${escapeXml(q.stem.substring(0, 50))}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="${baseType}">
    <correctResponse>
      <value>${escapeXml(answer)}</value>
    </correctResponse>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float" />
  <itemBody>
    <p>${processMath(q.stem, config.mathMode)}</p>
    <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="${Math.max(10, answer.length + 2)}" />
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct" />
</assessmentItem>`;
}

function generateOrderItem(row: QuestionRow, q: OrderQuestion, config: ExportConfig): string {
  const qid = escapeXml(row.metadata.questionId || row.id);
  const score = row.scoringConfig.marks || 1;

  let correctResponsesXml = '';
  for (const cid of q.correctSequenceIds) {
    correctResponsesXml += `<value>${escapeXml(cid)}</value>\n      `;
  }

  let optionsXml = '';
  for (const opt of q.options) {
    optionsXml += `
      <simpleChoice identifier="${escapeXml(opt.id)}">
        ${processMath(opt.text, config.mathMode)}
      </simpleChoice>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="${qid}" title="${escapeXml(q.stem.substring(0, 50))}" adaptive="false" timeDependent="false">
  <responseDeclaration identifier="RESPONSE" cardinality="ordered" baseType="identifier">
    <correctResponse>
      ${correctResponsesXml.trim()}
    </correctResponse>
    <mapping defaultValue="0">
      <!-- QTI 2.1 match_correct template usually works fine, but custom scoring might need mapEntries -->
    </mapping>
  </responseDeclaration>
  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float" />
  <itemBody>
    <prompt>${processMath(q.stem, config.mathMode)}</prompt>
    <orderInteraction responseIdentifier="RESPONSE" shuffle="true">
      ${optionsXml}
    </orderInteraction>
  </itemBody>
  <responseProcessing template="http://www.imsglobal.org/question/qti_v2p1/rptemplates/match_correct" />
</assessmentItem>`;
}

function generateManifest(artifacts: GeneratedArtifact[]): string {
  let resourcesXml = '';
  for (const artifact of artifacts) {
    if (artifact.fileName.endsWith('.xml') && artifact.fileName !== 'imsmanifest.xml') {
      const id = artifact.fileName.replace('.xml', '');
      resourcesXml += `
    <resource identifier="${escapeXml(id)}" type="imsqti_item_xmlv2p1" href="${escapeXml(artifact.fileName)}">
      <file href="${escapeXml(artifact.fileName)}" />
    </resource>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" identifier="MANIFEST-01">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.1.4</schemaversion>
  </metadata>
  <organizations />
  <resources>
    ${resourcesXml.trim()}
  </resources>
</manifest>`;
}

export function buildQti21Export(rows: QuestionRow[], config: ExportConfig): BuildResult {
  const artifacts: GeneratedArtifact[] = [];
  const warnings: BuildWarning[] = [];
  const errors: BuildError[] = [];

  for (const row of rows) {
    if (row.status === 'rejected' || row.normalizedQuestion?.type === 'UNKNOWN') {
      errors.push({
        code: 'INVALID_ROW_STATE',
        message: `Row ${row.sourceRowNumber} cannot be exported.`,
        rowId: row.id,
      });
      continue;
    }

    const q = row.normalizedQuestion;
    const qid = row.metadata.questionId || row.id;
    let xmlData = '';

    if (!q) continue;

    try {
      if (q.type === 'MCQ') {
        xmlData = generateMcqItem(row, q as McqQuestion, config);
      } else if (q.type === 'MSQ') {
        xmlData = generateMsqItem(row, q as MsqQuestion, config);
      } else if (q.type === 'ORDER') {
        xmlData = generateOrderItem(row, q as OrderQuestion, config);
      } else if (q.type === 'TEXT_ENTRY') {
        xmlData = generateTextEntryItem(row, q as TextEntryQuestion, config);
      }

      if (xmlData) {
        artifacts.push({
          fileName: `item_${qid}.xml`,
          mimeType: 'application/xml',
          data: xmlData,
          sizeBytes: new Blob([xmlData]).size,
        });
      }
    } catch (e: any) {
      errors.push({
        code: 'QTI_BUILD_ERROR',
        message: `Failed to build QTI XML for row ${row.sourceRowNumber}: ${e.message}`,
        rowId: row.id,
      });
    }
  }

  if (errors.length > 0) {
    return { success: false, artifacts: [], warnings, errors };
  }

  // Generate the manifest
  const manifestData = generateManifest(artifacts);
  artifacts.push({
    fileName: 'imsmanifest.xml',
    mimeType: 'application/xml',
    data: manifestData,
    sizeBytes: new Blob([manifestData]).size,
  });

  return {
    success: true,
    artifacts,
    warnings,
    errors,
  };
}

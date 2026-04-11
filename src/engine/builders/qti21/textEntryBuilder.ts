/**
 * QTI 2.1 Text Entry Builder
 * Generates compliant QTI 2.1 XML for Text Entry Questions (Short Answer)
 */

import { Question, QuestionBuilder, GenerationError } from '../../types';
import { escapeXml } from '../../xmlUtils';
import { validateXml } from '../../xmlValidator';
import { convertTextWithMath, stripMath } from '../../../app/utils/mathmlConverter';
import { IMG_SEPARATOR } from '../../../app/utils/mediaUtils';

class TextEntryBuilder implements QuestionBuilder {
  /**
   * Generate QTI 3.0 XML for Text Entry question
   */
  async generate(question: Question): Promise<string> {
    // Validate question data
    this.validateQuestion(question);

    // Generate XML
    return this.buildXml(question);
  }

  /**
   * Validate question has all required fields
   */
  private validateQuestion(question: Question): void {
    if (!question.identifier || question.identifier.trim() === '') {
      throw new Error('Question identifier is required');
    }

    if (!question.stem || question.stem.trim() === '') {
      throw new Error('Question stem is required');
    }

    if (!question.correct_answer || question.correct_answer.trim() === '') {
      throw new Error('Correct answer is required');
    }
  }

  /**
   * Build QTI 2.1 XML structure for text entry question
   */
  private async buildXml(question: Question): Promise<string> {
    const escapedId = escapeXml(question.identifier);
    const escapedTitle = escapeXml(stripMath(question.stem).substring(0, 100));

    // Keep question text inline with the interaction to match strict QTI 2.1 template.
    const stemParts = question.stem.split(IMG_SEPARATOR);
    const stemInlineParts = await Promise.all(stemParts.map(async part => {
      const trimmed = part.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<img') && trimmed.endsWith('/>')) {
        return trimmed;
      }
      return await convertTextWithMath(trimmed);
    }));
    const stemInlineContent = stemInlineParts.filter(Boolean).join(' ');

    const rawAnswer = question.correct_answer.trim();
    const answerCandidates = rawAnswer
      .split(/[;|]/)
      .map((token) => token.trim())
      .filter(Boolean);
    const uniqueAnswers = Array.from(new Set(answerCandidates));
    const primaryAnswer = uniqueAnswers[0] || rawAnswer;
    const escapedPrimaryAnswer = escapeXml(primaryAnswer);

    // Accept explicit length if present; otherwise derive from primary answer length.
    const explicitLength = Number((question as any).expectedLength ?? (question as any).expected_length);
    const answerLength = primaryAnswer.length;
    const expectedLength = Number.isFinite(explicitLength) && explicitLength > 0
      ? Math.round(explicitLength)
      : Math.max(20, Math.min(answerLength + 10, 500));

    const mappingXml = uniqueAnswers.length > 1
      ? `
    <mapping defaultValue="0">
${uniqueAnswers
  .map((answer) => `      <mapEntry mapKey="${escapeXml(answer)}" mappedValue="1" caseSensitive="false"/>`)
  .join('\n')}
    </mapping>`
      : '';

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqti_v2p1
    http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
  identifier="${escapedId}"
  title="${escapedTitle}"
  adaptive="false"
  timeDependent="false">

  ${escapedPrimaryAnswer ? `<responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string">
    <correctResponse>
      <value>${escapedPrimaryAnswer}</value>
    </correctResponse>
${mappingXml}
  </responseDeclaration>` : `<responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string"/>`}

  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue><value>0</value></defaultValue>
  </outcomeDeclaration>

  <itemBody>
    <p>${stemInlineContent} <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="${expectedLength}"/></p>
  </itemBody>
${escapedPrimaryAnswer ? `
  <responseProcessing>
    <responseCondition>
      <responseIf>
        <stringMatch caseSensitive="false">
          <variable identifier="RESPONSE"/>
          <baseValue baseType="string">${escapedPrimaryAnswer}</baseValue>
        </stringMatch>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">1</baseValue>
        </setOutcomeValue>
      </responseIf>
    </responseCondition>
  </responseProcessing>` : `
  <responseProcessing/>`}

</assessmentItem>`;

    return xml;
  }

  /**
   * Validate the generated XML
   */
  validate(xml: string): boolean {
    const errors = validateXml(xml);
    return errors.length === 0;
  }
}

/**
 * Factory function to create Text Entry builder
 */
export function createTextEntryBuilder(): QuestionBuilder {
  return new TextEntryBuilder();
}

/**
 * Generate QTI XML for a single Text Entry question
 * Throws error if generation fails
 */
export async function generateTextEntryXml(question: Question): Promise<string> {
  const builder = createTextEntryBuilder();
  return builder.generate(question);
}

/**
 * Generate and validate QTI XML for Text Entry question
 * Returns error if validation fails
 */
export async function generateAndValidateTextEntry(
  question: Question
): Promise<{ xml: string } | { error: GenerationError }> {
  try {
    const xml = await generateTextEntryXml(question);
    const builder = createTextEntryBuilder();

    // Custom QTI 2.1 validation logic: check structural rules 1, 2, 5
    if (xml.includes('<p><p>') || xml.includes('</p></p>')) {
      return {
        error: { code: 'XML_VALIDATION_FAILED', message: 'Generated XML contains nested <p> tags' }
      };
    }
    
    // Check missing response processing or outcome
    if (!xml.includes('<responseProcessing') || !xml.includes('<outcomeDeclaration')) {
       return {
         error: { code: 'XML_VALIDATION_FAILED', message: 'Missing responseProcessing or outcomeDeclaration' }
       };
    }
    
    // Enforce <responseDeclaration> before <itemBody>
    const rdIndex = xml.indexOf('<responseDeclaration');
    const ibIndex = xml.indexOf('<itemBody');
    if (rdIndex > -1 && ibIndex > -1 && rdIndex > ibIndex) {
      return {
         error: { code: 'XML_VALIDATION_FAILED', message: 'responseDeclaration appears after itemBody' }
       };
    }

    if (!builder.validate(xml)) {
      return {
        error: {
          code: 'XML_VALIDATION_FAILED',
          message: 'Generated XML failed base validation',
        },
      };
    }

    return { xml };
  } catch (error) {
    return {
      error: {
        code: 'TEXTENTRY_GENERATION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: error,
      },
    };
  }
}

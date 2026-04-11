/**
 * QTI 2.1 Order Interaction Builder
 * Generates compliant QTI 2.1 XML for ordering questions.
 */

import { Question, QuestionBuilder, GenerationError } from '../../types';
import { escapeXml } from '../../xmlUtils';
import { validateXml } from '../../xmlValidator';
import { convertTextWithMath, stripMath } from '../../../app/utils/mathmlConverter';

class OrderBuilder implements QuestionBuilder {
  async generate(question: Question): Promise<string> {
    this.validateQuestion(question);
    return this.buildXml(question);
  }

  private validateQuestion(question: Question): void {
    if (!question.identifier || question.identifier.trim() === '') {
      throw new Error('Question identifier is required');
    }

    if (!question.stem || question.stem.trim() === '') {
      throw new Error('Question stem is required');
    }

    if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
      throw new Error('Order interaction requires at least 2 items');
    }
  }

  private getChoiceIdentifiers(question: Question): string[] {
    return question.options.map((_, index) => String.fromCharCode(65 + index));
  }

  private parseOrderedCorrectIds(question: Question, choiceIdentifiers: string[]): string[] {
    const raw = String(question.correct_answer || '').trim();
    if (!raw) {
      return choiceIdentifiers;
    }

    const parsed = raw
      .split(/[;,|]/)
      .map((token) => token.trim().toUpperCase())
      .filter(Boolean)
      .map((token) => {
        if (/^[A-Z]$/.test(token)) return token;
        if (/^\d+$/.test(token)) {
          const idx = parseInt(token, 10) - 1;
          if (idx >= 0 && idx < 26) return String.fromCharCode(65 + idx);
        }
        return token;
      });

    const unique = Array.from(new Set(parsed));
    const valid = unique.filter((id) => choiceIdentifiers.includes(id));
    return valid.length > 0 ? valid : choiceIdentifiers;
  }

  private async buildXml(question: Question): Promise<string> {
    const escapedId = escapeXml(question.identifier);
    const escapedTitle = escapeXml(stripMath(question.stem).substring(0, 100));
    const choiceIdentifiers = this.getChoiceIdentifiers(question);
    const correctIds = this.parseOrderedCorrectIds(question, choiceIdentifiers);

    const promptContent = await convertTextWithMath(question.stem.trim());

    const simpleChoices = (
      await Promise.all(
        question.options.map(async (option: string, index: number) => {
          const identifier = choiceIdentifiers[index];
          const optionContent = await convertTextWithMath(option);
          return `      <simpleChoice identifier="${identifier}">${optionContent}</simpleChoice>`;
        })
      )
    ).join('\n');

    const correctResponseValues = correctIds
      .map((id) => `      <value>${id}</value>`)
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqti_v2p1
    http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
  identifier="${escapedId}"
  title="${escapedTitle}"
  adaptive="false"
  timeDependent="false">

  <responseDeclaration identifier="RESPONSE" cardinality="ordered" baseType="identifier">
    <correctResponse>
${correctResponseValues}
    </correctResponse>
  </responseDeclaration>

  <outcomeDeclaration identifier="SCORE" cardinality="single" baseType="float">
    <defaultValue><value>0</value></defaultValue>
  </outcomeDeclaration>

  <itemBody>
    <orderInteraction responseIdentifier="RESPONSE" shuffle="true">
      <prompt>${promptContent}</prompt>
${simpleChoices}
    </orderInteraction>
  </itemBody>

  <responseProcessing>
    <responseCondition>
      <responseIf>
        <match>
          <variable identifier="RESPONSE"/>
          <correct identifier="RESPONSE"/>
        </match>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">1</baseValue>
        </setOutcomeValue>
      </responseIf>
      <responseElse>
        <setOutcomeValue identifier="SCORE">
          <baseValue baseType="float">0</baseValue>
        </setOutcomeValue>
      </responseElse>
    </responseCondition>
  </responseProcessing>
</assessmentItem>`;
  }

  validate(xml: string): boolean {
    const errors = validateXml(xml);
    return errors.length === 0;
  }
}

export function createOrderBuilder(): QuestionBuilder {
  return new OrderBuilder();
}

export async function generateOrderXml(question: Question): Promise<string> {
  const builder = createOrderBuilder();
  return builder.generate(question);
}

export async function generateAndValidateOrder(
  question: Question
): Promise<{ xml: string } | { error: GenerationError }> {
  try {
    const xml = await generateOrderXml(question);
    const builder = createOrderBuilder();

    if (!xml.includes('<orderInteraction') || !xml.includes('cardinality="ordered"')) {
      return {
        error: {
          code: 'XML_VALIDATION_FAILED',
          message: 'Order interaction structure is missing required ordered response elements',
        },
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
        code: 'ORDER_GENERATION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: error,
      },
    };
  }
}

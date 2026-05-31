import { GeneratedArtifact, BuildWarning, BuildError } from '../core/buildTypes';

export function validateJsonArtifact(artifact: GeneratedArtifact): { isValid: boolean, errors: BuildError[] } {
  const errors: BuildError[] = [];

  if (artifact.mimeType !== 'application/json') {
    errors.push({
      code: 'INVALID_MIME_TYPE',
      message: `Expected application/json, got ${artifact.mimeType}`,
    });
    return { isValid: false, errors };
  }

  let parsed: any;
  try {
    if (typeof artifact.data !== 'string') {
      throw new Error('JSON data must be a string for validation.');
    }
    parsed = JSON.parse(artifact.data);
  } catch (e) {
    errors.push({
      code: 'JSON_PARSE_ERROR',
      message: 'Failed to parse JSON string. The artifact may be corrupted.',
    });
    return { isValid: false, errors };
  }

  if (!parsed.version || !parsed.questions || !Array.isArray(parsed.questions)) {
    errors.push({
      code: 'INVALID_JSON_SHAPE',
      message: 'JSON missing required root properties (version, questions array).',
    });
  } else {
    // Validate some basic shapes of questions
    parsed.questions.forEach((q: any, i: number) => {
      if (!q.id || !q.type || !q.stem) {
        errors.push({
          code: 'MALFORMED_QUESTION_JSON',
          message: `Question at index ${i} is missing required fields (id, type, stem).`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateXmlArtifact(artifact: GeneratedArtifact): { isValid: boolean, errors: BuildError[] } {
  const errors: BuildError[] = [];

  if (artifact.mimeType !== 'application/xml' && artifact.mimeType !== 'text/xml') {
    errors.push({
      code: 'INVALID_MIME_TYPE',
      message: `Expected application/xml, got ${artifact.mimeType}`,
    });
    return { isValid: false, errors };
  }

  try {
    if (typeof artifact.data !== 'string') {
      throw new Error('XML data must be a string for validation.');
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(artifact.data, 'application/xml');

    // DOMParser returns a document with <parsererror> if parsing fails
    const parserError = doc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      errors.push({
        code: 'XML_PARSE_ERROR',
        message: 'Failed to parse XML string. The artifact is not well-formed.',
      });
    }
  } catch (e: any) {
    errors.push({
      code: 'XML_PARSE_EXCEPTION',
      message: `Exception during XML validation: ${e.message}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a QTI 3.0 XML artifact.
 *
 * In addition to the generic well-formedness check performed by
 * `validateXmlArtifact`, this function verifies that:
 *   1. The document is well-formed XML.
 *   2. Non-manifest files contain at least one <qti-assessment-item>.
 */
export function validateQti30Artifact(artifact: GeneratedArtifact): { isValid: boolean, errors: BuildError[] } {
  // Start with the generic XML well-formedness check
  const base = validateXmlArtifact(artifact);
  if (!base.isValid) return base;

  const errors: BuildError[] = [];

  try {
    if (typeof artifact.data !== 'string') throw new Error('Data must be a string.');

    const parser = new DOMParser();
    const doc = parser.parseFromString(artifact.data, 'application/xml');

    const QTI3_NS = 'https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/';
    const isManifest = artifact.fileName === 'imsmanifest.xml';

    if (!isManifest) {
      // Every item file must have exactly one qti-assessment-item root
      const itemsWithNs = doc.getElementsByTagNameNS(QTI3_NS, 'qti-assessment-item');
      const itemsNoNs   = doc.getElementsByTagName('qti-assessment-item');
      if (itemsWithNs.length === 0 && itemsNoNs.length === 0) {
        errors.push({
          code: 'QTI30_MISSING_ITEM_ELEMENT',
          message: `${artifact.fileName}: no <qti-assessment-item> element found. Wrong namespace or element names.`,
        });
      }
    }
  } catch (e: any) {
    errors.push({
      code: 'QTI30_VALIDATION_EXCEPTION',
      message: `Exception during QTI 3.0 validation of ${artifact.fileName}: ${e.message}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

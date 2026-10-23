import {
  GeneratedArtifact,
  BuildWarning,
  BuildError,
} from "../core/buildTypes";
import { sanitizeXmlSpaces } from "../builders/shared/xmlUtils";

export function validateJsonArtifact(artifact: GeneratedArtifact): {
  isValid: boolean;
  errors: BuildError[];
} {
  const errors: BuildError[] = [];

  if (artifact.mimeType !== "application/json") {
    errors.push({
      code: "INVALID_MIME_TYPE",
      message: `Expected application/json, got ${artifact.mimeType}`,
    });
    return { isValid: false, errors };
  }

  let parsed: any;
  try {
    if (typeof artifact.data !== "string") {
      throw new Error("JSON data must be a string for validation.");
    }
    parsed = JSON.parse(artifact.data);
  } catch (e) {
    errors.push({
      code: "JSON_PARSE_ERROR",
      message: "Failed to parse JSON string. The artifact may be corrupted.",
    });
    return { isValid: false, errors };
  }

  if (
    !parsed.version ||
    !parsed.questions ||
    !Array.isArray(parsed.questions)
  ) {
    errors.push({
      code: "INVALID_JSON_SHAPE",
      message:
        "JSON missing required root properties (version, questions array).",
    });
  } else {
    // Validate some basic shapes of questions
    parsed.questions.forEach((q: any, i: number) => {
      if (!q.id || !q.type || !q.stem) {
        errors.push({
          code: "MALFORMED_QUESTION_JSON",
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

export function validateXmlArtifact(artifact: GeneratedArtifact): {
  isValid: boolean;
  errors: BuildError[];
} {
  const errors: BuildError[] = [];

  if (
    artifact.mimeType !== "application/xml" &&
    artifact.mimeType !== "text/xml"
  ) {
    errors.push({
      code: "INVALID_MIME_TYPE",
      message: `Expected application/xml, got ${artifact.mimeType}`,
    });
    return { isValid: false, errors };
  }

  try {
    if (typeof artifact.data !== "string") {
      throw new Error("XML data must be a string for validation.");
    }
    artifact.data = sanitizeXmlSpaces(artifact.data);
    const parser = new DOMParser();
    const doc = parser.parseFromString(artifact.data, "application/xml");

    // DOMParser returns a document with <parsererror> if parsing fails
    const parserError = doc.getElementsByTagName("parsererror");
    if (parserError.length > 0) {
      errors.push({
        code: "XML_PARSE_ERROR",
        message: "Failed to parse XML string. The artifact is not well-formed.",
      });
    }
  } catch (e: any) {
    errors.push({
      code: "XML_PARSE_EXCEPTION",
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
export function validateQti30Artifact(artifact: GeneratedArtifact): {
  isValid: boolean;
  errors: BuildError[];
} {
  // Start with the generic XML well-formedness check
  const base = validateXmlArtifact(artifact);
  if (!base.isValid) return base;

  const errors: BuildError[] = [];

  try {
    if (typeof artifact.data !== "string")
      throw new Error("Data must be a string.");

    const parser = new DOMParser();
    const doc = parser.parseFromString(artifact.data, "application/xml");

    const QTI3_NS = "https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/";
    const isManifest = artifact.fileName === "imsmanifest.xml";

    if (!isManifest) {
      // Every item file must have exactly one qti-assessment-item root
      const itemsWithNs = doc.getElementsByTagNameNS(
        QTI3_NS,
        "qti-assessment-item",
      );
      const itemsNoNs = doc.getElementsByTagName("qti-assessment-item");
      if (itemsWithNs.length === 0 && itemsNoNs.length === 0) {
        errors.push({
          code: "QTI30_MISSING_ITEM_ELEMENT",
          message: `${artifact.fileName}: no <qti-assessment-item> element found. Wrong namespace or element names.`,
        });
      }
    }
  } catch (e: any) {
    errors.push({
      code: "QTI30_VALIDATION_EXCEPTION",
      message: `Exception during QTI 3.0 validation of ${artifact.fileName}: ${e.message}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Structured export validation error with optional location info.
 */
export interface ExportValidationError {
  code: string;
  message: string;
  artifact?: string;
  itemId?: string;
  fieldPath?: string;
  line?: number;
  column?: number;
  evidence?: unknown;
}

/**
 * Validate a QTI 2.1 XML artifact.
 *
 * In addition to the generic well-formedness check, this verifies:
 *   1. Non-manifest files contain an <assessmentItem> root with correct namespace.
 *   2. xml:lang is present on <assessmentItem>.
 *   3. No <prompt> element is a direct child of <itemBody>.
 *   4. SCORE, MAXSCORE, MINSCORE outcome declarations exist.
 *   5. Identifiers don't start with digits.
 *   6. xsi:schemaLocation is present.
 */
export function validateQti21Artifact(artifact: GeneratedArtifact): {
  isValid: boolean;
  errors: BuildError[];
} {
  // Start with generic well-formedness
  const base = validateXmlArtifact(artifact);
  if (!base.isValid) return base;

  const errors: BuildError[] = [];
  const isManifest = artifact.fileName === "imsmanifest.xml";

  try {
    if (typeof artifact.data !== "string")
      throw new Error("Data must be a string.");

    const parser = new DOMParser();
    const doc = parser.parseFromString(artifact.data, "application/xml");

    if (isManifest) {
      // Manifest validation
      const CP_NS = "http://www.imsglobal.org/xsd/imscp_v1p1";
      const manifests =
        doc.getElementsByTagNameNS(CP_NS, "manifest");
      const manifestsNoNs = doc.getElementsByTagName("manifest");
      if (manifests.length === 0 && manifestsNoNs.length === 0) {
        errors.push({
          code: "QTI21_MISSING_MANIFEST_ELEMENT",
          message: `${artifact.fileName}: no <manifest> element found.`,
        });
      }

      // Check schemaLocation
      if (!artifact.data.includes("schemaLocation")) {
        errors.push({
          code: "QTI21_MISSING_SCHEMA_LOCATION",
          message: `${artifact.fileName}: missing xsi:schemaLocation declaration.`,
        });
      }
    } else {
      // Item validation
      const QTI21_NS = "http://www.imsglobal.org/xsd/imsqti_v2p1";
      const itemsWithNs = doc.getElementsByTagNameNS(
        QTI21_NS,
        "assessmentItem",
      );
      const itemsNoNs = doc.getElementsByTagName("assessmentItem");

      if (itemsWithNs.length === 0 && itemsNoNs.length === 0) {
        errors.push({
          code: "QTI21_MISSING_ITEM_ELEMENT",
          message: `${artifact.fileName}: no <assessmentItem> element found with QTI 2.1 namespace.`,
        });
        return { isValid: false, errors };
      }

      const assessmentItem =
        itemsWithNs.length > 0 ? itemsWithNs[0] : itemsNoNs[0];

      // Check xml:lang
      const xmlLang = assessmentItem.getAttributeNS(
        "http://www.w3.org/XML/1998/namespace",
        "lang",
      );
      if (!xmlLang) {
        errors.push({
          code: "QTI21_MISSING_XML_LANG",
          message: `${artifact.fileName}: <assessmentItem> is missing xml:lang attribute.`,
        });
      }

      // Check schemaLocation
      if (!artifact.data.includes("schemaLocation")) {
        errors.push({
          code: "QTI21_MISSING_SCHEMA_LOCATION",
          message: `${artifact.fileName}: missing xsi:schemaLocation declaration.`,
        });
      }

      // Check that <prompt> is NOT a direct child of <itemBody>
      const itemBodies = assessmentItem.getElementsByTagName("itemBody");
      for (let i = 0; i < itemBodies.length; i++) {
        const children = itemBodies[i].childNodes;
        for (let j = 0; j < children.length; j++) {
          const child = children[j];
          if (
            child.nodeType === 1 &&
            (child as Element).tagName === "prompt"
          ) {
            errors.push({
              code: "QTI21_PROMPT_UNDER_ITEMBODY",
              message: `${artifact.fileName}: <prompt> must not be a direct child of <itemBody>.`,
            });
          }
        }
      }

      // Check identifier format (no digit-leading identifiers)
      const identifier = assessmentItem.getAttribute("identifier") || "";
      if (/^\d/.test(identifier)) {
        errors.push({
          code: "QTI21_DIGIT_LEADING_IDENTIFIER",
          message: `${artifact.fileName}: item identifier "${identifier}" begins with a digit.`,
        });
      }

      // Check simpleChoice identifiers
      const choices = assessmentItem.getElementsByTagName("simpleChoice");
      for (let i = 0; i < choices.length; i++) {
        const choiceId = choices[i].getAttribute("identifier") || "";
        if (/^\d/.test(choiceId)) {
          errors.push({
            code: "QTI21_DIGIT_LEADING_IDENTIFIER",
            message: `${artifact.fileName}: simpleChoice identifier "${choiceId}" begins with a digit.`,
          });
        }
      }

      // Check for SCORE, MAXSCORE, MINSCORE declarations
      const outcomeDecls =
        assessmentItem.getElementsByTagName("outcomeDeclaration");
      const declaredIdentifiers = new Set<string>();
      for (let i = 0; i < outcomeDecls.length; i++) {
        declaredIdentifiers.add(
          outcomeDecls[i].getAttribute("identifier") || "",
        );
      }
      for (const required of ["SCORE", "MAXSCORE", "MINSCORE"]) {
        if (!declaredIdentifiers.has(required)) {
          errors.push({
            code: "QTI21_MISSING_SCORE_DECLARATION",
            message: `${artifact.fileName}: missing outcomeDeclaration for "${required}".`,
          });
        }
      }
    }
  } catch (e: any) {
    errors.push({
      code: "QTI21_VALIDATION_EXCEPTION",
      message: `Exception during QTI 2.1 validation of ${artifact.fileName}: ${e.message}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";
import { buildQti21Export } from "./qti21Builder";
import type { ExportConfig } from "../core/exportTypes";
import type { QuestionRow } from "../core/rowTypes";
import * as fs from "fs";
import { execSync } from "child_process";

// Helper to create the VAL-0001 QuestionRow
function val0001Row(): QuestionRow {
  return {
    id: "val0001-uuid",
    sourceRowNumber: 1,
    rawRow: {},
    metadata: { questionId: "VAL-0001", language: "en" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 4, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
    normalizedQuestion: {
      type: "MCQ",
      stem: "What is the identity element for addition?",
      options: [
        { id: "A", label: "A", text: "1" },
        { id: "B", label: "B", text: "0" },
        { id: "C", label: "C", text: "-1" },
      ],
      correctAnswerId: "B",
    },
    manualFixSections: [
      { id: "s1", type: "question" },
      { id: "s2", type: "response" },
      { id: "s3", type: "metadata" },
      {
        id: "s4",
        type: "explanation",
        content: "Adding zero leaves every integer unchanged",
      },
    ],
  };
}

describe("QTI 2.1 Public Export Function Integration", () => {
  it("generates correct XML without duplicated authoring sections for VAL-0001", () => {
    const config: ExportConfig = {
      ...structuredClone(DEFAULT_EXPORT_CONFIG),
      target: "qti_2_1",
      scoring: {
        ...DEFAULT_EXPORT_CONFIG.scoring,
        negativeMarking: { enabled: true, valueSource: "global", globalValue: 1 },
      },
    };

    const result = buildQti21Export([val0001Row()], config);
    expect(result.success).toBe(true);

    const artifact = result.artifacts.find((a) => a.fileName.startsWith("item_"));
    expect(artifact).toBeDefined();

    const xml = artifact!.data as string;
    
    // Save to file for reporting and XSD validation
    fs.writeFileSync("val0001.xml", xml, "utf-8");

    // Required Assertions
    expect(xml).not.toContain("AUTHORING_SECTION_0");
    expect(xml).not.toContain("<feedbackBlock");
    expect(xml).toContain('identifier="EXPLANATION_STATE"');
    expect(xml).toContain(
      'outcomeIdentifier="EXPLANATION_STATE" identifier="SHOW" showHide="show"',
    );
    
    const countOccurrences = (str: string, substr: string) => {
      let count = 0;
      let pos = str.indexOf(substr);
      while (pos !== -1) {
        count++;
        pos = str.indexOf(substr, pos + 1);
      }
      return count;
    };

    expect(countOccurrences(xml, "<modalFeedback")).toBe(1);
    expect(countOccurrences(xml, "Adding zero leaves every integer unchanged")).toBe(1);
    expect(xml).toContain('<baseValue baseType="float">-1</baseValue>');

    // Check response paths
    expect(xml).toContain('<isNull><variable identifier="RESPONSE"/></isNull>');
    expect(xml).toMatch(/<isNull>[\s\S]*<baseValue baseType="float">0<\/baseValue>[\s\S]*<\/responseIf>/);
    expect(xml).toMatch(/<responseElseIf>[\s\S]*<match><variable identifier="RESPONSE"\/>[\s\S]*<baseValue baseType="float">4<\/baseValue>[\s\S]*<\/responseElseIf>/);
    expect(xml).toMatch(/<responseElse>[\s\S]*<setOutcomeValue identifier="SCORE">[\s\S]*<baseValue baseType="float">-1<\/baseValue>[\s\S]*<\/responseElse>/);

    // Python XSD Validation
    try {
      // Create validation script
      const pyScript = `
import xmlschema
import sys
try:
    schema = xmlschema.XMLSchema('http://www.imsglobal.org/xsd/imsqti_v2p1.xsd')
    schema.validate('val0001.xml')
    print("XSD VALIDATION SUCCESSFUL")
    sys.exit(0)
except Exception as e:
    print(f"XSD VALIDATION FAILED: {e}")
    sys.exit(1)
      `;
      fs.writeFileSync("validate.py", pyScript);
      
      const output = execSync('python validate.py').toString();
      expect(output).toContain("XSD VALIDATION SUCCESSFUL");
    } finally {
      // Clean up validation script if needed, or leave for manual inspection
    }
  });
});

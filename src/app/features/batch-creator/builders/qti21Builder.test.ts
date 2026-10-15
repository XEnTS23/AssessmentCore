import { describe, expect, it } from "vitest";
import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";
import type { ExportConfig } from "../core/exportTypes";
import type { QuestionRow } from "../core/rowTypes";
import { buildQti21Export } from "./qti21Builder";

// ─── Helpers ────────────────────────────────────────────────────────────────

function config(overrides?: Partial<ExportConfig>): ExportConfig {
  return {
    ...structuredClone(DEFAULT_EXPORT_CONFIG),
    target: "qti_2_1",
    ...overrides,
  };
}

function baseRow(overrides?: Partial<QuestionRow>): QuestionRow {
  return {
    id: "row-1",
    sourceRowNumber: 1,
    rawRow: {},
    metadata: { questionId: "Q001", language: "en" },
    mediaReferences: [],
    mathReferences: [],
    scoringConfig: { marks: 4, partialMarking: false },
    history: [],
    status: "valid",
    issues: [],
    ...overrides,
  };
}

function mcqRow(overrides?: Partial<QuestionRow>): QuestionRow {
  return baseRow({
    normalizedQuestion: {
      type: "MCQ",
      stem: "What is 2 + 2?",
      options: [
        { id: "opt_a", label: "A", text: "3" },
        { id: "opt_b", label: "B", text: "4" },
        { id: "opt_c", label: "C", text: "5" },
        { id: "opt_d", label: "D", text: "6" },
      ],
      correctAnswerId: "opt_b",
      explanation: "2 + 2 = 4 by arithmetic.",
    },
    ...overrides,
  });
}

function msqRow(overrides?: Partial<QuestionRow>): QuestionRow {
  return baseRow({
    normalizedQuestion: {
      type: "MSQ",
      stem: "Select all prime numbers:",
      options: [
        { id: "opt_a", label: "A", text: "2" },
        { id: "opt_b", label: "B", text: "3" },
        { id: "opt_c", label: "C", text: "4" },
        { id: "opt_d", label: "D", text: "5" },
      ],
      correctAnswerIds: ["opt_a", "opt_b", "opt_d"],
    },
    ...overrides,
  });
}

function textEntryRow(overrides?: Partial<QuestionRow>): QuestionRow {
  return baseRow({
    normalizedQuestion: {
      type: "TEXT_ENTRY",
      stem: "What is the SI unit of force?",
      mode: "text",
      acceptedAnswers: ["Newton", "newton", "N"],
      caseSensitive: false,
      trimPolicy: "trim",
    },
    ...overrides,
  });
}

function numericRow(overrides?: Partial<QuestionRow>): QuestionRow {
  return baseRow({
    normalizedQuestion: {
      type: "TEXT_ENTRY",
      stem: "Enter the value of g in m/s²:",
      mode: "numeric",
      acceptedAnswers: ["9.8"],
      numericTolerance: 0.1,
      caseSensitive: false,
      trimPolicy: "trim",
    },
    ...overrides,
  });
}

function itemXml(result: ReturnType<typeof buildQti21Export>): string {
  const item = result.artifacts.find((a) => a.fileName.startsWith("item_"));
  expect(item).toBeDefined();
  return item?.data as string;
}

function manifestXml(result: ReturnType<typeof buildQti21Export>): string {
  const manifest = result.artifacts.find(
    (a) => a.fileName === "imsmanifest.xml",
  );
  expect(manifest).toBeDefined();
  return manifest?.data as string;
}

function negativeMarkingConfig(): ExportConfig {
  return config({
    scoring: {
      mode: "basic",
      partialMarking: { enabled: false, strategy: "none" },
      negativeMarking: {
        enabled: true,
        valueSource: "global",
        globalValue: 1,
      },
      scoreFloor: -1,
    },
  });
}

// ─── MCQ Tests ──────────────────────────────────────────────────────────────

describe("QTI 2.1 MCQ", () => {
  it("generates a valid four-option MCQ item", () => {
    const result = buildQti21Export([mcqRow()], config());
    expect(result.success).toBe(true);
    const xml = itemXml(result);

    // Has assessmentItem with QTI 2.1 namespace
    expect(xml).toContain(
      'xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"',
    );
    // Has schema location
    expect(xml).toContain("schemaLocation");
    // Has xml:lang
    expect(xml).toContain('xml:lang="en"');
    // Has 4 simpleChoice elements
    expect((xml.match(/<simpleChoice/g) || []).length).toBe(4);
    // Has choiceInteraction with maxChoices="1"
    expect(xml).toContain('maxChoices="1"');
  });

  it("places <prompt> inside <choiceInteraction>, not under <itemBody>", () => {
    const xml = itemXml(buildQti21Export([mcqRow()], config()));

    // prompt must NOT be direct child of itemBody
    expect(xml).not.toMatch(/<itemBody>\s*<prompt>/);
    // prompt must be inside choiceInteraction
    expect(xml).toMatch(/<choiceInteraction[^>]*>[\s\S]*<prompt>/);
    // prompt content wrapped in <p>
    expect(xml).toMatch(/<prompt>\s*<p>/);
  });

  it("uses stable CHOICE_A..D identifiers", () => {
    const xml = itemXml(buildQti21Export([mcqRow()], config()));
    expect(xml).toContain('identifier="CHOICE_A"');
    expect(xml).toContain('identifier="CHOICE_B"');
    expect(xml).toContain('identifier="CHOICE_C"');
    expect(xml).toContain('identifier="CHOICE_D"');
  });

  it("uses CHOICE identifiers in correctResponse", () => {
    const xml = itemXml(buildQti21Export([mcqRow()], config()));
    // opt_b is the second option → CHOICE_B
    expect(xml).toMatch(/<correctResponse>\s*<value>CHOICE_B<\/value>/);
  });

  it("handles digit-leading UUID option IDs", () => {
    const row = mcqRow();
    (row.normalizedQuestion as any).options = [
      { id: "123-abc", label: "A", text: "Option A" },
      { id: "456-def", label: "B", text: "Option B" },
    ];
    (row.normalizedQuestion as any).correctAnswerId = "123-abc";
    const result = buildQti21Export([row], config());
    expect(result.success).toBe(true);
    const xml = itemXml(result);
    // No identifier starts with a digit
    expect(xml).not.toMatch(/identifier="\d/);
  });

  it("scores correct answer as 4", () => {
    const xml = itemXml(
      buildQti21Export([mcqRow()], negativeMarkingConfig()),
    );
    expect(xml).toContain(
      '<baseValue baseType="float">4</baseValue>',
    );
  });

  it("scores incorrect answer as -1 when negative marking is enabled", () => {
    const xml = itemXml(
      buildQti21Export([mcqRow()], negativeMarkingConfig()),
    );
    // The responseElse block should contain -1
    expect(xml).toMatch(
      /<responseElse>[\s\S]*<baseValue baseType="float">-1<\/baseValue>/,
    );
  });

  it("scores unanswered as 0", () => {
    const xml = itemXml(
      buildQti21Export([mcqRow()], negativeMarkingConfig()),
    );
    // isNull → SCORE = 0
    expect(xml).toMatch(
      /<isNull>[\s\S]*<\/isNull>[\s\S]*<baseValue baseType="float">0<\/baseValue>/,
    );
  });

  it("declares SCORE, MAXSCORE, MINSCORE", () => {
    const xml = itemXml(
      buildQti21Export([mcqRow()], negativeMarkingConfig()),
    );
    expect(xml).toContain('identifier="SCORE"');
    expect(xml).toContain('identifier="MAXSCORE"');
    expect(xml).toContain('identifier="MINSCORE"');
  });

  it("preserves correct feedback", () => {
    const row = mcqRow();
    row.manualFixSections = [
      { id: "question", type: "question" },
      { id: "response", type: "response" },
      { id: "metadata", type: "metadata" },
      {
        id: "fb-correct",
        type: "feedback_correct",
        content: "Well done!",
      },
    ];
    const xml = itemXml(buildQti21Export([row], config()));
    expect(xml).toContain("<modalFeedback");
    expect(xml).toContain('identifier="CORRECT"');
    expect(xml).toContain("Well done!");
  });

  it("preserves incorrect feedback", () => {
    const row = mcqRow();
    row.manualFixSections = [
      { id: "question", type: "question" },
      { id: "response", type: "response" },
      { id: "metadata", type: "metadata" },
      {
        id: "fb-incorrect",
        type: "feedback_incorrect",
        content: "Try again.",
      },
    ];
    const xml = itemXml(buildQti21Export([row], config()));
    expect(xml).toContain("<modalFeedback");
    expect(xml).toContain('identifier="INCORRECT"');
    expect(xml).toContain("Try again.");
  });

  it("preserves explanation with EXPLANATION_STATE", () => {
    const xml = itemXml(buildQti21Export([mcqRow()], config()));
    // The MCQ has explanation "2 + 2 = 4 by arithmetic."
    expect(xml).toContain("EXPLANATION_STATE");
    expect(xml).toContain("2 + 2 = 4 by arithmetic.");
  });

  it("strips explanation when feedbackMode is 'strip'", () => {
    const xml = itemXml(
      buildQti21Export([mcqRow()], config({ feedbackMode: "strip" })),
    );
    expect(xml).not.toContain("EXPLANATION_STATE");
    expect(xml).not.toContain("2 + 2 = 4 by arithmetic.");
  });

  it("rejects a missing correct answer", () => {
    const row = mcqRow();
    (row.normalizedQuestion as any).correctAnswerId = "nonexistent";
    const result = buildQti21Export([row], config());
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects an empty option text gracefully", () => {
    const row = mcqRow();
    (row.normalizedQuestion as any).options[0].text = "";
    // Should still build — empty options are valid XML
    const result = buildQti21Export([row], config());
    expect(result.success).toBe(true);
  });
});

// ─── MSQ Tests ──────────────────────────────────────────────────────────────

describe("QTI 2.1 MSQ", () => {
  it("generates correct MSQ with multiple correct answers", () => {
    const result = buildQti21Export([msqRow()], config());
    expect(result.success).toBe(true);
    const xml = itemXml(result);
    expect(xml).toContain("cardinality=\"multiple\"");
    // Correct answers: opt_a, opt_b, opt_d → CHOICE_A, CHOICE_B, CHOICE_D
    expect(xml).toContain("<value>CHOICE_A</value>");
    expect(xml).toContain("<value>CHOICE_B</value>");
    expect(xml).toContain("<value>CHOICE_D</value>");
  });

  it("uses all-or-nothing scoring by default (match full set)", () => {
    const xml = itemXml(buildQti21Export([msqRow()], negativeMarkingConfig()));
    // Should use <match> with <correct> for full-set comparison
    expect(xml).toContain("<match>");
    expect(xml).toContain('<correct identifier="RESPONSE"/>');
  });

  it("uses partial credit scoring with mapping when configured", () => {
    const partialConfig = config({
      scoring: {
        mode: "advanced",
        partialMarking: { enabled: true, strategy: "proportional" },
        negativeMarking: { enabled: false, valueSource: "global", globalValue: 0 },
      },
    });
    const xml = itemXml(buildQti21Export([msqRow()], partialConfig));
    expect(xml).toContain("<mapping");
    expect(xml).toContain("<mapEntry");
    expect(xml).toContain("<mapResponse");
  });

  it("sets minChoices and maxChoices from options", () => {
    const xml = itemXml(buildQti21Export([msqRow()], config()));
    expect(xml).toContain('minChoices="1"');
    expect(xml).toContain('maxChoices="4"');
  });
});

// ─── TEXT_ENTRY Tests ───────────────────────────────────────────────────────

describe("QTI 2.1 TEXT_ENTRY", () => {
  it("generates a valid text entry item", () => {
    const result = buildQti21Export([textEntryRow()], config());
    expect(result.success).toBe(true);
    const xml = itemXml(result);
    expect(xml).toContain("<textEntryInteraction");
    expect(xml).toContain('baseType="string"');
  });

  it("places textEntryInteraction inside <p>, not in a <prompt>", () => {
    const xml = itemXml(buildQti21Export([textEntryRow()], config()));
    expect(xml).not.toMatch(/<itemBody>\s*<prompt>/);
    expect(xml).toMatch(/<p>[\s\S]*<textEntryInteraction/);
  });

  it("puts only the first answer in correctResponse", () => {
    const xml = itemXml(buildQti21Export([textEntryRow()], config()));
    const correctResponseMatch = xml.match(
      /<correctResponse>([\s\S]*?)<\/correctResponse>/,
    );
    expect(correctResponseMatch).toBeTruthy();
    const values = (correctResponseMatch![1].match(/<value>([^<]*)<\/value>/g) || []);
    // Only one value in correctResponse
    expect(values.length).toBe(1);
    expect(values[0]).toContain("Newton");
  });

  it("includes all accepted alternatives in mapping", () => {
    const xml = itemXml(buildQti21Export([textEntryRow()], config()));
    expect(xml).toContain("<mapping");
    expect(xml).toContain("Newton");
    expect(xml).toContain("newton");
    expect(xml).toContain('mapKey="N"');
  });

  it("rejects empty accepted answers", () => {
    const row = textEntryRow();
    (row.normalizedQuestion as any).acceptedAnswers = [];
    const result = buildQti21Export([row], config());
    expect(result.success).toBe(false);
  });

  it("generates numeric text entry with float baseType", () => {
    const xml = itemXml(buildQti21Export([numericRow()], config()));
    expect(xml).toContain('baseType="float"');
    expect(xml).toContain("<textEntryInteraction");
  });

  it("includes numeric tolerance via mapping", () => {
    const xml = itemXml(buildQti21Export([numericRow()], config()));
    expect(xml).toContain("<mapping");
    expect(xml).toContain("9.8");
  });
});

// ─── Manifest & Structure Tests ─────────────────────────────────────────────

describe("QTI 2.1 Manifest", () => {
  it("generates manifest at root with correct namespace", () => {
    const result = buildQti21Export([mcqRow()], config());
    const manifest = manifestXml(result);
    expect(manifest).toContain(
      'xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"',
    );
    expect(manifest).toContain("schemaLocation");
  });

  it("includes one resource per item with correct type", () => {
    const manifest = manifestXml(buildQti21Export([mcqRow()], config()));
    expect(manifest).toContain('type="imsqti_item_xmlv2p1"');
    expect(manifest).toContain("<file");
  });

  it("item-bank package contains no assessment hierarchy", () => {
    const manifest = manifestXml(buildQti21Export([mcqRow()], config()));
    expect(manifest).not.toContain("assessmentTest");
    expect(manifest).not.toContain("testPart");
    expect(manifest).not.toContain("assessmentSection");
    expect(manifest).not.toContain("assessmentItemRef");
  });

  it("uses relative paths only", () => {
    const manifest = manifestXml(buildQti21Export([mcqRow()], config()));
    expect(manifest).not.toMatch(/href="[A-Za-z]:\\/);
    expect(manifest).not.toMatch(/href="\//);
    expect(manifest).not.toMatch(/href="\.\.\//)
  });

  it("resource identifiers don't start with digits", () => {
    const manifest = manifestXml(buildQti21Export([mcqRow()], config()));
    expect(manifest).not.toMatch(/identifier="\d/);
  });
});

// ─── Regression: 30-item batch ──────────────────────────────────────────────

describe("QTI 2.1 30-item regression", () => {
  function generate30Items(): ReturnType<typeof buildQti21Export> {
    const rows: QuestionRow[] = [];
    for (let i = 1; i <= 30; i++) {
      rows.push(
        mcqRow({
          id: `row-${i}`,
          sourceRowNumber: i,
          metadata: {
            questionId: `VAL_${String(i).padStart(4, "0")}`,
            language: "en",
            negativeMarks: 1,
          },
        }),
      );
    }
    return buildQti21Export(rows, negativeMarkingConfig());
  }

  it("generates 30 item XML files + 1 manifest", () => {
    const result = generate30Items();
    expect(result.success).toBe(true);
    const items = result.artifacts.filter((a) =>
      a.fileName.startsWith("item_"),
    );
    const manifests = result.artifacts.filter(
      (a) => a.fileName === "imsmanifest.xml",
    );
    expect(items.length).toBe(30);
    expect(manifests.length).toBe(1);
  });

  it("all 31 XML files start with xml declaration", () => {
    const result = generate30Items();
    for (const artifact of result.artifacts) {
      const xml = artifact.data as string;
      expect(xml.trim()).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    }
  });

  it("zero identifiers begin with digits", () => {
    const result = generate30Items();
    for (const artifact of result.artifacts) {
      if (artifact.fileName === "imsmanifest.xml") continue;
      const xml = artifact.data as string;
      expect(xml).not.toMatch(/identifier="\d/);
    }
  });

  it("zero <prompt> elements appear directly under <itemBody>", () => {
    const result = generate30Items();
    for (const artifact of result.artifacts) {
      if (artifact.fileName === "imsmanifest.xml") continue;
      const xml = artifact.data as string;
      expect(xml).not.toMatch(/<itemBody>\s*<prompt>/);
    }
  });

  it("all 30 items include xml:lang", () => {
    const result = generate30Items();
    for (const artifact of result.artifacts) {
      if (artifact.fileName === "imsmanifest.xml") continue;
      const xml = artifact.data as string;
      expect(xml).toContain("xml:lang=");
    }
  });

  it("every manifest file reference resolves", () => {
    const result = generate30Items();
    const manifest = manifestXml(result);
    const fileNames = new Set(
      result.artifacts.map((a) => a.fileName),
    );

    const hrefMatches = manifest.matchAll(/href="([^"]+)"/g);
    for (const match of hrefMatches) {
      expect(fileNames.has(match[1])).toBe(true);
    }
  });

  it("correct score equals 4 in every item", () => {
    const result = generate30Items();
    for (const artifact of result.artifacts) {
      if (artifact.fileName === "imsmanifest.xml") continue;
      const xml = artifact.data as string;
      expect(xml).toContain(
        '<baseValue baseType="float">4</baseValue>',
      );
    }
  });

  it("incorrect score equals -1 in every item", () => {
    const result = generate30Items();
    for (const artifact of result.artifacts) {
      if (artifact.fileName === "imsmanifest.xml") continue;
      const xml = artifact.data as string;
      expect(xml).toContain(
        '<baseValue baseType="float">-1</baseValue>',
      );
    }
  });

  it("unanswered score equals 0 in every item", () => {
    const result = generate30Items();
    for (const artifact of result.artifacts) {
      if (artifact.fileName === "imsmanifest.xml") continue;
      const xml = artifact.data as string;
      // isNull branch sets score to 0
      expect(xml).toMatch(
        /<isNull>[\s\S]*<\/isNull>[\s\S]*<baseValue baseType="float">0<\/baseValue>/,
      );
    }
  });
});

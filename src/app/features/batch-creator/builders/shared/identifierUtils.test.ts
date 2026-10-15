import { describe, expect, it } from "vitest";
import {
  toQtiIdentifier,
  buildOptionIdMap,
  resolveOptionId,
  resolveItemId,
  toXmlSafeId,
  QtiIdentifierError,
} from "./identifierUtils";

describe("toQtiIdentifier", () => {
  it("passes through a simple letter-starting identifier", () => {
    expect(toQtiIdentifier("myId", "ITEM_")).toBe("myId");
  });

  it("prefixes digit-leading values", () => {
    expect(toQtiIdentifier("123abc", "ITEM_")).toBe("ITEM_123abc");
  });

  it("replaces unsupported characters with _", () => {
    expect(toQtiIdentifier("hello world!", "ID_")).toBe("hello_world");
  });

  it("handles UUID-style identifiers", () => {
    const result = toQtiIdentifier("a1b2c3d4-e5f6-7890-abcd-ef1234567890", "ITEM_");
    expect(result).toMatch(/^[A-Za-z_]/);
    expect(result).toContain("a1b2c3d4");
  });

  it("prefixes digit-leading UUIDs", () => {
    const result = toQtiIdentifier("12345678-abcd-ef01-2345-678901234567", "ITEM_");
    expect(result).toMatch(/^ITEM_/);
  });

  it("applies NFKC normalization", () => {
    // ﬃ (U+FB03) NFKC-normalizes to "ffi"
    const result = toQtiIdentifier("ﬃ_test", "ID_");
    expect(result).toBe("ffi_test");
  });

  it("trims whitespace", () => {
    expect(toQtiIdentifier("  abc  ", "ID_")).toBe("abc");
  });

  it("collapses consecutive underscores", () => {
    expect(toQtiIdentifier("a__b___c", "ID_")).toBe("a_b_c");
  });

  it("throws QtiIdentifierError for empty input without prefix", () => {
    expect(() => toQtiIdentifier("", "")).toThrow(QtiIdentifierError);
  });

  it("returns prefix for empty input with prefix", () => {
    expect(toQtiIdentifier("", "ITEM_")).toBe("ITEM_");
  });

  it("throws for all-special-char input that produces empty result", () => {
    expect(() => toQtiIdentifier("!@#$%", "")).toThrow(QtiIdentifierError);
  });

  it("validates result against QTI pattern", () => {
    const result = toQtiIdentifier("valid_id.123-test", "ID_");
    expect(result).toMatch(/^[A-Za-z_][A-Za-z0-9_.\-]*$/);
  });
});

describe("buildOptionIdMap", () => {
  it("generates CHOICE_A through CHOICE_D for 4 options", () => {
    const options = [
      { id: "opt1" },
      { id: "opt2" },
      { id: "opt3" },
      { id: "opt4" },
    ];
    const map = buildOptionIdMap(options);
    expect(map.map.get("opt1")).toBe("CHOICE_A");
    expect(map.map.get("opt2")).toBe("CHOICE_B");
    expect(map.map.get("opt3")).toBe("CHOICE_C");
    expect(map.map.get("opt4")).toBe("CHOICE_D");
  });

  it("reverse-maps QTI IDs back to raw IDs", () => {
    const options = [{ id: "raw1" }, { id: "raw2" }];
    const map = buildOptionIdMap(options);
    expect(map.reverse.get("CHOICE_A")).toBe("raw1");
    expect(map.reverse.get("CHOICE_B")).toBe("raw2");
  });

  it("throws on duplicate raw option IDs", () => {
    const options = [{ id: "dup" }, { id: "dup" }];
    expect(() => buildOptionIdMap(options)).toThrow(QtiIdentifierError);
  });

  it("handles many options (AA, AB, ...)", () => {
    const options = Array.from({ length: 27 }, (_, i) => ({
      id: `opt${i}`,
    }));
    const map = buildOptionIdMap(options);
    expect(map.map.get("opt26")).toBe("CHOICE_AA");
  });
});

describe("resolveOptionId", () => {
  it("returns the mapped QTI ID for a known raw ID", () => {
    const map = buildOptionIdMap([{ id: "a" }, { id: "b" }]);
    expect(resolveOptionId(map, "a")).toBe("CHOICE_A");
  });

  it("throws for an unknown raw ID", () => {
    const map = buildOptionIdMap([{ id: "a" }]);
    expect(() => resolveOptionId(map, "nonexistent")).toThrow(
      QtiIdentifierError,
    );
  });
});

describe("resolveItemId", () => {
  it("returns the question ID when available", () => {
    const result = resolveItemId("Q001", "row-uuid");
    expect(result).toBe("Q001");
  });

  it("falls back to row ID when questionId is undefined", () => {
    const result = resolveItemId(undefined, "row-uuid");
    expect(result).toMatch(/row-uuid/);
  });

  it("prefixes digit-leading question IDs", () => {
    const result = resolveItemId("123", "row-uuid");
    expect(result).toMatch(/^ITEM_/);
  });
});

describe("toXmlSafeId (backward compatibility)", () => {
  it("handles normal strings", () => {
    expect(toXmlSafeId("abc")).toBe("abc");
  });

  it("handles null/undefined", () => {
    expect(toXmlSafeId(null)).toBe("_unknown");
    expect(toXmlSafeId(undefined)).toBe("_unknown");
  });

  it("prefixes digit-leading strings", () => {
    const result = toXmlSafeId("123");
    expect(result).toMatch(/^[^0-9]/);
  });
});

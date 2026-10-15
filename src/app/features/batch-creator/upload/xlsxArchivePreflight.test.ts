import { describe, expect, it } from "vitest";
import {
  preflightXlsxArchive,
  XlsxSecurityError,
} from "./xlsxArchivePreflight";

interface Entry {
  name: string;
  compressed?: number;
  uncompressed?: number;
}

function u16(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer).setUint16(offset, value, true);
}

function u32(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer).setUint32(offset, value, true);
}

function centralDirectory(entries: Entry[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const records = entries.map((entry) => {
    const name = encoder.encode(entry.name);
    const record = new Uint8Array(46 + name.length);
    u32(record, 0, 0x02014b50);
    u16(record, 4, 20);
    u16(record, 6, 20);
    u32(record, 20, entry.compressed ?? 100);
    u32(record, 24, entry.uncompressed ?? 200);
    u16(record, 28, name.length);
    record.set(name, 46);
    return record;
  });
  const centralSize = records.reduce((sum, record) => sum + record.length, 0);
  const output = new Uint8Array(centralSize + 22);
  let cursor = 0;
  records.forEach((record) => {
    output.set(record, cursor);
    cursor += record.length;
  });
  u32(output, cursor, 0x06054b50);
  u16(output, cursor + 8, entries.length);
  u16(output, cursor + 10, entries.length);
  u32(output, cursor + 12, centralSize);
  u32(output, cursor + 16, 0);
  return output.buffer;
}

const REQUIRED: Entry[] = [
  { name: "[Content_Types].xml" },
  { name: "_rels/.rels" },
  { name: "xl/workbook.xml" },
];

describe("XLSX archive preflight", () => {
  it("accepts a bounded workbook archive structure", () => {
    expect(preflightXlsxArchive(centralDirectory(REQUIRED))).toEqual({
      entries: 3,
      totalUncompressedBytes: 600,
    });
  });

  it("rejects zip-bomb compression ratios before ExcelJS expands the archive", () => {
    expect(() =>
      preflightXlsxArchive(
        centralDirectory([
          ...REQUIRED,
          {
            name: "xl/worksheets/sheet1.xml",
            compressed: 1,
            uncompressed: 10_000,
          },
        ]),
      ),
    ).toThrowError(
      expect.objectContaining({ code: "SUSPICIOUS_COMPRESSION_RATIO" }),
    );
  });

  it.each([
    "../outside.xml",
    "xl/embeddings/oleObject1.bin",
    "xl/activeX/activeX1.bin",
    "xl/externalLinks/externalLink1.xml",
    "xl/vbaProject.bin",
  ])("rejects unsafe workbook part %s", (name) => {
    expect(() =>
      preflightXlsxArchive(centralDirectory([...REQUIRED, { name }])),
    ).toThrow(XlsxSecurityError);
  });

  it("rejects malformed non-ZIP input", () => {
    expect(() =>
      preflightXlsxArchive(new Uint8Array([1, 2, 3]).buffer),
    ).toThrowError(expect.objectContaining({ code: "INVALID_XLSX_ARCHIVE" }));
  });
});

export type XlsxSecurityCode =
  | "INVALID_XLSX_ARCHIVE"
  | "ZIP64_NOT_SUPPORTED"
  | "TOO_MANY_ARCHIVE_ENTRIES"
  | "ARCHIVE_EXPANSION_LIMIT"
  | "SUSPICIOUS_COMPRESSION_RATIO"
  | "UNSAFE_ARCHIVE_PATH"
  | "UNSAFE_WORKBOOK_CONTENT"
  | "ENCRYPTED_WORKBOOK_NOT_SUPPORTED";

export class XlsxSecurityError extends Error {
  constructor(
    public readonly code: XlsxSecurityCode,
    message: string,
  ) {
    super(message);
    this.name = "XlsxSecurityError";
  }
}

export interface XlsxArchiveLimits {
  maxEntries: number;
  maxEntryUncompressedBytes: number;
  maxTotalUncompressedBytes: number;
  maxCompressionRatio: number;
}

export const DEFAULT_XLSX_ARCHIVE_LIMITS: Readonly<XlsxArchiveLimits> =
  Object.freeze({
    maxEntries: 10_000,
    maxEntryUncompressedBytes: 50 * 1024 * 1024,
    maxTotalUncompressedBytes: 100 * 1024 * 1024,
    maxCompressionRatio: 200,
  });

function fail(code: XlsxSecurityCode, message: string): never {
  throw new XlsxSecurityError(code, message);
}

export function preflightXlsxArchive(
  buffer: ArrayBuffer,
  limits: Partial<XlsxArchiveLimits> = {},
): { entries: number; totalUncompressedBytes: number } {
  const resolved = { ...DEFAULT_XLSX_ARCHIVE_LIMITS, ...limits };
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const minimumEocd = 22;
  let eocd = -1;

  for (
    let cursor = bytes.length - minimumEocd;
    cursor >= Math.max(0, bytes.length - 65_557);
    cursor -= 1
  ) {
    if (view.getUint32(cursor, true) === 0x06054b50) {
      eocd = cursor;
      break;
    }
  }
  if (eocd < 0)
    fail(
      "INVALID_XLSX_ARCHIVE",
      "The XLSX file is not a valid ZIP-based workbook.",
    );

  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk !== 0 || centralDisk !== 0)
    fail("INVALID_XLSX_ARCHIVE", "Multi-disk XLSX archives are not supported.");
  if (
    entryCount === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    fail(
      "ZIP64_NOT_SUPPORTED",
      "ZIP64 workbooks are not accepted by this upload path.",
    );
  }
  if (entryCount > resolved.maxEntries) {
    fail(
      "TOO_MANY_ARCHIVE_ENTRIES",
      `The workbook contains too many internal files (${entryCount}).`,
    );
  }
  if (centralOffset + centralSize > bytes.length) {
    fail(
      "INVALID_XLSX_ARCHIVE",
      "The XLSX central directory is outside the uploaded file.",
    );
  }

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const names = new Set<string>();
  let totalUncompressedBytes = 0;
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (
      cursor + 46 > bytes.length ||
      view.getUint32(cursor, true) !== 0x02014b50
    ) {
      fail("INVALID_XLSX_ARCHIVE", "The XLSX central directory is malformed.");
    }
    const flags = view.getUint16(cursor + 8, true);
    const compressed = view.getUint32(cursor + 20, true);
    const uncompressed = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const end = cursor + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length)
      fail("INVALID_XLSX_ARCHIVE", "An XLSX archive entry is truncated.");
    if ((flags & 0x1) !== 0)
      fail(
        "ENCRYPTED_WORKBOOK_NOT_SUPPORTED",
        "Encrypted XLSX workbooks are not supported.",
      );

    const name = decoder
      .decode(bytes.slice(cursor + 46, cursor + 46 + nameLength))
      .replace(/\\/g, "/");
    const normalizedName = name.toLowerCase();
    if (
      !name ||
      name.startsWith("/") ||
      /^[a-z]:/i.test(name) ||
      name.split("/").includes("..")
    ) {
      fail(
        "UNSAFE_ARCHIVE_PATH",
        "The workbook contains an unsafe internal path.",
      );
    }
    if (
      normalizedName === "xl/vbaproject.bin" ||
      normalizedName.startsWith("xl/activex/") ||
      normalizedName.startsWith("xl/embeddings/") ||
      normalizedName.startsWith("xl/externallinks/")
    ) {
      fail(
        "UNSAFE_WORKBOOK_CONTENT",
        `Unsupported active or externally linked workbook content: ${name}`,
      );
    }
    if (uncompressed > resolved.maxEntryUncompressedBytes) {
      fail(
        "ARCHIVE_EXPANSION_LIMIT",
        `Workbook entry ${name} expands beyond the per-entry safety limit.`,
      );
    }
    if (
      uncompressed > 0 &&
      (compressed === 0 ||
        uncompressed / compressed > resolved.maxCompressionRatio)
    ) {
      fail(
        "SUSPICIOUS_COMPRESSION_RATIO",
        `Workbook entry ${name} has a suspicious compression ratio.`,
      );
    }
    totalUncompressedBytes += uncompressed;
    if (totalUncompressedBytes > resolved.maxTotalUncompressedBytes) {
      fail(
        "ARCHIVE_EXPANSION_LIMIT",
        "The workbook expands beyond the total uncompressed-size safety limit.",
      );
    }
    names.add(normalizedName);
    cursor = end;
  }

  for (const required of [
    "[content_types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
  ]) {
    if (!names.has(required))
      fail(
        "INVALID_XLSX_ARCHIVE",
        `The workbook is missing required part: ${required}`,
      );
  }
  return { entries: entryCount, totalUncompressedBytes };
}

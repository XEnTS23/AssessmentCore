import {
  CopyrightStatus,
  ParsedTimestamp,
  QuestionMetadata,
} from "../core/metadataTypes";
import { RawImportedRow } from "../core/rowTypes";
import { getMappedCellText } from "../upload/rawCellData";
import { ColumnMapping } from "./normalizeAnswer";

const cleanStr = (val: any): string | undefined => {
  if (val === null || val === undefined) return undefined;
  const str = String(val).trim();
  return str === "" ? undefined : str;
};

const parseNum = (val: any): number | undefined => {
  if (val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

export function normalizeCopyrightStatus(
  value: unknown,
): CopyrightStatus | undefined {
  const normalized = cleanStr(value)
    ?.toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!normalized) return undefined;
  const aliases: Record<string, CopyrightStatus> = {
    approved: "approved",
    teacher_created: "teacher_created",
    original: "teacher_created",
    licensed: "licensed",
    licenced: "licensed",
    public_domain: "public_domain",
    permission_granted: "permission_granted",
    unknown: "unknown",
    unverified: "unverified",
  };
  return aliases[normalized] ?? "unverified";
}

export function parseTimestamp(value: unknown): ParsedTimestamp | undefined {
  const rawValue = cleanStr(value);
  if (!rawValue) return undefined;
  const milliseconds = Date.parse(rawValue);
  if (!Number.isFinite(milliseconds)) {
    return {
      rawValue,
      valid: false,
      parser: "Date.parse",
      error: "Timestamp is not a supported date/time value",
    };
  }
  return {
    rawValue,
    valid: true,
    parsedValue: new Date(milliseconds),
    parser: "Date.parse",
  };
}

function mappedRawText(
  raw: RawImportedRow | undefined,
  rawRow: Record<string, any>,
  mappedColumn: string | undefined,
  fallbacks: string[],
): string | undefined {
  const mappedRead = getMappedCellText(raw, mappedColumn);
  if (mappedRead.found) return mappedRead.rawText;
  if (mappedColumn) return undefined;
  for (const column of fallbacks) {
    const read = getMappedCellText(raw, column);
    if (read.found) return read.rawText;
    if (rawRow[column] !== undefined) return String(rawRow[column]);
  }
  return undefined;
}

export function normalizeMetadata(
  rawRow: Record<string, any>,
  mapping: ColumnMapping,
  raw?: RawImportedRow,
): QuestionMetadata {
  const metadata: QuestionMetadata = {};

  if (mapping.subject) metadata.subject = cleanStr(rawRow[mapping.subject]);
  if (mapping.chapter) metadata.chapter = cleanStr(rawRow[mapping.chapter]);
  if (mapping.topic) metadata.topic = cleanStr(rawRow[mapping.topic]);
  if (mapping.difficulty)
    metadata.difficulty = cleanStr(rawRow[mapping.difficulty]);

  if (mapping.marks) metadata.marks = parseNum(rawRow[mapping.marks]);
  if (mapping.negativeMarks)
    metadata.negativeMarks = parseNum(rawRow[mapping.negativeMarks]);

  if (mapping.section) metadata.section = cleanStr(rawRow[mapping.section]);
  if (mapping.questionId)
    metadata.questionId = cleanStr(rawRow[mapping.questionId]);
  if (mapping.sourceExam)
    metadata.sourceExam = cleanStr(rawRow[mapping.sourceExam]);
  if (mapping.year) metadata.year = cleanStr(rawRow[mapping.year]);
  if (mapping.language) metadata.language = cleanStr(rawRow[mapping.language]);
  if (mapping.mediaUrl) {
    let rawUrl = cleanStr(rawRow[mapping.mediaUrl]);
    if (rawUrl && rawUrl.startsWith("[MEDIA:") && rawUrl.endsWith("]")) {
      rawUrl = rawUrl.slice(7, -1);
    }
    metadata.mediaUrl = rawUrl;
  }

  metadata.rawCopyrightStatus = mappedRawText(
    raw,
    rawRow,
    mapping.copyrightStatus,
    ["Copyright_Status", "Copyright"],
  );
  metadata.copyrightStatus = normalizeCopyrightStatus(
    metadata.rawCopyrightStatus,
  );
  metadata.rawSourceReference = mappedRawText(
    raw,
    rawRow,
    mapping.sourceReference,
    ["Source_Reference", "Source"],
  );
  metadata.sourceReference = cleanStr(metadata.rawSourceReference);
  metadata.rawTeacherVersion = mappedRawText(
    raw,
    rawRow,
    mapping.teacherVersion,
    ["Teacher_Version", "Version"],
  );
  metadata.teacherVersion = cleanStr(metadata.rawTeacherVersion);
  metadata.rawSubmittedAt = mappedRawText(raw, rawRow, mapping.submittedAt, [
    "Submitted_At",
    "Submitted_Date",
  ]);
  metadata.rawLastUpdatedAt = mappedRawText(
    raw,
    rawRow,
    mapping.lastUpdatedAt,
    ["Last_Updated_At", "Updated_At", "Updated_Date"],
  );
  metadata.submittedTimestamp = parseTimestamp(metadata.rawSubmittedAt);
  metadata.lastUpdatedTimestamp = parseTimestamp(metadata.rawLastUpdatedAt);
  metadata.submittedAt = metadata.submittedTimestamp?.parsedValue;
  metadata.lastUpdatedAt = metadata.lastUpdatedTimestamp?.parsedValue;

  return metadata;
}

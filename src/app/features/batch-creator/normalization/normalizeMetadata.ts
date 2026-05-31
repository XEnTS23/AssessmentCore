import { QuestionMetadata } from '../core/metadataTypes';
import { ColumnMapping } from './normalizeAnswer';

const cleanStr = (val: any): string | undefined => {
  if (val === null || val === undefined) return undefined;
  const str = String(val).trim();
  return str === '' ? undefined : str;
};

const parseNum = (val: any): number | undefined => {
  if (val === null || val === undefined) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

export function normalizeMetadata(
  rawRow: Record<string, any>,
  mapping: ColumnMapping
): QuestionMetadata {
  const metadata: QuestionMetadata = {};

  if (mapping.subject) metadata.subject = cleanStr(rawRow[mapping.subject]);
  if (mapping.chapter) metadata.chapter = cleanStr(rawRow[mapping.chapter]);
  if (mapping.topic) metadata.topic = cleanStr(rawRow[mapping.topic]);
  if (mapping.difficulty) metadata.difficulty = cleanStr(rawRow[mapping.difficulty]);
  
  if (mapping.marks) metadata.marks = parseNum(rawRow[mapping.marks]);
  if (mapping.negativeMarks) metadata.negativeMarks = parseNum(rawRow[mapping.negativeMarks]);
  
  if (mapping.section) metadata.section = cleanStr(rawRow[mapping.section]);
  if (mapping.questionId) metadata.questionId = cleanStr(rawRow[mapping.questionId]);
  if (mapping.sourceExam) metadata.sourceExam = cleanStr(rawRow[mapping.sourceExam]);
  if (mapping.year) metadata.year = cleanStr(rawRow[mapping.year]);
  if (mapping.language) metadata.language = cleanStr(rawRow[mapping.language]);
  if (mapping.mediaUrl) {
    let rawUrl = cleanStr(rawRow[mapping.mediaUrl]);
    if (rawUrl && rawUrl.startsWith('[MEDIA:') && rawUrl.endsWith(']')) {
      rawUrl = rawUrl.slice(7, -1);
    }
    metadata.mediaUrl = rawUrl;
  }

  return metadata;
}

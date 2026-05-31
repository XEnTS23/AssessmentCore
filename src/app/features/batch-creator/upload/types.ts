import { RawSheetRow } from '../core/rowTypes';

export type UploadSourceType = 'csv' | 'xlsx' | 'ocr';

export interface UploadStageOutput {
  sourceFileName: string;
  sourceType: UploadSourceType;
  columns: string[];
  rawRows: RawSheetRow[];
  previewRows: RawSheetRow[];
}

export interface UploadError {
  title: string;
  message: string;
}

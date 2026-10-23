import { RawSheetRow } from "../core/rowTypes";
import {
  CanonicalColumnMapping,
  MappingMetadata,
} from "../normalization/canonicalColumnMapping";

export type UploadSourceType = "csv" | "xlsx" | "ocr";

export interface UploadStageOutput {
  sourceFileName: string;
  sourceType: UploadSourceType;
  columns: string[];
  rawRows: RawSheetRow[];
  previewRows: RawSheetRow[];
  mapping: CanonicalColumnMapping;
  mappingMetadata: MappingMetadata;
}

export interface UploadError {
  title: string;
  message: string;
}

export interface GeneratedArtifact {
  fileName: string;
  mimeType: string;
  data: string | Blob; // For JSON it's string, for ZIP it might be Blob
  sizeBytes: number;
}

export interface BuildWarning {
  code: string;
  message: string;
  rowId?: string;
}

export interface BuildError {
  code: string;
  message: string;
  rowId?: string;
}

export interface BuildResult {
  success: boolean;
  artifacts: GeneratedArtifact[];
  warnings: BuildWarning[];
  errors: BuildError[];
}

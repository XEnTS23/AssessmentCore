import { useState, useCallback, useEffect, useRef } from "react";
import {
  assertFileWithinBatchLimits,
  BatchLimitError,
} from "../core/batchLimits";
import {
  UploadStageOutput,
  UploadSourceType,
  UploadError,
} from "../upload/types";
import { parseCsv } from "../upload/parseCsv";
import { parseXlsx } from "../upload/parseXlsx";
import { parseOcrOutput } from "../upload/parseOcrOutput";
import { useAuth } from "../../../../contexts/AuthContext";
import { XlsxSecurityError } from "../upload/xlsxArchivePreflight";
import {
  createWorkflowOperation,
  WorkflowOperation,
} from "../observability/workflowTelemetry";
import {
  createCanonicalColumnMapping,
  getMappingMetadata,
} from "../normalization/canonicalColumnMapping";

export function useUploadStage() {
  const { user } = useAuth();
  const [output, setOutput] = useState<UploadStageOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);
  const requestSequenceRef = useRef(0);
  const activeUploadOperationRef = useRef<WorkflowOperation | null>(null);

  useEffect(
    () => () => {
      requestSequenceRef.current += 1;
      activeUploadOperationRef.current?.cancel("component_unmounted");
    },
    [],
  );

  const handleFile = useCallback((file: File) => {
    const requestId = ++requestSequenceRef.current;
    activeUploadOperationRef.current?.cancel("superseded");
    const operation = createWorkflowOperation("upload", {
      fileBytes: file.size,
    });
    activeUploadOperationRef.current = operation;
    setIsLoading(true);
    setError(null);
    setOutput(null);

    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const isXlsx = file.name.toLowerCase().endsWith(".xlsx");

    if (!isCsv && !isXlsx) {
      setError({
        title: "Unsupported file type",
        message: "Please upload a .csv or .xlsx file.",
      });
      setIsLoading(false);
      operation.fail("UNSUPPORTED_FILE_TYPE");
      return;
    }

    try {
      assertFileWithinBatchLimits(file);
    } catch (err) {
      if (requestId !== requestSequenceRef.current) return;
      setError({
        title:
          err instanceof BatchLimitError
            ? "Upload limit exceeded"
            : "Upload Error",
        message:
          err instanceof Error
            ? err.message
            : "The selected file could not be accepted.",
      });
      setIsLoading(false);
      operation.fail(
        err instanceof BatchLimitError ? err.code : "UPLOAD_REJECTED",
      );
      return;
    }

    const type: UploadSourceType = isCsv ? "csv" : "xlsx";

    const onSuccess = ({ columns, rawRows, mapping, mappingMetadata }: any) => {
      if (requestId !== requestSequenceRef.current) return;
      setOutput({
        sourceFileName: file.name,
        sourceType: type,
        columns,
        rawRows,
        previewRows: rawRows.slice(0, 5), // Just take first 5 for preview
        mapping,
        mappingMetadata,
      });
      setIsLoading(false);
      operation.complete({ rows: rawRows.length, columns: columns.length });
    };

    const onError = (err: Error) => {
      if (requestId !== requestSequenceRef.current) return;
      setError({
        title:
          err instanceof BatchLimitError
            ? "Upload limit exceeded"
            : err instanceof XlsxSecurityError
              ? "Unsafe workbook rejected"
              : "Parsing Error",
        message: err.message || "An error occurred while parsing the file.",
      });
      setIsLoading(false);
      setOutput(null);
      operation.fail(
        err instanceof BatchLimitError
          ? err.code
          : err instanceof XlsxSecurityError
            ? err.code
            : "PARSE_ERROR",
      );
    };

    if (isCsv) {
      parseCsv({ file, onSuccess, onError });
    } else {
      parseXlsx({ file, onSuccess, onError });
    }
  }, []);

  const handleLoadOcr = useCallback(() => {
    const requestId = ++requestSequenceRef.current;
    activeUploadOperationRef.current?.cancel("superseded");
    const operation = createWorkflowOperation("upload");
    activeUploadOperationRef.current = operation;
    if (!user?.id) {
      setIsLoading(false);
      setOutput(null);
      setError({
        title: "Authentication Required",
        message: "You must be logged in to access recent OCR exports.",
      });
      operation.fail("AUTHENTICATION_REQUIRED");
      return;
    }

    setIsLoading(true);
    setError(null);
    setOutput(null);

    parseOcrOutput({
      userId: user.id,
      onSuccess: ({ columns, rawRows, fileName }) => {
        if (requestId !== requestSequenceRef.current) return;
        const mapping = createCanonicalColumnMapping(columns);
        setOutput({
          sourceFileName: fileName,
          sourceType: "ocr",
          columns,
          rawRows,
          previewRows: rawRows.slice(0, 5),
          mapping,
          mappingMetadata: getMappingMetadata(mapping),
        });
        setIsLoading(false);
        operation.complete({ rows: rawRows.length, columns: columns.length });
      },
      onError: (err) => {
        if (requestId !== requestSequenceRef.current) return;
        setError({
          title:
            err instanceof BatchLimitError
              ? "Upload limit exceeded"
              : err instanceof XlsxSecurityError
                ? "Unsafe workbook rejected"
                : "OCR Loading Error",
          message: err.message || "An error occurred while loading OCR data.",
        });
        setIsLoading(false);
        setOutput(null);
        operation.fail(
          err instanceof BatchLimitError
            ? err.code
            : err instanceof XlsxSecurityError
              ? err.code
              : "OCR_LOAD_ERROR",
        );
      },
    });
  }, [user?.id]);

  const reset = useCallback(() => {
    requestSequenceRef.current += 1;
    activeUploadOperationRef.current?.cancel("reset");
    setOutput(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    output,
    isLoading,
    error,
    handleFile,
    handleLoadOcr,
    reset,
  };
}

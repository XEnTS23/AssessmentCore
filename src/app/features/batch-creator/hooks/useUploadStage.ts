import { useState, useCallback } from 'react';
import { UploadStageOutput, UploadSourceType, UploadError } from '../upload/types';
import { parseCsv } from '../upload/parseCsv';
import { parseXlsx } from '../upload/parseXlsx';
import { parseOcrOutput } from '../upload/parseOcrOutput';
import { useAuth } from '../../../../contexts/AuthContext';

export function useUploadStage() {
  const { user } = useAuth();
  const [output, setOutput] = useState<UploadStageOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);

  const handleFile = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);

    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const isXlsx = file.name.toLowerCase().endsWith('.xlsx');

    if (!isCsv && !isXlsx) {
      setError({
        title: 'Unsupported file type',
        message: 'Please upload a .csv or .xlsx file.'
      });
      setIsLoading(false);
      return;
    }

    const type: UploadSourceType = isCsv ? 'csv' : 'xlsx';

    const onSuccess = ({ columns, rawRows }: any) => {
      setOutput({
        sourceFileName: file.name,
        sourceType: type,
        columns,
        rawRows,
        previewRows: rawRows.slice(0, 5) // Just take first 5 for preview
      });
      setIsLoading(false);
    };

    const onError = (err: Error) => {
      setError({
        title: 'Parsing Error',
        message: err.message || 'An error occurred while parsing the file.'
      });
      setIsLoading(false);
      setOutput(null);
    };

    if (isCsv) {
      parseCsv({ file, onSuccess, onError });
    } else {
      parseXlsx({ file, onSuccess, onError });
    }
  }, []);

  const handleLoadOcr = useCallback(() => {
    if (!user?.id) {
      setError({
        title: 'Authentication Required',
        message: 'You must be logged in to access recent OCR exports.'
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    parseOcrOutput({
      userId: user.id,
      onSuccess: ({ columns, rawRows, fileName }) => {
        setOutput({
          sourceFileName: fileName,
          sourceType: 'ocr',
          columns,
          rawRows,
          previewRows: rawRows.slice(0, 5)
        });
        setIsLoading(false);
      },
      onError: (err) => {
        setError({
          title: 'OCR Loading Error',
          message: err.message || 'An error occurred while loading OCR data.'
        });
        setIsLoading(false);
        setOutput(null);
      }
    });
  }, [user?.id]);

  const reset = useCallback(() => {
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
    reset
  };
}

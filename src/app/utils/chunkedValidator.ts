import { validateAllQuestions } from './questionValidator.js';
import type { ValidationResult, ValidationProfile } from './questionValidator.js';

/**
 * Validates questions in chunks to prevent UI blocking
 * Useful for large datasets (1000+ rows)
 */
export async function validateAllQuestionsChunked(
  rows: Record<string, any>[],
  columnMapping: any,
  chunkSize: number = 500,
  onProgress?: (progress: number, processedCount: number) => void,
  profileInput?: Partial<ValidationProfile>
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();
  const totalRows = rows.length;

  // Keep progress updates chunked for UI responsiveness, but run one full validation pass
  // so cross-row checks (duplicates/unique ids/mapping consistency) stay deterministic.
  for (let processedCount = 0; processedCount < totalRows; processedCount += chunkSize) {
    const completed = Math.min(processedCount + chunkSize, totalRows);
    const progress = Math.round((completed / Math.max(totalRows, 1)) * 100);
    onProgress?.(progress, completed);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const batchResults = validateAllQuestions(rows as any, columnMapping, profileInput);
  batchResults.forEach((result: ValidationResult) => {
    results.set(result.rowId, result);
  });

  onProgress?.(100, totalRows);

  return results;
}

/**
 * Validates a subset of rows (for re-validation after edits)
 */
export async function validateRowsSubset(
  rows: Record<string, any>[],
  columnMapping: any,
  changedRowIds: Set<string>,
  profileInput?: Partial<ValidationProfile>
): Promise<Map<string, ValidationResult>> {
  const results = new Map<string, ValidationResult>();
  
  // Only validate changed rows — use __rowKey which is the canonical map key
  const changedRows = rows.filter(row => changedRowIds.has(row.__rowKey));
  
  if (changedRows.length > 0) {
    const validationResults = validateAllQuestions(changedRows as any, columnMapping, profileInput);
    validationResults.forEach((result: ValidationResult) => {
      results.set(result.rowId, result);
    });
  }

  return results;
}

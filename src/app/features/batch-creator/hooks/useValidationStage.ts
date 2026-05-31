import { useState, useMemo, useEffect } from 'react';
import { QuestionRow, RawSheetRow } from '../core/rowTypes';
import { ValidationEngine } from '../validation/validationEngine';
import { getDefaultRuleRegistry } from '../validation/ruleRegistry';
import { normalizeRow } from '../normalization/normalizeRow';
import { ColumnMapping } from '../normalization/normalizeAnswer';

export type FilterStatus = 'all' | 'valid' | 'caution' | 'needs_review' | 'rejected';

export function useValidationStage(rawRows: RawSheetRow[] = []) {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // UI State
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRuleId, setSelectedRuleId] = useState<string>('all');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Process rows on mount / change
  useEffect(() => {
    if (rawRows.length === 0) {
      setRows([]);
      return;
    }

    setIsProcessing(true);

    // In a real app, this mapping comes from a mapping stage.
    // Since we don't have one yet, we'll try to guess the mapping from the column headers of the first row.
    const availableColumns = Object.keys(rawRows[0] || {});

    const findMatch = (keywords: string[], excludeKeywords: string[] = []) => {
      const col = availableColumns.find(c => {
        const lower = c.toLowerCase();
        return keywords.some(k => lower.includes(k)) && !excludeKeywords.some(k => lower.includes(k));
      });
      return col || '';
    };

    const dummyMapping: ColumnMapping = {
      stem: findMatch(['stem', 'question'], ['type', 'format', 'id', 'mark']),
      correctAnswer: findMatch(['answer', 'correct']),
      type: findMatch(['type', 'format', 'Question Type']),
      explanation: findMatch(['explanation', 'solution']),
      subject: findMatch(['subject', 'category']),
      questionId: findMatch(['id', 'qid', 'question id', 'serial', 'questionid']),
      topic: findMatch(['topic', 'tag', 'subtopic']),
      mediaUrl: findMatch(['media', 'image', 'url', 'Diagram']),
      options: []
    };

    // Find any options columns (e.g. Option A, option 1, etc.)
    const optionCols = availableColumns.filter(c => c.toLowerCase().includes('option') || c.toLowerCase().match(/^[a-d]$/));
    if (optionCols.length > 0) {
      dummyMapping.options = optionCols;
    }

    // Normalize
    const normalized = rawRows.map(raw => normalizeRow(raw, dummyMapping));

    // Validate
    const engine = new ValidationEngine(getDefaultRuleRegistry());
    const validated: QuestionRow[] = [];

    let isCancelled = false;
    let index = 0;
    const CHUNK_SIZE = 50;

    const processChunk = () => {
      if (isCancelled) return;

      const chunk = normalized.slice(index, index + CHUNK_SIZE);
      if (chunk.length === 0) {
        setRows(validated);
        setIsProcessing(false);
        return;
      }

      const chunkValidated = engine.validateBatch(chunk, {
        allRows: normalized,
        columnMapping: dummyMapping
      });
      validated.push(...chunkValidated);
      index += CHUNK_SIZE;

      setTimeout(processChunk, 0);
    };

    processChunk();

    return () => {
      isCancelled = true;
    };
  }, [rawRows]);

  // Derived state
  const summary = useMemo(() => {
    return {
      total: rows.length,
      valid: rows.filter(r => r.status === 'valid').length,
      caution: rows.filter(r => r.status === 'caution').length,
      needs_review: rows.filter(r => r.status === 'needs_review').length,
      rejected: rows.filter(r => r.status === 'rejected').length,
    };
  }, [rows]);

  const ruleFrequencies = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(r => {
      // Create a set of ruleIds for this row so we only count a rule once per row
      const rowRuleIds = new Set(r.issues.map(i => i.ruleId));
      rowRuleIds.forEach(ruleId => {
        counts.set(ruleId, (counts.get(ruleId) || 0) + 1);
      });
    });
    // Sort by count descending
    return Array.from(counts.entries()).map(([ruleId, count]) => ({ ruleId, count })).sort((a, b) => b.count - a.count);
  }, [rows]);

  const typeDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach(r => {
      const type = r.normalizedQuestion?.type || 'UNKNOWN';
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([type, count]) => ({ type, count }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Status filter
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;

      // Rule filter
      if (selectedRuleId !== 'all') {
        const hasRule = r.issues.some(i => i.ruleId === selectedRuleId);
        if (!hasRule) return false;
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const stem = (r.normalizedQuestion && 'stem' in r.normalizedQuestion ? r.normalizedQuestion.stem : r.normalizedQuestion?.type === 'UNKNOWN' ? r.normalizedQuestion.rawStem : '')?.toLowerCase() || '';
        const rawValues = Object.values(r.rawRow || {}).join(' ').toLowerCase();
        if (!stem.includes(q) && !rawValues.includes(q)) return false;
      }

      return true;
    });
  }, [rows, filterStatus, selectedRuleId, searchQuery]);

  const selectedRow = useMemo(() => {
    if (!selectedRowId) return null;
    return rows.find(r => r.id === selectedRowId) || null;
  }, [rows, selectedRowId]);

  return {
    rows,
    isProcessing,
    summary,
    filteredRows,
    ruleFrequencies,
    typeDistribution,

    // UI State
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedRuleId,
    setSelectedRuleId,
    selectedRowId,
    setSelectedRowId,
    selectedRow
  };
}

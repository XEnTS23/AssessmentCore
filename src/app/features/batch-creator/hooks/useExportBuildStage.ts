import { useState, useCallback, useMemo } from 'react';
import { QuestionRow, RawSheetRow } from '../core/rowTypes';
import { ExportConfig } from '../core/exportTypes';
import { buildAndPackage, PackageResult } from '../export/packageBuilder';
import { renderAllPreviews, QuestionPreview } from '../preview/questionPreviewRenderer';
import { renderStudentPreviewHtml } from '../preview/studentPreviewEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BuildStatus = 'idle' | 'building' | 'success' | 'error';

export interface UseExportBuildStageReturn {
  buildStatus: BuildStatus;
  packageResult: PackageResult | null;
  previews: QuestionPreview[];
  selectedPreviewIndex: number;
  selectedArtifactIndex: number;
  activeTab: 'student' | 'raw';
  selectedPreview: QuestionPreview | null;
  selectedArtifact: { fileName: string; data: string } | null;
  studentPreviewHtml: string;
  rows: QuestionRow[];
  runBuild: (config: ExportConfig) => Promise<void>;
  triggerDownload: () => void;
  selectPreview: (index: number) => void;
  selectArtifact: (index: number) => void;
  updateArtifact: (fileName: string, newData: string) => void; // TEMP: For XML editing feature
  setActiveTab: (tab: 'student' | 'raw') => void;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

import { DEFAULT_EXPORT_CONFIG } from '../configuration/defaultExportConfig';

export function useExportBuildStage(inputRows: QuestionRow[] = [], config: ExportConfig = DEFAULT_EXPORT_CONFIG): UseExportBuildStageReturn {
  const [buildStatus, setBuildStatus] = useState<BuildStatus>('idle');
  const [packageResult, setPackageResult] = useState<PackageResult | null>(null);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'student' | 'raw'>('student');
  const [refreshKey, setRefreshKey] = useState(0);

  const rows = useMemo<QuestionRow[]>(() => {
    return inputRows;
  }, [inputRows]);

  const previews = useMemo(() => renderAllPreviews(rows), [rows]);
  const selectedPreview = previews[selectedPreviewIndex] ?? null;

  const studentPreviewHtml = useMemo(() => {
    const row = rows[selectedPreviewIndex];
    if (!row) return '';
    
    // TEMP FEATURE: Parse edited XML to reflect basic changes (stem, options) in Student View
    let tempRow = row;
    const currentXml = packageResult?.validatedArtifacts?.find(a => row.metadata?.questionId && a.fileName.includes(row.metadata.questionId))?.data;
    
    if (typeof currentXml === 'string' && currentXml.includes('<assessmentItem')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentXml, 'text/xml');
        const promptNode = doc.querySelector('prompt') || doc.querySelector('itemBody > p');
        const choices = doc.querySelectorAll('simpleChoice');
        const correctValues = doc.querySelectorAll('correctResponse value');
        const mapEntry = doc.querySelector('mapEntry');
        
        if (promptNode || choices.length > 0 || correctValues.length > 0 || mapEntry) {
          tempRow = JSON.parse(JSON.stringify(row));
          
          if (mapEntry && mapEntry.hasAttribute('mappedValue')) {
            const parsedMarks = parseFloat(mapEntry.getAttribute('mappedValue') || '1');
            if (!isNaN(parsedMarks) && tempRow.scoringConfig) {
              tempRow.scoringConfig.marks = parsedMarks;
            }
          }

          if (tempRow.normalizedQuestion) {
            if (promptNode) {
              tempRow.normalizedQuestion.stem = promptNode.innerHTML.trim() || promptNode.textContent || '';
            }
            if (choices.length > 0 && tempRow.normalizedQuestion.options) {
               Array.from(choices).forEach(choice => {
                 const id = choice.getAttribute('identifier');
                 const option = tempRow.normalizedQuestion.options?.find((o: any) => o.id === id);
                 if (option) {
                   option.text = choice.innerHTML.trim() || choice.textContent || '';
                 }
               });
            }
            if (correctValues.length > 0) {
               const vals = Array.from(correctValues).map(v => v.textContent || '');
               if (tempRow.normalizedQuestion.type === 'MCQ') {
                 tempRow.normalizedQuestion.correctAnswerId = vals[0];
               } else if (tempRow.normalizedQuestion.type === 'MSQ') {
                 tempRow.normalizedQuestion.correctAnswerIds = vals;
               } else if (tempRow.normalizedQuestion.type === 'TEXT_ENTRY') {
                 tempRow.normalizedQuestion.acceptedAnswers = vals;
               } else if (tempRow.normalizedQuestion.type === 'ORDER') {
                 tempRow.normalizedQuestion.correctSequenceIds = vals;
               }
            }
          }
        }
      } catch (e) {
        // Ignore XML parsing errors for temp feature
      }
    }

    return renderStudentPreviewHtml(tempRow, config);
  }, [rows, selectedPreviewIndex, config, refreshKey, packageResult?.validatedArtifacts]);

  const selectedArtifact = useMemo(() => {
    const artifacts = packageResult?.validatedArtifacts ?? [];
    const a = artifacts[selectedArtifactIndex];
    if (!a || typeof a.data !== 'string') return null;
    return { fileName: a.fileName, data: a.data };
  }, [packageResult, selectedArtifactIndex]);

  const runBuild = useCallback(async (config: ExportConfig) => {
    setBuildStatus('building');
    setPackageResult(null);
    setRefreshKey(prev => prev + 1);
    try {
      const result = await buildAndPackage(rows, config);
      setPackageResult(result);
      setBuildStatus(result.isDownloadReady ? 'success' : 'error');
      setSelectedArtifactIndex(0);
    } catch (e: any) {
      setPackageResult({
        buildResult: { success: false, artifacts: [], warnings: [], errors: [{ code: 'BUILD_EXCEPTION', message: e?.message ?? String(e) }] },
        validatedArtifacts: [],
        validationErrors: [{ code: 'BUILD_EXCEPTION', message: e?.message ?? String(e) }],
        validationWarnings: [],
        downloadBlob: null,
        downloadFileName: '',
        isDownloadReady: false,
      });
      setBuildStatus('error');
    }
  }, [rows]);

  const triggerDownload = useCallback(() => {
    if (!packageResult?.downloadBlob || !packageResult.downloadFileName) return;
    const url = URL.createObjectURL(packageResult.downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = packageResult.downloadFileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, [packageResult]);

  const selectPreview = useCallback((index: number) => {
    setSelectedPreviewIndex(index);
    if (packageResult?.validatedArtifacts) {
      const row = rows[index];
      if (row && row.metadata?.questionId) {
        const qid = row.metadata.questionId;
        const artifactIndex = packageResult.validatedArtifacts.findIndex(a => a.fileName.includes(qid));
        if (artifactIndex !== -1) {
          setSelectedArtifactIndex(artifactIndex);
        }
      }
    }
  }, [rows, packageResult]);

  const selectArtifact = useCallback((index: number) => setSelectedArtifactIndex(index), []);

  // TEMP FEATURE: Update artifact data so changes reflect when toggling back
  const updateArtifact = useCallback((fileName: string, newData: string) => {
    setPackageResult(prev => {
      if (!prev) return prev;
      const updatedArtifacts = prev.validatedArtifacts.map(a =>
        a.fileName === fileName ? { ...a, data: newData } : a
      );
      return {
        ...prev,
        validatedArtifacts: updatedArtifacts
      };
    });
  }, []);

  const reset = useCallback(() => {
    setBuildStatus('idle');
    setPackageResult(null);
    setSelectedPreviewIndex(0);
    setSelectedArtifactIndex(0);
    setActiveTab('student');
  }, []);

  return {
    buildStatus, packageResult, previews, selectedPreviewIndex, selectedArtifactIndex,
    activeTab, selectedPreview, selectedArtifact, studentPreviewHtml, rows,
    runBuild, triggerDownload, selectPreview, selectArtifact, updateArtifact, setActiveTab, reset,
  };
}

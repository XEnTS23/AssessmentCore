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

  const rows = useMemo<QuestionRow[]>(() => {
    return inputRows;
  }, [inputRows]);

  const previews = useMemo(() => renderAllPreviews(rows), [rows]);
  const selectedPreview = previews[selectedPreviewIndex] ?? null;

  const studentPreviewHtml = useMemo(() => {
    const row = rows[selectedPreviewIndex];
    if (!row) return '';
    return renderStudentPreviewHtml(row, config);
  }, [rows, selectedPreviewIndex, config]);

  const selectedArtifact = useMemo(() => {
    const artifacts = packageResult?.validatedArtifacts ?? [];
    const a = artifacts[selectedArtifactIndex];
    if (!a || typeof a.data !== 'string') return null;
    return { fileName: a.fileName, data: a.data };
  }, [packageResult, selectedArtifactIndex]);

  const runBuild = useCallback(async (config: ExportConfig) => {
    setBuildStatus('building');
    setPackageResult(null);
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
    runBuild, triggerDownload, selectPreview, selectArtifact, setActiveTab, reset,
  };
}

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Play, Download, FileCode2, Eye, AlertTriangle,
  CheckCircle2, XCircle, Loader2, FileJson, File, ChevronRight,
  Info, RefreshCw, Edit2, Save,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ExportConfig } from '../core/exportTypes';
import { DEFAULT_EXPORT_CONFIG } from '../configuration/defaultExportConfig';
import { useExportBuildStage, BuildStatus } from '../hooks/useExportBuildStage';
import { QuestionPreview } from '../preview/questionPreviewRenderer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  json: 'Raw JSON',
  qti_2_1: 'QTI 2.1',
  qti_3_0: 'QTI 3.0',
  custom_lms: 'Custom LMS',
};

const STATUS_COLORS: Record<BuildStatus, string> = {
  idle: 'text-muted-foreground',
  building: 'text-primary',
  success: 'text-success',
  error: 'text-destructive',
};

function ArtifactIcon({ fileName }: { fileName: string }) {
  if (fileName.endsWith('.json')) return <FileJson className="h-3.5 w-3.5 shrink-0 text-amber-500" />;
  if (fileName.endsWith('.xml')) return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-violet-500" />;
  return <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    MCQ: 'bg-violet-100 text-violet-700',
    MSQ: 'bg-blue-100 text-blue-700',
    TEXT_ENTRY: 'bg-teal-100 text-teal-700',
  };
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${colors[type] ?? 'bg-muted text-muted-foreground'}`}>
      {type}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BuildPreviewStage({ wizard, upload }: { wizard: any; upload: any }) {
  // Grab the config that was saved during ConfigureStage (passed via wizard context or stored globally).
  // For now we read it from wizard's __mockCompletionMap extras or fall back to default.
  const savedConfig: ExportConfig = wizard.__exportConfig ?? DEFAULT_EXPORT_CONFIG;
  const sourceRows = wizard.__processedRows.length > 0 ? wizard.__processedRows : upload.output?.rawRows ?? [];

  const stage = useExportBuildStage(sourceRows, savedConfig);

  // Mark wizard stage complete once download is ready
  useEffect(() => {
    wizard.__mockSetComplete('BUILD_PREVIEW', stage.packageResult?.isDownloadReady ?? false);
  }, [stage.packageResult?.isDownloadReady, wizard]);

  // TEMP: State for XML editing feature
  const [isEditingRaw, setIsEditingRaw] = useState(false);
  const [editedRawContent, setEditedRawContent] = useState('');

  // Reset edit state when changing artifacts
  useEffect(() => {
    setIsEditingRaw(false);
    setEditedRawContent('');
  }, [stage.selectedArtifact?.fileName]);

  const handleEditClick = () => {
    if (!stage.selectedArtifact) return;
    setEditedRawContent(stage.selectedArtifact.data);
    setIsEditingRaw(true);
  };

  const handleSaveClick = () => {
    if (!stage.selectedArtifact) return;
    stage.updateArtifact(stage.selectedArtifact.fileName, editedRawContent);
    setIsEditingRaw(false);
  };

  const artifacts = stage.packageResult?.validatedArtifacts ?? [];
  const hasWarnings = (stage.packageResult?.validationWarnings.length ?? 0) > 0;
  const hasErrors = (stage.packageResult?.validationErrors.length ?? 0) > 0;

  return (
    <div className="flex h-full flex-col bg-background text-sm overflow-hidden">

      {/* ── Footer Portal ─────────────────────────────────────────────────────── */}
      {document.getElementById('wizard-footer-right') && createPortal(
        <>
          {/* Config summary pill */}
          <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground mr-2">
            <span className="font-medium text-foreground">{TARGET_LABELS[savedConfig.target] ?? savedConfig.target}</span>
            <span>·</span>
            <span>{savedConfig.mathMode.toUpperCase()}</span>
            <span>·</span>
            <span>{savedConfig.scoring.mode}</span>
          </div>

          {/* Build button */}
          {stage.buildStatus !== 'building' ? (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => stage.runBuild(savedConfig)}
              disabled={stage.rows.length === 0}
            >
              {stage.buildStatus === 'idle' ? (
                <><Play className="h-3.5 w-3.5" /> Build</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5" /> Rebuild</>
              )}
            </Button>
          ) : (
            <Button size="sm" className="h-8 gap-1.5 text-xs" disabled>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building…
            </Button>
          )}

          {/* Download button */}
          <Button
            size="sm"
            variant={stage.packageResult?.isDownloadReady ? 'default' : 'outline'}
            className="h-8 gap-1.5 text-xs"
            onClick={stage.triggerDownload}
            disabled={!stage.packageResult?.isDownloadReady}
          >
            <Download className="h-3.5 w-3.5" />
            {stage.packageResult?.downloadFileName
              ? stage.packageResult.downloadFileName.endsWith('.zip') ? 'Download ZIP' : 'Download'
              : 'Download'}
          </Button>
        </>,
        document.getElementById('wizard-footer-right')!
      )}

      {/* ── Body (3-column layout) ───────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Column 1: Question list */}
        <div className="w-56 shrink-0 border-r flex flex-col overflow-hidden bg-background">
          <div className="px-4 py-3 border-b text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Questions ({stage.rows.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {stage.previews.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">No rows loaded.</p>
            ) : (
              stage.previews.map((p, i) => (
                <button
                  key={p.questionId + i}
                  onClick={() => stage.selectPreview(i)}
                  className={`w-full text-left px-3 py-2.5 border-b transition-colors flex items-start gap-2 ${i === stage.selectedPreviewIndex
                    ? 'bg-primary/8 border-l-2 border-l-primary'
                    : 'hover:bg-muted/40'
                    }`}
                >
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5 w-5">
                    {p.rowNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <TypeBadge type={p.typeLabel.split(' ')[0]} />
                    </div>
                    <p className="text-[11px] text-foreground truncate leading-snug">{p.stem || '—'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Preview pane */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r">
          {/* Tab bar */}
          <div className="flex items-center border-b px-4 gap-3 shrink-0 h-10">
            <button
              onClick={() => stage.setActiveTab('student')}
              className={`text-xs py-2 border-b-2 transition-colors ${stage.activeTab === 'student' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Eye className="h-3.5 w-3.5 inline mr-1" />Student View
            </button>
            <button
              onClick={() => stage.setActiveTab('raw')}
              className={`text-xs py-2 border-b-2 transition-colors ${stage.activeTab === 'raw' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <FileCode2 className="h-3.5 w-3.5 inline mr-1" />Raw Output
            </button>
          </div>

          {stage.activeTab === 'student' ? (
            <div className="flex-1 overflow-hidden">
              {stage.buildStatus === 'success' ? (
                stage.studentPreviewHtml ? (
                  <iframe
                    srcDoc={stage.studentPreviewHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts"
                    title="Student question preview"
                  />
                ) : (
                  <EmptyState icon={<Eye className="h-8 w-8" />} text="Select a question to preview." />
                )
              ) : (
                <EmptyState icon={<Package className="h-8 w-8" />} text="Click Build to generate the artifacts. The preview will be available once the build succeeds." />
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">

              <div className="flex-1 overflow-auto bg-[#0d1117] text-[#c9d1d9] font-mono text-xs p-4 leading-relaxed relative">
                {/* TEMP: XML Edit Button (Requested by User to be removed later) */}
                {stage.buildStatus === 'success' && stage.selectedArtifact && stage.selectedArtifact.fileName.endsWith('.xml') && (
                  <div className="absolute top-4 right-4">
                    {isEditingRaw ? (
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={handleSaveClick}>
                        <Save className="h-3 w-3" /> Save
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={handleEditClick}>
                        <Edit2 className="h-3 w-3" /> Edit XML
                      </Button>
                    )}
                  </div>
                )}

                {stage.buildStatus === 'idle' && (
                  <p className="text-[#8b949e]">Click <strong>Build</strong> to generate artifacts.</p>
                )}
                {stage.buildStatus === 'building' && (
                  <p className="text-[#8b949e] animate-pulse">Generating artifacts…</p>
                )}
                {(stage.buildStatus === 'success' || stage.buildStatus === 'error') && stage.selectedArtifact ? (
                  isEditingRaw ? (
                    <textarea
                      className="w-full h-full bg-transparent text-[#c9d1d9] outline-none resize-none font-mono text-xs"
                      value={editedRawContent}
                      onChange={(e) => setEditedRawContent(e.target.value)}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap break-all">{stage.selectedArtifact.data}</pre>
                  )
                ) : (stage.buildStatus === 'error' && !stage.selectedArtifact) ? (
                  <p className="text-red-400">Build failed. See error panel below.</p>
                ) : null}
              </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground p-8">
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">{icon}</div>
      <p className="text-xs text-center">{text}</p>
    </div>
  );
}

function StatusCard({ buildStatus }: { buildStatus: BuildStatus }) {
  const icons: Record<BuildStatus, React.ReactNode> = {
    idle: <Package className="h-4 w-4 text-muted-foreground" />,
    building: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
    success: <CheckCircle2 className="h-4 w-4 text-success" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
  };
  const labels: Record<BuildStatus, string> = {
    idle: 'Not built yet',
    building: 'Building artifacts…',
    success: 'Build succeeded — ready to download',
    error: 'Build failed — fix errors above',
  };
  return (
    <div className={`flex items-center gap-2 rounded-lg border p-3 ${buildStatus === 'success' ? 'bg-success/5 border-success/20' :
      buildStatus === 'error' ? 'bg-destructive/5 border-destructive/20' :
        buildStatus === 'building' ? 'bg-primary/5 border-primary/20' :
          'bg-muted/30 border-border'
      }`}>
      {icons[buildStatus]}
      <span className={`text-xs font-medium ${STATUS_COLORS[buildStatus]}`}>{labels[buildStatus]}</span>
    </div>
  );
}

function PreviewCard({ preview }: { preview: QuestionPreview }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <TypeBadge type={preview.typeLabel.split(' ')[0]} />
        <span className="font-mono text-[10px] text-muted-foreground truncate">{preview.questionId}</span>
      </div>
      <p className="text-foreground line-clamp-3 leading-relaxed">{preview.stem || '—'}</p>
      {preview.optionLines.length > 0 && (
        <ul className="space-y-1 mt-1">
          {preview.optionLines.map(o => (
            <li key={o.label} className={`flex items-start gap-1.5 ${o.isCorrect ? 'text-success font-medium' : 'text-muted-foreground'}`}>
              <span className="font-bold shrink-0">{o.label}.</span>
              <span className="truncate">{o.text}</span>
              {o.isCorrect && <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
        <span>Answer: <strong className="text-foreground">{preview.answerSummary}</strong></span>
        <span>{preview.marks} mark{preview.marks !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

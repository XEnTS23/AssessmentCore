import React, { useState, useMemo } from 'react';
import { Settings, Info, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Input } from '../../../components/ui/input';
import { ExportConfig } from '../core/exportTypes';
import { DEFAULT_EXPORT_CONFIG } from '../configuration/defaultExportConfig';
import { validateExportConfig } from '../configuration/exportConfigValidation';
import { checkExportReadiness } from '../rules/exportReadiness.rules';
import { normalizeRow } from '../normalization/normalizeRow';
import { ColumnMapping } from '../normalization/normalizeAnswer';

export function ConfigureStage({ wizard, upload }: { wizard: any, upload: any }) {
  // Local state for the configuration in this stage
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);

  const validation = useMemo(() => validateExportConfig(config), [config]);

  // Mock mapping (in a real app this would come from a previous stage)
  const dummyMapping: ColumnMapping = useMemo(() => ({
    stem: 'stem',
    correctAnswer: 'answer',
    type: 'type',
  }), []);

  // Use the processed rows from Manual Fix stage, or fallback to raw if skipped
  const rows = useMemo(() => {
    if (wizard.__processedRows && wizard.__processedRows.length > 0) {
      return wizard.__processedRows;
    }
    if (!upload?.output?.rawRows) return [];
    return upload.output.rawRows.map((r: any) => normalizeRow(r, dummyMapping));
  }, [upload, dummyMapping, wizard.__processedRows]);

  const readiness = useMemo(() => checkExportReadiness(config, rows), [config, rows]);

  const isReadyToExport = validation.isValid && readiness.isReady;

  // Sync validity with the wizard to enable/disable "Next"
  React.useEffect(() => {
    wizard.__mockSetComplete('CONFIGURE', isReadyToExport);
    // Also persist config so BuildPreviewStage can read it
    wizard.__setExportConfig?.(config);
  }, [isReadyToExport, config, wizard]);

  return (
    <div className="flex h-full flex-col bg-background text-sm">


      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl">

        {/* Readiness and Validation Errors */}
        {(!validation.isValid || !readiness.isReady) && (
          <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-md space-y-2">
            <h4 className="text-destructive font-semibold text-xs uppercase flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Export Blockers
            </h4>
            <ul className="list-disc pl-5 text-destructive/90 text-sm space-y-1">
              {validation.errors.map((err, i) => <li key={`cfg-err-${i}`}>{err}</li>)}
              {readiness.issues.filter(i => i.severity === 'block').map(issue => (
                <li key={issue.id}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {(validation.warnings.length > 0 || readiness.issues.some(i => i.severity === 'warning')) && (
          <div className="p-4 border border-warning/20 bg-warning/5 rounded-md space-y-2">
            <h4 className="text-warning font-semibold text-xs uppercase flex items-center gap-1.5">
              <Info className="h-4 w-4" /> Notices & Warnings
            </h4>
            <ul className="list-disc pl-5 text-warning-foreground text-sm space-y-1">
              {validation.warnings.map((warn, i) => <li key={`cfg-warn-${i}`}>{warn}</li>)}
              {readiness.issues.filter(i => i.severity === 'warning').map(issue => (
                <li key={issue.id}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Target & Formats */}
          <section className="space-y-4 border rounded-lg p-5 bg-card shadow-sm">
            <h3 className="font-semibold text-base border-b pb-2">Format & Target</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Export Target LMS / Standard</label>
              <Select value={config.target} onValueChange={(v: any) => setConfig({ ...config, target: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qti_2_1">QTI 2.1 (Canvas, Moodle)</SelectItem>
                  <SelectItem value="qti_3_0">QTI 3.0</SelectItem>
                  <SelectItem value="json">Raw JSON (API / DB)</SelectItem>
                  <SelectItem value="custom_lms">Custom LMS Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Package Structure</label>
              <Select value={config.packageStructure} onValueChange={(v: any) => setConfig({ ...config, packageStructure: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessment">Fixed Assessment / Quiz</SelectItem>
                  <SelectItem value="bank">Item Bank (Pool)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Media Handling Strategy</label>
              <Select value={config.mediaMode} onValueChange={(v: any) => setConfig({ ...config, mediaMode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep_public_url">Keep Public URLs (Live linking)</SelectItem>
                  <SelectItem value="download_and_package">Download & Package (Zip)</SelectItem>
                  <SelectItem value="upload_to_storage" disabled>Upload to Cloud Storage (Coming soon)</SelectItem>
                  <SelectItem value="custom_lms_reference">LMS Internal References</SelectItem>
                  <SelectItem value="base64_inline">Base64 Inline Encode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Math & Formula Mode</label>
              <Select value={config.mathMode} onValueChange={(v: any) => setConfig({ ...config, mathMode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latex">Raw LaTeX</SelectItem>
                  <SelectItem value="mathml">MathML (Standard)</SelectItem>
                  <SelectItem value="mathjax">MathJax Script tags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Metadata Inclusion</label>
              <Select value={config.metadataMode} onValueChange={(v: any) => setConfig({ ...config, metadataMode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="include_all">Include All Metadata</SelectItem>
                  <SelectItem value="include_selected">Include Selected Only</SelectItem>
                  <SelectItem value="exclude">Exclude All Metadata</SelectItem>
                  <SelectItem value="strict_mapping">Strict Mapping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Scoring & Behaviors */}
          <section className="space-y-4 border rounded-lg p-5 bg-card shadow-sm">
            <h3 className="font-semibold text-base border-b pb-2">Scoring & Behaviors</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Feedback & Rationales</label>
              <Select value={config.feedbackMode} onValueChange={(v: any) => setConfig({ ...config, feedbackMode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_attempt">Include as post-attempt feedback</SelectItem>
                  <SelectItem value="hints">Include as hints</SelectItem>
                  <SelectItem value="strip">Strip from export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <label className="text-sm font-medium">Global Option Shuffling</label>
                <p className="text-xs text-muted-foreground">Randomize MCQ/MSQ options globally</p>
              </div>
              <Switch
                checked={config.shuffleOptions}
                onCheckedChange={(c) => setConfig({ ...config, shuffleOptions: c })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Scoring Complexity</label>
              <Select
                value={config.scoring.mode}
                onValueChange={(v: any) => setConfig({ ...config, scoring: { ...config.scoring, mode: v } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (Right/Wrong)</SelectItem>
                  <SelectItem value="advanced">Advanced (Partial/Negative)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.scoring.mode === 'advanced' && (
              <>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Enable Partial Marking (MSQ)</label>
                    <Switch
                      checked={config.scoring.partialMarking.enabled}
                      onCheckedChange={(c) => setConfig({
                        ...config,
                        scoring: {
                          ...config.scoring,
                          partialMarking: { ...config.scoring.partialMarking, enabled: c }
                        }
                      })}
                    />
                  </div>
                  {config.scoring.partialMarking.enabled && (
                    <Select
                      value={config.scoring.partialMarking.strategy}
                      onValueChange={(v: any) => setConfig({
                        ...config,
                        scoring: {
                          ...config.scoring,
                          partialMarking: { ...config.scoring.partialMarking, strategy: v }
                        }
                      })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="proportional">Proportional (+ fraction per correct)</SelectItem>
                        <SelectItem value="right_minus_wrong">Right minus Wrong</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Enable Negative Marking</label>
                    <Switch
                      checked={config.scoring.negativeMarking.enabled}
                      onCheckedChange={(c) => setConfig({
                        ...config,
                        scoring: {
                          ...config.scoring,
                          negativeMarking: { ...config.scoring.negativeMarking, enabled: c }
                        }
                      })}
                    />
                  </div>
                  {config.scoring.negativeMarking.enabled && (
                    <div className="flex gap-2">
                      <Select
                        value={config.scoring.negativeMarking.valueSource}
                        onValueChange={(v: any) => setConfig({
                          ...config,
                          scoring: {
                            ...config.scoring,
                            negativeMarking: { ...config.scoring.negativeMarking, valueSource: v }
                          }
                        })}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Global Value</SelectItem>
                          <SelectItem value="metadata">From Row Metadata</SelectItem>
                        </SelectContent>
                      </Select>
                      {config.scoring.negativeMarking.valueSource === 'global' && (
                        <Input
                          type="number"
                          placeholder="Penalty (e.g. 0.25)"
                          className="h-8 text-xs w-32"
                          value={config.scoring.negativeMarking.globalValue || ''}
                          onChange={(e) => setConfig({
                            ...config,
                            scoring: {
                              ...config.scoring,
                              negativeMarking: { ...config.scoring.negativeMarking, globalValue: parseFloat(e.target.value) || 0 }
                            }
                          })}
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Score Floor (Minimum score)</label>
                    <Input
                      type="number"
                      placeholder="Floor (e.g. 0)"
                      className="h-8 text-xs w-20"
                      value={config.scoring.scoreFloor ?? ''}
                      onChange={(e) => setConfig({
                        ...config,
                        scoring: {
                          ...config.scoring,
                          scoreFloor: e.target.value === '' ? undefined : parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-3 pt-4 border-t">
              <label className="text-xs font-medium text-muted-foreground">Time Limit</label>
              <Select
                value={config.timeLimitMode}
                onValueChange={(v: any) => setConfig({ ...config, timeLimitMode: v, timeLimitValue: v === 'none' ? undefined : config.timeLimitValue })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="global">Global (Assessment Total)</SelectItem>
                  <SelectItem value="per_question">Per Question</SelectItem>
                </SelectContent>
              </Select>
              {config.timeLimitMode !== 'none' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Minutes"
                    className="h-8 text-xs"
                    value={config.timeLimitValue || ''}
                    onChange={(e) => setConfig({ ...config, timeLimitValue: parseFloat(e.target.value) })}
                  />
                  <span className="text-xs text-muted-foreground">minutes</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

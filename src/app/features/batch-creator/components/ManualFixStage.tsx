import React, { useEffect, useState } from 'react';
import { Search, AlertTriangle, ShieldCheck, Undo2, Wrench, ChevronRight, ChevronLeft, XCircle, AlertCircle, Info, Image as ImageIcon, Sparkles, Download } from 'lucide-react';
import { useManualFixStage, FixFilterStatus } from '../hooks/useManualFixStage';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { ValidationIssue } from '../core/issueTypes';
import { FixSuggestion } from '../core/fixTypes';
import { EditorFormState } from '../fixing/manualFixEngine';
import { downloadCorrectedSheet } from '../export/correctedSheetBuilder';

export function ManualFixStage({ upload, wizard }: { upload: any, wizard: any }) {
  const fixStage = useManualFixStage(upload.output?.rawRows, wizard.exportConfig);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [fixStage.filteredRows.length, fixStage.filterStatus, fixStage.searchQuery]);

  const totalPages = Math.ceil(fixStage.filteredRows.length / pageSize);
  const paginatedRows = fixStage.filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!fixStage.isProcessing && fixStage.rows.length > 0) {
      // Complete if there are no rejected/blocking rows left
      const isComplete = fixStage.summary.rejected === 0;
      wizard.__mockSetComplete('MANUAL_FIX', isComplete);
    } else {
      wizard.__mockSetComplete('MANUAL_FIX', false);
    }
  }, [fixStage.isProcessing, fixStage.rows.length, fixStage.summary.rejected, wizard]);

  // Sync rows down the pipeline for the next stages
  useEffect(() => {
    wizard.__setProcessedRows(fixStage.rows);
  }, [fixStage.rows, wizard]);

  if (fixStage.isProcessing) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Running Cleaning & Suggestion Engines...</p>
      </div>
    );
  }

  if (fixStage.rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Wrench className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No Rows to Fix</h2>
        <p className="text-sm text-muted-foreground">Please complete the upload stage first.</p>
      </div>
    );
  }

  const {
    summary,
    filteredRows,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    selectedRowId,
    selectedRow,
    selectedRowSuggestions,
    editorState,
    setEditorState,
    autoFixedRowIds,
    selectRow,
    saveEdit,
    handleApplySuggestion,
    undoLastEdit,
    canUndo,
  } = fixStage;

  return (
    <div className="flex h-full bg-background text-sm">
      {/* ── Left Panel (Row List) ──────────────────────────────────────── */}
      <div className="flex w-1/3 flex-col border-r bg-background shrink-0">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Issue Rows</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {filteredRows.length} / {fixStage.rows.length} rows
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-[10px] px-2"
                onClick={() => downloadCorrectedSheet(fixStage.rows)}
                disabled={fixStage.rows.length === 0}
                title="Download corrected sheet as CSV"
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs border border-input rounded-md"
            />
          </div>
          <div className="flex rounded-md border overflow-hidden text-[10px] w-full">
            {(['all', 'rejected', 'needs_review', 'caution', 'valid'] as FixFilterStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 py-1 capitalize transition-colors ${filterStatus === status
                  ? 'bg-foreground text-background font-medium'
                  : 'bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
              >
                {status === 'needs_review' ? 'Review' : status}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {paginatedRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No issues matching the current filters.
            </div>
          ) : paginatedRows.map(row => {
            const isSelected = row.id === selectedRowId;
            const hasBlock = row.issues.some(i => i.severity === 'block');
            const hasReview = row.issues.some(i => i.severity === 'review');
            const hasWarning = row.issues.some(i => i.severity === 'warning');
            const isAutoFixed = autoFixedRowIds.has(row.id);
            
            let statusIcon = <ShieldCheck className="h-4 w-4 text-success" />;
            if (hasBlock) statusIcon = <XCircle className="h-4 w-4 text-destructive" />;
            else if (hasReview) statusIcon = <AlertCircle className="h-4 w-4 text-primary" />;
            else if (hasWarning) statusIcon = <AlertTriangle className="h-4 w-4 text-warning" />;
            else if (isAutoFixed) statusIcon = <Sparkles className="h-4 w-4 text-[#9b87f5]" />;

            const rowNumber = row.sourceRowNumber;
            const stem = (row.normalizedQuestion && 'stem' in row.normalizedQuestion) 
              ? row.normalizedQuestion.stem 
              : row.normalizedQuestion?.type === 'UNKNOWN' ? row.normalizedQuestion.rawStem : '';

            return (
              <button
                key={row.id}
                onClick={() => selectRow(row.id)}
                className={`w-full text-left p-3 border-b flex items-start gap-3 transition-colors hover:bg-muted/30 ${isSelected ? 'bg-muted/50 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'}`}
              >
                <div className="mt-0.5 shrink-0">{statusIcon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs text-foreground">
                      Row {rowNumber}
                      {isAutoFixed && <span className="ml-2 text-[9px] uppercase font-bold text-[#9b87f5] bg-[#9b87f5]/10 px-1 rounded tracking-wider">Auto Fixed</span>}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{row.normalizedQuestion?.type || 'UNKNOWN'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{stem || 'No stem text...'}</p>
                  {row.issues.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {row.issues.slice(0, 2).map(issue => (
                        <span key={issue.id} className="text-[9px] px-1.5 py-0.5 rounded border uppercase text-muted-foreground truncate max-w-[120px]">
                          {issue.ruleId}
                        </span>
                      ))}
                      {row.issues.length > 2 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded border uppercase text-muted-foreground">
                          +{row.issues.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Pagination Controls */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-3 py-2">
          <div className="text-[10px] text-muted-foreground">
            {Math.min((currentPage - 1) * pageSize + 1, fixStage.filteredRows.length)} - {Math.min(currentPage * pageSize, fixStage.filteredRows.length)} of {fixStage.filteredRows.length}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <div className="text-[10px] font-medium px-1">
              {currentPage} / {totalPages || 1}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Editor) ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background/50 overflow-hidden">
        {selectedRow && editorState ? (
          <>
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-6 bg-background shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold">Editing Row {selectedRow.sourceRowNumber}</h3>
                <div className={`px-2 py-0.5 rounded text-xs font-medium uppercase
                  ${autoFixedRowIds.has(selectedRow.id) ? 'bg-[#9b87f5]/10 text-[#9b87f5]' :
                  selectedRow.status === 'valid' ? 'bg-success/10 text-success' :
                  selectedRow.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                  selectedRow.status === 'needs_review' ? 'bg-primary/10 text-primary' :
                  'bg-warning/10 text-warning'}`}
                >
                  {autoFixedRowIds.has(selectedRow.id) ? 'AUTO FIXED' : selectedRow.status.replace('_', ' ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={undoLastEdit} 
                  disabled={!canUndo}
                  className="h-8 px-3 text-xs"
                >
                  <Undo2 className="h-3.5 w-3.5 mr-1.5" />
                  Undo
                </Button>
                <Button 
                  size="sm" 
                  onClick={saveEdit}
                  className="h-8 px-4 text-xs"
                >
                  Save & Validate
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Validation Issues & Suggestions */}
              {selectedRow.issues.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Validation Issues ({selectedRow.issues.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedRow.issues.map(issue => (
                      <div key={issue.id} className="p-3 rounded-md border bg-card/50 text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold text-xs text-foreground block mb-1">{issue.ruleId}</span>
                            <span className="text-muted-foreground">{issue.message}</span>
                          </div>
                          <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-medium
                            ${issue.severity === 'block' ? 'bg-destructive/10 text-destructive' : 
                              issue.severity === 'review' ? 'bg-primary/10 text-primary' : 
                              'bg-warning/10 text-warning'}`}
                          >
                            {issue.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedRowSuggestions.length > 0 && (
                    <div className="mt-4 p-4 rounded-md border border-primary/20 bg-primary/5 space-y-3">
                      <h5 className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5" />
                        Suggested Fixes
                      </h5>
                      <div className="space-y-2">
                        {selectedRowSuggestions.map(sugg => (
                          <div key={sugg.id} className="flex items-center justify-between p-2 rounded border bg-background text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`h-2 w-2 rounded-full ${sugg.confidence === 'high' ? 'bg-success' : sugg.confidence === 'medium' ? 'bg-warning' : 'bg-destructive'}`}></span>
                              <span>{sugg.label}</span>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleApplySuggestion(sugg)}>
                              Apply
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Editor Form */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Manual Edit</h4>
                
                {/* Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Question Type</label>
                  <Select value={editorState.type} onValueChange={(val) => setEditorState({...editorState, type: val})}>
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                      <SelectItem value="MSQ">Multiple Select (MSQ)</SelectItem>
                      <SelectItem value="TEXT_ENTRY">Text Entry</SelectItem>
                      <SelectItem value="UNKNOWN">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Stem */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Question Stem</label>
                  <Textarea 
                    value={editorState.stem} 
                    onChange={e => setEditorState({...editorState, stem: e.target.value})}
                    className="min-h-[100px] font-mono text-sm border border-input rounded-md px-3 py-2"
                    placeholder="Enter question text here..."
                  />
                  {editorState.stem.includes('$') && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Info className="h-3 w-3" /> Math delimiters detected. They will be rendered in preview.
                    </p>
                  )}
                </div>

                {/* MCQ/MSQ Specifics */}
                {(editorState.type === 'MCQ' || editorState.type === 'MSQ') && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Options</label>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                        setEditorState({
                          ...editorState,
                          options: [...editorState.options, { id: crypto.randomUUID(), text: '' }]
                        })
                      }}>+ Add Option</Button>
                    </div>
                    
                    <div className="space-y-2">
                      {editorState.options.map((opt, i) => (
                        <div key={opt.id} className="flex items-start gap-3">
                          {editorState.type === 'MCQ' ? (
                            <div className="pt-2">
                              <input 
                                type="radio" 
                                name="mcq-answer" 
                                checked={editorState.correctAnswerId === opt.id}
                                onChange={() => setEditorState({...editorState, correctAnswerId: opt.id})}
                                className="w-4 h-4 cursor-pointer accent-primary"
                              />
                            </div>
                          ) : (
                            <div className="pt-2">
                              <Checkbox 
                                checked={editorState.correctAnswerIds.includes(opt.id)}
                                onCheckedChange={(checked) => {
                                  let newIds = [...editorState.correctAnswerIds];
                                  if (checked) {
                                    if (!newIds.includes(opt.id)) newIds.push(opt.id);
                                  } else {
                                    newIds = newIds.filter(id => id !== opt.id);
                                  }
                                  setEditorState({...editorState, correctAnswerIds: newIds});
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1 flex gap-2">
                            <div className="w-8 h-9 shrink-0 flex items-center justify-center bg-muted rounded border text-xs font-semibold">
                              {String.fromCharCode(65 + i)}
                            </div>
                            <Input 
                              value={opt.text}
                              onChange={e => {
                                const newOpts = [...editorState.options];
                                newOpts[i].text = e.target.value;
                                setEditorState({...editorState, options: newOpts});
                              }}
                              className="h-9 text-sm border border-input rounded-md px-3"
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            />
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => {
                                const newOpts = editorState.options.filter((_, idx) => idx !== i);
                                // also remove from correct answers if present
                                const newCorrectId = editorState.correctAnswerId === opt.id ? '' : editorState.correctAnswerId;
                                const newCorrectIds = editorState.correctAnswerIds.filter(id => id !== opt.id);
                                setEditorState({
                                  ...editorState, 
                                  options: newOpts,
                                  correctAnswerId: newCorrectId,
                                  correctAnswerIds: newCorrectIds
                                });
                              }}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {editorState.options.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No options defined.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Text Entry Specifics */}
                {editorState.type === 'TEXT_ENTRY' && (
                  <div className="space-y-4 border-t pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Validation Mode</label>
                        <Select value={editorState.textEntryMode} onValueChange={(val: any) => setEditorState({...editorState, textEntryMode: val})}>
                          <SelectTrigger className="w-full h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text (Exact/Case)</SelectItem>
                            <SelectItem value="numeric">Numeric (Tolerance)</SelectItem>
                            <SelectItem value="formula">Formula (LaTeX)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {editorState.textEntryMode === 'text' && (
                        <div className="space-y-2 pt-1.5 flex flex-col justify-end">
                          <div className="flex items-center gap-2 h-9">
                            <Checkbox 
                              id="case-sensitive" 
                              checked={editorState.caseSensitive} 
                              onCheckedChange={(c) => setEditorState({...editorState, caseSensitive: !!c})}
                            />
                            <label htmlFor="case-sensitive" className="text-sm">Case Sensitive</label>
                          </div>
                        </div>
                      )}

                      {editorState.textEntryMode === 'numeric' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">Tolerance (±)</label>
                          <Input 
                            type="number" 
                            step="any"
                            value={editorState.numericTolerance ?? ''}
                            onChange={(e) => setEditorState({...editorState, numericTolerance: e.target.value === '' ? undefined : Number(e.target.value)})}
                            className="h-9 text-sm border border-input rounded-md px-3"
                            placeholder="e.g. 0.01"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Accepted Answers (comma separated)</label>
                      <Textarea 
                        value={editorState.acceptedAnswers.join(', ')} 
                        onChange={e => setEditorState({...editorState, acceptedAnswers: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                        className="min-h-[80px] font-mono text-sm border border-input rounded-md px-3 py-2"
                        placeholder="val1, val2, val3..."
                      />
                    </div>
                  </div>
                )}

                {/* Media Preview (Readonly for now) */}
                {selectedRow.mediaReferences && selectedRow.mediaReferences.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                     <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                       <ImageIcon className="h-3.5 w-3.5" /> Media References
                     </label>
                     <div className="grid grid-cols-2 gap-2">
                       {selectedRow.mediaReferences.map(media => (
                         <div key={media.id} className="border rounded p-2 text-xs flex flex-col gap-2 bg-card">
                           <div className="flex items-center justify-between">
                             <span className="truncate text-muted-foreground" title={media.publicUrlSource}>{media.publicUrlSource}</span>
                             <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold
                               ${media.status === 'resolved' ? 'bg-success/10 text-success' : 
                                 media.status === 'failed' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}
                             >
                               {media.status}
                             </span>
                           </div>
                           {media.status === 'resolved' ? (
                             <div className="relative aspect-video rounded overflow-hidden bg-black/5 flex items-center justify-center">
                               {(() => {
                                 const url = media.resolvedUrl || media.publicUrlSource;
                                 const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
                                 return <img src={cacheBustedUrl} alt="Reference" className="max-w-full max-h-full object-contain" />;
                               })()}
                             </div>
                           ) : (
                             <div className="aspect-video rounded bg-destructive/5 border border-destructive/20 border-dashed flex items-center justify-center text-destructive/50 flex-col gap-1">
                               <ImageOff className="h-6 w-6" />
                               <span>Failed to load</span>
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                  </div>
                )}

              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <Wrench className="h-12 w-12 mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground mb-1">Manual Fix Editor</h3>
            <p className="text-sm max-w-sm">
              Select a row from the left panel to review its validation issues, apply suggested fixes, or edit fields manually.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ImageOff({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="2" x2="22" y1="2" y2="22" />
      <path d="M10.41 10.41a2 2 0 1 1-2.83-2.83" />
      <line x1="13.5" x2="6" y1="13.5" y2="21" />
      <line x1="18" x2="21" y1="12" y2="15" />
      <path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.05-.22 1.41-.59" />
      <path d="M21 15V5a2 2 0 0 0-2-2H9" />
    </svg>
  )
}

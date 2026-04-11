import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Loader2, CheckCircle2, XCircle, Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { auditRow, auditBatch, autoFixStem, type AuditIssue, type RowAuditResult } from '../../services/rowAuditService';
import { Progress } from './ui/progress';
import type { ValidationResult } from '../utils/questionValidator';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ISSUE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  grammar: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  logic:   { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  clarity: { bg: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200'    },
  factual: { bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200'   },
};

function AiStatusIcon({ result, loading }: { result: RowAuditResult | undefined; loading: boolean }) {
  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-[#003a9f]" />;
  if (!result)  return <Clock className="w-4 h-4 text-slate-400" />;
  if (result.status === 'ai_certified') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  return <XCircle className="w-4 h-4 text-red-500" />;
}

function Gate1Pill({ status }: { status: string }) {
  if (status === 'valid')
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-archivo">valid</span>;
  if (status === 'caution')
    return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-archivo">caution</span>;
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-archivo">rejected</span>;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AiAuditReviewerProps {
  results: ValidationResult[];
  onProceed: () => void;
  onSkip: () => void;
}

export function AiAuditReviewer({ results, onProceed, onSkip }: AiAuditReviewerProps) {
  const [auditResults, setAuditResults]   = useState<Map<string, RowAuditResult>>(new Map());
  const [loadingRows, setLoadingRows]     = useState<Set<string>>(new Set());
  const [editedStems, setEditedStems]     = useState<Map<string, string>>(new Map());
  const [selectedKey, setSelectedKey]     = useState<string | null>(results[0]?.rowKey ?? null);
  const [modalKey, setModalKey]           = useState<string | null>(null);
  const [isAuditingAll, setIsAuditingAll] = useState(false);
  const [isAutoFixing, setIsAutoFixing]   = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  // Ref-based concurrency lock — synchronous, unlike setState
  const isAuditingRef = useRef(false);

  // ── Audit helpers ───────────────────────────────────────────────────────

  function markLoading(rowKey: string, on: boolean) {
    setLoadingRows(prev => { const s = new Set(prev); on ? s.add(rowKey) : s.delete(rowKey); return s; });
  }

  async function runAudit(result: ValidationResult, stemOverride?: string) {
    if (!result.canonicalItem) return;
    const { rowKey, canonicalItem } = result;
    markLoading(rowKey, true);
    try {
      const auditResult = await auditRow(rowKey, canonicalItem, stemOverride ?? editedStems.get(rowKey));
      setAuditResults(prev => new Map(prev).set(rowKey, auditResult));
      // Auto-open modal on rejection so user sees feedback immediately
      if (auditResult.status === 'ai_rejected') setModalKey(rowKey);
    } finally {
      markLoading(rowKey, false);
    }
  }

  async function handleAuditAll() {
    // Synchronous guard — prevents double-fire before React re-renders the disabled button
    if (isAuditingRef.current) return;
    isAuditingRef.current = true;
    setIsAuditingAll(true);
    setBatchProgress({ done: 0, total: results.length });
    try {
      await auditBatch(results, (done, total, partial) => {
        setBatchProgress({ done, total });
        setAuditResults(new Map(partial));
      });
    } finally {
      setBatchProgress(null);
      setIsAuditingAll(false);
      isAuditingRef.current = false;
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────

  const certified = Array.from(auditResults.values()).filter(r => r.status === 'ai_certified').length;
  const rejected  = Array.from(auditResults.values()).filter(r => r.status === 'ai_rejected').length;
  const pending   = results.length - auditResults.size;

  const selectedResult  = results.find(r => r.rowKey === selectedKey);
  const selectedAudit   = selectedKey ? auditResults.get(selectedKey) : undefined;
  const selectedLoading = selectedKey ? loadingRows.has(selectedKey) : false;

  const modalResult  = results.find(r => r.rowKey === modalKey);
  const modalAudit   = modalKey ? auditResults.get(modalKey) : undefined;
  const modalStem    = modalKey ? (editedStems.get(modalKey) ?? modalResult?.canonicalItem?.stem ?? '') : '';
  const modalLoading = modalKey ? loadingRows.has(modalKey) : false;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable = !!target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isEditable || results.length === 0) return;

      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();

      const currentIndex = selectedKey ? results.findIndex((r) => r.rowKey === selectedKey) : -1;
      const base = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex = e.key === 'ArrowUp'
        ? Math.max(0, base - 1)
        : Math.min(results.length - 1, base + 1);

      setSelectedKey(results[nextIndex]?.rowKey ?? null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [results, selectedKey]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full font-archivo gap-0">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#111c2d] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#003a9f]" />
            AI Semantic Audit
          </h2>
          <p className="text-sm text-[#454652] mt-0.5">
            Gate 2 — Groq reviews grammar, logic, clarity &amp; factual accuracy
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm mr-2">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />{certified} certified
            </span>
            <span className="flex items-center gap-1.5 text-red-600 font-medium">
              <XCircle className="w-3.5 h-3.5" />{rejected} rejected
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <Clock className="w-3.5 h-3.5" />{pending} pending
            </span>
          </div>

          <Button
            variant="outline"
            onClick={onSkip}
            className="border-[#c5c5d4] text-[#454652] hover:bg-[#f9f9ff] font-archivo text-sm"
          >
            Skip
          </Button>
          {batchProgress ? (
            <div className="flex items-center gap-3 min-w-[220px]">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-[#454652] mb-1">
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Auditing via Gemini…
                  </span>
                  <span className="font-semibold text-[#003a9f]">
                    {batchProgress.done} / {batchProgress.total}
                  </span>
                </div>
                <Progress
                  value={(batchProgress.done / batchProgress.total) * 100}
                  className="h-1.5 bg-[#c5c5d4] [&_[data-slot=progress-indicator]]:bg-[#003a9f]"
                />
              </div>
            </div>
          ) : (
            <Button
              onClick={handleAuditAll}
              disabled={isAuditingAll || loadingRows.size > 0}
              className="bg-[#003a9f] hover:bg-[#004fd2] text-white font-archivo text-sm"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />Audit All
            </Button>
          )}
          <Button
            onClick={onProceed}
            className="bg-[#003a9f] hover:bg-[#004fd2] text-white font-archivo text-sm"
          >
            Proceed to Configure →
          </Button>
        </div>
      </div>

      {/* ── Split panel ── */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 280px)' }}>

        {/* Left: question list */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-[#c5c5d4] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[#c5c5d4] bg-[#f9f9ff]">
            <p className="text-xs font-semibold text-[#454652] uppercase tracking-wider">
              {results.length} Questions
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-[#f0f3ff]">
              {results.map(result => {
                const { rowKey, rowNumber, canonicalItem, status } = result;
                if (!canonicalItem) return null;
                const audit   = auditResults.get(rowKey);
                const loading = loadingRows.has(rowKey);
                const isSelected = rowKey === selectedKey;

                return (
                  <button
                    key={rowKey}
                    onClick={() => setSelectedKey(rowKey)}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#e7eeff] border-l-2 border-[#003a9f]'
                        : 'hover:bg-[#f9f9ff] border-l-2 border-transparent'
                    }`}
                  >
                    {/* Status icon */}
                    <div className="mt-0.5 flex-shrink-0">
                      <AiStatusIcon result={audit} loading={loading} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-semibold text-[#757684]">#{rowNumber}</span>
                        <Gate1Pill status={status} />
                        <span className="text-[10px] text-[#757684] capitalize">
                          {canonicalItem.canonicalType.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-[#111c2d] line-clamp-2 leading-relaxed font-data">
                        {editedStems.get(rowKey) ?? canonicalItem.stem ?? '(no stem)'}
                      </p>
                    </div>

                    {/* Audit button */}
                    <button
                      onClick={e => { e.stopPropagation(); runAudit(result); }}
                      disabled={loading || isAuditingAll}
                      className={`flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
                        loading || isAuditingAll
                          ? 'opacity-40 cursor-not-allowed bg-[#f0f3ff] text-[#757684]'
                          : 'bg-[#e7eeff] text-[#003a9f] hover:bg-[#d8e3fb]'
                      }`}
                    >
                      {loading ? '…' : audit ? 'Re-audit' : 'Audit'}
                    </button>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 bg-white rounded-xl border border-[#c5c5d4] flex flex-col overflow-hidden">
          {!selectedResult || !selectedResult.canonicalItem ? (
            <div className="flex-1 flex items-center justify-center text-[#757684] text-sm">
              Select a question from the list
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-[#c5c5d4] bg-[#f9f9ff] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#454652]">
                    Question #{selectedResult.rowNumber}
                  </span>
                  <Gate1Pill status={selectedResult.status} />
                  <Badge variant="outline" className="text-[#454652] border-[#c5c5d4] text-xs font-archivo capitalize">
                    {selectedResult.canonicalItem.canonicalType.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {selectedAudit?.status === 'ai_rejected' && (
                    <Button
                      size="sm"
                      onClick={() => setModalKey(selectedKey)}
                      className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-archivo text-xs h-7"
                      variant="outline"
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      View Issues & Fix
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => selectedResult && runAudit(selectedResult)}
                    disabled={selectedLoading || isAuditingAll}
                    className="bg-[#003a9f] text-white hover:bg-[#004fd2] font-archivo text-xs h-7"
                  >
                    {selectedLoading
                      ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Auditing…</>
                      : selectedAudit ? 'Re-audit' : 'Audit'}
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="px-6 py-5 space-y-5">

                  {/* Stem */}
                  <div>
                    <p className="text-[11px] font-semibold text-[#757684] uppercase tracking-wider mb-1.5">
                      Question Stem
                    </p>
                    <p className="text-sm text-[#111c2d] leading-relaxed font-data">
                      {editedStems.get(selectedResult.rowKey) ?? selectedResult.canonicalItem.stem ?? '(no stem)'}
                    </p>
                    {editedStems.has(selectedResult.rowKey) && (
                      <span className="text-[10px] text-[#003a9f] mt-1 block">edited</span>
                    )}
                  </div>

                  {/* Options */}
                  {selectedResult.canonicalItem.choices.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#757684] uppercase tracking-wider mb-1.5">
                        Options
                      </p>
                      <div className="space-y-1.5">
                        {selectedResult.canonicalItem.choices.map((c, i) => {
                          const alpha = 'ABCDEFGHIJ'[i] ?? String(i + 1);
                          const isCorrect = selectedResult.canonicalItem!.correctResponseIdentifiers.includes(c.identifier);
                          return (
                            <div
                              key={c.identifier}
                              className={`flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm ${
                                isCorrect
                                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                                  : 'bg-[#f9f9ff] border border-[#c5c5d4] text-[#111c2d]'
                              }`}
                            >
                              <span className="font-semibold flex-shrink-0">{alpha}.</span>
                              <span className="font-data">{(c as any).text ?? c.identifier}</span>
                              {isCorrect && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto flex-shrink-0 mt-0.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Order items */}
                  {selectedResult.canonicalItem.orderItems.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-[#757684] uppercase tracking-wider mb-1.5">
                        Order Items
                      </p>
                      <div className="space-y-1.5">
                        {selectedResult.canonicalItem.orderItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#f9f9ff] border border-[#c5c5d4] text-sm text-[#111c2d]">
                            <span className="font-semibold text-[#757684]">{i + 1}.</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI result summary */}
                  {selectedAudit && (
                    <div className={`rounded-lg border p-4 ${
                      selectedAudit.status === 'ai_certified'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {selectedAudit.status === 'ai_certified'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <XCircle className="w-4 h-4 text-red-600" />}
                        <span className={`text-sm font-semibold ${
                          selectedAudit.status === 'ai_certified' ? 'text-emerald-800' : 'text-red-800'
                        }`}>
                          {selectedAudit.status === 'ai_certified'
                            ? 'AI Certified — no issues found'
                            : `${selectedAudit.issues.length} issue${selectedAudit.issues.length !== 1 ? 's' : ''} found`}
                        </span>
                      </div>
                      {selectedAudit.status === 'ai_rejected' && (
                        <p className="text-xs text-red-700 mt-1">
                          Click <strong>View Issues &amp; Fix</strong> above to review and fix.
                        </p>
                      )}
                    </div>
                  )}

                  {!selectedAudit && !selectedLoading && (
                    <div className="rounded-lg border border-dashed border-[#c5c5d4] p-4 text-center">
                      <p className="text-sm text-[#757684]">Click <strong>Audit</strong> to analyse this question</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </div>

      {/* ── Issues & Fix Modal ── */}
      <Dialog open={!!modalKey} onOpenChange={open => !open && setModalKey(null)}>
        <DialogContent className="max-w-2xl font-archivo max-h-[90vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-[#c5c5d4]">
            <DialogTitle className="flex items-center gap-2 text-[#111c2d]">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Issues &amp; Fix — Question #{modalResult?.rowNumber}
            </DialogTitle>
          </DialogHeader>

          {modalResult?.canonicalItem && (
            <div className="flex-1 overflow-y-auto">

              {/* ── Question data (read-only) ── */}
              <div className="px-6 py-4 bg-[#f9f9ff] border-b border-[#c5c5d4] space-y-3">
                <p className="text-[10px] font-bold text-[#757684] uppercase tracking-wider">Question Data</p>

                {/* Original stem */}
                <div>
                  <p className="text-[10px] font-semibold text-[#454652] mb-1">Original Stem</p>
                  <p className="text-sm text-[#111c2d] leading-relaxed bg-white rounded-lg border border-[#c5c5d4] px-3 py-2">
                    {modalResult.canonicalItem.stem || <span className="text-[#757684] italic">(no stem)</span>}
                  </p>
                </div>

                {/* Options */}
                {modalResult.canonicalItem.choices.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#454652] mb-1">Options</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {modalResult.canonicalItem.choices.map((c, i) => {
                        const alpha = 'ABCDEFGHIJ'[i] ?? String(i + 1);
                        const isCorrect = modalResult.canonicalItem!.correctResponseIdentifiers.includes(c.identifier);
                        return (
                          <div key={c.identifier} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs ${
                            isCorrect
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium'
                              : 'bg-white border border-[#c5c5d4] text-[#111c2d]'
                          }`}>
                            <span className="font-bold flex-shrink-0">{alpha}.</span>
                            <span className="truncate">{(c as any).text ?? c.identifier}</span>
                            {isCorrect && <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Order items */}
                {modalResult.canonicalItem.orderItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-[#454652] mb-1">Order Items</p>
                    <div className="space-y-1">
                      {modalResult.canonicalItem.orderItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs bg-white border border-[#c5c5d4] text-[#111c2d]">
                          <span className="font-bold text-[#757684]">{i + 1}.</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-5 space-y-5">

                {/* ── Issues ── */}
                {modalAudit?.issues && modalAudit.issues.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[#757684] uppercase tracking-wider mb-2">
                      {modalAudit.issues.length} Issue{modalAudit.issues.length !== 1 ? 's' : ''} Detected
                    </p>
                    <div className="space-y-2">
                      {modalAudit.issues.map((issue: AuditIssue, idx: number) => {
                        const colors = ISSUE_COLORS[issue.issue_type] ?? ISSUE_COLORS.clarity;
                        return (
                          <div key={idx} className={`rounded-lg border p-3.5 ${colors.bg} ${colors.border}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                                  {issue.issue_type}
                                </span>
                                <p className="text-sm text-[#111c2d] mt-0.5 leading-relaxed">{issue.description}</p>
                                <p className={`text-xs mt-1.5 italic ${colors.text}`}>
                                  Suggestion: {issue.suggestion}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => modalKey && setEditedStems(prev => new Map(prev).set(modalKey, issue.suggestion))}
                                className={`flex-shrink-0 text-xs h-7 border ${colors.border} ${colors.text} hover:opacity-80 font-archivo`}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Editable stem ── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-[#757684] uppercase tracking-wider">
                      Fixed Stem
                      <span className="ml-2 text-[10px] font-normal normal-case text-[#454652]">
                        — edit manually or use AI Auto-Fix
                      </span>
                    </label>
                    {/* AI Auto-Fix button */}
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!modalResult?.canonicalItem || !modalAudit?.issues || !modalKey) return;
                        setIsAutoFixing(true);
                        try {
                          const fixed = await autoFixStem(
                            modalResult.canonicalItem,
                            modalAudit.issues,
                            modalStem,
                          );
                          setEditedStems(prev => new Map(prev).set(modalKey, fixed));
                        } catch (err: any) {
                          console.error('Auto-fix failed:', err);
                        } finally {
                          setIsAutoFixing(false);
                        }
                      }}
                      disabled={isAutoFixing || !modalAudit?.issues?.length}
                      className="bg-[#003a9f] hover:bg-[#004fd2] text-white font-archivo text-xs h-7"
                    >
                      {isAutoFixing
                        ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Fixing…</>
                        : <><Sparkles className="w-3 h-3 mr-1" />AI Auto-Fix</>}
                    </Button>
                  </div>
                  <Textarea
                    value={modalStem}
                    onChange={e => modalKey && setEditedStems(prev => new Map(prev).set(modalKey, e.target.value))}
                    rows={3}
                    className="text-sm text-[#111c2d] border-[#c5c5d4] focus:border-[#003a9f] resize-none font-archivo"
                    placeholder="Edit the stem here, or click AI Auto-Fix to let Groq rewrite it…"
                  />
                </div>

              </div>
            </div>
          )}

          {/* Modal footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#c5c5d4] bg-[#f9f9ff]">
            <Button
              variant="outline"
              onClick={() => setModalKey(null)}
              className="border-[#c5c5d4] text-[#454652] font-archivo text-sm"
            >
              Close
            </Button>
            <Button
              onClick={async () => {
                if (!modalResult) return;
                await runAudit(modalResult, editedStems.get(modalKey ?? ''));
              }}
              disabled={modalLoading || isAutoFixing}
              className="bg-[#003a9f] hover:bg-[#004fd2] text-white font-archivo text-sm"
            >
              {modalLoading
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Re-auditing…</>
                : <><Sparkles className="w-4 h-4 mr-1.5" />Re-audit</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


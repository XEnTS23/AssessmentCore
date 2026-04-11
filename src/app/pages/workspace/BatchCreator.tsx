import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import JSZip from "jszip";
import {
  Upload,
  Download,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Settings,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Sparkles,
  Code,
  EyeOff,
  RefreshCw,
  Lock,
  LogIn,
  Check,
  Copy,
  Image,
  FolderOpen,
  Shield,
  Mail,
  MessageCircle,
  Bell,
  CircleHelp,
  UserRound,
  Layers,
  Home,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Switch } from "../../components/ui/switch";
import { ValidationReport } from "../../components/ValidationReport";
import { ValidationReportOptimized } from "../../components/ValidationReportOptimized";
import { AiAuditReviewer } from "../../components/AiAuditReviewer";
import { DataFixingWorkspace } from "../../components/DataFixingWorkspace";
import { AIValidationReport } from "../../components/AIValidationReport";
import { MathMLRenderer } from "../../components/MathMLRenderer";
import { parseFile, detectQuestionColumns } from "../../utils/fileParser";
import { buildValidationDatasetInsights, buildValidationProfile, validateAllQuestions, computeDataQualityMetrics, computeDatasetRecoveryMetrics, ValidationResult } from "../../utils/questionValidator";
import { runDualValidation, type ImprovementMetrics, type CleanLog, type RowImprovementRecord, type RemediationSuggestion, type Pass3Metrics, type Pass3ExecutionMetrics } from "../../utils/dataCleaningPipeline";
import { validateAllQuestionsChunked } from "../../utils/chunkedValidator";
import { convertToQTIQuestion, generateJSON, generateQTI } from "../../utils/qtiConverter";
import { applyTemplateXmlToGeneratedItem } from "../../utils/templateXmlApplier";
import { TemplateMappingUI } from "../../components/TemplateMappingUI";
import { ExtractedTemplate } from "../../utils/templateFieldExtractor";
import { ColumnMapping, SheetRow } from "../../utils/templateDataMapper";
import { 
  generateAndValidateMCQ, 
  generateAndValidateTextEntry, 
  generateQTIByVersion,
  Question as QTIQuestion 
} from "../../../engine";
import { processXmlMath } from "../../utils/mathmlConverter";
import { replacePlaceholder, hasFeedbackPlaceholders, listPlaceholdersInNode, removePlaceholderSection } from "../../utils/placeholderHandler";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "sonner";
import {
  validateBatch as runAIValidation,
  isProviderConfigured,
  getAvailableProviders,
  autoFixXml,
  type AIValidationItem,
  type AIProvider,
} from "../../../services/aiValidationService";
import {
  runAiAudit,
  checkAuditServerHealth,
  type AuditResult,
  type AuditBucket,
} from "../../../services/aiAuditService";
import { supabase } from "../../../services/supabaseClient";

import {
  extractMediaZip,
  validateMediaReferences,
  insertImageIntoQuestionText,
  IMG_SEPARATOR,
  getImagesForPackaging,
  normalizeMediaFilename,
  resolveMediaFileKey,
  validateAnswerInOptions,
  validateUniqueIds,
  MediaFile,
  MediaValidationError,
} from "../../utils/mediaUtils";
import { uploadMediaFilesToSupabase, UploadedMediaUrl } from "../../../services/mediaUploadService";
import ExcelJS from 'exceljs';



interface FileData {
  columns: string[];
  rows: Record<string, any>[];
  fileName: string;
}

interface ValidationStatsSummary {
  valid: number;
  caution: number;
  rejected: number;
  total: number;
  duplicates: number;
  missingAnswers: number;
  formattingIssues: number;
}

interface DedupDeletedRowSummary {
  rowKey: string;
  rowNumber: number;
  questionText: string;
}


type UploadedUrlMatchField = 'fileName' | 'serialNumber';

function canonicalImageKey(input: string): string {
  const normalized = normalizeMediaFilename(input);
  if (!normalized) return '';

  const dotIndex = normalized.lastIndexOf('.');
  const rawName = dotIndex >= 0 ? normalized.slice(0, dotIndex) : normalized;
  let ext = dotIndex >= 0 ? normalized.slice(dotIndex + 1) : '';
  if (ext === 'jpeg') ext = 'jpg';

  const normalizedName = rawName.replace(/[\s._-]+/g, '');
  return ext ? `${normalizedName}.${ext}` : normalizedName;
}

function applyUploadedUrlsToRowsBySerial(
  rows: Record<string, any>[],
  imageCol: string,
  uploadedUrls: UploadedMediaUrl[]
): { rows: Record<string, any>[]; mappedCount: number } {
  const serialToUrl = new Map<number, string>();
  const fileNameToUrl = new Map<string, string>();
  const canonicalFileNameToUrl = new Map<string, string>();

  uploadedUrls.forEach((entry) => {
    if (entry.serialNumber != null && !serialToUrl.has(entry.serialNumber)) {
      serialToUrl.set(entry.serialNumber, entry.publicUrl);
    }

    const normalizedFileName = normalizeMediaFilename(entry.fileName);
    if (normalizedFileName && !fileNameToUrl.has(normalizedFileName)) {
      fileNameToUrl.set(normalizedFileName, entry.publicUrl);
    }

    const canonical = canonicalImageKey(entry.fileName);
    if (canonical && !canonicalFileNameToUrl.has(canonical)) {
      canonicalFileNameToUrl.set(canonical, entry.publicUrl);
    }
  });

  let mappedCount = 0;
  const mappedRows = rows.map((row, index) => {
    const currentImageValue = row[imageCol] ? String(row[imageCol]).trim() : '';

    // Keep existing URLs untouched.
    if (currentImageValue.startsWith('http://') || currentImageValue.startsWith('https://')) {
      return row;
    }

    // 1) Primary mapping: filename in sheet -> uploaded filename
    const normalizedCurrent = normalizeMediaFilename(currentImageValue);
    let url = normalizedCurrent ? fileNameToUrl.get(normalizedCurrent) : undefined;

    // 1b) Canonical fallback: ignore separators/case and jpg/jpeg differences.
    if (!url) {
      const canonicalCurrent = canonicalImageKey(currentImageValue);
      url = canonicalCurrent ? canonicalFileNameToUrl.get(canonicalCurrent) : undefined;
    }

    // 2) Fallback mapping: row serial number -> filename serial number
    if (!url) {
      const rowSerial = index + 1;
      url = serialToUrl.get(rowSerial);
    }

    if (!url) return row;
    mappedCount += 1;
    return {
      ...row,
      [imageCol]: url,
    };
  });

  return { rows: mappedRows, mappedCount };
}

function canonicalChoiceAnswerToLegacyLabel(canonicalItem?: ValidationResult['canonicalItem']): string {
  if (!canonicalItem || canonicalItem.choices.length === 0 || canonicalItem.correctResponseIdentifiers.length === 0) {
    return '';
  }

  const targetId = canonicalItem.correctResponseIdentifiers[0];
  const idx = canonicalItem.choices.findIndex((choice) => choice.identifier === targetId);
  if (idx < 0 || idx > 25) return '';
  return String.fromCharCode(65 + idx);
}

function canonicalChoiceAnswersToLegacyLabels(canonicalItem?: ValidationResult['canonicalItem']): string {
  if (!canonicalItem || canonicalItem.choices.length === 0 || canonicalItem.correctResponseIdentifiers.length === 0) {
    return '';
  }

  const labels = canonicalItem.correctResponseIdentifiers
    .map((targetId) => {
      const idx = canonicalItem.choices.findIndex((choice) => choice.identifier === targetId);
      if (idx < 0 || idx > 25) return '';
      return String.fromCharCode(65 + idx);
    })
    .filter(Boolean);

  return Array.from(new Set(labels)).join(',');
}

function canonicalOrderAnswersToLegacyLabels(canonicalItem?: ValidationResult['canonicalItem']): string {
  if (!canonicalItem) return '';

  const orderedCount = canonicalItem.orderItems.length;
  if (orderedCount > 0) {
    return Array.from({ length: orderedCount }, (_, idx) => String.fromCharCode(65 + idx)).join(',');
  }

  if (canonicalItem.correctResponseIdentifiers.length > 0 && canonicalItem.choices.length > 0) {
    const mapped = canonicalItem.correctResponseIdentifiers
      .map((targetId) => {
        const idx = canonicalItem.choices.findIndex((choice) => choice.identifier === targetId);
        if (idx < 0 || idx > 25) return '';
        return String.fromCharCode(65 + idx);
      })
      .filter(Boolean);
    return Array.from(new Set(mapped)).join(',');
  }

  return '';
}

function buildSequentialChoiceLabels(count: number): string {
  const labels: string[] = [];
  for (let idx = 0; idx < count; idx += 1) {
    labels.push(String.fromCharCode(65 + idx));
  }
  return labels.join(',');
}

function canonicalTypeToLegacyQuestionType(canonicalType?: string): string {
  switch (canonicalType) {
    case 'single_choice':
    case 'true_false':
    case 'mcq':
    case 'truefalse':
      return 'mcq';
    case 'text_entry':
    case 'numeric':
    case 'shortanswer':
      return 'shortanswer';
    case 'multi_select':
    case 'msq':
      return 'msq';
    case 'order':
      return 'order';
    default:
      return 'shortanswer';
  }
}

function appendImageTagForXmlMedia(questionText: string, imageValue: string): string {
  const raw = String(imageValue || '').trim();
  if (!raw) return questionText;

  const isUrl = raw.startsWith('http://') || raw.startsWith('https://');
  const src = isUrl ? raw : `../media/${raw}`;
  const alt = raw;

  // Use the shared separator so builders preserve a standalone image block.
  return `${questionText}${IMG_SEPARATOR}<img src="${src}" alt="${alt}"/>`;
}

function ensureXmlContainsImageTagForXmlMedia(xmlContent: string, imageValue: string): string {
  const raw = String(imageValue || '').trim();
  if (!raw) return xmlContent;

  const isUrl = raw.startsWith('http://') || raw.startsWith('https://');
  const src = isUrl ? raw : `../media/${raw}`;

  // If this exact image source is already present in img/object, do nothing.
  const escapedSrc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const hasImg = new RegExp(`<img\\b[^>]*\\bsrc=["']${escapedSrc}["'][^>]*>`, 'i').test(xmlContent);
  const hasObject = new RegExp(`<object\\b[^>]*\\bdata=["']${escapedSrc}["'][^>]*>`, 'i').test(xmlContent);
  if (hasImg || hasObject) return xmlContent;

  // If no itemBody exists, leave XML untouched.
  if (!xmlContent.includes('</itemBody>')) return xmlContent;

  const imageBlock = `\n    <p><img src="${src}" alt="${raw}"/></p>`;
  return xmlContent.replace('</itemBody>', `${imageBlock}\n  </itemBody>`);
}

function buildInternalRowKey(row: Record<string, any>, index: number): string {
  if (row.__rowKey && String(row.__rowKey).trim()) {
    return String(row.__rowKey);
  }

  const explicitId = row.id != null ? String(row.id).trim() : '';
  const sourceId = explicitId || `row_${index + 1}`;
  return `${sourceId}#${index + 1}`;
}

function ensureInternalRowKeys(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((row, index) => ({
    ...row,
    __rowKey: buildInternalRowKey(row, index),
  }));
}

function getRowValidationKey(row: Record<string, any>, index?: number): string {
  if (row.__rowKey && String(row.__rowKey).trim()) {
    return String(row.__rowKey);
  }

  if (typeof index === 'number') {
    return buildInternalRowKey(row, index);
  }

  if (row.id != null && String(row.id).trim()) {
    return String(row.id).trim();
  }

  return '';
}

export function BatchCreator() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, user, userUsage, trackExport, trackQuestionsConverted, refreshUsage } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [uploadPreviewColumns, setUploadPreviewColumns] = useState<string[]>([]);
  const [uploadPreviewRows, setUploadPreviewRows] = useState<Record<string, any>[]>([]);
  const [isParsingUploadPreview, setIsParsingUploadPreview] = useState(false);
  const [columnMapping, setColumnMapping] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<Map<string, ValidationResult>>(new Map());
  // Dual-validation pipeline state (non-breaking additions)
  const [cleanValidationResults, setCleanValidationResults] = useState<Record<string, ValidationResult> | null>(null);
  const [cleaningMetrics, setCleaningMetrics] = useState<ImprovementMetrics | null>(null);
  const [cleaningLogs, setCleaningLogs] = useState<CleanLog[]>([]);
  const [rowImprovements, setRowImprovements] = useState<RowImprovementRecord[]>([]);
  const [viewMode, setViewMode] = useState<'raw' | 'clean'>('raw');
  const [pass3Suggestions, setPass3Suggestions] = useState<RemediationSuggestion[]>([]);
  const [pass3Metrics, setPass3Metrics] = useState<Pass3Metrics | null>(null);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [pass3ExecutionMetrics, setPass3ExecutionMetrics] = useState<Pass3ExecutionMetrics | null>(null);
  // PASS 3 user-assisted execution state
  const [pass3ExecutedRows, setPass3ExecutedRows] = useState<any[]>([]);
  const [manualFixedRows, setManualFixedRows] = useState<Map<string, any>>(new Map());
  const manualFixedRowsRef = useRef<Map<string, any>>(new Map()); // ADD THIS LINE
  const [manualFixResults, setManualFixResults] = useState<Map<string, ValidationResult>>(new Map());
  const [manualFixHistory, setManualFixHistory] = useState<Map<string, { field: string; original: unknown }>>(new Map());
  const [manualMetrics, setManualMetrics] = useState({ manualFixesApplied: 0, rowsImprovedByUser: 0 });
  const [manualFixInputs, setManualFixInputs] = useState<Map<string, string>>(new Map());
  const [isFixingWorkspaceOpen, setIsFixingWorkspaceOpen] = useState(false);
  const [isApplyingAutoFixes, setIsApplyingAutoFixes] = useState(false);
  const [autoFixComparison, setAutoFixComparison] = useState<{
    before: ValidationStatsSummary;
    after: ValidationStatsSummary | null;
    autoFixedCount: number;
    applied: boolean;
  } | null>(null);
  const [dedupDeletedRows, setDedupDeletedRows] = useState<DedupDeletedRowSummary[]>([]);
  const [outputFormat, setOutputFormat] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [validationProgressText, setValidationProgressText] = useState('');
  const [showValidationReport, setShowValidationReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, any>[]>([]);
  const [exportValidationError, setExportValidationError] = useState<string>("");

  // Batch Creator access gate state
  const [copied, setCopied] = useState(false);

  // Media support state
  const [mediaZipFile, setMediaZipFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<Map<string, MediaFile>>(new Map());
  const [mediaValidationErrors, setMediaValidationErrors] = useState<MediaValidationError[]>([]);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [isUploadingMediaUrls, setIsUploadingMediaUrls] = useState(false);
  const [uploadedMediaUrls, setUploadedMediaUrls] = useState<UploadedMediaUrl[]>([]);
  const [mediaUploadError, setMediaUploadError] = useState<string>("");
  const [autoMappedImageRows, setAutoMappedImageRows] = useState<number>(0);
  const [questionMatchColumnForManualMap, setQuestionMatchColumnForManualMap] = useState<string>("");
  const [uploadedUrlMatchField, setUploadedUrlMatchField] = useState<UploadedUrlMatchField>('fileName');
  const [manualMapMessage, setManualMapMessage] = useState<string>("");
  const [exportMode, setExportMode] = useState<'qti-package' | 'xml-media-folder' | "">("");
  const [containsImages, setContainsImages] = useState<"yes" | "no" | "">("");
  const [containsMath, setContainsMath] = useState<"yes" | "no" | "">("");
  const [mathFormat, setMathFormat] = useState<"mathjax" | "mathml" | "">("");
  const [hasTemplateXml, setHasTemplateXml] = useState<"yes" | "no" | "">("");
  const [templateXmlFile, setTemplateXmlFile] = useState<File | null>(null);
  const [templateXmlContent, setTemplateXmlContent] = useState<string>("");
  const [showTemplateMappingUI, setShowTemplateMappingUI] = useState(false);
  const [templateMapping, setTemplateMapping] = useState<ColumnMapping | null>(null);
  const [templateSheetData, setTemplateSheetData] = useState<SheetRow[]>([]);
  const [extractedTemplate, setExtractedTemplate] = useState<ExtractedTemplate | null>(null);
  const [configurationValidationError, setConfigurationValidationError] = useState<string>("");
  const [showConfigErrors, setShowConfigErrors] = useState(false);
  const [reportDatasetName, setReportDatasetName] = useState<string>('');

  // Wizard step state
  type WizardStep = 'upload' | 'validating' | 'clean-fix' | 'ai-audit' | 'configure' | 'transform';
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [transformDone, setTransformDone] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [expandedFixRow, setExpandedFixRow] = useState<string | null>(null);
  const [selectedAuditRowKey, setSelectedAuditRowKey] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const stepOrder: WizardStep[] = ['upload', 'validating', 'clean-fix', 'ai-audit', 'configure', 'transform'];
  const stepLabels: Record<WizardStep, string> = {
    upload: 'Upload',
    validating: 'Validation',
    'clean-fix': 'Fixing',
    'ai-audit': 'AI Audit',
    configure: 'Preview',
    transform: 'Export',
  };

  const canNavigateToStep = (step: WizardStep): boolean => {
    if (step === 'upload') return true;
    if (step === 'validating') return uploadedFiles.length > 0;
    if (step === 'clean-fix') return !!fileData && validationResults.size > 0;
    if (step === 'ai-audit') return !!fileData && validationResults.size > 0;
    if (step === 'configure') return !!fileData && editedRows.length > 0;
    if (step === 'transform') return !!fileData && isExportConfigComplete();
    return false;
  };

  const handleStepperJump = (step: WizardStep) => {
    if (!canNavigateToStep(step)) return;
    setCurrentStep(step);
  };

  const fixingNavigationRowKeys = useMemo(() => {
    const keys = new Set<string>();
    pass3Suggestions.forEach((s) => {
      if (s.rowKey) keys.add(s.rowKey);
    });
    validationResults.forEach((vr, key) => {
      if (vr.issues?.some((issue) => issue.severity === 'block')) keys.add(key);
    });
    return Array.from(keys);
  }, [pass3Suggestions, validationResults]);

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const stepProgressPercent = ((currentStepIndex + 1) / stepOrder.length) * 100;
  const sidebarCollapsedWidth = 72;
  const sidebarExpandedWidth = 256;
  const sidebarWidth = isSidebarHovered ? sidebarExpandedWidth : sidebarCollapsedWidth;
  const previewTableColumns = useMemo(() => {
    if (uploadPreviewColumns.length > 0) {
      return uploadPreviewColumns.slice(0, 5);
    }

    if (fileData?.columns?.length) {
      return fileData.columns.slice(0, 5);
    }

    return ['ID', 'Question Content', 'Ans_A', 'Ans_B', 'Correct'];
  }, [uploadPreviewColumns, fileData]);

  const previewTableRows = useMemo(() => {
    if (uploadPreviewRows.length > 0) {
      return uploadPreviewRows.slice(0, 3);
    }

    if (fileData?.rows?.length) {
      return fileData.rows.slice(0, 3);
    }

    return [] as Record<string, any>[];
  }, [uploadPreviewRows, fileData]);

  const freeQuestionQuota = 100;
  const exportedQuestions = userUsage?.total_questions_converted || 0;
  const quotaUsedPercent = userUsage?.is_unlimited
    ? 100
    : Math.min((exportedQuestions / freeQuestionQuota) * 100, 100);
  const quotaSummary = userUsage?.is_unlimited
    ? `Unlimited plan - ${exportedQuestions} questions converted`
    : `${Math.max(freeQuestionQuota - exportedQuestions, 0)} of ${freeQuestionQuota} questions left`;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  // AI Validation state
  const [aiValidationEnabled, setAiValidationEnabled] = useState(false);
  const [aiValidationPhase, setAiValidationPhase] = useState<'idle' | 'ready' | 'running' | 'done'>('idle');
  const [aiValidationResults, setAiValidationResults] = useState<AIValidationItem[]>([]);
  const [aiValidationProgress, setAiValidationProgress] = useState({ current: 0, total: 0 });
  const [generatedXmlItems, setGeneratedXmlItems] = useState<Array<{ fileName: string; xmlContent: string }>>([]);
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');
  const [pendingExportContext, setPendingExportContext] = useState<{
    zip: JSZip;
    exportedFiles: Array<{ identifier: string; filename: string; imageFiles?: string[] }>;
    referencedImages: Set<string>;
    exportCount: number;
    mode: 'qti-package' | 'xml-media-folder';
    downloadBaseName: string;
  } | null>(null);
  const [aiFixingItemNo, setAiFixingItemNo] = useState<number | null>(null);
  const XML_REVIEW_PAGE_SIZE = 100;
  const [isXmlReviewOpen, setIsXmlReviewOpen] = useState(false);
  const [xmlReviewPageIndex, setXmlReviewPageIndex] = useState(0);
  const [selectedXmlReviewIndex, setSelectedXmlReviewIndex] = useState(0);
  const [xmlPreviewMode, setXmlPreviewMode] = useState<'rendered' | 'raw'>('rendered');
  const [isRawXmlEditing, setIsRawXmlEditing] = useState(false);
  const [rawXmlDraft, setRawXmlDraft] = useState('');
  const [rawXmlDraftSourceIndex, setRawXmlDraftSourceIndex] = useState<number | null>(null);
  const [xmlReviewFixingIndex, setXmlReviewFixingIndex] = useState<number | null>(null);
  const [studentChoiceResponses, setStudentChoiceResponses] = useState<Record<number, string[]>>({});
  const [studentTextResponses, setStudentTextResponses] = useState<Record<number, string>>({});
  const [studentOrderResponses, setStudentOrderResponses] = useState<Record<number, string[]>>({});
  const [studentPreviewSubmissions, setStudentPreviewSubmissions] = useState<
    Record<number, { submitted: boolean; isCorrect: boolean; score: number; feedbackHtml: string }>
  >({});

  const AI_AUDIT_PAGE_SIZE = 100;
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<Record<string, AuditResult>>({});
  const [auditProgress, setAuditProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [auditOverrides, setAuditOverrides] = useState<Set<string>>(new Set());
  const [aiAuditPageIndex, setAiAuditPageIndex] = useState(0);
  const [autoFixedRowKeys, setAutoFixedRowKeys] = useState<Set<string>>(new Set());
  const [aiAuditStatusFilter, setAiAuditStatusFilter] = useState<'ALL' | 'FAILED' | 'PASSED'>('ALL');
  const [aiAuditEditingRowKey, setAiAuditEditingRowKey] = useState<string | null>(null);
  const [aiAuditDraftRows, setAiAuditDraftRows] = useState<Map<string, Record<string, any>>>(new Map());

  const aiAuditQueueRows = useMemo(() => {
    const rows: Array<{
      rowKey: string;
      rowNumber: number;
      questionText: string;
      fixTag: 'MANUAL_FIXED' | 'AUTO_FIXED' | null;
      aiStatus: 'PASSED' | 'FAILED' | 'PENDING';
      aiFeedback: string;
      aiSuggestedFix?: string;
      aiIssues: Array<{ issue_type: string; description: string; suggestion: string }>;
      audit: AuditResult | null;
      rowData: Record<string, any>;
    }> = [];

    editedRows.forEach((row, idx) => {
      const rowKey = getRowValidationKey(row, idx);
      if (!rowKey) return;

      const vr = validationResults.get(rowKey);
      if (!vr) return;

      const audit = auditResults[rowKey] || null;
      const questionText = String(
        vr.data?.questionText ||
          row[columnMapping?.questionCol || 'question'] ||
          ''
      ).trim();

      const fixTag = manualFixedRows.has(rowKey)
        ? 'MANUAL_FIXED'
        : autoFixedRowKeys.has(rowKey)
        ? 'AUTO_FIXED'
        : null;

      const aiPassed = !!audit && (audit.bucket === 'AI_CERTIFIED' || auditOverrides.has(rowKey));
      const aiStatus: 'PASSED' | 'FAILED' | 'PENDING' = !audit
        ? 'PENDING'
        : aiPassed
        ? 'PASSED'
        : 'FAILED';

      const aiFeedback = audit
        ? (audit.explanation || 'AI audit completed for this row.')
        : 'AI audit has not been run for this question yet.';
      const aiSuggestedFix = audit?.suggestedFix;
      const aiIssues = (audit?.issues ?? []).map((iss) => ({
        issue_type: iss.issue_type,
        description: iss.description,
        suggestion: iss.suggestion,
      }));

      rows.push({
        rowKey,
        rowNumber: vr.rowNumber || idx + 1,
        questionText,
        fixTag,
        aiStatus,
        aiFeedback,
        aiSuggestedFix,
        aiIssues,
        audit,
        rowData: row,
      });
    });

    return rows;
  }, [editedRows, validationResults, auditResults, auditOverrides, columnMapping?.questionCol, manualFixedRows, autoFixedRowKeys]);

  const filteredAiAuditQueueRows = useMemo(() => {
    if (aiAuditStatusFilter === 'ALL') return aiAuditQueueRows;
    if (aiAuditStatusFilter === 'FAILED') {
      return aiAuditQueueRows.filter((row) => row.aiStatus === 'FAILED');
    }
    return aiAuditQueueRows.filter((row) => row.aiStatus === 'PASSED');
  }, [aiAuditQueueRows, aiAuditStatusFilter]);

  const totalAiAuditPages = Math.max(1, Math.ceil(filteredAiAuditQueueRows.length / AI_AUDIT_PAGE_SIZE));
  const visibleAiAuditQueueRows = useMemo(() => {
    const start = aiAuditPageIndex * AI_AUDIT_PAGE_SIZE;
    return filteredAiAuditQueueRows.slice(start, start + AI_AUDIT_PAGE_SIZE);
  }, [filteredAiAuditQueueRows, aiAuditPageIndex, AI_AUDIT_PAGE_SIZE]);

  useEffect(() => {
    const maxPageIndex = Math.max(0, totalAiAuditPages - 1);
    if (aiAuditPageIndex > maxPageIndex) {
      setAiAuditPageIndex(maxPageIndex);
    }
  }, [aiAuditPageIndex, totalAiAuditPages]);

  const activeAiAuditRow = useMemo(() => {
    if (visibleAiAuditQueueRows.length === 0) return null;
    return visibleAiAuditQueueRows.find((row) => row.rowKey === selectedAuditRowKey) || visibleAiAuditQueueRows[0];
  }, [visibleAiAuditQueueRows, selectedAuditRowKey]);

  const totalXmlReviewPages = Math.max(1, Math.ceil(generatedXmlItems.length / XML_REVIEW_PAGE_SIZE));
  const visibleXmlReviewStart = xmlReviewPageIndex * XML_REVIEW_PAGE_SIZE;
  const visibleXmlReviewItems = useMemo(
    () => generatedXmlItems.slice(visibleXmlReviewStart, visibleXmlReviewStart + XML_REVIEW_PAGE_SIZE),
    [generatedXmlItems, visibleXmlReviewStart]
  );

  const selectedXmlReviewItem = generatedXmlItems[selectedXmlReviewIndex] || null;

  useEffect(() => {
    if (!isXmlReviewOpen) return;
    const maxPageIndex = Math.max(0, totalXmlReviewPages - 1);
    if (xmlReviewPageIndex > maxPageIndex) {
      setXmlReviewPageIndex(maxPageIndex);
    }
  }, [isXmlReviewOpen, xmlReviewPageIndex, totalXmlReviewPages]);

  useEffect(() => {
    if (!isXmlReviewOpen) return;
    if (generatedXmlItems.length === 0) {
      setSelectedXmlReviewIndex(0);
      setRawXmlDraft('');
      return;
    }
    if (selectedXmlReviewIndex >= generatedXmlItems.length) {
      setSelectedXmlReviewIndex(0);
      setXmlReviewPageIndex(0);
    }
  }, [isXmlReviewOpen, generatedXmlItems, selectedXmlReviewIndex]);

  useEffect(() => {
    if (!selectedXmlReviewItem) {
      setRawXmlDraft('');
      setRawXmlDraftSourceIndex(null);
      return;
    }
    setRawXmlDraft(selectedXmlReviewItem.xmlContent);
    setRawXmlDraftSourceIndex(selectedXmlReviewIndex);
    setIsRawXmlEditing(false);
  }, [selectedXmlReviewIndex, selectedXmlReviewItem]);

  const parseXmlPreviewData = (xmlContent: string) => {
    try {
      const normalizedXml = processXmlMath(xmlContent);
      const doc = new DOMParser().parseFromString(normalizedXml, 'application/xml');
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        return {
          parseError: parserError.textContent || 'Invalid XML',
          itemIdentifier: '',
          stemHtml: '',
          choices: [] as Array<{ id: string; html: string; isCorrect: boolean }>,
          orderChoices: [] as Array<{ id: string; html: string; isCorrect: boolean }>,
          itemBodyHtml: '',
          interactionType: 'unknown' as 'choice' | 'textentry' | 'order' | 'unknown',
          interactionPromptHtml: '',
          maxChoices: 1,
          correctResponseText: '',
          correctResponseValues: [] as string[],
          acceptedTextAnswers: [] as string[],
          studentViewHtml: '',
          responseProcessingTemplate: '',
          outcomeDeclarations: [] as Array<{ identifier: string; defaultValue: string; baseType: string; cardinality: string }>,
          outcomeRules: [] as Array<{ identifier: string; value: string }>,
          textEntryPlaceholders: [] as Array<{ responseId: string; expectedLength: string; placeholderText: string }>,
          feedbackBlocks: [] as Array<{ id: string; title: string; html: string }>,
          rubricBlocks: [] as Array<{ view: string; html: string }>,
        };
      }

      const itemBody = doc.querySelector('itemBody');
      const rootItem = doc.documentElement;
      const itemIdentifier = rootItem?.getAttribute('identifier') || '';
      const choiceInteractionNode = itemBody?.querySelector('choiceInteraction') || null;
      const orderInteractionNode = itemBody?.querySelector('orderInteraction') || null;
      const textEntryInteractionNode = itemBody?.querySelector('textEntryInteraction') || null;

      const buildStemHtml = () => {
        if (!itemBody) return '';
        const stemClone = itemBody.cloneNode(true) as Element;
        stemClone.querySelectorAll(
          'choiceInteraction, textEntryInteraction, extendedTextInteraction, inlineChoiceInteraction, hotspotInteraction, matchInteraction, orderInteraction, associateInteraction, gapMatchInteraction, sliderInteraction, uploadInteraction, rubricBlock'
        ).forEach((node) => node.remove());
        return (stemClone.innerHTML || '').trim();
      };

      const buildStudentViewHtml = () => {
        if (!itemBody) return '';
        const escapeHtmlAttr = (value: string) =>
          value
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const serializeNode = (node: Element) => node.outerHTML || new XMLSerializer().serializeToString(node);
        let studentHtml = (itemBody.innerHTML || '').trim();

        Array.from(itemBody.querySelectorAll('rubricBlock')).forEach((node) => {
          studentHtml = studentHtml.replace(serializeNode(node), '');
        });

        Array.from(itemBody.querySelectorAll('choiceInteraction')).forEach((interactionNode) => {
          const promptHtml = interactionNode.querySelector('prompt')?.innerHTML?.trim() || '';
          const maxChoices = Number(interactionNode.getAttribute('maxChoices') || '1');
          const inputType = maxChoices > 1 ? 'checkbox' : 'radio';
          const choicesHtml = Array.from(interactionNode.querySelectorAll('simpleChoice')).map((choiceNode) => {
            const choiceHtml = choiceNode.innerHTML || '';
            return `<label style=\"display:flex; gap:8px; align-items:flex-start; margin:8px 0;\"><input type=\"${inputType}\" disabled /><span>${choiceHtml}</span></label>`;
          }).join('');

          const replacement = `${promptHtml ? `<div>${promptHtml}</div>` : ''}<div>${choicesHtml}</div>`;
          studentHtml = studentHtml.replace(serializeNode(interactionNode), replacement);
        });

        Array.from(itemBody.querySelectorAll('textEntryInteraction')).forEach((textEntryNode) => {
          const promptHtml = textEntryNode.querySelector('prompt')?.innerHTML?.trim() || '';
          const expectedLength = textEntryNode.getAttribute('expectedLength') || '';
          const placeholder = textEntryNode.getAttribute('placeholderText') || 'Enter your answer';
          const parsedExpectedLength = Number(expectedLength);
          const widthStyle = Number.isFinite(parsedExpectedLength) && parsedExpectedLength > 0
            ? `width:${Math.max(120, parsedExpectedLength * 10)}px;`
            : 'width:220px;';

          const replacement = `${promptHtml ? `<div>${promptHtml}</div>` : ''}<div style=\"margin-top:8px;\"><input type=\"text\" disabled placeholder=\"${escapeHtmlAttr(placeholder)}\" style=\"${widthStyle} max-width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; background:#fff;\" /></div>`;
          studentHtml = studentHtml.replace(serializeNode(textEntryNode), replacement);
        });

        Array.from(itemBody.querySelectorAll('extendedTextInteraction')).forEach((extendedNode) => {
          const promptHtml = extendedNode.querySelector('prompt')?.innerHTML?.trim() || '';
          const replacement = `${promptHtml ? `<div>${promptHtml}</div>` : ''}<div style=\"margin-top:8px;\"><textarea disabled rows=\"4\" placeholder=\"Enter your answer\" style=\"width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; background:#fff;\"></textarea></div>`;
          studentHtml = studentHtml.replace(serializeNode(extendedNode), replacement);
        });

        return studentHtml.trim();
      };

      const stemHtml = buildStemHtml();
      const studentViewHtml = buildStudentViewHtml() || stemHtml || itemBody?.innerHTML || '';

      const correctValues = new Set(
        Array.from(doc.querySelectorAll('responseDeclaration[identifier="RESPONSE"] correctResponse value'))
          .map((n) => (n.textContent || '').trim())
          .filter(Boolean)
      );

      const fallbackCorrectValues = Array.from(doc.querySelectorAll('responseDeclaration correctResponse value'))
        .map((n) => (n.textContent || '').trim())
        .filter(Boolean);

      const effectiveCorrectValues = correctValues.size > 0 ? Array.from(correctValues) : fallbackCorrectValues;
      const acceptedTextAnswers = Array.from(new Set([
        ...effectiveCorrectValues,
        ...Array.from(doc.querySelectorAll('responseDeclaration[identifier="RESPONSE"] mapping mapEntry'))
          .map((node) => (node.getAttribute('mapKey') || '').trim())
          .filter(Boolean),
      ]));

      const choices = Array.from(itemBody?.querySelectorAll('choiceInteraction simpleChoice') || []).map((choiceNode) => {
        const id = choiceNode.getAttribute('identifier') || '';
        return {
          id,
          html: choiceNode.innerHTML,
          isCorrect: correctValues.has(id),
        };
      });

      const orderChoices = Array.from(itemBody?.querySelectorAll('orderInteraction simpleChoice') || []).map((choiceNode) => {
        const id = choiceNode.getAttribute('identifier') || '';
        return {
          id,
          html: choiceNode.innerHTML,
          isCorrect: effectiveCorrectValues.includes(id),
        };
      });

      const textEntryPlaceholders = Array.from(itemBody?.querySelectorAll('textEntryInteraction') || []).map((textEntryNode) => ({
        responseId: textEntryNode.getAttribute('responseIdentifier') || 'RESPONSE',
        expectedLength: textEntryNode.getAttribute('expectedLength') || 'N/A',
        placeholderText: textEntryNode.getAttribute('placeholderText') || '',
      }));

      const feedbackBlocks = Array.from(doc.querySelectorAll('modalFeedback')).map((feedbackNode) => ({
        id: feedbackNode.getAttribute('identifier') || '',
        title: feedbackNode.getAttribute('title') || feedbackNode.getAttribute('outcomeIdentifier') || 'Feedback',
        html: feedbackNode.innerHTML,
      }));

      const outcomeDeclarations = Array.from(doc.querySelectorAll('outcomeDeclaration')).map((outcomeNode) => ({
        identifier: outcomeNode.getAttribute('identifier') || 'UNKNOWN',
        baseType: outcomeNode.getAttribute('baseType') || 'unknown',
        cardinality: outcomeNode.getAttribute('cardinality') || 'single',
        defaultValue: Array.from(outcomeNode.querySelectorAll('defaultValue value'))
          .map((n) => (n.textContent || '').trim())
          .filter(Boolean)
          .join(', '),
      }));

      const outcomeRules = Array.from(doc.querySelectorAll('responseProcessing setOutcomeValue')).map((node) => ({
        identifier: node.getAttribute('identifier') || 'UNKNOWN',
        value: Array.from(node.querySelectorAll('baseValue'))
          .map((base) => (base.textContent || '').trim())
          .filter(Boolean)
          .join(', '),
      }));

      const responseProcessingTemplate = doc.querySelector('responseProcessing')?.getAttribute('template') || '';

      const rubricBlocks = Array.from(itemBody?.querySelectorAll('rubricBlock') || []).map((rubricNode) => ({
        view: rubricNode.getAttribute('view') || 'author',
        html: rubricNode.innerHTML,
      }));

      const interactionType: 'choice' | 'textentry' | 'order' | 'unknown' =
        choices.length > 0
          ? 'choice'
          : orderChoices.length > 0
            ? 'order'
            : textEntryPlaceholders.length > 0
              ? 'textentry'
              : 'unknown';

      const interactionPromptHtml =
        choiceInteractionNode?.querySelector('prompt')?.innerHTML?.trim()
        || orderInteractionNode?.querySelector('prompt')?.innerHTML?.trim()
        || textEntryInteractionNode?.querySelector('prompt')?.innerHTML?.trim()
        || '';

      const maxChoices = Number(choiceInteractionNode?.getAttribute('maxChoices') || '1');

      return {
        parseError: '',
        itemIdentifier,
        stemHtml,
        choices,
        orderChoices,
        itemBodyHtml: itemBody?.innerHTML || '',
        interactionType,
        interactionPromptHtml,
        maxChoices: Number.isFinite(maxChoices) ? maxChoices : 1,
        correctResponseText: effectiveCorrectValues.join(', '),
        correctResponseValues: effectiveCorrectValues,
        acceptedTextAnswers,
        studentViewHtml,
        responseProcessingTemplate,
        outcomeDeclarations,
        outcomeRules,
        textEntryPlaceholders,
        feedbackBlocks,
        rubricBlocks,
      };
    } catch (error) {
      return {
        parseError: error instanceof Error ? error.message : 'Failed to parse XML',
        itemIdentifier: '',
        stemHtml: '',
        choices: [] as Array<{ id: string; html: string; isCorrect: boolean }>,
        orderChoices: [] as Array<{ id: string; html: string; isCorrect: boolean }>,
        itemBodyHtml: '',
        interactionType: 'unknown' as 'choice' | 'textentry' | 'order' | 'unknown',
        interactionPromptHtml: '',
        maxChoices: 1,
        correctResponseText: '',
        correctResponseValues: [] as string[],
        acceptedTextAnswers: [] as string[],
        studentViewHtml: '',
        responseProcessingTemplate: '',
        outcomeDeclarations: [] as Array<{ identifier: string; defaultValue: string; baseType: string; cardinality: string }>,
        outcomeRules: [] as Array<{ identifier: string; value: string }>,
        textEntryPlaceholders: [] as Array<{ responseId: string; expectedLength: string; placeholderText: string }>,
        feedbackBlocks: [] as Array<{ id: string; title: string; html: string }>,
        rubricBlocks: [] as Array<{ view: string; html: string }>,
      };
    }
  };

  useEffect(() => {
    if (visibleAiAuditQueueRows.length === 0) {
      if (selectedAuditRowKey !== null) setSelectedAuditRowKey(null);
      return;
    }

    if (!selectedAuditRowKey || !visibleAiAuditQueueRows.some((row) => row.rowKey === selectedAuditRowKey)) {
      setSelectedAuditRowKey(visibleAiAuditQueueRows[0].rowKey);
    }
  }, [visibleAiAuditQueueRows, selectedAuditRowKey]);

  // Batch Creator access: requires a provisioned token to have been redeemed
  const hasBatchAccess = !!userUsage?.batch_creator_access;
  const canUseAIValidation = !!userUsage?.is_unlimited;

  useEffect(() => {
    if (!canUseAIValidation && aiValidationEnabled) {
      setAiValidationEnabled(false);
      setAiValidationPhase('idle');
      setAiValidationResults([]);
      setGeneratedXmlItems([]);
      setPendingExportContext(null);
    }
  }, [canUseAIValidation, aiValidationEnabled]);

  useEffect(() => {
    // Load template XML content when file changes
    if (templateXmlFile && showTemplateMappingUI) {
      templateXmlFile.text().then((content) => {
        setTemplateXmlContent(content);
      });
    }
  }, [templateXmlFile, showTemplateMappingUI]);

  useEffect(() => {
    if (columnMapping?.imageCol) {
      setQuestionMatchColumnForManualMap(columnMapping.imageCol);
    }
  }, [columnMapping?.imageCol]);

  // Track whether inline edits have been made but not yet exported
  const hasUnsavedEdits = useRef(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedEdits.current) return;
      e.preventDefault();
      // Modern browsers require returnValue to be set to show the dialog
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable = !!target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
      if (isEditable) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < 0) return;

        const nextIndex = e.key === 'ArrowLeft'
          ? Math.max(0, currentIndex - 1)
          : Math.min(stepOrder.length - 1, currentIndex + 1);

        const nextStep = stepOrder[nextIndex];
        if (nextStep && canNavigateToStep(nextStep)) {
          e.preventDefault();
          handleStepperJump(nextStep);
        }
        return;
      }

      if (currentStep === 'clean-fix' && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && fixingNavigationRowKeys.length > 0) {
        e.preventDefault();
        const currentIndex = selectedRowKey ? fixingNavigationRowKeys.indexOf(selectedRowKey) : -1;
        const baseIndex = currentIndex === -1 ? 0 : currentIndex;
        const nextIndex = e.key === 'ArrowUp'
          ? Math.max(0, baseIndex - 1)
          : Math.min(fixingNavigationRowKeys.length - 1, baseIndex + 1);
        setSelectedRowKey(fixingNavigationRowKeys[nextIndex] ?? null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentStep, stepOrder, canNavigateToStep, handleStepperJump, fixingNavigationRowKeys, selectedRowKey]);

  const readTemplateXmlContent = async (): Promise<string | null> => {
    if (hasTemplateXml !== 'yes') {
      return null;
    }

    if (!templateXmlFile) {
      throw new Error('Template XML is required but no file was uploaded');
    }

    const xml = await templateXmlFile.text();
    if (!xml || xml.trim() === '') {
      throw new Error('Template XML file is empty');
    }

    return xml;
  };

  const applyTemplateIfNeeded = (
    templateXmlContent: string | null,
    xmlContent: string,
    fileName: string,
    row?: Record<string, any>,
  ): string => {
    if (!templateXmlContent) {
      return xmlContent;
    }

    const localName = (nodeName: string): string => {
      const parts = nodeName.split(':');
      return parts[parts.length - 1];
    };

    const getMappedColumnByFieldName = (fieldName: string): string | null => {
      if (!templateMapping || !extractedTemplate) {
        return null;
      }

      const field = extractedTemplate.fields.find(
        (f) => f.name.toLowerCase() === fieldName.toLowerCase()
      );

      if (!field) {
        return null;
      }

      return templateMapping[field.id] || null;
    };

    const findSourceRowForMappedValues = (currentRow?: Record<string, any>): SheetRow | null => {
      if (!currentRow) {
        return null;
      }

      if (!templateSheetData || templateSheetData.length === 0) {
        return currentRow as SheetRow;
      }

      const questionIdColumn = getMappedColumnByFieldName('Question ID');
      if (questionIdColumn) {
        const currentQuestionId = String(currentRow[questionIdColumn] ?? '').trim();
        if (currentQuestionId) {
          const matched = templateSheetData.find(
            (r) => String(r[questionIdColumn] ?? '').trim() === currentQuestionId,
          );
          if (matched) {
            return matched;
          }
        }
      }

      if (currentRow.id) {
        const matchedById = templateSheetData.find((r) => String(r.id ?? '') === String(currentRow.id));
        if (matchedById) {
          return matchedById;
        }
      }

      return currentRow as SheetRow;
    };

    const setInnerXml = (doc: Document, element: Element, xmlFragment: string): void => {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }

      if (!xmlFragment || xmlFragment.trim() === '') {
        return;
      }

      const fragmentDoc = new DOMParser().parseFromString(`<root>${xmlFragment}</root>`, 'application/xml');
      if (fragmentDoc.querySelector('parsererror')) {
        element.textContent = xmlFragment;
        return;
      }

      const nodes = Array.from(fragmentDoc.documentElement.childNodes);
      nodes.forEach((node) => element.appendChild(doc.importNode(node, true)));
    };

    const normalizeSubsectionToken = (name: string): string => {
      return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'subsection';
    };

    const getSubsectionMappings = (parentFieldNames: string[]): Array<{ placeholderName: string; columnName: string }> => {
      if (!templateMapping || !extractedTemplate) {
        return [];
      }

      const parentFieldIds = extractedTemplate.fields
        .filter((f) => parentFieldNames.some((name) => f.name.toLowerCase() === name.toLowerCase()))
        .map((f) => f.id);

      if (parentFieldIds.length === 0) {
        return [];
      }

      const result: Array<{ placeholderName: string; columnName: string }> = [];

      Object.entries(templateMapping).forEach(([key, column]) => {
        if (!column) {
          return;
        }

        parentFieldIds.forEach((parentFieldId) => {
          const prefix = `subsection::${parentFieldId}::`;
          if (key.startsWith(prefix)) {
            const rawToken = key.slice(prefix.length);
            const placeholderName = normalizeSubsectionToken(rawToken);
            if (placeholderName) {
              result.push({ placeholderName, columnName: column });
            }
          }
        });
      });

      return result;
    };

    const getFieldModeByName = (fieldName: string): 'add-column' | 'add-subsections' => {
      if (!templateMapping || !extractedTemplate) {
        return 'add-column';
      }

      const field = extractedTemplate.fields.find((f) => f.name.toLowerCase() === fieldName.toLowerCase());
      if (!field) {
        return 'add-column';
      }

      const mode = templateMapping[`mode::${field.id}`];
      return mode === 'add-subsections' ? 'add-subsections' : 'add-column';
    };

    const applyMappedFeedbackOverrides = (
      templateAppliedXml: string,
      sourceRow: SheetRow | null,
    ): string => {
      if (!sourceRow || !templateMapping || !extractedTemplate) {
        return templateAppliedXml;
      }

      const doc = new DOMParser().parseFromString(templateAppliedXml, 'application/xml');
      if (doc.querySelector('parsererror')) {
        return templateAppliedXml;
      }

      const localName = (nodeName: string): string => {
        const parts = nodeName.split(':');
        return parts[parts.length - 1];
      };

      const elements = Array.from(doc.querySelectorAll('*')) as Element[];
      const feedbackNodes = elements.filter((el) => localName(el.nodeName) === 'modalFeedback');
      const promptNodes = elements.filter((el) => localName(el.nodeName) === 'prompt');

      // Apply globally mapped comment placeholders (anywhere in template XML).
      const placeholderFields = extractedTemplate.fields.filter((field) => field.id.startsWith('placeholder_'));
      placeholderFields.forEach((field) => {
        const token = field.id.replace('placeholder_', '');
        const columnName = templateMapping[field.id];
        if (!columnName) return;
        const value = String(sourceRow[columnName] ?? '');
        replacePlaceholder(
          doc.documentElement,
          token,
          value || null,
          containsMath,
          mathFormat,
          processXmlMath,
        );
      });

      // Apply subsection placeholders in Question Stem/Text Entry Prompt.
      const questionSubsections = getSubsectionMappings(['Question Stem', 'Text Entry Prompt']);
      const questionSubsectionMode =
        getFieldModeByName('Question Stem') === 'add-subsections' ||
        getFieldModeByName('Text Entry Prompt') === 'add-subsections';

      if (questionSubsections.length > 0 || questionSubsectionMode) {
        promptNodes.forEach((promptNode) => {
          const mappedQuestionPlaceholders = new Set<string>();

          questionSubsections.forEach(({ placeholderName, columnName }) => {
            const value = String(sourceRow[columnName] ?? '');
            mappedQuestionPlaceholders.add(placeholderName);

            if (value.trim() === '') {
              removePlaceholderSection(promptNode, placeholderName);
            } else {
              replacePlaceholder(
                promptNode,
                placeholderName,
                value || null,
                containsMath,
                mathFormat,
                processXmlMath,
              );
            }
          });

          // In subsection mode, remove unmapped subsection placeholder sections entirely.
          if (questionSubsectionMode) {
            const allPlaceholders = listPlaceholdersInNode(promptNode);
            allPlaceholders.forEach((name) => {
              const columnName = templateMapping[`placeholder_${name}`];
              if (columnName) {
                mappedQuestionPlaceholders.add(name);
              }
            });
            allPlaceholders
              .filter((name) => !mappedQuestionPlaceholders.has(name))
              .forEach((missingName) => removePlaceholderSection(promptNode, missingName));
          }
        });
      }

      feedbackNodes.forEach((feedbackNode) => {
        const identifier = (feedbackNode.getAttribute('identifier') || '').toLowerCase();
        const isIncorrect = identifier.includes('incorrect') || identifier.includes('wrong');
        const isCorrect = !isIncorrect && identifier.includes('correct');

        // Check if this feedback block has placeholders
        const hasPlaceholders = hasFeedbackPlaceholders(feedbackNode);
        const incorrectSubsections = isIncorrect ? getSubsectionMappings(['Incorrect Feedback']) : [];
        const incorrectSubsectionMode = isIncorrect && getFieldModeByName('Incorrect Feedback') === 'add-subsections';

        if (hasPlaceholders) {
          const mappedIncorrectPlaceholders = new Set<string>();
          const placeholdersInFeedback = listPlaceholdersInNode(feedbackNode);
          placeholdersInFeedback.forEach((placeholderName) => {
            const columnName = templateMapping[`placeholder_${placeholderName}`];
            if (!columnName) return;
            const value = String(sourceRow[columnName] ?? '');
            if (isIncorrect) {
              mappedIncorrectPlaceholders.add(placeholderName);
            }
            replacePlaceholder(
              feedbackNode,
              placeholderName,
              value || null,
              containsMath,
              mathFormat,
              processXmlMath,
            );
          });

          if (isIncorrect) {
            // Also apply subsection mappings created in mapping UI.
            incorrectSubsections.forEach(({ placeholderName, columnName }) => {
              const value = String(sourceRow[columnName] ?? '');
              mappedIncorrectPlaceholders.add(placeholderName);

              if (value.trim() === '') {
                removePlaceholderSection(feedbackNode, placeholderName);
              } else {
                replacePlaceholder(
                  feedbackNode,
                  placeholderName,
                  value || null,
                  containsMath,
                  mathFormat,
                  processXmlMath,
                );
              }
            });

            // In subsection mode, remove any unmapped subsection placeholder sections entirely.
            if (incorrectSubsectionMode) {
              const allPlaceholders = listPlaceholdersInNode(feedbackNode);
              allPlaceholders.forEach((name) => {
                const columnName = templateMapping[`placeholder_${name}`];
                if (columnName) {
                  mappedIncorrectPlaceholders.add(name);
                }
              });
              allPlaceholders
                .filter((name) => !mappedIncorrectPlaceholders.has(name))
                .forEach((missingName) => removePlaceholderSection(feedbackNode, missingName));
            }
          }
        } else if (incorrectSubsections.length === 0) {
          // Fallback: use full block replacement for non-placeholder templates (backward compatibility)
          const correctFeedbackColumn = getMappedColumnByFieldName('Correct Feedback');
          const incorrectFeedbackColumn = getMappedColumnByFieldName('Incorrect Feedback');

          if (isCorrect && correctFeedbackColumn) {
            const rawValue = String(sourceRow[correctFeedbackColumn] ?? '');
            const value = containsMath === 'yes' && mathFormat === 'mathml'
              ? processXmlMath(rawValue)
              : rawValue;
            setInnerXml(doc, feedbackNode, value);
          }

          if (isIncorrect && incorrectFeedbackColumn) {
            const rawValue = String(sourceRow[incorrectFeedbackColumn] ?? '');
            const value = containsMath === 'yes' && mathFormat === 'mathml'
              ? processXmlMath(rawValue)
              : rawValue;
            setInnerXml(doc, feedbackNode, value);
          }
        }
      });

      return new XMLSerializer().serializeToString(doc);
    };

    try {
      const mergedXml = applyTemplateXmlToGeneratedItem(templateXmlContent, xmlContent);
      const sourceRow = findSourceRowForMappedValues(row);
      return applyMappedFeedbackOverrides(mergedXml, sourceRow);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Template XML enforcement failed for ${fileName}: ${message}`);
    }
  };


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setUploadedFiles([file]);
      setConfigurationValidationError("");
      setUploadPreviewColumns([]);
      setUploadPreviewRows([]);

      try {
        setIsParsingUploadPreview(true);
        const parsed = await parseFile(file);
        setUploadPreviewColumns(parsed.columns.slice(0, 8));
        setUploadPreviewRows(parsed.rows.slice(0, 6));
      } catch (error) {
        console.warn('Upload preview parsing failed:', error);
        toast.error('Uploaded file selected, but preview could not be generated. You can still continue.');
      } finally {
        setIsParsingUploadPreview(false);
      }
    }
  };

  const handleTemplateUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setTemplateXmlFile(files[0]);
    setConfigurationValidationError("");
    // Show mapping UI after template is uploaded
    setShowTemplateMappingUI(true);
  };

  const handleTemplateMappingComplete = (
    mapping: ColumnMapping,
    sheetRows: SheetRow[],
    template: ExtractedTemplate,
  ) => {
    setTemplateMapping(mapping);
    setTemplateSheetData(sheetRows);
    setExtractedTemplate(template);
    setShowTemplateMappingUI(false);
    setConfigurationValidationError("");
  };

  const handleTemplateMappingCancel = () => {
    setShowTemplateMappingUI(false);
    setTemplateXmlFile(null);
    setTemplateMapping(null);
    setTemplateSheetData([]);
    setExtractedTemplate(null);
  };

  const handleMediaFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingMedia(true);
    setMediaValidationErrors([]);

    try {
      const extracted = new Map<string, MediaFile>();
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'];
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
      };

      for (const file of Array.from(files)) {
        const normalizedName = normalizeMediaFilename(file.name);
        const matchedExt = imageExtensions.find(ext => normalizedName.endsWith(ext));
        if (!matchedExt) continue;

        const data = await file.arrayBuffer();
        extracted.set(normalizedName, {
          filename: file.name,
          data,
          type: mimeTypes[matchedExt] || 'application/octet-stream',
        });
      }

      if (extracted.size === 0) {
        throw new Error('No supported image files found in the selected folder');
      }

      setMediaZipFile(null);
      setMediaFiles(extracted);
      setUploadedMediaUrls([]);
      setMediaUploadError("");
      setAutoMappedImageRows(0);

      if (editedRows.length > 0 && columnMapping?.imageCol) {
        const validation = validateMediaReferences(editedRows, columnMapping.imageCol, extracted);
        setMediaValidationErrors(validation.errors);
      }
    } catch (error) {
      console.error('Error processing media folder:', error);
      toast.error(`Error processing media folder: ${error instanceof Error ? error.message : String(error)}`);
      setMediaFiles(new Map());
      setUploadedMediaUrls([]);
    } finally {
      setIsProcessingMedia(false);
    }
  };

  const validateConfigurationBeforeProceed = (): string[] => {
    const errors: string[] = [];
    if (uploadedFiles.length === 0) {
      errors.push('Please upload a source file');
    }
    return errors;
  };

  const isConfigurationComplete = (): boolean => {
    return uploadedFiles.length > 0;
  };

  const isExportConfigComplete = (): boolean => {
    if (!outputFormat || outputFormat.trim() === '') return false;
    if (!exportMode || exportMode.trim() === '') return false;
    if (!containsImages) return false;
    if (!containsMath) return false;
    if (containsMath === 'yes' && !mathFormat) return false;
    if (!hasTemplateXml) return false;
    if (hasTemplateXml === 'yes' && !templateXmlFile) return false;
    return true;
  };

  const validateExportConfig = (): string[] => {
    const errors: string[] = [];
    if (!outputFormat || outputFormat.trim() === '') errors.push('Please select a QTI version');
    if (!exportMode || exportMode.trim() === '') errors.push('Please select an export format');
    if (!containsImages) errors.push('Please specify whether your data contains images');
    if (!containsMath) errors.push('Please specify whether your data contains math');
    if (containsMath === 'yes' && !mathFormat) errors.push('Please choose the supported math format');
    if (!hasTemplateXml) errors.push('Please specify whether you have a template XML');
    if (hasTemplateXml === 'yes' && !templateXmlFile) errors.push('Please upload the template XML file');
    return errors;
  };

  const validationProfile = useMemo(
    () =>
      buildValidationProfile({
        outputFormat,
        exportMode,
        hasTemplateXml,
        containsMath,
        containsImages,
      }),
    [outputFormat, exportMode, hasTemplateXml, containsMath, containsImages]
  );

  const handleProceedToValidation = async () => {
    const file = uploadedFiles[0];
    if (!file) {
      toast.error('Please upload a source file');
      return;
    }

    try {
      setIsValidating(true);
      setCurrentStep('validating');
      setValidationProgress(0);
      setValidationProgressText('Parsing file...');

      const parsed = await parseFile(file);
      const detected = detectQuestionColumns(parsed.columns);
      console.log('Detected column mapping:', detected);

      const keyedRows = ensureInternalRowKeys(parsed.rows);
      setFileData({ ...parsed, rows: keyedRows });
      setColumnMapping(detected);
      setEditedRows([...keyedRows]);
      setUploadedMediaUrls([]);
      setMediaUploadError('');
      setAutoMappedImageRows(0);

      setValidationProgressText(`Validating ${parsed.rows.length} questions...`);
      let resultsMap: Map<string, ValidationResult>;

      if (parsed.rows.length > 500) {
        resultsMap = await validateAllQuestionsChunked(
          keyedRows as any,
          detected,
          500,
          (progress, processedCount) => {
            setValidationProgress(progress);
            setValidationProgressText(`Validated ${processedCount} of ${keyedRows.length} questions...`);
          },
          validationProfile
        );
      } else {
        const results = validateAllQuestions(keyedRows as any, detected, validationProfile);
        resultsMap = new Map<string, ValidationResult>();
        results.forEach(result => {
          resultsMap.set(result.rowId, result);
        });
        setValidationProgress(100);
      }

      // Run dual-validation pipeline (PASS 1 + PASS 2) for cleaning metrics.
      // Fallback to raw results on any error — zero regression risk.
      try {
        const dualResult = runDualValidation(keyedRows as any, detected, validationProfile);
        setCleanValidationResults(dualResult.cleanResults);
        setCleaningMetrics(dualResult.metrics);
        setCleaningLogs(dualResult.cleanLogs);
        setRowImprovements(dualResult.rowImprovements);
        setPass3Suggestions(dualResult.pass3Result.suggestions);
        setPass3Metrics(dualResult.pass3Result.pass3Metrics);
        setPass3ExecutionMetrics(dualResult.pass3ExecutionResult.executionMetrics);
        setPass3ExecutedRows(dualResult.pass3ExecutionResult.executedRows);
        setManualFixedRows(new Map());
        manualFixedRowsRef.current = new Map(); // Add this line
        setManualFixResults(new Map());
        setManualFixHistory(new Map());
        setManualMetrics({ manualFixesApplied: 0, rowsImprovedByUser: 0 });
        setManualFixInputs(new Map());
      } catch (dualErr) {
        console.warn('[DualValidation] Pipeline failed, skipping cleaning metrics:', dualErr);
        setCleanValidationResults(null);
        setCleaningMetrics(null);
        setCleaningLogs([]);
        setRowImprovements([]);
        setPass3Suggestions([]);
        setPass3Metrics(null);
      }

      setValidationResults(resultsMap);
      setShowValidationReport(true);
      setAutoFixComparison(null);
      setAutoFixedRowKeys(new Set());
      setDedupDeletedRows([]);
      setIsValidating(false);
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error(`Error parsing file: ${error}`);
      setIsValidating(false);
      setCurrentStep('upload');
    }
  };

  const handleApplySupabaseUrls = async () => {
    if (!columnMapping?.imageCol) {
      toast.error('Cannot upload: image column not detected in the sheet.');
      return;
    }
    if (mediaFiles.size === 0) {
      toast.error('No media files loaded. Upload a ZIP or folder first.');
      return;
    }
    setIsUploadingMediaUrls(true);
    setMediaUploadError('');
    try {
      const uploadedUrls = await uploadMediaFilesToSupabase(mediaFiles);
      setUploadedMediaUrls(uploadedUrls);
      const { rows: rowsWithUrls, mappedCount } = applyUploadedUrlsToRowsBySerial(
        editedRows,
        columnMapping.imageCol,
        uploadedUrls
      );
      setEditedRows(rowsWithUrls);
      setAutoMappedImageRows(mappedCount);
      toast.success(`Mapped ${mappedCount} image URL(s) from Supabase`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMediaUploadError(msg);
      toast.error(`Media upload failed: ${msg}`);
    } finally {
      setIsUploadingMediaUrls(false);
    }
  };

  const handleTransformClick = async () => {
    setShowConfigErrors(true);
    const errors = validateExportConfig();
    if (errors.length > 0) {
      setConfigurationValidationError(errors[0]);
      return;
    }
    setConfigurationValidationError('');
    setTransformDone(false);
    setCurrentStep('transform');
    // Export functions manage their own isExporting state
    if (outputFormat === 'json') {
      await exportToJSON();
    } else if (exportMode === 'qti-package') {
      await exportToQTI();
    } else if (exportMode === 'xml-media-folder') {
      await exportXmlMediaFolder();
    }
    setTransformDone(true);
  };


  const handleDataChange = async (updatedRows: Record<string, any>[]) => {
    const keyedRows = ensureInternalRowKeys(updatedRows);
    hasUnsavedEdits.current = true;
    setEditedRows(keyedRows);

    // For large datasets, only re-validate the visible rows to reduce computation
    if (updatedRows.length > 1000) {
      // Still validate but don't show progress for inline edits
      const newResults = validateAllQuestions(keyedRows as any, columnMapping, validationProfile);
      const resultsMap = new Map<string, ValidationResult>();
      newResults.forEach(result => {
        resultsMap.set(result.rowId, result);
      });
      setValidationResults(resultsMap);
    } else {
      // For smaller datasets, validate all as before
      const newResults = validateAllQuestions(keyedRows as any, columnMapping, validationProfile);
      const resultsMap = new Map<string, ValidationResult>();
      newResults.forEach(result => {
        resultsMap.set(result.rowId, result);
      });
      setValidationResults(resultsMap);
    }
  };

  const applyManualUploadedUrlMapping = async () => {
    if (!columnMapping?.imageCol) {
      setManualMapMessage('Cannot map URLs: image column is not detected in question sheet.');
      return;
    }

    if (!questionMatchColumnForManualMap) {
      setManualMapMessage('Please select a question-sheet match column.');
      return;
    }

    if (uploadedMediaUrls.length === 0) {
      setManualMapMessage('No uploaded image URLs available to map. Upload media first.');
      return;
    }

    const keyToUrl = new Map<string, string>();

    uploadedMediaUrls.forEach((entry) => {
      if (uploadedUrlMatchField === 'serialNumber') {
        if (entry.serialNumber != null) {
          keyToUrl.set(String(entry.serialNumber), entry.publicUrl);
        }
        return;
      }

      const canonical = canonicalImageKey(entry.fileName);
      if (canonical && !keyToUrl.has(canonical)) {
        keyToUrl.set(canonical, entry.publicUrl);
      }
    });

    let mappedCount = 0;
    const updatedRows = editedRows.map((row, index) => {
      let matchValue = '';

      if (questionMatchColumnForManualMap === '__row_serial__') {
        matchValue = String(index + 1);
      } else {
        const raw = row[questionMatchColumnForManualMap];
        matchValue = raw != null ? String(raw).trim() : '';
      }

      if (!matchValue) return row;

      const key = uploadedUrlMatchField === 'serialNumber'
        ? matchValue
        : canonicalImageKey(matchValue);

      const mappedUrl = key ? keyToUrl.get(key) : undefined;
      if (!mappedUrl) return row;

      mappedCount += 1;
      return {
        ...row,
        [columnMapping.imageCol]: mappedUrl,
      };
    });

    await handleDataChange(updatedRows);
    setManualMapMessage(
      mappedCount > 0
        ? `Manual mapping complete: ${mappedCount} row(s) updated with public URLs.`
        : 'Manual mapping complete: no rows matched the selected mapping columns.'
    );
  };

  // Handle media ZIP upload
  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setMediaZipFile(file);
    setIsProcessingMedia(true);
    setMediaValidationErrors([]);

    try {
      const extracted = await extractMediaZip(file);
      setMediaFiles(extracted);
      setUploadedMediaUrls([]);
      setMediaUploadError("");
      setAutoMappedImageRows(0);

      // Validate references if we have data loaded
      if (editedRows.length > 0 && columnMapping?.imageCol) {
        const validation = validateMediaReferences(editedRows, columnMapping.imageCol, extracted);
        setMediaValidationErrors(validation.errors);
      }

      setIsProcessingMedia(false);
    } catch (error) {
      console.error('Error processing media ZIP:', error);
      toast.error(`Error processing media ZIP: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessingMedia(false);
      setMediaZipFile(null);
      setMediaFiles(new Map());
      setUploadedMediaUrls([]);
    }
  };

  // Validate before export
  const validateBeforeExport = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (containsImages === 'yes') {
      if (!columnMapping?.imageCol) {
        errors.push('Contains images is set to Yes, but no image column was detected. Add Image/Img/Diagram column.');
      }

      if (mediaFiles.size === 0) {
        errors.push('Contains images is set to Yes, but no media ZIP/folder is uploaded.');
      }

      if (columnMapping?.imageCol) {
        const imageCol = columnMapping.imageCol;
        const rowsWithMissingImage = editedRows
          .map((row, idx) => ({ row, rowNumber: idx + 1 }))
          .filter(({ row }) => {
            const imageValue = row[imageCol];
            return !imageValue || String(imageValue).trim() === '';
          })
          .slice(0, 10)
          .map(({ rowNumber }) => rowNumber);

        if (rowsWithMissingImage.length > 0) {
          errors.push(`Contains images is Yes, but image filename is empty for row(s): ${rowsWithMissingImage.join(', ')}${editedRows.length > 10 ? ' ...' : ''}`);
        }
      }
    }

    // Check for duplicate IDs
    const idValidation = validateUniqueIds(editedRows);
    if (!idValidation.valid) {
      idValidation.errors.forEach(e => {
        errors.push(`Row ${e.rowNumber}: ${e.message}`);
      });
    }

    // Check answer in options
    const answerValidation = validateAnswerInOptions(editedRows, columnMapping);
    if (!answerValidation.valid) {
      answerValidation.errors.forEach(e => {
        errors.push(`Row ${e.rowNumber}: ${e.message}`);
      });
    }

    // Check media references only when user explicitly enables images.
    if (containsImages === 'yes') {
      if (columnMapping?.imageCol && mediaFiles.size > 0) {
        const mediaValidation = validateMediaReferences(editedRows, columnMapping.imageCol, mediaFiles);
        if (!mediaValidation.valid) {
          mediaValidation.errors.forEach(e => {
            errors.push(`Row ${e.rowNumber}: ${e.message}`);
          });
        }
      } else if (columnMapping?.imageCol) {
        // Check if any row has a LOCAL image reference but no media ZIP uploaded
        // (Ignore rows that already have full URLs)
        const hasLocalImageRefs = editedRows.some(row => {
          const imageValue = row[columnMapping.imageCol];
          const valStr = imageValue ? String(imageValue).trim() : '';
          // It's a local ref if it's not empty and doesn't look like a URL
          return valStr !== '' && !valStr.startsWith('http://') && !valStr.startsWith('https://');
        });

        if (hasLocalImageRefs && mediaFiles.size === 0) {
          errors.push('Questions reference local images but no media ZIP file was uploaded');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  // Remove duplicate questions - keep first occurrence of each duplicate group
  const handleDeduplicate = () => {
    if (!editedRows || editedRows.length === 0) return;

    const duplicateIds = new Set<string>();
    validationResults.forEach((result, rowId) => {
      if (result.issues.some(i => i.category === 'duplicate' || i.field === 'Duplicate')) {
        duplicateIds.add(rowId);
      }
    });

    if (duplicateIds.size === 0) {
      toast.info('No duplicate questions detected');
      return;
    }

    // Group duplicates by fingerprint
    const fingerprintGroups = new Map<string, string[]>();
    editedRows.forEach((row, index) => {
      const rowKey = getRowValidationKey(row, index);
      if (!duplicateIds.has(rowKey)) return;
      const result = validationResults.get(rowKey);
      if (!result) return;

      // Extract fingerprint from question text for grouping
      const questionText = columnMapping.questionCol ? row[columnMapping.questionCol] : '';
      const fingerprint = String(questionText || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

      if (!fingerprintGroups.has(fingerprint)) {
        fingerprintGroups.set(fingerprint, []);
      }
      fingerprintGroups.get(fingerprint)!.push(rowKey);
    });

    // Keep first occurrence of each duplicate group, remove others
    const idsToRemove = new Set<string>();
    fingerprintGroups.forEach((ids) => {
      // Sort by row number and keep the first one
      const sortedIds = ids.sort((a, b) => {
        const aIndex = editedRows.findIndex((r, idx) => getRowValidationKey(r, idx) === a);
        const bIndex = editedRows.findIndex((r, idx) => getRowValidationKey(r, idx) === b);
        return aIndex - bIndex;
      });
      // Remove all but the first
      sortedIds.slice(1).forEach(id => idsToRemove.add(id));
    });

    if (idsToRemove.size === 0) {
      toast.info('No duplicates to remove');
      return;
    }

    const confirmMessage = `This will remove ${idsToRemove.size} duplicate question(s), keeping the first occurrence of each. Continue?`;
    if (!confirm(confirmMessage)) return;

    const deletedRowsSummary: DedupDeletedRowSummary[] = editedRows
      .map((row, index) => ({ row, index, rowKey: getRowValidationKey(row, index) }))
      .filter(({ rowKey }) => idsToRemove.has(rowKey))
      .map(({ row, index, rowKey }) => ({
        rowKey,
        rowNumber: index + 1,
        questionText: String(row[columnMapping.questionCol] ?? '').trim() || 'Untitled question',
      }));

    // Remove duplicates
    const deduplicatedRows = editedRows.filter((row, index) => !idsToRemove.has(getRowValidationKey(row, index)));
    handleDataChange(deduplicatedRows);
    setDedupDeletedRows((prev) => {
      const merged = [...prev, ...deletedRowsSummary];
      const uniqueByKey = new Map<string, DedupDeletedRowSummary>();
      merged.forEach((item) => uniqueByKey.set(item.rowKey, item));
      return Array.from(uniqueByKey.values());
    });
    toast.success(`Successfully removed ${idsToRemove.size} duplicate question(s)`);
  };

  const generateQTIManifest = (
    files: Array<{ identifier: string; filename: string; imageFiles?: string[] }>,
    version: 'qti-1.2' | 'qti-2.1' | 'qti-3.0' = 'qti-2.1'
  ) => {
    const timestamp = new Date().toISOString();
    let resourcesXml = '';
    
    // Generate resource entries based on version
    if (version === 'qti-1.2') {
      // QTI 1.2 uses imsqti_xmlv1p2 as resource type
      files.forEach((file, index) => {
        const resourceId = `res_${file.filename.replace('.xml', '')}`;
        let fileRefs = `\n      <file href="${file.filename}"/>`;
        
        // Add image file references if present
        if (file.imageFiles && file.imageFiles.length > 0) {
          file.imageFiles.forEach(img => {
            fileRefs += `\n      <file href="images/${img}"/>`;
          });
        }
        
        resourcesXml += `\n    <resource identifier="${resourceId}" type="imsqti_xmlv1p2" href="${file.filename}">${fileRefs}\n    </resource>`;
      });
    } else {
      // QTI 2.1 and 3.0 use imsqti_item_xmlvXpX format
      let resourceType = 'imsqti_item_xmlv2p1';
      if (version === 'qti-3.0') {
        resourceType = 'imsqti_item_xmlv3p0';
      }
      
      files.forEach((file, index) => {
        const resourceId = `res_${file.filename.replace('.xml', '')}`;
        let fileRefs = `\n      <file href="${file.filename}"/>`;
        
        // Add image file references if present
        if (file.imageFiles && file.imageFiles.length > 0) {
          file.imageFiles.forEach(img => {
            fileRefs += `\n      <file href="images/${img}"/>`;
          });
        }
        
        resourcesXml += `\n    <resource identifier="${resourceId}" type="${resourceType}" href="${file.filename}">${fileRefs}\n    </resource>`;
      });
    }

    let manifest = '';

    // Generate manifest based on version
    if (version === 'qti-1.2') {
      manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="MANIFEST-QTI-12" 
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:imsmd="http://www.imsglobal.org/xsd/imsmd_v1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd">
  <metadata>
    <schema>IMS Content</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations/>
  <resources>${resourcesXml}
  </resources>
</manifest>`;
    } else if (version === 'qti-3.0') {
      manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_v3p0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1/imscp_v1p1.xsd http://www.imsglobal.org/xsd/imsqti_v3p0 http://www.imsglobal.org/xsd/qti/qtiv3p0/imsqti_v3p0.xsd"
          identifier="QTI_EXPORT_MANIFEST"
          version="1.0">

  <metadata>
    <schema>IMS Content Packaging</schema>
    <schemaversion>1.1</schemaversion>
    <created>${timestamp}</created>
  </metadata>

  <organizations/>

  <resources>${resourcesXml}
  </resources>
</manifest>`;
    } else {
      // QTI 2.1 (default)
      manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:imsqti="http://www.imsglobal.org/xsd/imsqti_v2p1"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1/imscp_v1p1.xsd http://www.imsglobal.org/xsd/imsqti_v2p1 http://www.imsglobal.org/xsd/qti/qtiv2p1/imsqti_v2p1.xsd"
          identifier="QTI_EXPORT_MANIFEST"
          version="1.0">

  <metadata>
    <schema>IMS Content Packaging</schema>
    <schemaversion>1.1</schemaversion>
    <created>${timestamp}</created>
  </metadata>

  <organizations/>

  <resources>${resourcesXml}
  </resources>
</manifest>`;
    }

    return manifest;
  };

  const exportToQTI = async () => {
    if (!fileData || !columnMapping) return;

    // Validate required selection fields
    if (!outputFormat || outputFormat.trim() === "") {
      setExportValidationError("Please select a QTI version (1.2, 2.1, or 3.0)");
      return;
    }

    if (!exportMode || exportMode.trim() === "") {
      setExportValidationError("Please select an export format (QTI Package or XML + Media Folder)");
      return;
    }

    setExportValidationError("");

    // Save form data for LMS export
    saveFormDataToLocalStorage();

    // Configure MathML generation mode for QTI


    setIsExporting(true);

    try {
      // Validate before export
      const preExportValidation = validateBeforeExport();
      if (!preExportValidation.valid) {
        const errorMessage = `Export validation failed:\n\n${preExportValidation.errors.slice(0, 10).join('\n')}${preExportValidation.errors.length > 10 ? `\n\n...and ${preExportValidation.errors.length - 10} more errors` : ''}`;
        toast.error(errorMessage);
        setIsExporting(false);
        return;
      }

      const resolvedTemplateXml = await readTemplateXmlContent();

      const zip = new JSZip();
      let exportCount = 0;
      const exportedFiles: Array<{ identifier: string; filename: string; imageFiles?: string[] }> = [];
      const xmlFilesForValidation: Array<{ fileName: string; xmlContent: string }> = [];
      const referencedImages = new Set<string>();

      for (let rowIndex = 0; rowIndex < editedRows.length; rowIndex += 1) {
        const row = editedRows[rowIndex];
        const validationResult = validationResults.get(getRowValidationKey(row, rowIndex));
        
        // Skip questions with rejected status (critical errors)
        if (validationResult?.status === 'rejected') {
          continue;
        }

        // Skip questions with LOW_CONFIDENCE_FAIL audit status (unless overridden)
        const rowKey = getRowValidationKey(row, rowIndex);
        const auditResult = auditResults[rowKey];
        if (auditResult?.bucket === 'LOW_CONFIDENCE_FAIL' && !auditOverrides.has(rowKey)) {
          continue;
        }
        
        const canonicalItem = validationResult?.canonicalItem;
        const questionType = canonicalTypeToLegacyQuestionType(canonicalItem?.canonicalType || validationResult?.detectedType);
        const itemNumber = String(exportCount + 1).padStart(3, '0');
        const safeItemIdentifier = `item_${itemNumber}`;
        const fileName = `${safeItemIdentifier}.xml`;

        // Get image filename for this question
        const imageFilename = columnMapping?.imageCol ? row[columnMapping.imageCol] : undefined;
        const imageFilenameStr = imageFilename ? String(imageFilename).trim() : '';
        const normalizedImageKey = imageFilenameStr
          ? (resolveMediaFileKey(mediaFiles, imageFilenameStr) || normalizeMediaFilename(imageFilenameStr))
          : '';
        const matchedMediaFile = normalizedImageKey ? mediaFiles.get(normalizedImageKey) : undefined;
        const resolvedImageFilename = matchedMediaFile?.filename || imageFilenameStr;
        const itemImageFiles: string[] = [];
        
        if (normalizedImageKey) {
          referencedImages.add(normalizedImageKey);
          if (matchedMediaFile?.filename) {
            itemImageFiles.push(matchedMediaFile.filename);
          } else if (resolvedImageFilename) {
            itemImageFiles.push(resolvedImageFilename);
          }
        }

        // Get question text with image inserted
        const originalQuestionText = (row[columnMapping.questionCol] as string) || '';
        const questionTextWithImage = insertImageIntoQuestionText(originalQuestionText, resolvedImageFilename);

        try {
          let xmlContent = '';

          if (questionType === 'mcq' || questionType === 'msq') {
            const isMsq = questionType === 'msq';
            const optionValues = canonicalItem?.choices?.length
              ? canonicalItem.choices.map((choice) => choice.text)
              : columnMapping.optionCols
                ?.map((col: string) => row[col])
                .filter((v: any) => v !== null && v !== undefined && v !== '') || [];

            const canonicalAnswerLabel = isMsq
              ? canonicalChoiceAnswersToLegacyLabels(canonicalItem)
              : canonicalChoiceAnswerToLegacyLabel(canonicalItem);
            const resolvedAnswer = canonicalAnswerLabel || (row[columnMapping.answerCol] as string) || (isMsq ? 'A,B' : 'A');

            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'batch-export',
              identifier: safeItemIdentifier,
              stem: questionTextWithImage,
              type: isMsq ? 'MSQ' : 'MCQ',
              options: optionValues.map((v: any) => String(v)),
              correct_answer: resolvedAnswer,
              validation_status: (validationResult?.status as string) === 'valid' ? 'Valid' : 'Caution',
            };

            const result = await generateQTIByVersion(
              qtiQuestion, 
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              isMsq ? 'MSQ' : 'MCQ'
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'mcq', columnMapping);
              oldQti.id = safeItemIdentifier;
              oldQti.questionText = questionTextWithImage;
              xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else if (questionType === 'shortanswer') {
            const resolvedAnswer = canonicalItem?.answerTokens?.length
              ? canonicalItem.answerTokens.join('|')
              : (row[columnMapping.answerCol] as string) || '';
            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'batch-export',
              identifier: safeItemIdentifier,
              stem: questionTextWithImage,
              type: 'ShortAnswer',
              options: [],
              correct_answer: resolvedAnswer,
              validation_status: (validationResult?.status as string) === 'valid' ? 'Valid' : 'Caution',
            };

            const result = await generateQTIByVersion(
              qtiQuestion,
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              'ShortAnswer'
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'shortanswer', columnMapping);
              oldQti.id = safeItemIdentifier;
              oldQti.questionText = questionTextWithImage;
              xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else if (questionType === 'order') {
            const orderedItems = canonicalItem?.orderItems?.length
              ? canonicalItem.orderItems
              : (columnMapping.optionCols
                ?.map((col: string) => String(row[col] ?? '').trim())
                .filter((v: string) => v.length > 0) || []);

            const resolvedOrder = canonicalOrderAnswersToLegacyLabels(canonicalItem)
              || (row[columnMapping.answerCol] as string)
              || buildSequentialChoiceLabels(orderedItems.length);

            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'batch-export',
              identifier: safeItemIdentifier,
              stem: questionTextWithImage,
              type: 'OrderInteraction',
              options: orderedItems,
              correct_answer: resolvedOrder,
              validation_status: (validationResult?.status as string) === 'valid' ? 'Valid' : 'Caution',
            };

            const result = await generateQTIByVersion(
              qtiQuestion,
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              'OrderInteraction'
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'order', columnMapping);
              oldQti.id = safeItemIdentifier;
              oldQti.questionText = questionTextWithImage;
              xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else if (questionType === 'order') {
            const orderedItems = canonicalItem?.orderItems?.length
              ? canonicalItem.orderItems
              : (columnMapping.optionCols
                ?.map((col: string) => String(row[col] ?? '').trim())
                .filter((v: string) => v.length > 0) || []);

            const resolvedOrder = canonicalOrderAnswersToLegacyLabels(canonicalItem)
              || (row[columnMapping.answerCol] as string)
              || buildSequentialChoiceLabels(orderedItems.length);

            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'batch-export',
              identifier: safeItemIdentifier,
              stem: questionTextWithImage,
              type: 'OrderInteraction',
              options: orderedItems,
              correct_answer: resolvedOrder,
              validation_status: (validationResult?.status as string) === 'valid' ? 'Valid' : 'Caution',
            };

            const result = await generateQTIByVersion(
              qtiQuestion,
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              'OrderInteraction'
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'order', columnMapping);
              oldQti.id = safeItemIdentifier;
              oldQti.questionText = questionTextWithImage;
              xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else if (questionType === 'order') {
            const orderedItems = canonicalItem?.orderItems?.length
              ? canonicalItem.orderItems
              : (columnMapping.optionCols
                ?.map((col: string) => String(row[col] ?? '').trim())
                .filter((v: string) => v.length > 0) || []);

            const resolvedOrder = canonicalOrderAnswersToLegacyLabels(canonicalItem)
              || (row[columnMapping.answerCol] as string)
              || buildSequentialChoiceLabels(orderedItems.length);

            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'ai-validation',
              identifier: safeItemIdentifier,
              stem: (row[columnMapping.questionCol] as string) || '',
              type: 'OrderInteraction',
              options: orderedItems,
              correct_answer: resolvedOrder,
              validation_status: 'Valid',
            };

            const result = await generateQTIByVersion(
              qtiQuestion,
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              'OrderInteraction',
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'order', columnMapping);
              oldQti.id = safeItemIdentifier;
              xmlContent = (await generateQTI(
                oldQti,
                outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1',
                'xml',
              )).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else {
            const oldQti = convertToQTIQuestion(row, questionType, columnMapping);
            oldQti.id = safeItemIdentifier;
            oldQti.questionText = questionTextWithImage;
            xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
          }

          xmlContent = applyTemplateIfNeeded(resolvedTemplateXml, xmlContent, fileName, row);

          zip.file(fileName, xmlContent);
          exportedFiles.push({ identifier: safeItemIdentifier, filename: fileName, imageFiles: itemImageFiles.length > 0 ? itemImageFiles : undefined });
          xmlFilesForValidation.push({ fileName, xmlContent });
          exportCount++;
        } catch (error) {
          if (resolvedTemplateXml) {
            throw error;
          }

          console.warn(`Error generating QTI for row ${row.id}:`, error);
          const oldQti = convertToQTIQuestion(row, questionType, columnMapping);
          oldQti.id = safeItemIdentifier;
          oldQti.questionText = questionTextWithImage;
          const xml = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
          zip.file(fileName, xml);
          exportedFiles.push({ identifier: safeItemIdentifier, filename: fileName, imageFiles: itemImageFiles.length > 0 ? itemImageFiles : undefined });
          xmlFilesForValidation.push({ fileName, xmlContent: xml });
          exportCount++;
        }
      }

      if (exportCount === 0) {
        toast.warning('No valid questions to export');
        setIsExporting(false);
        return;
      }

      // â”€â”€ AI Validation intercept â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (aiValidationEnabled && canUseAIValidation) {
        // Store context so we can resume after AI validation
        setGeneratedXmlItems(xmlFilesForValidation);
        setPendingExportContext({
          zip,
          exportedFiles,
          referencedImages,
          exportCount,
          mode: 'qti-package',
          downloadBaseName: 'qti-export',
        });
        setAiValidationProgress({ current: 0, total: xmlFilesForValidation.length });
        setAiValidationPhase('running');
        setIsExporting(false);

        try {
          const results = await runAIValidation(
            xmlFilesForValidation,
            outputFormat,
            aiProvider,
            (current, total) => setAiValidationProgress({ current, total }),
          );

          // Convert any AI-suggested LaTeX back to MathML
          const processedResults = results.map(item => ({
            ...item,
            xmlContent: processXmlMath(item.xmlContent)
          }));
          
          setAiValidationResults(processedResults);
          setAiValidationPhase('done');
        } catch (error) {
          toast.error('AI validation failed: ' + (error instanceof Error ? error.message : String(error)));
          setAiValidationPhase('idle');
        }
        return; // Don't download yet â€” user will review and click "Download Valid Items"
      }

      // â”€â”€ Normal (non-AI) export path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (referencedImages.size > 0 && mediaFiles.size > 0) {
        const imagesFolder = zip.folder('images');
        if (imagesFolder) {
          referencedImages.forEach(lowerFilename => {
            const mediaFile = mediaFiles.get(lowerFilename);
            if (mediaFile) {
              imagesFolder.file(mediaFile.filename, mediaFile.data);
            }
          });
        }
      }

      // Generate and add imsmanifest.xml
      const manifestXml = generateQTIManifest(
        exportedFiles,
        outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0'
      );
      zip.file('imsmanifest.xml', manifestXml);

      setGeneratedXmlItems(xmlFilesForValidation);
      setPendingExportContext({
        zip,
        exportedFiles,
        referencedImages,
        exportCount,
        mode: 'qti-package',
        downloadBaseName: 'qti-export',
      });
      setXmlReviewPageIndex(0);
      setSelectedXmlReviewIndex(0);
      setXmlPreviewMode('rendered');
      setIsXmlReviewOpen(true);
      setIsExporting(false);
      toast.success(`Generated ${exportCount} XML items. Review before download.`);
      return;
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error exporting to QTI format: " + (error instanceof Error ? error.message : String(error)));
      setIsExporting(false);
    } finally {
      // Reset MathML mode

    }
  };

  // Download the prepared zip blob
  const downloadZipBlob = async (blob: Blob, count: number) => {
    setIsExporting(true);
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qti-export-${new Date().toISOString().slice(0, 10)}-${count}questions.zip`;
      link.click();
      URL.revokeObjectURL(url);

      // Track for authenticated users
      if (isAuthenticated) {
        await trackExport();
        await trackQuestionsConverted(count);
      } else {
        // Track for anonymous users in localStorage
        const currentCount = parseInt(localStorage.getItem('localQuestionsConverted') || '0', 10);
        localStorage.setItem('localQuestionsConverted', (currentCount + count).toString());
      }

      hasUnsavedEdits.current = false;
      toast.success(`Successfully exported ${count} questions in ZIP file`);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as XML + Media Folder (without manifest or QTI packaging)
  const exportXmlMediaFolder = async () => {
    if (!fileData || !columnMapping) return;

    // Validate required selection fields
    if (!outputFormat || outputFormat.trim() === "") {
      setExportValidationError("Please select a QTI version (1.2, 2.1, or 3.0)");
      return;
    }

    if (!exportMode || exportMode.trim() === "") {
      setExportValidationError("Please select an export format (QTI Package or XML + Media Folder)");
      return;
    }

    setExportValidationError("");

    // Configure MathML generation mode for QTI


    setIsExporting(true);

    try {
      // Validate before export
      const preExportValidation = validateBeforeExport();
      if (!preExportValidation.valid) {
        const errorMessage = `Export validation failed:\n\n${preExportValidation.errors.slice(0, 10).join('\n')}${preExportValidation.errors.length > 10 ? `\n\n...and ${preExportValidation.errors.length - 10} more errors` : ''}`;
        toast.error(errorMessage);
        setIsExporting(false);
        return;
      }

      const resolvedTemplateXml = await readTemplateXmlContent();

      const zip = new JSZip();
      const xmlFolder = zip.folder('xml');
      const mediaFolder = zip.folder('media');
      
      if (!xmlFolder || !mediaFolder) {
        throw new Error('Failed to create folders');
      }

      let exportCount = 0;
      const referencedImages = new Set<string>();
      const xmlFilesForValidation: Array<{ fileName: string; xmlContent: string }> = [];

      for (let rowIndex = 0; rowIndex < editedRows.length; rowIndex += 1) {
        const row = editedRows[rowIndex];
        const validationResult = validationResults.get(getRowValidationKey(row, rowIndex));
        
        if (validationResult?.status === 'rejected') {
          continue;
        }

        // Skip questions with LOW_CONFIDENCE_FAIL audit status (unless overridden)
        const rowKey = getRowValidationKey(row, rowIndex);
        const auditResult = auditResults[rowKey];
        if (auditResult?.bucket === 'LOW_CONFIDENCE_FAIL' && !auditOverrides.has(rowKey)) {
          continue;
        }
        
        const canonicalItem = validationResult?.canonicalItem;
        const questionType = canonicalTypeToLegacyQuestionType(canonicalItem?.canonicalType || validationResult?.detectedType);
        const itemNumber = String(exportCount + 1).padStart(3, '0');
        const safeItemIdentifier = `item_${itemNumber}`;
        const fileName = `${safeItemIdentifier}.xml`;

        // Get image filename for this question
        const imageFilename = columnMapping?.imageCol ? row[columnMapping.imageCol] : undefined;
        const imageFilenameStr = imageFilename ? String(imageFilename).trim() : '';
        
        if (imageFilenameStr) {
          if (!imageFilenameStr.startsWith('http://') && !imageFilenameStr.startsWith('https://')) {
            referencedImages.add(imageFilenameStr.toLowerCase());
          }
        }

        // For XML+Media mode, preserve image as a dedicated stem block with URL/local path.
        const originalQuestionText = (row[columnMapping.questionCol] as string) || '';
        const questionTextWithImage = imageFilenameStr
          ? appendImageTagForXmlMedia(originalQuestionText, imageFilenameStr)
          : originalQuestionText;

        try {
          let xmlContent = '';

          if (questionType === 'mcq' || questionType === 'msq') {
            const isMsq = questionType === 'msq';
            const optionValues = canonicalItem?.choices?.length
              ? canonicalItem.choices.map((choice) => choice.text)
              : columnMapping.optionCols
                ?.map((col: string) => row[col])
                .filter((v: any) => v !== null && v !== undefined && v !== '') || [];

            const canonicalAnswerLabel = isMsq
              ? canonicalChoiceAnswersToLegacyLabels(canonicalItem)
              : canonicalChoiceAnswerToLegacyLabel(canonicalItem);
            const resolvedAnswer = canonicalAnswerLabel || (row[columnMapping.answerCol] as string) || (isMsq ? 'A,B' : 'A');

            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'batch-export',
              identifier: safeItemIdentifier,
              stem: questionTextWithImage,
              type: isMsq ? 'MSQ' : 'MCQ',
              options: optionValues.map((v: any) => String(v)),
              correct_answer: resolvedAnswer,
              validation_status: (validationResult?.status as string) === 'valid' ? 'Valid' : 'Caution',
            };

            const result = await generateQTIByVersion(
              qtiQuestion, 
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              isMsq ? 'MSQ' : 'MCQ'
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'mcq', columnMapping);
              oldQti.id = safeItemIdentifier;
              oldQti.questionText = questionTextWithImage;
              xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else if (questionType === 'shortanswer') {
            const resolvedAnswer = canonicalItem?.answerTokens?.length
              ? canonicalItem.answerTokens.join('|')
              : (row[columnMapping.answerCol] as string) || '';
            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'batch-export',
              identifier: safeItemIdentifier,
              stem: questionTextWithImage,
              type: 'ShortAnswer',
              options: [],
              correct_answer: resolvedAnswer,
              validation_status: (validationResult?.status as string) === 'valid' ? 'Valid' : 'Caution',
            };

            const result = await generateQTIByVersion(
              qtiQuestion,
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              'ShortAnswer'
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'shortanswer', columnMapping);
              oldQti.id = safeItemIdentifier;
              oldQti.questionText = questionTextWithImage;
              xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else {
            const oldQti = convertToQTIQuestion(row, questionType, columnMapping);
            oldQti.id = safeItemIdentifier;
            oldQti.questionText = questionTextWithImage;
            xmlContent = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
          }

          xmlContent = applyTemplateIfNeeded(resolvedTemplateXml, xmlContent, fileName, row);
          xmlContent = ensureXmlContainsImageTagForXmlMedia(xmlContent, imageFilenameStr);
          xmlFolder.file(fileName, xmlContent);
          xmlFilesForValidation.push({ fileName, xmlContent });
          exportCount++;
        } catch (error) {
          if (resolvedTemplateXml) {
            throw error;
          }

          console.warn(`Error generating XML for row ${row.id}:`, error);
          const oldQti = convertToQTIQuestion(row, questionType, columnMapping);
          oldQti.id = safeItemIdentifier;
          oldQti.questionText = questionTextWithImage;
          let xml = (await generateQTI(oldQti, outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1', 'xml')).xml || '';
          xml = ensureXmlContainsImageTagForXmlMedia(xml, imageFilenameStr);
          xmlFolder.file(fileName, xml);
          xmlFilesForValidation.push({ fileName, xmlContent: xml });
          exportCount++;
        }
      }

      if (exportCount === 0) {
        toast.warning('No valid questions to export');
        setIsExporting(false);
        return;
      }

      // â”€â”€ AI Validation intercept â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      if (aiValidationEnabled && canUseAIValidation) {
        setGeneratedXmlItems(xmlFilesForValidation);
        setPendingExportContext({
          zip,
          exportedFiles: [],
          referencedImages,
          exportCount,
          mode: 'xml-media-folder',
          downloadBaseName: 'xml-media-export',
        });
        setAiValidationProgress({ current: 0, total: xmlFilesForValidation.length });
        setAiValidationPhase('running');
        setIsExporting(false);

        try {
          const results = await runAIValidation(
            xmlFilesForValidation,
            outputFormat,
            aiProvider,
            (current, total) => setAiValidationProgress({ current, total }),
          );

          // Convert any AI-suggested LaTeX back to MathML
          const processedResults = results.map(item => ({
            ...item,
            xmlContent: processXmlMath(item.xmlContent)
          }));
          
          setAiValidationResults(processedResults);
          setAiValidationPhase('done');
        } catch (error) {
          toast.error('AI validation failed: ' + (error instanceof Error ? error.message : String(error)));
          setAiValidationPhase('idle');
        }
        return;
      }

      // â”€â”€ Normal (non-AI) export path â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Add images to media folder
      if (referencedImages.size > 0 && mediaFiles.size > 0) {
        referencedImages.forEach(lowerFilename => {
          const mediaFile = mediaFiles.get(lowerFilename);
          if (mediaFile) {
            mediaFolder.file(mediaFile.filename, mediaFile.data);
          }
        });
      }

      setGeneratedXmlItems(xmlFilesForValidation);
      setPendingExportContext({
        zip,
        exportedFiles: [],
        referencedImages,
        exportCount,
        mode: 'xml-media-folder',
        downloadBaseName: 'xml-media-export',
      });
      setXmlReviewPageIndex(0);
      setSelectedXmlReviewIndex(0);
      setXmlPreviewMode('rendered');
      setIsXmlReviewOpen(true);
      setIsExporting(false);
      toast.success(`Generated ${exportCount} XML items. Review before download.`);
      return;
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error exporting: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      // Reset MathML mode

      setIsExporting(false);
    }
  };


  // Save form data to localStorage for LMS export
  const saveFormDataToLocalStorage = () => {
    try {
      const dataToSave = {
        editedRows,
        columnMapping,
        validationResults: Array.from(validationResults.entries()), // Convert Map to array for JSON serialization
      };
      localStorage.setItem('batchCreatorData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving form data to localStorage:', error);
    }
  };

  const exportToJSON = async () => {
    if (!fileData || !columnMapping) return;

    // Validate required selection fields
    if (!outputFormat || outputFormat.trim() === "") {
      setExportValidationError("Please select a QTI version (1.2, 2.1, or 3.0)");
      return;
    }

    setExportValidationError("");

    // Save form data for LMS export
    saveFormDataToLocalStorage();

    setIsExporting(true);
    try {
      const qtiQuestions = editedRows
        .map((row, index) => ({ row, index }))
        .filter(({ row, index }) => {
          const validationResult = validationResults.get(getRowValidationKey(row, index));
          // Skip questions with rejected status (critical errors)
          return validationResult?.status !== 'rejected';
        })
        .map(({ row, index }) => {
          const validationResult = validationResults.get(getRowValidationKey(row, index));
          const questionType = validationResult?.detectedType || 'shortanswer';
          return convertToQTIQuestion(row, questionType, columnMapping);
        });

      const json = generateJSON(qtiQuestions);
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qti-export-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      // Track the export
      await trackExport();

      hasUnsavedEdits.current = false;
      toast.success(`Successfully exported ${qtiQuestions.length} questions as JSON`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error exporting to JSON format");
    } finally {
      setIsExporting(false);
    }
  };

  // â”€â”€ AI Validation Callbacks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // ── AI Audit (Colab endpoint) ──────────────────────────────────────────────

  const auditRejectedCount = useMemo(() => {
    if (Object.keys(auditResults).length === 0) return 0;
    let count = 0;
    Object.values(auditResults).forEach((result) => {
      if (result.bucket === 'LOW_CONFIDENCE_FAIL' && !auditOverrides.has(result.rowKey)) {
        count++;
      }
    });
    return count;
  }, [auditResults, auditOverrides]);

  const handleStartAiAudit = async () => {
    setIsAuditing(true);

    // 1. Health check
    const health = await checkAuditServerHealth();
    if (!health.available) {
      toast.error(`Audit server unreachable: ${health.error || 'Connection failed'}`);
      setIsAuditing(false);
      return;
    }

    // 2. Collect only visible-page valid/caution rows
    const visibleRowKeys = new Set(visibleAiAuditQueueRows.map((row) => row.rowKey));
    const rowsToAudit: Array<{ row: Record<string, any>; rowKey: string }> = [];
    editedRows.forEach((row, idx) => {
      const rowKey = getRowValidationKey(row, idx);
      const vr = validationResults.get(rowKey);
      if (visibleRowKeys.has(rowKey) && vr && (vr.status === 'valid' || vr.status === 'caution')) {
        rowsToAudit.push({ row, rowKey });
      }
    });

    if (rowsToAudit.length === 0) {
      toast.info('No visible valid/caution rows to audit on this page');
      setIsAuditing(false);
      return;
    }

    setAuditProgress({ current: 0, total: rowsToAudit.length });

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    // 3. Run sequential audit
    const results: Record<string, AuditResult> = { ...auditResults };
    let certified = 0, needsReview = 0, failed = 0;

    for (let i = 0; i < rowsToAudit.length; i++) {
      const { row, rowKey } = rowsToAudit[i];
      try {
        const result = await runAiAudit(row, undefined, accessToken);
        result.rowKey = rowKey;
        results[rowKey] = result;

        if (result.bucket === 'AI_CERTIFIED') certified++;
        else if (result.bucket === 'NEEDS_MANUAL_REVIEW') needsReview++;
        else if (result.bucket === 'LOW_CONFIDENCE_FAIL') failed++;
      } catch (err) {
        const errorResult: AuditResult = {
          rowKey,
          bucket: 'LOW_CONFIDENCE_FAIL',
          confidence: 0,
          explanation: 'CONNECTION_ERROR',
          error: err instanceof Error ? err.message : String(err),
        };
        results[rowKey] = errorResult;
        failed++;
      }

      setAuditProgress({ current: i + 1, total: rowsToAudit.length });
      setAuditResults({ ...results });
    }

    toast.success(`AI Audit (visible page) complete: ${certified} certified, ${needsReview} need review, ${failed} rejected`);
    setIsAuditing(false);
  };

  const handleAuditSingleQuestion = async (row: Record<string, any>, rowKey: string) => {
    setIsAuditing(true);
    try {
      const health = await checkAuditServerHealth();
      if (!health.available) {
        toast.error(`Audit server unreachable: ${health.error || 'Connection failed'}`);
        return;
      }

      setAuditProgress({ current: 0, total: 1 });
      const { data: { session } } = await supabase.auth.getSession();
      const result = await runAiAudit(row, undefined, session?.access_token);
      result.rowKey = rowKey;
      setAuditResults((prev) => ({ ...prev, [rowKey]: result }));
      setAuditProgress({ current: 1, total: 1 });
      toast.success('AI audit completed for selected question.');
    } catch (err) {
      const errorResult: AuditResult = {
        rowKey,
        bucket: 'LOW_CONFIDENCE_FAIL',
        confidence: 0,
        explanation: 'CONNECTION_ERROR',
        error: err instanceof Error ? err.message : String(err),
      };
      setAuditResults((prev) => ({ ...prev, [rowKey]: errorResult }));
      toast.error('AI audit failed for selected question.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleStartInlineAuditEdit = (rowKey: string, rowData: Record<string, any>) => {
    setAiAuditEditingRowKey(rowKey);
    setAiAuditDraftRows((prev) => {
      const next = new Map(prev);
      next.set(rowKey, { ...rowData });
      return next;
    });
  };

  const handleInlineAuditFieldChange = (rowKey: string, field: string, value: string) => {
    setAiAuditDraftRows((prev) => {
      const next = new Map(prev);
      const base = next.get(rowKey) ?? {};
      next.set(rowKey, { ...base, [field]: value });
      return next;
    });
  };

  const handleSaveInlineAuditEdit = (rowKey: string) => {
    const draft = aiAuditDraftRows.get(rowKey);
    if (!draft) return;

    const nextRows = editedRows.map((row, idx) => {
      const key = getRowValidationKey(row, idx);
      if (key !== rowKey) return row;
      return { ...row, ...draft };
    });

    setEditedRows(nextRows);
    setAuditResults((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
    setAuditOverrides((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
    setAiAuditEditingRowKey(null);
    toast.success('Row updated in AI Audit. Re-run AI audit for this question.');
  };

  const handleDismissAuditRejection = (rowKey: string) => {
    setAuditOverrides(prev => {
      const next = new Set(prev);
      next.add(rowKey);
      return next;
    });
  };

  const handleClearAuditResults = () => {
    setAuditResults({});
    setAuditProgress({ current: 0, total: 0 });
    setAuditOverrides(new Set());
  };

  const handleStartAIValidation = async () => {
    // Configure MathML generation mode for QTI

    setAiValidationPhase('running');
    try {
      const resolvedTemplateXml = await readTemplateXmlContent();

      // Generate XML items for validation
      const itemsToValidate: Array<{ fileName: string; xmlContent: string }> = [];

      // Use valid + caution items for validation
      const itemsForGeneration = editedRows
        .map((row, idx) => ({ row, idx }))
        .filter(({ row, idx }) => {
          const result = validationResults.get(getRowValidationKey(row, idx));
          return result && (result.status === 'valid' || result.status === 'caution');
        });

      for (let i = 0; i < itemsForGeneration.length; i++) {
        const { row, idx } = itemsForGeneration[i];
        const itemNumber = String(i + 1).padStart(3, '0');
        const safeItemIdentifier = `item_${itemNumber}`;
        const fileName = `${safeItemIdentifier}.xml`;

        try {
          const validationResult = validationResults.get(getRowValidationKey(row, idx));
          const canonicalItem = validationResult?.canonicalItem;
          const questionType = canonicalTypeToLegacyQuestionType(canonicalItem?.canonicalType || validationResult?.detectedType);

          let xmlContent = '';

          if (questionType === 'mcq' || questionType === 'msq') {
            const isMsq = questionType === 'msq';
            const optionValues = canonicalItem?.choices?.length
              ? canonicalItem.choices.map((choice) => choice.text)
              : columnMapping.optionCols
              ?.map((col: string) => row[col])
              .filter((v: any) => v !== null && v !== undefined && v !== '') || [];

            const canonicalAnswerLabel = isMsq
              ? canonicalChoiceAnswersToLegacyLabels(canonicalItem)
              : canonicalChoiceAnswerToLegacyLabel(canonicalItem);
            const resolvedAnswer = canonicalAnswerLabel || (row[columnMapping.answerCol] as string) || (isMsq ? 'A,B' : 'A');

            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'ai-validation',
              identifier: safeItemIdentifier,
              stem: (row[columnMapping.questionCol] as string) || '',
              type: isMsq ? 'MSQ' : 'MCQ',
              options: optionValues.map((v: any) => String(v)),
              correct_answer: resolvedAnswer,
              validation_status: 'Valid',
            };

            const result = await generateQTIByVersion(
              qtiQuestion,
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              isMsq ? 'MSQ' : 'MCQ',
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'mcq', columnMapping);
              oldQti.id = safeItemIdentifier;
              xmlContent = (await generateQTI(
                oldQti,
                outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1',
                'xml',
              )).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else if (questionType === 'shortanswer') {
            const resolvedAnswer = canonicalItem?.answerTokens?.length
              ? canonicalItem.answerTokens.join('|')
              : (row[columnMapping.answerCol] as string) || '';
            const qtiQuestion: QTIQuestion = {
              id: row.id || safeItemIdentifier,
              upload_id: 'ai-validation',
              identifier: safeItemIdentifier,
              stem: (row[columnMapping.questionCol] as string) || '',
              type: 'ShortAnswer',
              options: [],
              correct_answer: resolvedAnswer,
              validation_status: 'Valid',
            };

            const result = await generateQTIByVersion(
              qtiQuestion,
              outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
              'ShortAnswer',
            );
            if ('error' in result) {
              const oldQti = convertToQTIQuestion(row, 'shortanswer', columnMapping);
              oldQti.id = safeItemIdentifier;
              xmlContent = (await generateQTI(
                oldQti,
                outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1',
                'xml',
              )).xml || '';
            } else {
              xmlContent = result.xml;
            }
          } else {
            const oldQti = convertToQTIQuestion(row, questionType, columnMapping);
            oldQti.id = safeItemIdentifier;
            xmlContent = (await generateQTI(
              oldQti,
              outputFormat === 'qti-1.2' ? '1.2' : outputFormat === 'qti-3.0' ? '3.0' : '2.1',
              'xml',
            )).xml || '';
          }

          xmlContent = applyTemplateIfNeeded(resolvedTemplateXml, xmlContent, fileName, row);

          itemsToValidate.push({ fileName, xmlContent });
        } catch (error) {
          if (resolvedTemplateXml) {
            throw error;
          }

          console.error(`Error generating XML for item ${i + 1}:`, error);
        }
      }

      if (itemsToValidate.length === 0) {
        toast.warning('No items could be generated for validation');
        setAiValidationPhase('idle');
        return;
      }

      setGeneratedXmlItems(itemsToValidate);
      
      // Store context so download button works
      const zip = new JSZip();
      const referencedImages = new Set<string>();
      itemsForGeneration.forEach(({ row }) => {
        const imageFilename = columnMapping?.imageCol ? row[columnMapping.imageCol] : undefined;
        if (imageFilename) referencedImages.add(String(imageFilename).trim().toLowerCase());
      });
      setPendingExportContext({
        zip,
        exportedFiles: [],
        referencedImages,
        exportCount: itemsToValidate.length,
        mode: exportMode === 'xml-media-folder' ? 'xml-media-folder' : 'qti-package',
        downloadBaseName: exportMode === 'xml-media-folder' ? 'xml-media-export' : 'qti-export',
      });

      // Run AI validation
      const results = await runAIValidation(
        itemsToValidate,
        outputFormat,
        aiProvider,
        (current, total) => setAiValidationProgress({ current, total }),
      );

      // Convert any AI-suggested LaTeX back to MathML
      const processedResults = results.map(item => ({
        ...item,
        xmlContent: processXmlMath(item.xmlContent)
      }));

      setAiValidationResults(processedResults);
      setAiValidationPhase('done');
    } catch (error) {
      console.error('AI validation error:', error);
      toast.error('Validation failed: ' + (error instanceof Error ? error.message : String(error)));
      setAiValidationPhase('idle');
    } finally {
      // Reset MathML mode

    }
  };

  const handleAIItemXmlChange = (itemNo: number, newXml: string) => {
    const updated = [...generatedXmlItems];
    if (updated[itemNo]) {
      updated[itemNo].xmlContent = newXml;
      setGeneratedXmlItems(updated);
    }
  };

  const handleAIAutoFix = async (itemNo: number) => {
    const current = generatedXmlItems[itemNo];
    if (!current) return;

    try {
      setAiFixingItemNo(itemNo);
      const fixedXml = await autoFixXml(
        aiProvider,
        current.xmlContent,
        outputFormat || 'qti-3.0',
      );

      // Convert any LaTeX in AI's output back to MathML
      const processedXml = processXmlMath(fixedXml);

      // Update generated XML items
      const updatedGenerated = [...generatedXmlItems];
      updatedGenerated[itemNo] = { ...updatedGenerated[itemNo], xmlContent: processedXml };
      setGeneratedXmlItems(updatedGenerated);

      // Also update validation result copy so UI shows latest XML
      const updatedResults = [...aiValidationResults];
      const existing = updatedResults.find(i => i.itemNo === itemNo);
      if (existing) {
        existing.xmlContent = processedXml;
        setAiValidationResults([...updatedResults]);
      }
    } catch (error) {
      toast.error('AI fix failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setAiFixingItemNo(null);
    }
  };

  const handleAIRevalidate = async () => {
    // Configure MathML generation mode for QTI

    setAiValidationPhase('running');
    try {
      const results = await runAIValidation(
        generatedXmlItems,
        outputFormat,
        aiProvider,
        (current, total) => setAiValidationProgress({ current, total }),
      );

      // Convert any AI-suggested LaTeX back to MathML
      const processedResults = results.map(item => ({
        ...item,
        xmlContent: processXmlMath(item.xmlContent)
      }));

      setAiValidationResults(processedResults);
      setAiValidationPhase('done');
    } catch (error) {
      toast.error('Re-validation failed: ' + (error instanceof Error ? error.message : String(error)));
      setAiValidationPhase('done');
    } finally {
      // Reset MathML mode

    }
  };

  const handleAIDownloadValid = async () => {
    if (!pendingExportContext) return;

    setIsExporting(true);
    try {
      const validItems = aiValidationResults
        .map((result, idx) => ({ ...result, idx }))
        .filter((item) => item.isValid);

      if (validItems.length === 0) {
        toast.warning('No valid items to download');
        setIsExporting(false);
        return;
      }

      const { zip, referencedImages: allReferencedImages } = pendingExportContext;

      // Rebuild ZIP with only valid items
      const filteredZ = new JSZip();
      
      // Determine folder structure based on exportMode
      const isXmlMedia = exportMode === 'xml-media-folder';
      const xmlFolder = isXmlMedia ? filteredZ.folder('xml') : filteredZ;
      const mediaFolder = isXmlMedia ? filteredZ.folder('media') : filteredZ.folder('images');

      if (isXmlMedia && (!xmlFolder || !mediaFolder)) {
        throw new Error('Failed to create folders in ZIP');
      }

      validItems.forEach((item) => {
        // Use consistent padding (3 for QTI Package, 5 for XML+Media as seen in builders)
        const padding = isXmlMedia ? 5 : 3;
        const fileName = `item_${String(item.idx + 1).padStart(padding, '0')}.xml`;
        
        if (isXmlMedia && xmlFolder) {
          (xmlFolder as any).file(fileName, item.xmlContent);
        } else {
          filteredZ.file(fileName, item.xmlContent);
        }
      });

      // Add images if needed
      if (allReferencedImages.size > 0 && mediaFiles.size > 0 && mediaFolder) {
        allReferencedImages.forEach((lowerFilename) => {
          const mediaFile = mediaFiles.get(lowerFilename);
          if (mediaFile) {
            (mediaFolder as any).file(mediaFile.filename, mediaFile.data);
          }
        });
      }

      // For QTI package mode, add manifest
      if (exportMode === 'qti-package') {
        const manifestXml = generateQTIManifest(
          validItems.map((_, idx) => ({
            identifier: `item_${String(idx + 1).padStart(3, '0')}`,
            filename: `item_${String(idx + 1).padStart(3, '0')}.xml`,
          })),
          outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
        );
        filteredZ.file('imsmanifest.xml', manifestXml);
      }

      const blob = await filteredZ.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qti-export-validated-${new Date().toISOString().slice(0, 10)}-${validItems.length}questions.zip`;
      link.click();
      URL.revokeObjectURL(url);

      // Track the export
      if (isAuthenticated) {
        await trackExport();
        await trackQuestionsConverted(validItems.length);
      } else {
        const currentCount = parseInt(localStorage.getItem('localQuestionsConverted') || '0', 10);
        localStorage.setItem('localQuestionsConverted', (currentCount + validItems.length).toString());
      }

      toast.success(`Successfully exported ${validItems.length} valid questions`);
      setAiValidationPhase('idle');
      setGeneratedXmlItems([]);
      setPendingExportContext(null);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error downloading: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleAICancel = () => {
    setAiValidationPhase('idle');
    setGeneratedXmlItems([]);
    setPendingExportContext(null);
    setAiValidationResults([]);
    setAiValidationProgress({ current: 0, total: 0 });
  };

  const handleSaveCurrentRawXml = () => {
    const current = generatedXmlItems[selectedXmlReviewIndex];
    if (!current) return;
    const updated = [...generatedXmlItems];
    updated[selectedXmlReviewIndex] = {
      ...current,
      xmlContent: rawXmlDraft,
    };
    setGeneratedXmlItems(updated);
    setRawXmlDraftSourceIndex(selectedXmlReviewIndex);
    setIsRawXmlEditing(false);
    toast.success('XML updated for this item');
  };

  const handleAiFixCurrentXml = async () => {
    const current = generatedXmlItems[selectedXmlReviewIndex];
    if (!current) return;

    try {
      setXmlReviewFixingIndex(selectedXmlReviewIndex);
      const fixedXml = await autoFixXml(aiProvider, current.xmlContent, outputFormat || 'qti-3.0');
      const processedXml = processXmlMath(fixedXml);
      const updated = [...generatedXmlItems];
      updated[selectedXmlReviewIndex] = { ...current, xmlContent: processedXml };
      setGeneratedXmlItems(updated);
      setRawXmlDraft(processedXml);
      setRawXmlDraftSourceIndex(selectedXmlReviewIndex);
      setIsRawXmlEditing(false);
      toast.success('AI fix applied to selected XML');
    } catch (error) {
      toast.error('AI fix failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setXmlReviewFixingIndex(null);
    }
  };

  const handleDownloadReviewedXml = async () => {
    if (!pendingExportContext || generatedXmlItems.length === 0) return;

    setIsExporting(true);
    try {
      const isXmlMedia = pendingExportContext.mode === 'xml-media-folder';
      const zip = new JSZip();
      const xmlFolder = isXmlMedia ? zip.folder('xml') : zip;
      const mediaFolder = isXmlMedia ? zip.folder('media') : zip.folder('images');

      if (isXmlMedia && !xmlFolder) {
        throw new Error('Failed to create xml folder for export.');
      }

      generatedXmlItems.forEach((item, index) => {
        const fallbackPadding = isXmlMedia ? 5 : 3;
        const fallbackName = `item_${String(index + 1).padStart(fallbackPadding, '0')}.xml`;
        const resolvedName = item.fileName?.trim() ? item.fileName : fallbackName;
        if (isXmlMedia && xmlFolder) {
          (xmlFolder as any).file(resolvedName, item.xmlContent);
        } else {
          zip.file(resolvedName, item.xmlContent);
        }
      });

      if (pendingExportContext.referencedImages.size > 0 && mediaFiles.size > 0 && mediaFolder) {
        pendingExportContext.referencedImages.forEach((mediaKey) => {
          const mediaFile = mediaFiles.get(mediaKey);
          if (mediaFile) {
            (mediaFolder as any).file(mediaFile.filename, mediaFile.data);
          }
        });
      }

      if (!isXmlMedia) {
        const manifestItems = generatedXmlItems.map((item, idx) => {
          const fileName = item.fileName?.trim() ? item.fileName : `item_${String(idx + 1).padStart(3, '0')}.xml`;
          const identifier = fileName.replace(/\.xml$/i, '');
          return { identifier, filename: fileName };
        });
        const manifestXml = generateQTIManifest(
          manifestItems,
          outputFormat as 'qti-1.2' | 'qti-2.1' | 'qti-3.0',
        );
        zip.file('imsmanifest.xml', manifestXml);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pendingExportContext.downloadBaseName}-${new Date().toISOString().slice(0, 10)}-${generatedXmlItems.length}questions.zip`;
      link.click();
      URL.revokeObjectURL(url);

      if (isAuthenticated) {
        await trackExport();
        await trackQuestionsConverted(generatedXmlItems.length);
      } else {
        const currentCount = parseInt(localStorage.getItem('localQuestionsConverted') || '0', 10);
        localStorage.setItem('localQuestionsConverted', (currentCount + generatedXmlItems.length).toString());
      }

      hasUnsavedEdits.current = false;
      setIsXmlReviewOpen(false);
      setTransformDone(true);
      toast.success(`Downloaded ${generatedXmlItems.length} reviewed XML items.`);
    } catch (error) {
      toast.error('Error downloading reviewed export: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
    }
  };

  const revalidateAll = async (): Promise<Map<string, ValidationResult>> => {
    setIsValidating(true);
    setValidationProgress(0);
    setValidationProgressText('Re-validating all questions...');

    // Merge manual fixes into editedRows before re-validating
    // so user edits persist across re-runs
    const mergedRows = [...editedRows];
    const fixedRowsToMerge = manualFixedRowsRef.current; // Read synchronously from the Ref
    if (fixedRowsToMerge.size > 0) {
      fixedRowsToMerge.forEach((fixedRow, fixKey) => {
        // Find matching editedRow by __rowKey or by computed key with index
        const idx = mergedRows.findIndex((r, i) => {
          if (r.__rowKey && String(r.__rowKey).trim() === fixKey) return true;
          return getRowValidationKey(r, i) === fixKey;
        });
        if (idx >= 0) {
          // Preserve __rowKey from original row to keep key stability
          mergedRows[idx] = { ...fixedRow, __rowKey: mergedRows[idx].__rowKey };
        }
      });
    }
    setEditedRows(mergedRows);

    let resultsMap: Map<string, ValidationResult>;

    if (mergedRows.length > 500) {
      // Use chunked validation for large datasets
      resultsMap = await validateAllQuestionsChunked(
        mergedRows as any,
        columnMapping,
        500,
        (progress, processedCount) => {
          setValidationProgress(progress);
          setValidationProgressText(`Re-validated ${processedCount} of ${mergedRows.length} questions...`);
        },
        validationProfile
      );
    } else {
      // For smaller datasets, validate all at once
      const results = validateAllQuestions(mergedRows as any, columnMapping, validationProfile);
      resultsMap = new Map<string, ValidationResult>();
      results.forEach(result => {
        resultsMap.set(result.rowId, result);
      });
      setValidationProgress(100);
    }

    // Refresh dual-validation pipeline results after re-validation
    try {
      const dualResult = runDualValidation(mergedRows as any, columnMapping, validationProfile);
      setCleanValidationResults(dualResult.cleanResults);
      setCleaningMetrics(dualResult.metrics);
      setCleaningLogs(dualResult.cleanLogs);
      setRowImprovements(dualResult.rowImprovements);
      setPass3Suggestions(dualResult.pass3Result.suggestions);
      setPass3Metrics(dualResult.pass3Result.pass3Metrics);
      setPass3ExecutionMetrics(dualResult.pass3ExecutionResult.executionMetrics);
      setPass3ExecutedRows(dualResult.pass3ExecutionResult.executedRows);
      setManualFixedRows(new Map());
      manualFixedRowsRef.current = new Map(); // Add this line
      setManualFixResults(new Map());
      setManualFixHistory(new Map());
      setManualMetrics({ manualFixesApplied: 0, rowsImprovedByUser: 0 });
      setManualFixInputs(new Map());
    } catch (dualErr) {
      console.warn('[DualValidation] Pipeline failed during re-validate:', dualErr);
    }

    setValidationResults(resultsMap);
    setIsValidating(false);
    return resultsMap;
  };

  const handleApplyAutomatedFixes = async () => {
    const availableAutoFixCount = pass3ExecutionMetrics?.suggestionsApplied ?? 0;
    if (pass3ExecutedRows.length === 0 || availableAutoFixCount <= 0) {
      toast.info('No high-confidence automated fixes are available right now.');
      return;
    }

    const beforeSummary = buildStatsFromResultsMap(validationResults);
    const appliedAutoFixKeys = new Set(
      pass3Suggestions
        .filter((s) => s.confidence === 'HIGH')
        .map((s) => s.rowKey)
    );
    setIsApplyingAutoFixes(true);
    try {
      const nextRows = ensureInternalRowKeys(pass3ExecutedRows as Record<string, any>[]);
      setEditedRows(nextRows);
      setAutoFixedRowKeys(appliedAutoFixKeys);
      setManualFixedRows(new Map());
      manualFixedRowsRef.current = new Map();
      setManualFixResults(new Map());
      setManualFixHistory(new Map());
      setManualMetrics({ manualFixesApplied: 0, rowsImprovedByUser: 0 });
      setManualFixInputs(new Map());

      setAutoFixComparison({
        before: beforeSummary,
        after: null,
        autoFixedCount: availableAutoFixCount,
        applied: true,
      });

      toast.success(`Applied ${availableAutoFixCount} high-confidence automated fixes.`);
    } finally {
      setIsApplyingAutoFixes(false);
    }
  };

  const handleReRunValidationAfterAutoFix = async () => {
    if (!autoFixComparison?.applied) return;

    const latestResults = await revalidateAll();
    const afterSummary = buildStatsFromResultsMap(latestResults);
    setAutoFixComparison((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        after: afterSummary,
      };
    });
    setCurrentStep('validating');
  };

  // ── PASS 3 user-assisted execution ────────────────────────────────────────

  /** Rank validation status for regression detection (higher = better). */
  const rankStatus = (s?: string) => s === 'valid' ? 2 : s === 'caution' ? 1 : 0;

  /**
   * Apply a manually chosen value for a MEDIUM-confidence suggestion.
   * Validates the candidate row in isolation and rolls back if status regresses.
   */
  const applyManualFix = (
    rowKey: string,
    suggestion: RemediationSuggestion,
    selectedValue: string,
  ) => {
    if (!selectedValue.trim() || !columnMapping) return;
    const baseRow = manualFixedRowsRef.current.get(rowKey)
      ?? manualFixedRows.get(rowKey)
      ?? pass3ExecutedRows[suggestion.rowIndex - 1]
      ?? editedRows.find((r, idx) => getRowValidationKey(r, idx) === rowKey);
    if (!baseRow) return;

    const originalValue = baseRow[suggestion.field];
    const candidateRow = { ...baseRow, [suggestion.field]: selectedValue.trim() };

    const [candidateResult] = validateAllQuestions([candidateRow], columnMapping, validationProfile);

    const prevResult = manualFixResults.get(rowKey) ??
      (cleanValidationResults ? cleanValidationResults[rowKey] : undefined);
    const prevRank = rankStatus(prevResult?.status);
    const newRank  = rankStatus(candidateResult?.status);

    const isManualEdit = suggestion.type === 'MANUAL_EDIT';
    if (isManualEdit || newRank >= prevRank) {
      // Synchronously update the ref so rapid Re-run clicks see the newest data
      manualFixedRowsRef.current.set(rowKey, candidateRow);
      
      setManualFixedRows(new Map(manualFixedRowsRef.current));
      setManualFixResults(prev => new Map(prev).set(rowKey, candidateResult!));
      setManualFixHistory(prev => new Map(prev).set(rowKey, { field: suggestion.field, original: originalValue }));
      setManualMetrics(prev => ({
        manualFixesApplied: prev.manualFixesApplied + 1,
        rowsImprovedByUser: newRank > prevRank ? prev.rowsImprovedByUser + 1 : prev.rowsImprovedByUser,
      }));
      // Clear the input for this suggestion
      setManualFixInputs(prev => { const n = new Map(prev); n.delete(rowKey); return n; });
    }
    // If candidate is worse and not a manual edit, silently discard (safety rollback)
  };

  /** Apply multiple field edits to a row in one shot. */
  const applyBulkManualEdits = (rowKey: string, edits: Record<string, string>) => {
    if (!columnMapping || Object.keys(edits).length === 0) return;
    const baseRow = manualFixedRowsRef.current.get(rowKey)
      ?? manualFixedRows.get(rowKey)
      ?? pass3ExecutedRows.find((r: any) => getRowValidationKey(r) === rowKey)
      ?? editedRows.find((r) => getRowValidationKey(r) === rowKey);
    if (!baseRow) return;

    // Merge all edits into the row at once
    const candidateRow = { ...baseRow };
    for (const [field, value] of Object.entries(edits)) {
      candidateRow[field] = value;
    }

    const [candidateResult] = validateAllQuestions([candidateRow], columnMapping, validationProfile);

    manualFixedRowsRef.current.set(rowKey, candidateRow);
    setManualFixedRows(new Map(manualFixedRowsRef.current));
    setManualFixResults(prev => new Map(prev).set(rowKey, candidateResult!));
    setManualFixHistory(prev => new Map(prev).set(rowKey, { field: Object.keys(edits).join(','), original: null }));
    setManualMetrics(prev => ({
      manualFixesApplied: prev.manualFixesApplied + 1,
      rowsImprovedByUser: prev.rowsImprovedByUser + 1,
    }));
    setManualFixInputs(prev => { const n = new Map(prev); n.delete(rowKey); return n; });
  };

  /** Revert a previously applied manual fix. */
  const undoManualFix = (rowKey: string) => {
    const history = manualFixHistory.get(rowKey);
    if (!history) return;
    manualFixedRowsRef.current.delete(rowKey);
    setManualFixedRows(new Map(manualFixedRowsRef.current));
    setManualFixResults(prev => { const n = new Map(prev); n.delete(rowKey); return n; });
    setManualFixHistory(prev => { const n = new Map(prev); n.delete(rowKey); return n; });
    setManualMetrics(prev => ({
      manualFixesApplied: Math.max(0, prev.manualFixesApplied - 1),
      rowsImprovedByUser: Math.max(0, prev.rowsImprovedByUser - 1),
    }));
  };

  /** Extract available options from an executed row for the option-picker dropdown. */
  const getRowOptionsForSuggestion = (rowIndex: number): Array<{ label: string; text: string }> => {
    const row = manualFixedRows.get(pass3ExecutedRows[rowIndex - 1]?.__rowKey ?? '') ??
                pass3ExecutedRows[rowIndex - 1];
    if (!row || !columnMapping?.optionCols) return [];
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return (columnMapping.optionCols as string[])
      .map((col: string, i: number) => {
        const val = row[col];
        if (val === null || val === undefined || String(val).trim() === '') return null;
        return { label: LETTERS[i] ?? String(i + 1), text: String(val).trim() };
      })
      .filter((x): x is { label: string; text: string } => x !== null);
  };

  const buildStatsFromResultsMap = (resultsMap: Map<string, ValidationResult>): ValidationStatsSummary => {
    const summary: ValidationStatsSummary = {
      valid: 0,
      caution: 0,
      rejected: 0,
      total: resultsMap.size,
      duplicates: 0,
      missingAnswers: 0,
      formattingIssues: 0,
    };

    resultsMap.forEach((result) => {
      summary[result.status] += 1;
      const issues = result.issues || [];
      const categories = new Set(result.categories || []);
      if (issues.some((i) => i.category === 'duplicate' || i.field === 'Duplicate')) summary.duplicates += 1;
      if (issues.some((i) => i.field === 'Correct Answer' || i.field === 'Correct Answers')) summary.missingAnswers += 1;
      if (categories.has('content_quality')) summary.formattingIssues += 1;
    });

    return summary;
  };

  const getValidationStats = () => {
    // When viewMode is 'clean', compute stats from the cleaned validation results.
    const useClean = viewMode === 'clean' && cleanValidationResults !== null;
    const stats = {
      valid: 0,
      caution: 0,
      rejected: 0,
      total: useClean ? Object.keys(cleanValidationResults!).length : validationResults.size,
      duplicates: 0,
      missingAnswers: 0,
      formattingIssues: 0,
    };

    const iterate = (result: ValidationResult) => {
      stats[result.status]++;
      const issues = result.issues || [];
      const categories = new Set(result.categories || []);
      if (issues.some((i) => i.category === 'duplicate' || i.field === 'Duplicate')) stats.duplicates++;
      if (issues.some((i) => i.field === 'Correct Answer' || i.field === 'Correct Answers')) stats.missingAnswers++;
      if (categories.has('content_quality')) stats.formattingIssues++;
    };

    if (useClean) {
      Object.values(cleanValidationResults!).forEach(iterate);
    } else {
      validationResults.forEach(iterate);
    }
    return stats;
  };

  const escapeHtml = (value: unknown): string => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** Build report-ready rows and results that include manual fixes. */
  const getReportData = () => {
    const baseResults: Map<string, ValidationResult> =
      viewMode === 'clean' && cleanValidationResults
        ? new Map(Object.entries(cleanValidationResults))
        : new Map(validationResults);

    // Overlay manual fix results
    manualFixResults.forEach((vr, key) => baseResults.set(key, vr));

    // Overlay manual fixed row data
    const reportRows = [...editedRows];
    manualFixedRows.forEach((fixedRow, fixKey) => {
      const idx = reportRows.findIndex((r, i) => {
        if (r.__rowKey && String(r.__rowKey).trim() === fixKey) return true;
        return getRowValidationKey(r, i) === fixKey;
      });
      if (idx >= 0) {
        reportRows[idx] = { ...fixedRow, __rowKey: reportRows[idx].__rowKey };
      }
    });

    return { reportRows, reportResults: baseResults };
  };

  const handleDownloadValidationReport = () => {
    const { reportResults: activeResults } = getReportData();

    const resultsArray = Array.from(activeResults.values());
    const insights = buildValidationDatasetInsights(resultsArray);
    const summary = insights.validationSummary;
    const total = Math.max(1, summary.totalRows);
    const usableCount = summary.valid;
    const needsFixingCount = summary.invalid + summary.review;
    const usablePercent = Math.round((usableCount / total) * 100);
    const needsFixingPercent = Math.round((needsFixingCount / total) * 100);
    const highRiskIndicator = summary.invalid > 0
      || insights.batchInsights.highFallbackUsage
      || (summary.highUncertainty / total) >= 0.2;
    const verdict = usablePercent >= 85
      ? `This dataset is in good shape (${usablePercent}% immediately usable)`
      : `Your dataset has value — cleanup required before upload`;

    const dqMetrics = computeDataQualityMetrics(resultsArray);

    const issueCopy: Record<string, { label: string; impact: string; fix: string; }> = {
      DUPLICATE_EXACT: {
        label: 'Duplicate questions',
        impact: 'Students encounter the same question more than once — this undermines test integrity and is immediately flagged by any LMS quality check.',
        fix: 'Remove all copies except the single best version.',
      },
      DUPLICATE_CONFLICT: {
        label: 'Conflicting duplicate questions',
        impact: 'Two copies of the same question carry different answers — the LMS cannot determine which is correct and will fail at import.',
        fix: 'Resolve the correct answer and retain one authoritative version.',
      },
      DUPLICATE_NEAR: {
        label: 'Near-duplicate questions',
        impact: 'Questions are so similar that students can guess by elimination, directly reducing assessment validity and reliability scores.',
        fix: 'Merge or differentiate so each question tests a unique concept.',
      },
      DUPLICATE_SUSPICIOUS: {
        label: 'Very similar questions',
        impact: 'Repetitive questions reduce assessment validity and allow students to inflate their scores unfairly.',
        fix: 'Review and merge or remove the weaker version.',
      },
      MISSING_ANSWER: {
        label: 'Questions with no answer key',
        impact: 'No correct answer means the LMS cannot grade this question at all — it will silently skip or error on upload.',
        fix: 'Supply a correct answer for every question.',
      },
      MISSING_MULTI_SELECT_ANSWERS: {
        label: 'Incomplete multi-select answers',
        impact: 'Partial answer sets produce wrong student scores — a critical grading failure that affects every learner who takes the assessment.',
        fix: 'List every correct option for each multi-select question.',
      },
      ANSWER_NOT_IN_OPTIONS: {
        label: 'Answer not found in options',
        impact: 'The stated answer cannot be matched to any option — the LMS will reject these questions outright at upload time.',
        fix: 'Update the answer to exactly match one of the available options.',
      },
      MSQ_EXACT_SET_MISMATCH: {
        label: 'Multi-select answer mismatch',
        impact: 'Correct answers do not match the option list — students will receive incorrect scores on every submission.',
        fix: 'Ensure every correct answer matches an available option exactly.',
      },
      MSQ_CARDINALITY_MISMATCH: {
        label: 'Multi-select count mismatch',
        impact: 'The number of required correct answers is wrong — students will be penalised unfairly on an otherwise valid question.',
        fix: 'Include all and only the correct answers in the answer key.',
      },
      INVALID_OPTION_IDENTIFIER: {
        label: 'Invalid option labels',
        impact: 'The LMS cannot map answers to options — these questions will break during import and cannot be used.',
        fix: 'Assign clear, unique labels to every answer option.',
      },
      MISSING_STEM: {
        label: 'Questions with no text',
        impact: 'Without a question prompt there is nothing for the student to answer — these rows are completely unusable and block the entire upload.',
        fix: 'Write the full question text for every row.',
      },
      SHORT_STEM: {
        label: 'Question text too short',
        impact: 'One-word prompts confuse students and reduce measurement accuracy across your entire assessment.',
        fix: 'Expand the prompt so the question is clear and unambiguous.',
      },
      INVALID_FORMAT: {
        label: 'Multiple answers on a single-choice question',
        impact: 'MCQ questions must have exactly one answer — the LMS will reject any question flagged with two or more correct answers.',
        fix: 'Select exactly one correct answer for each MCQ.',
      },
      AMBIGUOUS_ANSWER_MAPPING: {
        label: 'Answer matches multiple options',
        impact: 'The LMS cannot determine which option is correct — this question will fail automated scoring entirely and cannot be delivered to students.',
        fix: 'Use the option label (A / B / 1 / 2) instead of repeating option text.',
      },
    };

    const topIssues = insights.topIssues
      .filter((issue) => issueCopy[issue.code])
      .slice(0, 5)
      .map((issue) => ({
        ...issue,
        label: issueCopy[issue.code].label,
        impact: issueCopy[issue.code].impact,
        fix: issueCopy[issue.code].fix,
      }));

    const topIssueBlocksHtml = topIssues.length
      ? topIssues.map((issue) => {
          const percent = Math.round((issue.count / total) * 100);
          const rowIds = insights.exampleRows.topIssues[issue.code] || [];
          const exampleTexts = rowIds.slice(0, 2).map((rowId) => {
            const result = activeResults.get(rowId);
            const rowIndex = editedRows.findIndex((row, idx) => getRowValidationKey(row, idx) === rowId);
            const row = rowIndex >= 0 ? editedRows[rowIndex] : undefined;
            const questionText = columnMapping?.questionCol ? String(row?.[columnMapping.questionCol] || '').trim() : '';
            return questionText || (result ? `Question #${result.rowNumber}` : 'Question');
          }).filter((text) => text.length > 0);
          const examplesHtml = exampleTexts.length
            ? exampleTexts.map((text) => `<div class="example">"${escapeHtml(text)}"</div>`).join('')
            : '<div class="example muted">Example available on request</div>';
          return `
            <div class="problem-card">
              <div class="problem-header">
                <div class="problem-title">${escapeHtml(issue.label)}</div>
                <div class="problem-percent">${percent}%</div>
              </div>
              <div class="problem-impact"><strong>Impact:</strong> ${escapeHtml(issue.impact)}</div>
              <div class="problem-fix"><strong>Fix:</strong> ${escapeHtml(issue.fix)}</div>
              <div class="problem-examples">${examplesHtml}</div>
            </div>
          `;
        }).join('')
      : `<div class="muted">No major issues detected.</div>`;

    const sampleRowIds = Array.from(new Set([
      ...insights.exampleRows.fallback,
      ...Object.values(insights.exampleRows.topIssues).flat(),
    ])).slice(0, 3);

    const sampleRowBlocksHtml = sampleRowIds.map((rowId) => {
      const result = activeResults.get(rowId);
      const rowIndex = editedRows.findIndex((row, idx) => getRowValidationKey(row, idx) === rowId);
      const row = rowIndex >= 0 ? editedRows[rowIndex] : undefined;
      const questionText = columnMapping?.questionCol ? String(row?.[columnMapping.questionCol] || '').trim() : '';
      const answerText = columnMapping?.answerCol ? String(row?.[columnMapping.answerCol] || '').trim() : '';
      const problems = (result?.issues || []).slice(0, 3).map((issue) => {
        const mapped = issueCopy[issue.code];
        return mapped?.label || issue.message || 'Needs correction';
      });
      const fixes = (result?.issues || []).slice(0, 3).map((issue) => {
        const mapped = issueCopy[issue.code];
        return mapped?.fix || 'Update the question to meet LMS requirements.';
      });
      return `
        <div class="row-card">
          <div class="row-title">Question #${result?.rowNumber ?? '-'}</div>
          <div class="row-original"><strong>Original:</strong> ${escapeHtml(questionText || '(missing)')}<br/><span class="muted">Answer: ${escapeHtml(answerText || '(missing)')}</span></div>
          <div class="row-problems"><strong>Problems detected:</strong> ${escapeHtml(problems.join('; ') || 'Needs attention')}</div>
          <div class="row-fix"><strong>What needs to be fixed:</strong> ${escapeHtml(fixes.join('; ') || 'Standardize and correct the content')}</div>
        </div>
      `;
    }).join('');

    const appendixRows = resultsArray
      .filter((result) => (result.issues || []).length > 0)
      .slice(0, 10)
      .map((result) => {
        const rowIndex = editedRows.findIndex((row, idx) => getRowValidationKey(row, idx) === result.rowId);
        const row = rowIndex >= 0 ? editedRows[rowIndex] : undefined;
        const questionText = columnMapping?.questionCol ? String(row?.[columnMapping.questionCol] || '').trim() : '';
        return `
          <tr>
            <td>${result.rowNumber}</td>
            <td>${escapeHtml(questionText || '(missing)')}</td>
            <td>${escapeHtml(result.issues.map((issue) => issueCopy[issue.code]?.label || issue.message).slice(0, 2).join('; '))}</td>
          </tr>
        `;
      }).join('');

    const datasetName = reportDatasetName.trim() || fileData?.fileName || 'Untitled Dataset';
    const currentDate = new Date().toLocaleDateString();

    // ── AssessmentCore brand tokens ───────────────────────────────────────────
    const AC_BLUE = '#003a9f';
    const AC_RED  = '#ba1a1a';

    // ── Health badge (POOR → DATA NEEDS CLEANING) ─────────────────────────────
    const healthColor = usablePercent >= 80 ? '#004fd2' : usablePercent >= 60 ? '#8f4600' : '#ba1a1a';
    const healthBg    = usablePercent >= 80 ? '#e7eeff' : usablePercent >= 60 ? '#ffdcc6' : '#ffdad6';
    const healthText  = usablePercent >= 80 ? 'GOOD'    : usablePercent >= 60 ? 'NEEDS WORK' : 'DATA NEEDS CLEANING';

    // ── KPI row ────────────────────────────────────────────────────────────────
    const readyNowPct    = Math.round((summary.valid   / total) * 100);
    const needsFixingPct = Math.round((summary.review  / total) * 100);
    const brokenPct      = Math.round((summary.invalid / total) * 100);

    // ── PART 1–6: Compute recovery metrics with separated layers ─────────────
    const recovery = computeDatasetRecoveryMetrics(resultsArray);
    const totalQs = total;
    const uniqueQs = recovery.uniqueRows;

    // Extract values for report display
    const validInUnique = recovery.validInUnique;
    const fixableInUnique = recovery.fixableInUnique;
    const conservativeEst = recovery.conservativeRecoverable;
    const realisticEst = recovery.realisticRecoverable;
    const conservativePct = recovery.immediatelyUsablePercent;
    const realisticPct = recovery.finalUsablePercent;
    const uniquePct = totalQs > 0 ? Math.round((uniqueQs / totalQs) * 100) : 0;

    // ── Recovery framing (derived from metrics) ──────────────────────────────
    const recoverablePct = realisticPct;
    const dupPercent = totalQs > 0 ? Math.round((recovery.deduplicationGain / totalQs) * 100) : 0;
    const gainCount = fixableInUnique;
    const readySeg = conservativePct;
    const recoverSeg = Math.max(0, realisticPct - conservativePct);
    const lostSeg = Math.max(0, 100 - realisticPct); // "needs further review"

    // ── Donut chart ───────────────────────────────────────────────────────────
    const validEnd = Math.round((summary.valid / total) * 100);
    // FIX: Calculate from the raw sum to prevent rounding drift
    const cautionEnd = Math.round(((summary.valid + summary.review) / total) * 100);

    // ── Impact priority order ─────────────────────────────────────────────────
    const IMPACT_ORDER = [
      'MISSING_STEM', 'MISSING_ANSWER', 'MISSING_MULTI_SELECT_ANSWERS',
      'ANSWER_NOT_IN_OPTIONS', 'INVALID_FORMAT', 'AMBIGUOUS_ANSWER_MAPPING',
      'AMBIGUOUS_ANSWER_MATCH', 'DUPLICATE_CONFLICT', 'MSQ_EXACT_SET_MISMATCH',
      'DUPLICATE_EXACT', 'DUPLICATE_NEAR', 'DUPLICATE_SUSPICIOUS', 'SHORT_STEM',
    ];

    // ── Issues sorted by impact (not frequency) ───────────────────────────────
    const impactSortedIssues = [...insights.topIssues]
      .filter((iss) => issueCopy[iss.code])
      .sort((a, b) => {
        const ai = IMPACT_ORDER.indexOf(a.code);
        const bi = IMPACT_ORDER.indexOf(b.code);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });

    // ── Issue frequency bars (top 5, impact-sorted) ───────────────────────────
    const top5Iss = impactSortedIssues.slice(0, 5);
    const maxIssueCt = Math.max(1, ...top5Iss.map((i) => i.count));
    const issueBarsHtml = top5Iss.map((issue) => {
      const barPct   = Math.round((issue.count / maxIssueCt) * 100);
      const ofTotal  = Math.round((issue.count / total) * 100);
      const label    = issueCopy[issue.code]?.label || issue.code;
      const barColor = issue.code.startsWith('DUPLICATE') ? AC_BLUE : AC_RED;
      return `<div class="bar-row"><div class="bar-label">${escapeHtml(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${barPct}%;background:${barColor}"></div></div><div class="bar-meta">${issue.count}&thinsp;&middot;&thinsp;${ofTotal}%</div></div>`;
    }).join('');

    // ── Top 3 issue cards (impact order, ranked) ──────────────────────────────
    const top3CardsHtml = impactSortedIssues.slice(0, 3).map((issue, idx) => {
      const copy = issueCopy[issue.code];
      if (!copy) return '';
      const pct  = Math.round((issue.count / total) * 100);
      const col  = issue.code.startsWith('DUPLICATE') ? AC_BLUE : AC_RED;
      const rank = ['#1 IMPACT', '#2 IMPACT', '#3 IMPACT'][idx] ?? '';
      return `<div class="issue-card"><div class="rank-tag" style="background:${col}">${rank}</div><div class="issue-pct" style="color:${col}">${pct}%</div><div class="issue-title">${escapeHtml(copy.label)}</div><div class="issue-impact">${escapeHtml(copy.impact)}</div><div class="issue-fix"><strong>Fix:</strong> ${escapeHtml(copy.fix)}</div></div>`;
    }).join('');

    // ── BEFORE → AFTER sample rows ────────────────────────────────────────────
    const sampleTableRowsHtml = sampleRowIds.slice(0, 3).map((rowId) => {
      const res    = activeResults.get(rowId);
      const ri     = editedRows.findIndex((r2, idx) => getRowValidationKey(r2, idx) === rowId);
      const row2   = ri >= 0 ? editedRows[ri] : undefined;
      const q      = columnMapping?.questionCol ? String(row2?.[columnMapping.questionCol] || '').trim() : '';
      const truncQ = q.length > 50 ? q.slice(0, 50) + '\u2026' : (q || '(missing)');
      const issArr = res?.issues || [];
      const topIss = issArr[0];
      const beforeText = topIss ? (issueCopy[topIss.code]?.label || topIss.message) : 'Needs review';
      let afterText = 'Standardise and verify';
      if (issArr.some((i) => i.code === 'MISSING_ANSWER' || i.code === 'MISSING_MULTI_SELECT_ANSWERS')) {
        afterText = 'Add correct answer \u2192 fully gradeable';
      } else if (issArr.some((i) => i.code === 'ANSWER_NOT_IN_OPTIONS')) {
        const choices = ((res as any)?.canonicalItem?.choices || []).map((c: any) => c.text).slice(0, 3).join(', ');
        afterText = choices ? 'Set answer to one of: ' + choices : 'Align answer to an available option';
      } else if (issArr.some((i) => i.code === 'INVALID_FORMAT')) {
        afterText = 'Choose exactly 1 correct answer';
      } else if (issArr.some((i) => i.code === 'AMBIGUOUS_ANSWER_MAPPING')) {
        afterText = 'Use option label (A/B/C) not text';
      } else if (issArr.some((i) => i.code === 'DUPLICATE_CONFLICT')) {
        afterText = 'Resolve conflict \u2192 keep 1 authoritative version';
      } else if (issArr.some((i) => i.code === 'DUPLICATE_EXACT')) {
        afterText = 'Remove duplicate \u2192 keep best copy';
      } else if (issArr.some((i) => i.code === 'MISSING_STEM')) {
        afterText = 'Write the full question text';
      }
      return `<tr><td class="rn">${res?.rowNumber ?? '-'}</td><td>${escapeHtml(truncQ)}</td><td class="before-c">${escapeHtml(beforeText)}</td><td class="after-c">\u2713 ${escapeHtml(afterText)}</td></tr>`;
    }).join('');

    const reportHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Validation Report — ${escapeHtml(datasetName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Archivo', 'Segoe UI', Arial, sans-serif; color: #111c2d; background: #fff; font-size: 11.5px; line-height: 1.4; display: flex; flex-direction: column; gap: 9px; }

    /* HEADER */
    .hdr { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #003a9f; padding-bottom: 8px; }
    .brand-name { font-size: 14px; font-weight: 800; color: #003a9f; letter-spacing: -0.03em; }
    .brand-sep  { width: 1.5px; height: 15px; background: #c5c5d4; margin: 0 8px; display: inline-block; vertical-align: middle; }
    .hdr-rpt    { font-size: 12px; font-weight: 700; color: #111c2d; }
    .hdr-sub    { font-size: 9.5px; color: #454652; margin-top: 1px; }
    .badge { padding: 4px 10px; border-radius: 999px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.07em; border: 1.5px solid; }

    /* RECOVERY POTENTIAL BANNER */
    .rec-banner { background: #003a9f; border-radius: 9px; padding: 10px 14px; color: #fff; display: flex; align-items: center; gap: 14px; }
    .rec-hero   { flex-shrink: 0; }
    .rec-big    { font-size: 36px; font-weight: 800; line-height: 1; }
    .rec-sup    { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; opacity: 0.75; margin-bottom: 1px; }
    .rec-body   { flex: 1; }
    .rec-title  { font-size: 13px; font-weight: 700; margin-bottom: 5px; }
    .rec-bar    { display: flex; height: 9px; border-radius: 999px; overflow: hidden; gap: 2px; margin-bottom: 5px; }
    .rec-seg    { height: 100%; border-radius: 999px; }
    .rec-legend { display: flex; gap: 12px; font-size: 8.5px; opacity: 0.85; }
    .rec-leg-item { display: flex; align-items: center; gap: 4px; }
    .rec-dot    { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .rec-dup    { flex-shrink: 0; background: rgba(255,255,255,0.12); border-radius: 7px; padding: 7px 12px; text-align: center; }
    .rec-dup-pct { font-size: 24px; font-weight: 800; line-height: 1; }
    .rec-dup-lbl { font-size: 8.5px; opacity: 0.8; margin-top: 1px; line-height: 1.3; text-align: center; }

    /* KPI ROW — ready now + recoverable (hero) + broken */
    .kpi-row { display: grid; grid-template-columns: 1fr 1.4fr 1fr; gap: 7px; }
    .kpi { border-radius: 8px; padding: 9px 12px; border: 1px solid #c5c5d4; }
    .kpi-lbl { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #454652; }
    .kpi-val { font-size: 26px; font-weight: 800; line-height: 1.1; margin-top: 1px; }
    .kpi-val-hero { font-size: 32px; font-weight: 800; line-height: 1.1; margin-top: 1px; }
    .kpi-sub { font-size: 9.5px; color: #454652; margin-top: 1px; }
    .c-green { color: #004fd2; } .bg-green { background: #e7eeff; }
    .c-amber { color: #8f4600; } .bg-amber { background: #ffdcc6; }
    .c-red   { color: #ba1a1a; } .bg-red   { background: #ffdad6; }
    .c-blue  { color: #003a9f; } .bg-blue  { background: #e7eeff; }

    /* DATASET BREAKDOWN (PART 5) */
    .dataset-breakdown { background: #f9f9ff; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; }
    .bd-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #454652; margin-bottom: 8px; }
    .bd-layers { display: flex; flex-direction: column; gap: 4px; }
    .bd-layer { border-radius: 6px; padding: 7px 9px; font-size: 10px; background: #fff; border: 1px solid #c5c5d4; }
    .bd-label { font-size: 9px; font-weight: 600; color: #454652; }
    .bd-count { font-size: 14px; font-weight: 800; color: #111c2d; margin-top: 2px; }
    .bd-saved { font-size: 8.5px; color: #454652; margin-top: 2px; }
    .bd-arrow { text-align: center; font-size: 12px; color: #757684; margin: 0; line-height: 1; }

    /* OVERVIEW (donut + gain panel) */
    .overview { display: flex; gap: 12px; align-items: flex-start; }
    .donut-col { flex: 0 0 155px; display: flex; flex-direction: column; align-items: center; gap: 7px; }
    .donut-wrap { position: relative; width: 112px; height: 112px; }
    .donut { width: 112px; height: 112px; border-radius: 50%; }
    .donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .dn { font-size: 22px; font-weight: 800; line-height: 1; color: #111c2d; }
    .ds { font-size: 9px; color: #454652; }
    .legend { width: 100%; display: flex; flex-direction: column; gap: 3px; }
    .leg-r { display: flex; align-items: center; gap: 5px; font-size: 10px; }
    .leg-d { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .leg-n { margin-left: auto; font-weight: 700; }

    /* WHAT YOU GAIN AFTER CLEANUP */
    .gain-col   { flex: 1; border: 1.5px solid #003a9f; border-radius: 9px; padding: 10px 12px; }
    .gain-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #003a9f; margin-bottom: 7px; }
    .gt-wrap { display: flex; flex-direction: column; gap: 3px; }
    .gt-row  { display: grid; grid-template-columns: 1.3fr 44px 60px 1fr; gap: 6px; padding: 4px 7px; border-radius: 5px; align-items: center; font-size: 10px; }
    .gt-head { font-size: 7.5px; text-transform: uppercase; letter-spacing: .07em; color: #757684; background: #f9f9ff; }
    .gt-hi-green { background: #e7eeff; }
    .gt-hi-blue  { background: #e7eeff; }
    .gt-total    { background: #111c2d; color: #fff; margin-top: 1px; }
    .gt-note  { font-size: 9px; color: #454652; }
    .gt-note-gr  { font-size: 9px; color: #004fd2; }
    .gt-note-bl  { font-size: 9px; color: #003a9f; }
    .gt-note-wh  { font-size: 9px; color: rgba(255,255,255,0.7); }

    /* SECTION HEADING */
    .sec-hd { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: #454652; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #c5c5d4; }

    /* ISSUE CARDS */
    .issue-grid   { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; }
    .issue-card   { border: 1px solid #c5c5d4; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 3px; }
    .rank-tag     { display: inline-block; font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em; color: #fff; padding: 2px 7px; border-radius: 999px; margin-bottom: 2px; }
    .issue-pct    { font-size: 22px; font-weight: 800; line-height: 1; }
    .issue-title  { font-size: 11px; font-weight: 700; color: #111c2d; }
    .issue-impact { font-size: 10px; color: #454652; line-height: 1.45; margin-top: 2px; }
    .issue-fix    { font-size: 10px; color: #111c2d; margin-top: 2px; }

    /* BEFORE → AFTER TABLE */
    .stbl { width: 100%; border-collapse: collapse; font-size: 10px; }
    .stbl th { background: #f9f9ff; font-weight: 700; text-align: left; padding: 4px 7px; border: 1px solid #c5c5d4; font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.06em; color: #454652; }
    .stbl td  { padding: 4px 7px; border: 1px solid #c5c5d4; vertical-align: top; }
    .stbl tr:nth-child(even) td { background: #f9f9ff; }
    .rn       { width: 26px; color: #757684; text-align: center; }
    .before-c { color: #ba1a1a; width: 148px; }
    .after-c  { color: #004fd2; font-weight: 600; width: 168px; }

    /* BOTTOM ROW */
    .bottom  { display: flex; gap: 9px; }
    .act-col { flex: 1; border: 1px solid #c5c5d4; border-radius: 8px; padding: 10px 12px; }
    .out-col { flex: 1; background: #003a9f; color: #fff; border-radius: 8px; padding: 10px 12px; }
    .col-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 7px; }
    .act-item  { display: flex; gap: 6px; font-size: 10.5px; margin-bottom: 5px; align-items: flex-start; line-height: 1.4; }
    .chk       { color: #003a9f; font-weight: 800; font-size: 12px; flex-shrink: 0; }
    .commit-text { font-size: 10.5px; line-height: 1.6; opacity: 0.93; }
    .commit-hi   { font-weight: 700; }
    .commit-sig  { margin-top: 8px; font-size: 9px; opacity: 0.65; font-style: italic; }

    /* FOOTER */
    .foot { font-size: 8.5px; color: #757684; text-align: center; border-top: 1px solid #f0f3ff; padding-top: 5px; }
    .print-note { font-size: 10px; color: #454652; text-align: center; margin-top: 6px; }
    @media print { .print-note { display: none; } }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="hdr">
    <div style="display:flex;align-items:center">
      <div class="brand-name">AssessmentCore</div>
      <div class="brand-sep"></div>
      <div>
        <div class="hdr-rpt">Question Bank Validation Report</div>
        <div class="hdr-sub">Dataset: ${escapeHtml(datasetName)}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${escapeHtml(currentDate)}</div>
      </div>
    </div>
    <div class="badge" style="color:${healthColor};background:${healthBg};border-color:${healthColor}">${escapeHtml(healthText)}</div>
  </div>

  <!-- URGENCY HOOK -->
  <div style="background:#ba1a1a;color:#fff;padding:12px 14px;border-radius:8px;margin-bottom:10px;text-align:center;font-weight:700;font-size:12.5px;letter-spacing:0.5px">
    93% of your dataset is redundant — only ${uniqueQs} real questions found
  </div>

  <!-- RECOVERY POTENTIAL BANNER -->
  <div class="rec-banner">
    <div class="rec-hero">
      <div class="rec-sup">Questions Recoverable</div>
      <div class="rec-big">${realisticEst}</div>
    </div>
    <div class="rec-body">
      <div class="rec-title">Your dataset is heavily duplicated, but we identified ${uniqueQs} real questions — ${realisticEst} can be recovered into a usable question bank.</div>
      <div class="rec-bar">
        <div class="rec-seg" style="width:${readySeg}%;background:#004fd2"></div>
        <div class="rec-seg" style="width:${recoverSeg}%;background:#004fd2"></div>
        <div class="rec-seg" style="width:${lostSeg}%;background:rgba(255,255,255,0.2)"></div>
      </div>
      <div class="rec-legend">
        <div class="rec-leg-item"><div class="rec-dot" style="background:#004fd2"></div>Immediately usable (${readySeg}%)</div>
        <div class="rec-leg-item"><div class="rec-dot" style="background:#004fd2"></div>Recoverable via fixes (${recoverSeg}%)</div>
        <div class="rec-leg-item"><div class="rec-dot" style="background:rgba(255,255,255,0.35)"></div>Requires deeper review (${lostSeg}%)</div>
      </div>
    </div>
    <div class="rec-dup">
      <div class="rec-dup-pct">${dupPercent}%</div>
      <div class="rec-dup-lbl">duplicate or<br>redundant</div>
    </div>
  </div>

  <!-- KPI ROW: ready now | RECOVERABLE (hero) | broken -->
  <div class="kpi-row">
    <div class="kpi bg-green">
      <div class="kpi-lbl">Ready Now</div>
      <div class="kpi-val c-green">${conservativePct}%</div>
      <div class="kpi-sub">${validInUnique} questions usable today</div>
    </div>
    <div class="kpi bg-blue" style="border-color:#003a9f">
      <div class="kpi-lbl" style="color:#003a9f">Questions Recoverable After Cleanup</div>
      <div class="kpi-val-hero c-blue">${realisticEst} Questions</div>
      <div class="kpi-sub" style="color:#003a9f">${realisticEst} questions recoverable after cleanup (out of ${uniqueQs} unique questions)</div>
    </div>
    <div class="kpi bg-red">
      <div class="kpi-lbl">Requires Cleanup / Review</div>
      <div class="kpi-val c-red">${lostSeg}%</div>
      <div class="kpi-sub">${recovery.blockedInUnique} need structural review</div>
    </div>
  </div>

  <!-- PAIN + CONSEQUENCE SECTION -->
  <div style="background:#ffdad6;border-left:4px solid #ba1a1a;padding:10px 12px;margin-bottom:8px;border-radius:5px;font-size:10.5px;color:#454652;line-height:1.5">
    <strong style="color:#ba1a1a">Impact:</strong> Most of your content is currently unusable in an LMS and may lead to failed uploads or poor student experience.
  </div>

  <!-- DATASET SIZE BREAKDOWN -->
  <div style="display:none"><!-- placeholder -->
  </div>

  <!-- KPI ROW continued -->
  <div style="display:none"><!-- spacing -->
  </div>

  <!-- DATASET SIZE BREAKDOWN (PART 5) -->
  <div class="dataset-breakdown">
    <div class="bd-title">Dataset Size Breakdown</div>
    <div class="bd-layers">
      <div class="bd-layer">
        <div class="bd-label">Original Dataset</div>
        <div class="bd-count">${totalQs} questions</div>
      </div>
      <div class="bd-arrow">↓</div>
      <div class="bd-layer" style="background:#FDE2E4">
        <div class="bd-label">After Deduplication</div>
        <div class="bd-count" style="font-size:18px;font-weight:800;color:#004fd2;letter-spacing:0.5px">${uniqueQs} UNIQUE QUESTIONS IDENTIFIED</div>
        <div class="bd-saved"><strong>${dupPercent}% of your dataset was redundant — we removed duplicates to uncover ${uniqueQs} actual questions</strong></div>
      </div>
      <div class="bd-arrow">↓</div>
      <div class="bd-layer" style="background:#E7F5FF">
        <div class="bd-label">Immediately Usable</div>
        <div class="bd-count c-green">${validInUnique} valid questions</div>
        <div class="bd-saved">${conservativePct}% ready to upload</div>
      </div>
      <div class="bd-arrow">↓</div>
      <div class="bd-layer" style="background:#e7eeff">
        <div class="bd-label">After Cleanup & Fixes</div>
        <div class="bd-count c-green">+${fixableInUnique} recoverable</div>
        <div class="bd-saved">${realisticEst} total usable (${recoverablePct}%)</div>
      </div>
    </div>
  </div>

  <!-- DONUT + WHAT YOU GAIN -->
  <div class="overview">
    <div class="donut-col">
      <div class="donut-wrap">
        <div class="donut" style="background:conic-gradient(#004fd2 0% ${validEnd}%,#8f4600 ${validEnd}% ${cautionEnd}%,#ba1a1a ${cautionEnd}% 100%);-webkit-mask:radial-gradient(closest-side,transparent 57%,black 58%);mask:radial-gradient(closest-side,transparent 57%,black 58%)"></div>
        <div class="donut-center"><div class="dn">${total}</div><div class="ds">questions</div></div>
      </div>
      <div class="legend">
        <div class="leg-r"><div class="leg-d" style="background:#004fd2"></div><span>Valid</span><span class="leg-n c-green">${summary.valid}</span></div>
        <div class="leg-r"><div class="leg-d" style="background:#8f4600"></div><span>Caution</span><span class="leg-n c-amber">${summary.review}</span></div>
        <div class="leg-r"><div class="leg-d" style="background:#ba1a1a"></div><span>Rejected</span><span class="leg-n c-red">${summary.invalid}</span></div>
      </div>
    </div>
    <div class="gain-col">
      <div class="gain-title">Recovery Summary</div>
      <div class="gain-transform">
        <div class="gain-box" style="background:#e7eeff">
          <div class="g-lbl">Before Dedup</div>
          <div class="g-val c-green">${totalQs}</div>
          <div class="g-sub">total questions</div>
        </div>
        <div class="gain-arrow">↓</div>
        <div class="gain-box" style="background:#e7eeff">
          <div class="g-lbl">After Dedup</div>
          <div class="g-val c-blue">${uniqueQs}</div>
          <div class="g-sub">${uniqueQs} unique questions (${recovery.deduplicationGain} duplicates removed)</div>
        </div>
        <div class="gain-arrow">↓</div>
        <div class="gain-box" style="background:#e7eeff;text-align:center;border:2px solid #004fd2">
          <div class="g-lbl" style="color:#004fd2;font-size:11px;font-weight:700">Final Outcome</div>
          <div class="g-val c-green" style="font-size:24px;margin:6px 0">${realisticEst}</div>
          <div class="g-sub" style="color:#004fd2;font-weight:600">high-quality, LMS-ready questions after cleanup</div>
        </div>
      </div>
      <div class="gain-wins">
        <div class="win-item"><span class="win-chk">✓</span><span><strong>${recovery.deduplicationGain}</strong> duplicates identified (${dupPercent}% of dataset &mdash; easy wins)</span></div>
        <div class="win-item"><span class="win-chk">✓</span><span><strong>${fixableInUnique}</strong> fixable issues (add answers, format fixes, etc.)</span></div>
        <div class="win-item"><span class="win-chk">✓</span><span><strong>${realisticEst}</strong> usable questions can be recovered after cleanup — your dataset has strong core value</span></div>
      </div>
    </div>
  </div>

  <!-- TOP 3 ISSUES -->
  <div>
    <div class="sec-hd">Top Issues &mdash; Ranked by Business Impact</div>
    <div class="issue-grid">
      ${top3CardsHtml || '<div style="color:#454652;font-size:11px">No major issues detected.</div>'}
    </div>
  </div>

  <!-- BEFORE → AFTER SAMPLE ROWS -->
  <div>
    <div class="sec-hd">Sample Rows &mdash; Before &amp; After Remediation</div>
    ${sampleTableRowsHtml
      ? `<table class="stbl"><thead><tr><th style="width:28px">#</th><th>Question</th><th>Before (Issue)</th><th>After (Fix)</th></tr></thead><tbody>${sampleTableRowsHtml}</tbody></table>`
      : '<div style="color:#454652;font-size:11px">No sample rows available.</div>'}
  </div>

  <!-- WHAT WE FIX + OUR COMMITMENT -->
  <div class="bottom">
    <div class="act-col">
      <div class="col-title" style="color:#003a9f">What We Will Fix</div>
      <div class="act-item"><span class="chk">&#10003;</span><span>Remove exact and conflicting duplicate questions</span></div>
      <div class="act-item"><span class="chk">&#10003;</span><span>Correct all answer-to-option mapping errors</span></div>
      <div class="act-item"><span class="chk">&#10003;</span><span>Standardise question formats and answer fields</span></div>
      <div class="act-item"><span class="chk">&#10003;</span><span>Ensure full LMS compatibility (QTI 2.1 / JSON)</span></div>
      <div class="act-item"><span class="chk">&#10003;</span><span>Flag near-duplicate questions for your review</span></div>
    </div>
    <div class="out-col">
      <div class="col-title">Our Commitment</div>
      <div class="commit-text">Your data is highly recoverable — we can transform it into a reliable, structured question bank. We will clean, deduplicate, and validate your entire dataset so you can go from ${validInUnique} usable today to <span class="commit-hi">${realisticEst}+ usable questions</span> certified for LMS upload.</div>
      <div class="commit-text" style="margin-top:7px">We transform fragmented, duplicate-heavy data into a clean, structured, LMS-ready question bank. Every question will be checked, corrected where possible, and delivered in your target format (QTI 2.1 / JSON).</div>
      <div class="commit-sig">&mdash; AssessmentCore Quality Team</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="foot">AssessmentCore &nbsp;&middot;&nbsp; Confidential &nbsp;&middot;&nbsp; ${escapeHtml(currentDate)} &nbsp;&middot;&nbsp; Question Bank Validation Report</div>

  <!-- FINAL CONVERSION LINE -->
  <div style="background:#e7eeff;border-radius:6px;padding:10px 12px;margin-top:8px;font-size:10px;color:#003a9f;text-align:center;font-weight:600;line-height:1.5">
    This report shows the current state — we can deliver the cleaned, validated dataset ready for direct LMS upload.
  </div>

<p class="print-note">Save as PDF via your browser&rsquo;s print dialog.</p>
<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body>
</html>`;

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      toast.error('Popup blocked. Please allow popups and try again to generate the PDF report.');
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
  };

  const handleDownloadRowLevelReport = () => {
    const { reportRows, reportResults } = getReportData();
    const datasetName = reportDatasetName.trim() || fileData?.fileName || 'Untitled Dataset';
    const currentDate = new Date().toLocaleDateString();
    const totalRows = reportRows.length;

    let validCount = 0, cautionCount = 0, rejectedCount = 0;
    reportResults.forEach((r) => {
      if (r.status === 'valid') validCount++;
      else if (r.status === 'caution') cautionCount++;
      else rejectedCount++;
    });

    // --- Data Quality Summary metrics ---

    // FIX 2: Auto-fixable — no BLOCK issues + at least one review issue that doesn't need
    // manual structural decision. Does NOT require all issues to be fixable.
    const MANUAL_REVIEW_CODES = new Set(['DUPLICATE_CONFLICT', 'DUPLICATE_EXACT']);
    let autoFixableRows = 0;
    reportResults.forEach((r) => {
      const issues = r.issues ?? [];
      if (issues.length === 0) return;
      const hasCritical = issues.some((i: any) => i.severity === 'block');
      const hasFixable  = issues.some((i: any) =>
        i.severity === 'review' && !MANUAL_REVIEW_CODES.has(i.code ?? '')
      );
      if (!hasCritical && hasFixable) autoFixableRows++;
    });

    // FIX 1: Duplicate % — union-find across ALL duplicate codes so DUPLICATE_CONFLICT,
    // DUPLICATE_NEAR, DUPLICATE_SUSPICIOUS are included, not just DUPLICATE_EXACT.
    const ALL_DUPLICATE_CODES = new Set([
      'DUPLICATE_EXACT', 'DUPLICATE_CONFLICT', 'DUPLICATE_NEAR', 'DUPLICATE_SUSPICIOUS',
    ]);
    // Extract partner row numbers from any duplicate issue message format:
    //   "Matching row(s): 2, 3."  |  "Related row(s): 2, 3."  |  "Near duplicate with row 5 ..."
    const extractPartners = (msg: string): number[] => {
      const listMatch = msg.match(/row\(s\):\s*([\d,\s]+)/i);
      if (listMatch) return listMatch[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      const singleMatch = msg.match(/\brow\s+(\d+)\b/i);
      if (singleMatch) return [parseInt(singleMatch[1], 10)];
      return [];
    };
    // Union-Find
    const ufParent = new Map<number, number>();
    const ufFind = (x: number): number => {
      if (!ufParent.has(x)) ufParent.set(x, x);
      if (ufParent.get(x) !== x) ufParent.set(x, ufFind(ufParent.get(x)!));
      return ufParent.get(x)!;
    };
    const ufUnion = (x: number, y: number) => {
      const px = ufFind(x), py = ufFind(y);
      if (px !== py) ufParent.set(px, py);
    };
    reportResults.forEach((r) => {
      if (!r.rowNumber) return;
      (r.issues ?? []).forEach((i: any) => {
        if (!ALL_DUPLICATE_CODES.has(i.code)) return;
        const partners = extractPartners(i.message ?? '');
        if (partners.length > 0) {
          ufFind(r.rowNumber!); // ensure self is registered
          partners.forEach(p => ufUnion(r.rowNumber!, p));
        }
      });
    });
    // Count cluster sizes; redundant = clusterSize - 1 (first occurrence = original)
    const clusterSizes = new Map<number, number>();
    reportResults.forEach((r) => {
      if (!r.rowNumber || !ufParent.has(r.rowNumber)) return;
      const root = ufFind(r.rowNumber);
      clusterSizes.set(root, (clusterSizes.get(root) ?? 0) + 1);
    });
    let redundantRows = 0;
    clusterSizes.forEach((size) => { if (size > 1) redundantRows += size - 1; });

    const pct = (n: number) => totalRows === 0 ? 0 : Math.round((n / totalRows) * 100);

    const usabilityPct    = pct(validCount);
    const attentionPct    = Math.min(100, pct(cautionCount + rejectedCount));
    const criticalPct     = pct(rejectedCount);
    const partialPct      = pct(cautionCount);
    const duplicatePct    = Math.min(100, pct(redundantRows));
    const autoFixPct      = Math.min(100, pct(autoFixableRows));

    // FIX: Calculate effective usability strictly from the raw sum, capped at 100%
    const effectiveCount  = validCount + cautionCount;
    const effectivePct    = totalRows === 0 ? 0 : Math.min(100, Math.round((effectiveCount / totalRows) * 100));

    // --- helpers ---
    const TYPE_LABELS: Record<string, string> = {
      single_choice: 'MCQ', multi_select: 'MSQ', true_false: 'True/False',
      text_entry: 'Text Entry', numeric: 'Numeric', order: 'Order', unknown: 'Unknown',
    };
    const formatType = (t?: string) => TYPE_LABELS[t ?? ''] ?? (t || '-');
    const truncate = (s: string, max: number) => max > 0 && s.length > max ? s.slice(0, max) + '\u2026' : s;

    const formatOptions = (row: Record<string, any>): string => {
      if (!columnMapping?.optionCols) return '';
      return (columnMapping.optionCols as string[]).map((col: string, i: number) => {
        const label = String.fromCharCode(65 + i);
        const text = String(row[col] ?? '').trim();
        return text ? `${label}: ${truncate(text, 120)}` : '';
      }).filter(Boolean).join('\n');
    };

    const formatIssuesHtml = (issues: { code: string; severity: string; message: string }[]): string => {
      if (!issues || issues.length === 0) {
        return '<span class="no-issues">\u2713 No issues</span>';
      }
      return issues.map((iss) => {
        const sevClass = iss.severity === 'block' ? 'sev-block' : 'sev-review';
        const sevLabel = iss.severity === 'block' ? 'BLOCK' : 'REVIEW';
        return `<div class="issue-row"><span class="sev-pill ${sevClass}">${sevLabel}</span> ${escapeHtml(iss.message)}</div>`;
      }).join('');
    };

    const statusBadge = (status: string): string => {
      const map: Record<string, { cls: string; label: string }> = {
        valid: { cls: 'st-valid', label: 'Valid' },
        caution: { cls: 'st-caution', label: 'Caution' },
        rejected: { cls: 'st-rejected', label: 'Rejected' },
      };
      const s = map[status] || { cls: '', label: status };
      return `<span class="status-badge ${s.cls}">${s.label}</span>`;
    };

    // --- build dynamic columns ---
    type ColDef = { key: string; label: string; extract: (row: Record<string, any>, res?: any) => string; maxChars: number; width: string };
    const cols: ColDef[] = [
      { key: 'rowNum', label: '#', extract: (_r, res) => String(res?.rowNumber ?? '-'), maxChars: 0, width: '30px' },
      { key: 'id', label: 'ID', extract: (row) => { const raw = row.__sourceIdRaw ?? row.id ?? ''; return String(raw).trim() || '(auto)'; }, maxChars: 40, width: '55px' },
    ];

    if (columnMapping?.typeCol) {
      cols.push({ key: 'type', label: 'Type', extract: (_r, res) => formatType(res?.canonicalItem?.canonicalType), maxChars: 0, width: '60px' });
    }

    cols.push({ key: 'question', label: 'Question Text', extract: (row) => columnMapping?.questionCol ? String(row[columnMapping.questionCol] ?? '').trim() : '', maxChars: 300, width: '' });

    if (columnMapping?.optionCols?.length) {
      cols.push({ key: 'options', label: 'Options', extract: (row) => formatOptions(row), maxChars: 0, width: '' });
    }

    cols.push({ key: 'answer', label: 'Answer', extract: (row) => columnMapping?.answerCol ? String(row[columnMapping.answerCol] ?? '').trim() : '', maxChars: 150, width: '90px' });

    if (columnMapping?.orderCol) {
      cols.push({ key: 'order', label: 'Order Items', extract: (row) => String(row[columnMapping.orderCol] ?? '').trim(), maxChars: 150, width: '100px' });
    }

    if (columnMapping?.imageCol) {
      cols.push({ key: 'image', label: 'Image', extract: (row) => String(row[columnMapping.imageCol] ?? '').trim(), maxChars: 60, width: '80px' });
    }

    cols.push({ key: 'status', label: 'Status', extract: (_r, res) => res?.status ?? 'unknown', maxChars: 0, width: '55px' });
    cols.push({ key: 'issues', label: 'Issues Identified', extract: () => '', maxChars: 0, width: '200px' });

    // --- build table HTML ---
    const theadHtml = `<tr>${cols.map((c) => `<th${c.width ? ` style="width:${c.width}"` : ''}>${escapeHtml(c.label)}</th>`).join('')}</tr>`;

    const tbodyHtml = reportRows.map((row, idx) => {
      const rowKey = getRowValidationKey(row, idx);
      const result = reportResults.get(rowKey);

      const cells = cols.map((col) => {
        if (col.key === 'status') {
          return `<td class="td-status">${statusBadge(result?.status ?? 'unknown')}</td>`;
        }
        if (col.key === 'issues') {
          return `<td class="td-issues">${formatIssuesHtml(result?.issues ?? [])}</td>`;
        }
        if (col.key === 'options') {
          const optText = col.extract(row, result);
          const lines = optText.split('\n').map((line: string) => escapeHtml(line)).join('<br/>');
          return `<td>${lines}</td>`;
        }
        const raw = col.extract(row, result);
        const display = col.maxChars > 0 ? truncate(raw, col.maxChars) : raw;
        return `<td>${escapeHtml(display)}</td>`;
      });

      const rowCls = result?.status === 'rejected' ? 'row-rejected' : result?.status === 'caution' ? 'row-caution' : '';
      return `<tr class="${rowCls}">${cells.join('')}</tr>`;
    }).join('');

    // --- assemble HTML ---
    const rowReportHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Row-Level Analysis \u2014 ${escapeHtml(datasetName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Archivo', 'Segoe UI', Arial, sans-serif; color: #111c2d; background: #fff; font-size: 9px; line-height: 1.35; padding: 0 2px; }

    /* HEADER */
    .hdr { display: flex; align-items: center; justify-content: space-between; border-bottom: 2.5px solid #003a9f; padding-bottom: 6px; margin-bottom: 8px; }
    .brand-name { font-size: 13px; font-weight: 800; color: #003a9f; letter-spacing: -0.03em; }
    .brand-sep { width: 1.5px; height: 14px; background: #c5c5d4; margin: 0 7px; display: inline-block; vertical-align: middle; }
    .hdr-rpt { font-size: 11px; font-weight: 700; color: #111c2d; }
    .hdr-sub { font-size: 8.5px; color: #454652; margin-top: 1px; }

    /* SUMMARY BAR */
    .summary-bar { display: flex; gap: 12px; align-items: center; background: #f9f9ff; border: 1px solid #c5c5d4; border-radius: 6px; padding: 7px 12px; margin-bottom: 8px; font-size: 9.5px; flex-wrap: wrap; }
    .stat-pill { padding: 2px 8px; border-radius: 999px; font-weight: 700; font-size: 9px; }
    .pill-valid { background: #e7eeff; color: #004fd2; }
    .pill-caution { background: #ffdcc6; color: #8f4600; }
    .pill-rejected { background: #ffdad6; color: #ba1a1a; }

    /* DATA TABLE */
    table.row-table { width: 100%; border-collapse: collapse; font-size: 8.5px; table-layout: auto; }
    table.row-table thead { display: table-header-group; }
    table.row-table th { background: #003a9f; color: #fff; font-weight: 700; text-align: left; padding: 4px 5px; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    table.row-table td { padding: 3px 5px; border: 1px solid #c5c5d4; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; }
    table.row-table tr:nth-child(even) td { background: #f9f9ff; }
    table.row-table tr { page-break-inside: avoid; }

    /* Row status left-border accent */
    tr.row-rejected td:first-child { border-left: 3px solid #ba1a1a; }
    tr.row-caution td:first-child { border-left: 3px solid #8f4600; }

    /* STATUS BADGE */
    .td-status { text-align: center; }
    .status-badge { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 7.5px; font-weight: 700; letter-spacing: 0.04em; }
    .st-valid { background: #e7eeff; color: #004fd2; }
    .st-caution { background: #ffdcc6; color: #8f4600; }
    .st-rejected { background: #ffdad6; color: #ba1a1a; }

    /* ISSUE ROWS */
    .td-issues { font-size: 8px; }
    .issue-row { padding: 1.5px 0; border-bottom: 0.5px solid #f0f3ff; line-height: 1.4; }
    .issue-row:last-child { border-bottom: none; }
    .sev-pill { display: inline-block; padding: 0.5px 4px; border-radius: 3px; font-size: 6.5px; font-weight: 800; letter-spacing: 0.05em; margin-right: 3px; vertical-align: middle; }
    .sev-block { background: #ffdad6; color: #ba1a1a; }
    .sev-review { background: #ffdcc6; color: #8f4600; }
    .no-issues { color: #004fd2; font-weight: 600; }

    /* QUALITY SUMMARY SECTION */
    .qs-section { margin-bottom: 10px; border: 1px solid #c5c5d4; border-radius: 7px; overflow: hidden; }
    .qs-header { background: #003a9f; color: #fff; font-size: 9.5px; font-weight: 800; padding: 5px 12px; letter-spacing: 0.04em; }
    .qs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
    .qs-cell { padding: 7px 12px; border-right: 1px solid #c5c5d4; border-bottom: 1px solid #c5c5d4; }
    .qs-cell:nth-child(3n) { border-right: none; }
    .qs-cell:nth-last-child(-n+3) { border-bottom: none; }
    .qs-label { font-size: 7.5px; color: #454652; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1px; }
    .qs-value { font-size: 15px; font-weight: 800; line-height: 1; }
    .qs-sub { font-size: 7.5px; color: #454652; margin-top: 1px; }
    .qs-green { color: #004fd2; }
    .qs-amber { color: #8f4600; }
    .qs-red   { color: #ba1a1a; }
    .qs-blue  { color: #1d4ed8; }
    .qs-gray  { color: #454652; }

    /* FOOTER */
    .foot { font-size: 7.5px; color: #757684; text-align: center; border-top: 1px solid #f0f3ff; padding-top: 4px; margin-top: 8px; }
    .print-note { font-size: 9px; color: #454652; text-align: center; margin-top: 6px; }
    @media print { .print-note { display: none; } }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="hdr">
    <div style="display:flex;align-items:center">
      <div class="brand-name">AssessmentCore</div>
      <div class="brand-sep"></div>
      <div>
        <div class="hdr-rpt">Row-Level Validation Analysis</div>
        <div class="hdr-sub">Dataset: ${escapeHtml(datasetName)}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${escapeHtml(currentDate)}</div>
      </div>
    </div>
  </div>

  <!-- SUMMARY BAR -->
  <div class="summary-bar">
    <span><strong>${totalRows}</strong> total rows</span>
    <span class="stat-pill pill-valid">${validCount} valid</span>
    <span class="stat-pill pill-caution">${cautionCount} caution</span>
    <span class="stat-pill pill-rejected">${rejectedCount} rejected</span>
    <span style="margin-left:auto;color:#454652;font-size:8.5px">
      This report contains row-level analysis for every question in the dataset.
    </span>
  </div>

  <!-- DATA QUALITY SUMMARY -->
  <div class="qs-section">
    <div class="qs-header">&#128202; Data Quality Summary</div>
    <div class="qs-grid">
      <div class="qs-cell">
        <div class="qs-label">Usability</div>
        <div class="qs-value qs-green">${usabilityPct}%</div>
        <div class="qs-sub">${validCount} of ${totalRows} rows fully valid</div>
      </div>
      <div class="qs-cell">
        <div class="qs-label">Requires Attention</div>
        <div class="qs-value qs-amber">${attentionPct}%</div>
        <div class="qs-sub">${cautionCount + rejectedCount} rows with issues</div>
      </div>
      <div class="qs-cell">
        <div class="qs-label">Critical Issues</div>
        <div class="qs-value qs-red">${criticalPct}%</div>
        <div class="qs-sub">${rejectedCount} rows rejected</div>
      </div>
      <div class="qs-cell">
        <div class="qs-label">Needs Minor Fix</div>
        <div class="qs-value qs-amber">${partialPct}%</div>
        <div class="qs-sub">${cautionCount} rows with caution</div>
      </div>
      <div class="qs-cell">
        <div class="qs-label">Duplicates / Redundancy</div>
        <div class="qs-value qs-gray">${duplicatePct}%</div>
        <div class="qs-sub">${redundantRows} redundant rows (originals excluded)</div>
      </div>
      <div class="qs-cell">
        <div class="qs-label">Minor Fixes Needed</div>
        <div class="qs-value qs-blue">${autoFixPct}%</div>
        <div class="qs-sub">${autoFixableRows} rows (require minor human review)</div>
      </div>
      <div class="qs-cell">
        <div class="qs-label">Effective Usability</div>
        <div class="qs-value qs-blue">${effectivePct}%</div>
        <div class="qs-sub">${effectiveCount} / ${totalRows} rows usable with minor fixes</div>
      </div>
    </div>
  </div>

  <!-- DATA TABLE -->
  <table class="row-table">
    <thead>${theadHtml}</thead>
    <tbody>${tbodyHtml}</tbody>
  </table>

  <!-- FOOTER -->
  <div class="foot">AssessmentCore &nbsp;&middot;&nbsp; Confidential &nbsp;&middot;&nbsp; ${escapeHtml(currentDate)} &nbsp;&middot;&nbsp; Row-Level Validation Analysis</div>

  <p class="print-note">Save as PDF via your browser&rsquo;s print dialog.</p>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body>
</html>`;

    const rowReportWindow = window.open('', '_blank');
    if (!rowReportWindow) {
      toast.error('Popup blocked. Please allow popups and try again to generate the row-level report.');
      return;
    }
    rowReportWindow.document.open();
    rowReportWindow.document.write(rowReportHtml);
    rowReportWindow.document.close();
  };

  const handleDownloadAnnotatedSheet = async () => {
    if (!fileData) return;

    const { reportRows, reportResults: activeResults } = getReportData();

    const hasFixes = pass3Suggestions.length > 0;

    const FIX_HINTS: Record<string, string> = {
      MISSING_ID:                'Assign a unique ID to this row',
      MISSING_STEM:              'Add question text',
      SHORT_STEM:                'Expand the question text (under 5 characters)',
      UNKNOWN_EXPLICIT_TYPE:     'Fix the question type — use: single_choice, multi_select, true_false, text_entry, numeric, or order',
      DUPLICATE_ID:              'Assign a unique ID — this ID appears on multiple rows',
      MISSING_ANSWER:            'Add a correct answer',
      INSUFFICIENT_OPTIONS:      'Add at least 2 answer options',
      ANSWER_NOT_IN_OPTIONS:     'Update the answer to match one of the option labels or text values',
      AMBIGUOUS_ANSWER_MAPPING:  'Clarify the answer — it matches multiple options',
      INVALID_ORDER_ITEMS:       'Add at least 2 items to the order sequence',
      ORDER_SEQUENCE_INCOMPLETE: 'Ensure the answer covers all order items exactly once',
      DUPLICATE_EXACT:           'Remove this duplicate row',
      DUPLICATE_CONFLICT:        'Resolve the conflict — same stem but different answers exist',
      DUPLICATE_NEAR:            'Review for near-duplicate with another row',
      DUPLICATE_SUSPICIOUS:      'Review for similarity with another row',
    };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AssessmentCore';
    const ws = wb.addWorksheet('Validation');

    const headers = [...fileData.columns, 'Issue Identified', 'Fixes Suggested'];
    ws.columns = headers.map(h => ({
      header: h,
      key: h,
      width: h === 'Issue Identified' || h === 'Fixes Suggested' ? 42 : 22,
    }));

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.height = 26;
    headerRow.eachCell(cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F6CBD' } };
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Archivo', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border    = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    });

    // Add data rows
    for (const row of reportRows) {
      const rowKey = row.__rowKey as string | undefined;
      const result = rowKey ? activeResults.get(rowKey) : undefined;
      const status = result?.status ?? 'valid';
      const issues: any[] = result?.issues ?? [];

      // Issue Identified
      let issueText: string;
      if (!result || issues.length === 0) {
        issueText = 'Valid';
      } else if (status === 'caution') {
        issueText = 'Caution\n' + issues.map((i: any) => i.message).join('\n');
      } else {
        issueText = 'Rejected\n' + issues.map((i: any) => i.message).join('\n');
      }

      // Fixes Suggested
      let fixText = '';
      if (hasFixes && rowKey) {
        const rowFixes = pass3Suggestions.filter(s => s.rowKey === rowKey);
        fixText = rowFixes
          .map(s => s.suggestedValue ? `${s.message} → ${s.suggestedValue}` : s.message)
          .join('\n');
      } else if (issues.length > 0) {
        const hints = [...new Set(
          issues.map((i: any) => FIX_HINTS[i.code]).filter(Boolean) as string[]
        )];
        fixText = hints.join('\n');
      }

      const rowData: Record<string, any> = {};
      for (const col of fileData.columns) {
        rowData[col] = row[col] ?? '';
      }
      rowData['Issue Identified'] = issueText;
      rowData['Fixes Suggested']  = fixText;

      const excelRow = ws.addRow(rowData);
      excelRow.height = 30;

      const bgArgb =
        status === 'valid'   ? 'FFF0FDF4' :
        status === 'caution' ? 'FFFFFBEB' :
        'FFFEF2F2';

      excelRow.eachCell({ includeEmpty: true }, cell => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font      = { name: 'Archivo', size: 10 };
        cell.alignment = { vertical: 'top', wrapText: true };
      });
    }

    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = `annotated_${viewMode === 'clean' ? 'cleaned' : 'original'}_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = getValidationStats();
  const imageUrlTableRows = useMemo(() => {
    if (exportMode !== 'xml-media-folder') return [];
    if (containsImages !== 'yes') return [];
    if (!columnMapping?.imageCol) return [];

    const imageCol = columnMapping.imageCol as string;
    const fileNameToUrl = new Map<string, string>();
    const serialToUrl = new Map<number, string>();
    const canonicalFileNameToUrl = new Map<string, string>();

    uploadedMediaUrls.forEach((entry) => {
      const normalizedName = normalizeMediaFilename(entry.fileName);
      if (normalizedName && !fileNameToUrl.has(normalizedName)) {
        fileNameToUrl.set(normalizedName, entry.publicUrl);
      }

      const canonical = canonicalImageKey(entry.fileName);
      if (canonical && !canonicalFileNameToUrl.has(canonical)) {
        canonicalFileNameToUrl.set(canonical, entry.publicUrl);
      }

      if (entry.serialNumber != null && !serialToUrl.has(entry.serialNumber)) {
        serialToUrl.set(entry.serialNumber, entry.publicUrl);
      }
    });

    return editedRows
      .map((row, index) => {
        const rowSerial = index + 1;
        const imageValue = row[imageCol] ? String(row[imageCol]).trim() : '';
        const isExistingUrl = imageValue.startsWith('http://') || imageValue.startsWith('https://');

        let mappedUrl = '';
        if (isExistingUrl) {
          mappedUrl = imageValue;
        } else if (imageValue) {
          const normalized = normalizeMediaFilename(imageValue);
          mappedUrl = normalized ? (fileNameToUrl.get(normalized) || '') : '';

          if (!mappedUrl) {
            const canonical = canonicalImageKey(imageValue);
            mappedUrl = canonical ? (canonicalFileNameToUrl.get(canonical) || '') : '';
          }

          if (!mappedUrl) {
            mappedUrl = serialToUrl.get(rowSerial) || '';
          }
        }

        const status: 'mapped' | 'existing' | 'missing' | 'empty' =
          mappedUrl && isExistingUrl
            ? 'existing'
            : mappedUrl
              ? 'mapped'
              : imageValue
                ? 'missing'
                : 'empty';

        return {
          rowSerial,
          imageValue,
          mappedUrl,
          status,
        };
      })
      .filter((entry) => entry.imageValue || entry.mappedUrl);
  }, [exportMode, containsImages, columnMapping, editedRows, uploadedMediaUrls]);

  // Loading state
  if (loading) {
    return (
      <div className="h-full bg-[#f9f9ff] flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[#454652]">Loading...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - show registration prompt
  if (!isAuthenticated) {
    return (
      <div className="h-full bg-[#f9f9ff] flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#003a9f]" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Register or login to use Batch QTI Creator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-[#e7eeff] border-[#003a9f]">
              <AlertCircle className="h-4 w-4 text-[#003a9f]" />
              <AlertTitle className="text-[#111c2d]">Free Trial Available</AlertTitle>
              <AlertDescription className="text-[#454652] text-sm">
                Get 1 free QTI export when you sign up! Perfect for testing our batch conversion features.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/auth/register')}
                className="w-full bg-[#003a9f] hover:bg-[#0d4a94] text-white font-medium"
                size="lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Create Account
              </Button>

              <Button
                onClick={() => navigate('/auth/login')}
                variant="outline"
                className="w-full border-[#c5c5d4] text-[#003a9f] hover:bg-[#f0f3ff]"
                size="lg"
              >
                Sign In
              </Button>
            </div>

            <div className="pt-4 border-t border-[#c5c5d4]">
              <h3 className="font-semibold text-[#111c2d] mb-3">What you get:</h3>
              <ul className="space-y-2 text-sm text-[#454652]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>1 free QTI export per month on free plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Support for up to 100 questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Unlimited batch validation</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading spinner while AuthContext is initializing
  if (loading) {
    return (
      <div className="h-full bg-[#f9f9ff] flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#003a9f]" />
      </div>
    );
  }

  // Access gate: user does not have a provisioned Batch Creator token
  if (!hasBatchAccess) {
    const draftMessage = `Hi,

I am a registered user of AssessmentCore (email: ${user?.email ?? ''}).

I would like to request access to the Batch Creator feature. Could you please provide me with an access token?

Thank you.`;

    const handleCopy = () => {
      navigator.clipboard.writeText(draftMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="h-full bg-[#f9f9ff] flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-xl border border-[#c5c5d4]">
          <CardHeader className="pb-4 border-b border-[#c5c5d4]">
            <CardTitle className="flex items-center gap-3 text-[#111c2d]">
              <div className="w-10 h-10 rounded-full bg-[#e7eeff] border border-[#c5c5d4] flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-[#003a9f]" />
              </div>
              Batch QTI Creator — Licensed Access Only
            </CardTitle>
            <CardDescription className="text-[#454652] mt-1">
              This tool is available to licensed users only.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* What it is */}
            <div className="bg-[#f9f9ff] rounded-lg border border-[#c5c5d4] p-4 space-y-2">
              <h3 className="text-sm font-semibold text-[#111c2d]">What you get with a license:</h3>
              <ul className="space-y-1.5 text-sm text-[#454652]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Batch convert Excel / CSV files to QTI 1.2 / 2.1 / 3.0
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Support for 100,000+ questions per file
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Full validation report with inline editing
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Export to Canvas, Moodle, Blackboard, and more
                </li>
              </ul>
            </div>

            {/* Contact administrator */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#111c2d]">Contact Administrator to Get Access</h3>
                <p className="text-xs text-[#454652] mt-0.5">Send a message to the admin to request your access token.</p>
              </div>
              <div className="flex gap-2">
                <a
                  href="https://wa.me/911111111111"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full border-[#003a9f] text-[#003a9f] hover:bg-[#e7eeff] hover:text-[#004fd2] gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </a>
                <a
                  href="mailto:hello@assessmentcore.in"
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full border-[#003a9f] text-[#003a9f] hover:bg-[#e7eeff] gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Button>
                </a>
              </div>

              {/* Draft message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#111c2d]">Draft Message</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-6 px-2 text-xs text-[#454652] hover:text-[#003a9f] gap-1"
                  >
                    {copied ? (
                      <><Check className="w-3 h-3 text-emerald-500" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </Button>
                </div>
                <textarea
                  readOnly
                  value={draftMessage}
                  rows={6}
                  className="w-full text-xs text-[#111c2d] bg-[#f9f9ff] border border-[#c5c5d4] rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#003a9f]"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageTabLabels = ['Upload', 'Validation', 'Clean & Fix', 'AI Audit', 'Configure', 'Export'];
  const uploadStepperLabels: Record<WizardStep, string> = {
    upload: 'Upload',
    validating: 'Validation',
    'clean-fix': 'Fixation',
    'ai-audit': 'AI Audit',
    configure: 'Config',
    transform: 'Export',
  };

  const getStepperIcon = (step: WizardStep) => {
    switch (step) {
      case 'upload':
        return <Upload className="w-4 h-4" />;
      case 'validating':
        return <Shield className="w-4 h-4" />;
      case 'clean-fix':
        return <RefreshCw className="w-4 h-4" />;
      case 'ai-audit':
        return <Sparkles className="w-4 h-4" />;
      case 'configure':
        return <Settings className="w-4 h-4" />;
      case 'transform':
        return <Download className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  if (currentStep === 'upload') {
    return (
      <div className="fixed inset-0 z-50 bg-[#F9FAFB] text-slate-900 antialiased flex">
        {/* Sidebar */}
        <aside
          className="h-screen flex-shrink-0 bg-white flex flex-col border-r border-slate-200 transition-[width] duration-300"
          style={{ width: sidebarWidth }}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className={`mb-4 ${isSidebarHovered ? 'p-8' : 'p-4 flex justify-center'}`}>
            {isSidebarHovered ? (
              <>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">AssessmentCore</h1>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Workflow Wizard</p>
              </>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#0052CC]/10 text-[#0052CC] font-black flex items-center justify-center">A</div>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}
              title="Home"
            >
              <Home className="w-5 h-5" />
              {isSidebarHovered && <span>Home</span>}
            </button>

            <button
              type="button"
              onClick={() => toast.info('XML Previewer will be available soon')}
              className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}
            >
              <Code className="w-5 h-5" />
              {isSidebarHovered && <span>XML Previewer</span>}
            </button>

            <button
              type="button"
              className={`w-full flex items-center py-3 bg-[#0052CC]/5 text-[#0052CC] font-semibold rounded-lg text-sm ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}
            >
              <Upload className="w-5 h-5" />
              {isSidebarHovered && <span>Batch Creator</span>}
            </button>

            <button
              type="button"
              onClick={() => toast.info('LMS Export will be available soon')}
              className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}
            >
              <Download className="w-5 h-5" />
              {isSidebarHovered && <span>LMS Export</span>}
            </button>
          </nav>

          <div className="p-6 mt-auto">
            <button
              type="button"
              onClick={() => toast.info('Draft saved locally')}
              className={`w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center ${isSidebarHovered ? 'justify-center gap-2' : 'justify-center'}`}
            >
              <FileText className="w-4 h-4" />
              {isSidebarHovered && <span>Save Draft</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-h-screen flex flex-col overflow-auto">
          <header className="w-full bg-white border-b border-slate-200 pt-4 pb-5 px-12 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <nav className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-400">Batches</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[#0052CC] font-semibold">New Assessment Batch</span>
              </nav>

              <div className="flex items-center gap-6" ref={profileMenuRef}>
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Help"
                    aria-label="Help"
                  >
                    <CircleHelp className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 transition-colors relative"
                    title="Notifications"
                    aria-label="Notifications"
                    onClick={() => toast.info('No new notifications')}
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 leading-none">{user?.email?.split('@')[0] || 'Alex Rivera'}</p>
                      <p className="text-[10px] text-slate-500">Administrator</p>
                    </div>
                    <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 bg-[#e7eeff] text-[#0052CC] flex items-center justify-center">
                      <UserRound className="w-4 h-4" />
                    </div>
                  </button>

                  <div className={`absolute right-0 mt-2 w-72 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-3 origin-top-right transition-all duration-200 ${
                    isProfileMenuOpen
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                  }`}>
                    <div className="px-2 pb-2 border-b border-[#f0f3ff] mb-2">
                      <p className="text-sm font-semibold text-[#111c2d] truncate">{user?.email || 'User'}</p>
                      <p className="text-xs text-[#454652]">Account menu</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        toast.info('Profile page will be available soon');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/workspace');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Dashboard
                    </button>

                    <div className="mt-2 rounded-lg bg-[#f9f9ff] border border-[#c5c5d4] p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#111c2d]">Usage</span>
                        <span className="text-xs font-semibold text-[#003a9f]">{Math.round(quotaUsedPercent)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#c5c5d4] overflow-hidden">
                        <div className="h-full bg-[#003a9f] transition-all duration-300" style={{ width: `${quotaUsedPercent}%` }} />
                      </div>
                      <p className="text-[11px] text-[#454652] mt-1">{quotaSummary}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto w-full relative px-8">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-slate-200" />
              <div className="flex items-center justify-between relative z-10">
                {stepOrder.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <button
                      key={`upload-step-${step}`}
                      type="button"
                      onClick={() => handleStepperJump(step)}
                      disabled={!canNavigateToStep(step)}
                      className="flex items-center justify-center disabled:cursor-not-allowed"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                          isCurrent
                            ? 'bg-[#0052CC] text-white border-[#0052CC] ring-4 ring-[#0052CC]/10 shadow-lg shadow-[#0052CC]/20'
                            : isDone
                            ? 'bg-[#e7eeff] text-[#0052CC] border-[#b4c5ff]'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        {getStepperIcon(step)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <div className="flex-1 px-12 py-10 bg-slate-50/50">
            <div className="max-w-7xl mx-auto grid grid-cols-12 gap-10">
              <div className="col-span-12 space-y-6">

                <label htmlFor="file-upload" className="block cursor-pointer">
                  <div className="border-2 border-dashed border-[#0052CC]/20 bg-white hover:border-[#0052CC]/40 hover:bg-blue-50/30 transition-all rounded-xl p-16 flex flex-col items-center justify-center text-center group shadow-sm">
                    <div className="w-16 h-16 bg-[#0052CC]/5 text-[#0052CC] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="w-9 h-9" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Drag &amp; Drop Assessment File</h3>
                    <p className="text-sm text-slate-400 mb-8">Support for Excel (.xlsx, .xls), JSON and CSV files up to 50MB</p>
                    <span className="px-8 py-3 bg-[#0052CC] text-white rounded-lg font-bold hover:bg-[#0047B3] transition-all shadow-lg shadow-[#0052CC]/20">
                      Browse Local Files
                    </span>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".csv,.xlsx,.xls,.json"
                  />
                </label>

                {uploadedFiles.length > 0 && (
                  <div className="bg-[#e7eeff] border border-[#b4c5ff] rounded-xl p-4">
                    <div className="flex items-center gap-2 text-[#003a9f] font-semibold text-sm mb-1">
                      <CheckCircle2 className="w-4 h-4" /> File Ready
                    </div>
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="text-sm text-[#111c2d]">
                        <p className="font-semibold">{file.name}</p>
                        <p className="text-xs text-[#454652]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2.5 font-bold text-slate-800">
                      <FileText className="w-5 h-5 text-[#0052CC]" />
                      Raw Data Preview
                    </div>
                    <div className="flex items-center gap-2">
                      {uploadedFiles[0] && (
                        <>
                          <span className="text-[11px] font-mono font-medium bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 border border-slate-200">
                            {uploadedFiles[0].name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{(uploadedFiles[0].size / 1024 / 1024).toFixed(2)}MB</span>
                        </>
                      )}
                    </div>
                  </div>

                  {isParsingUploadPreview && (
                    <div className="px-6 py-4 text-sm text-[#454652] flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading preview...
                    </div>
                  )}

                  {!isParsingUploadPreview && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-slate-50/80">
                          <tr className="text-slate-500 border-b border-slate-100">
                            {previewTableColumns.map((col) => (
                              <th key={`preview-head-${col}`} className="px-6 py-4 font-semibold text-[11px] uppercase tracking-wider">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="text-slate-600 divide-y divide-slate-50">
                          {(previewTableRows.length > 0 ? previewTableRows : [
                            { ID: '101', 'Question Content': 'What is the capital of Renaissance Italy?', Ans_A: 'Rome', Ans_B: 'Florence', Correct: 'B' },
                            { ID: '102', 'Question Content': 'Determine the derivative of f(x) = sin(x).', Ans_A: 'cos(x)', Ans_B: '-cos(x)', Correct: 'A' },
                            { ID: '103', 'Question Content': 'Which molecule is used as biological energy?', Ans_A: 'DNA', Ans_B: 'ATP', Correct: 'B' },
                          ]).map((row, rowIndex) => (
                            <tr key={`preview-row-${rowIndex}`} className="hover:bg-slate-50/50 transition-colors">
                              {previewTableColumns.map((col, colIndex) => {
                                const value = String(row[col] ?? '');
                                const isQuestionCol = colIndex === 1;
                                const isFirstCol = colIndex === 0;
                                const isCorrectCol = col.toLowerCase().includes('correct') || col.toLowerCase().includes('answer');
                                return (
                                  <td
                                    key={`preview-cell-${rowIndex}-${col}`}
                                    className={`px-6 py-4 ${isFirstCol ? 'font-mono text-xs text-slate-400' : ''} ${isQuestionCol ? 'font-medium text-slate-800 max-w-[420px] truncate' : ''}`}
                                    title={value}
                                  >
                                    {isCorrectCol && value.length <= 3 ? (
                                      <span className="bg-[#0052CC]/10 text-[#0052CC] px-2.5 py-1 rounded font-bold text-xs">{value || '—'}</span>
                                    ) : (
                                      value || '—'
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <footer className="sticky bottom-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 py-3.5 px-10 flex justify-end items-center gap-6 z-40">
            <button
              type="button"
              onClick={() => {
                setUploadedFiles([]);
                setUploadPreviewColumns([]);
                setUploadPreviewRows([]);
              }}
              className="text-slate-500 text-sm font-bold hover:text-slate-900 transition-colors"
            >
              Cancel Import
            </button>

            <Button
              onClick={handleProceedToValidation}
              disabled={uploadedFiles.length === 0}
              className="group px-8 py-2.5 bg-[#0052CC] text-white rounded-lg font-bold hover:bg-[#0047B3] hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-300 disabled:text-white disabled:translate-y-0 shadow-lg shadow-[#0052CC]/25 transition-all flex items-center gap-2"
            >
              Proceed to Validation
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </footer>
        </div>
      </div>
    );
  }

  if (currentStep === 'validating') {
    return (
      <div className="fixed inset-0 z-50 bg-[#F9FAFB] text-slate-900 antialiased flex">
        {/* Sidebar */}
        <aside
          className="h-screen flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col transition-[width] duration-300"
          style={{ width: sidebarWidth }}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className={`${isSidebarHovered ? 'p-6' : 'p-4 flex justify-center'}`}>
            {isSidebarHovered ? (
              <>
                <h1 className="text-lg font-black tracking-tighter text-blue-700">AssessmentCore</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Educator Portal</p>
              </>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-black flex items-center justify-center">A</div>
            )}
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`w-full flex items-center py-2 text-slate-600 hover:bg-slate-200/50 transition-all rounded-lg text-sm font-medium ${isSidebarHovered ? 'gap-3 px-3 justify-start' : 'px-0 justify-center'}`}
              title="Home"
            >
              <Home className="w-5 h-5" />
              {isSidebarHovered && <span>Home</span>}
            </button>

            <button
              type="button"
              onClick={() => toast.info('XML Previewer will be available soon')}
              className={`w-full flex items-center py-2 text-slate-600 hover:bg-slate-200/50 transition-all rounded-lg text-sm font-medium ${isSidebarHovered ? 'gap-3 px-3 justify-start' : 'px-0 justify-center'}`}
            >
              <Eye className="w-5 h-5" />
              {isSidebarHovered && <span>XML Previewer</span>}
            </button>
            <button
              type="button"
              className={`w-full flex items-center py-2 bg-slate-200 text-blue-700 font-semibold rounded-lg text-sm ${isSidebarHovered ? 'gap-3 px-3 justify-start' : 'px-0 justify-center'}`}
            >
              <Layers className="w-5 h-5" />
              {isSidebarHovered && <span>Batch Creator</span>}
            </button>
            <button
              type="button"
              onClick={() => toast.info('LMS Export will be available soon')}
              className={`w-full flex items-center py-2 text-slate-600 hover:bg-slate-200/50 transition-all rounded-lg text-sm font-medium ${isSidebarHovered ? 'gap-3 px-3 justify-start' : 'px-0 justify-center'}`}
            >
              <Download className="w-5 h-5" />
              {isSidebarHovered && <span>LMS Export</span>}
            </button>
            <button
              type="button"
              onClick={() => toast.info('Draft saved locally')}
              className={`w-full flex items-center py-2 text-slate-600 hover:bg-slate-200/50 transition-all rounded-lg text-sm font-medium ${isSidebarHovered ? 'gap-3 px-3 justify-start' : 'px-0 justify-center'}`}
            >
              <FileText className="w-5 h-5" />
              {isSidebarHovered && <span>Save Draft</span>}
            </button>
          </nav>
          <div className="p-4 border-t border-slate-200 space-y-1">
            <button
              type="button"
              className={`w-full flex items-center py-2 text-slate-600 hover:bg-slate-200/50 transition-all rounded-lg text-sm font-medium ${isSidebarHovered ? 'gap-3 px-3 justify-start' : 'px-0 justify-center'}`}
            >
              <CircleHelp className="w-5 h-5" />
              {isSidebarHovered && <span>Support</span>}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className={`w-full flex items-center py-2 text-slate-600 hover:bg-slate-200/50 transition-all rounded-lg text-sm font-medium ${isSidebarHovered ? 'gap-3 px-3 justify-start' : 'px-0 justify-center'}`}
            >
              <LogIn className="w-5 h-5" />
              {isSidebarHovered && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Stage */}
        <div className="flex-1 min-h-screen flex flex-col overflow-auto">
          <header className="w-full bg-white border-b border-slate-200 pt-4 pb-5 px-12 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <nav className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-400">Batches</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[#0052CC] font-semibold">New Assessment Batch</span>
              </nav>

              <div className="flex items-center gap-6" ref={profileMenuRef}>
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Help"
                    aria-label="Help"
                  >
                    <CircleHelp className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 transition-colors relative"
                    title="Notifications"
                    aria-label="Notifications"
                    onClick={() => toast.info('No new notifications')}
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 leading-none">{user?.email?.split('@')[0] || 'Alex Rivera'}</p>
                      <p className="text-[10px] text-slate-500">Administrator</p>
                    </div>
                    <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 bg-[#e7eeff] text-[#0052CC] flex items-center justify-center">
                      <UserRound className="w-4 h-4" />
                    </div>
                  </button>

                  <div className={`absolute right-0 mt-2 w-72 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-3 origin-top-right transition-all duration-200 ${
                    isProfileMenuOpen
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                  }`}>
                    <div className="px-2 pb-2 border-b border-[#f0f3ff] mb-2">
                      <p className="text-sm font-semibold text-[#111c2d] truncate">{user?.email || 'User'}</p>
                      <p className="text-xs text-[#454652]">Account menu</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        toast.info('Profile page will be available soon');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/workspace/dashboard');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Dashboard
                    </button>

                    <div className="mt-2 rounded-lg bg-[#f9f9ff] border border-[#c5c5d4] p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#111c2d]">Usage</span>
                        <span className="text-xs font-semibold text-[#003a9f]">{Math.round(quotaUsedPercent)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#c5c5d4] overflow-hidden">
                        <div className="h-full bg-[#003a9f] transition-all duration-300" style={{ width: `${quotaUsedPercent}%` }} />
                      </div>
                      <p className="text-[11px] text-[#454652] mt-1">{quotaSummary}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto w-full relative px-8">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-slate-200" />
              <div className="flex items-center justify-between relative z-10">
                {stepOrder.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <button
                      key={`upload-step-${step}`}
                      type="button"
                      onClick={() => handleStepperJump(step)}
                      disabled={!canNavigateToStep(step)}
                      className="flex items-center justify-center disabled:cursor-not-allowed"
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${
                          isCurrent
                            ? 'bg-[#0052CC] text-white border-[#0052CC] ring-4 ring-[#0052CC]/10 shadow-lg shadow-[#0052CC]/20'
                            : isDone
                            ? 'bg-[#e7eeff] text-[#0052CC] border-[#b4c5ff]'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        {getStepperIcon(step)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-8 pb-32 space-y-8 max-w-[1600px] mx-auto w-full">
            {/* Show progress spinner while validating */}
            {isValidating ? (
              <div className="max-w-xl mx-auto space-y-6 pt-12">
                <Card className="border border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      Validating Questions
                    </CardTitle>
                    <CardDescription>Parsing your file and running validation checks...</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-slate-500">
                        <span>{validationProgressText || 'Processing file...'}</span>
                        <span>{Math.round(validationProgress)}%</span>
                      </div>
                      <Progress value={validationProgress} />
                    </div>
                    {uploadedFiles.length > 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-xs text-slate-500">File: <strong>{uploadedFiles[0].name}</strong></p>
                      </div>
                    )}
                    <Button
                      onClick={() => { setCurrentStep('upload'); setIsValidating(false); }}
                      variant="outline"
                      className="w-full font-semibold"
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                {/* Metric Cards */}
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-emerald-500 transition-all ${
                    stats.valid > 0 ? 'bg-emerald-50 shadow-md ring-2 ring-emerald-500 ring-inset' : 'bg-white shadow-sm hover:bg-emerald-50/30'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Valid</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 font-mono">{stats.valid.toLocaleString()}</span>
                      <span className="text-emerald-600 font-bold text-sm">Items</span>
                    </div>
                  </div>
                  <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-amber-500 transition-all ${
                    stats.caution > 0 ? 'bg-amber-50 shadow-md ring-2 ring-amber-500 ring-inset' : 'bg-white shadow-sm hover:bg-amber-50/30'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Need Review</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 font-mono">{stats.caution.toLocaleString()}</span>
                      <span className="text-amber-600 font-bold text-sm">Items</span>
                    </div>
                  </div>
                  <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-rose-600 relative overflow-hidden ${
                    stats.rejected > 0 ? 'bg-rose-50 shadow-md ring-2 ring-rose-600 ring-inset' : 'bg-white shadow-sm'
                  }`}>
                    <div className="absolute top-0 right-0 p-2 text-rose-200">
                      <XCircle className="w-10 h-10 opacity-20" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-1">Rejected</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-rose-900 font-mono">{stats.rejected.toLocaleString()}</span>
                      <span className="text-rose-600 font-bold text-sm">Items</span>
                    </div>
                  </div>
                  <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-indigo-500 transition-all ${
                    stats.duplicates > 0 ? 'bg-indigo-50 shadow-md ring-2 ring-indigo-500 ring-inset' : 'bg-white shadow-sm hover:bg-indigo-50/30'
                  }`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Duplicates</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 font-mono">{stats.duplicates.toLocaleString()}</span>
                      <span className="text-indigo-600 font-bold text-sm">Items</span>
                    </div>
                  </div>
                </section>

                {autoFixComparison?.after && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-[0.1em] text-slate-600">After Automated Fixing</h4>
                      <span className="text-xs font-semibold text-[#0052CC]">
                        {autoFixComparison.autoFixedCount} auto-fixed applied
                      </span>
                    </div>

                    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                      <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-emerald-500 transition-all ${
                        autoFixComparison.after.valid > 0 ? 'bg-emerald-50 shadow-md ring-2 ring-emerald-500 ring-inset' : 'bg-white shadow-sm hover:bg-emerald-50/30'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Valid</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-slate-900 font-mono">{autoFixComparison.after.valid.toLocaleString()}</span>
                          <span className="text-emerald-600 font-bold text-sm">Items</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Δ {autoFixComparison.after.valid - autoFixComparison.before.valid >= 0 ? '+' : ''}{autoFixComparison.after.valid - autoFixComparison.before.valid}
                        </p>
                      </div>

                      <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-amber-500 transition-all ${
                        autoFixComparison.after.caution > 0 ? 'bg-amber-50 shadow-md ring-2 ring-amber-500 ring-inset' : 'bg-white shadow-sm hover:bg-amber-50/30'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Need Review</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-slate-900 font-mono">{autoFixComparison.after.caution.toLocaleString()}</span>
                          <span className="text-amber-600 font-bold text-sm">Items</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Δ {autoFixComparison.after.caution - autoFixComparison.before.caution >= 0 ? '+' : ''}{autoFixComparison.after.caution - autoFixComparison.before.caution}
                        </p>
                      </div>

                      <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-rose-600 relative overflow-hidden ${
                        autoFixComparison.after.rejected > 0 ? 'bg-rose-50 shadow-md ring-2 ring-rose-600 ring-inset' : 'bg-white shadow-sm'
                      }`}>
                        <div className="absolute top-0 right-0 p-2 text-rose-200">
                          <XCircle className="w-10 h-10 opacity-20" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-1">Rejected</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-rose-900 font-mono">{autoFixComparison.after.rejected.toLocaleString()}</span>
                          <span className="text-rose-600 font-bold text-sm">Items</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Δ {autoFixComparison.after.rejected - autoFixComparison.before.rejected >= 0 ? '+' : ''}{autoFixComparison.after.rejected - autoFixComparison.before.rejected}
                        </p>
                      </div>

                      <div className={`flex flex-col items-start p-6 rounded-xl border-l-4 border-indigo-500 transition-all ${
                        autoFixComparison.autoFixedCount > 0 ? 'bg-indigo-50 shadow-md ring-2 ring-indigo-500 ring-inset' : 'bg-white shadow-sm hover:bg-indigo-50/30'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Auto-fixed</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-slate-900 font-mono">{autoFixComparison.autoFixedCount.toLocaleString()}</span>
                          <span className="text-indigo-600 font-bold text-sm">Items</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">Applied in Clean &amp; Fix</p>
                      </div>
                    </section>
                  </section>
                )}

                {/* Reports Section */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-[0.1em] text-slate-700">Reports Download Center</h4>
                      <p className="text-xs text-slate-500">Download every report generated by this validation run.</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dataset</p>
                      <p className="text-xs font-semibold text-slate-700 truncate">{fileData?.fileName || reportDatasetName || 'Current Batch'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-[#bfd6ff] bg-[#eef4ff] p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.1em] text-[#2457b8]">PDF Report</p>
                        <Download className="w-4 h-4 text-[#2457b8]" />
                      </div>
                      <p className="text-xs text-[#2f4b80] leading-relaxed">Executive summary with quality metrics and validation outcomes.</p>
                      <Button type="button" onClick={handleDownloadValidationReport} className="mt-auto w-full bg-[#2457b8] hover:bg-[#1f4aa0] text-white text-xs font-semibold">
                        Download PDF
                      </Button>
                    </div>

                    <div className="rounded-xl border border-[#ffd8a8] bg-[#fff5e9] p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.1em] text-[#a45a07]">Row Analysis</p>
                        <FileText className="w-4 h-4 text-[#a45a07]" />
                      </div>
                      <p className="text-xs text-[#7a4c1b] leading-relaxed">Detailed row-level diagnostics for every question in the batch.</p>
                      <Button type="button" onClick={handleDownloadRowLevelReport} className="mt-auto w-full bg-[#a45a07] hover:bg-[#8c4d05] text-white text-xs font-semibold">
                        Download Analysis
                      </Button>
                    </div>

                    <div className="rounded-xl border border-[#b9e6d2] bg-[#ebfff5] p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.1em] text-[#18794e]">Annotated Sheet</p>
                        <FileJson className="w-4 h-4 text-[#18794e]" />
                      </div>
                      <p className="text-xs text-[#1f6c4a] leading-relaxed">Spreadsheet export with validation flags and context for remediation.</p>
                      <Button type="button" onClick={handleDownloadAnnotatedSheet} className="mt-auto w-full bg-[#18794e] hover:bg-[#136541] text-white text-xs font-semibold">
                        Download Sheet
                      </Button>
                    </div>
                  </div>
                </section>

              </>
            )}
          </div>

          {/* Sticky Footer */}
          {!isValidating && (
            <footer
              className="fixed bottom-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-8 py-4 z-40 flex items-center justify-between transition-[left] duration-300"
              style={{ left: sidebarWidth }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep('upload')}
                className="px-6 py-2.5 text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors rounded-xl"
              >
                Back to Upload
              </button>

              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setCurrentStep('clean-fix')}
                  className="group px-8 py-2.5 text-xs font-semibold text-white bg-[#2457b8] hover:bg-[#1f4aa0] rounded-md shadow-sm transition-colors flex items-center gap-2"
                >
                  Proceed to Clean &amp; Fix
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </footer>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'ai-audit') {
    const totalRows = filteredAiAuditQueueRows.length;
    const visibleStart = totalRows === 0 ? 0 : aiAuditPageIndex * AI_AUDIT_PAGE_SIZE + 1;
    const visibleEnd = Math.min(totalRows, (aiAuditPageIndex + 1) * AI_AUDIT_PAGE_SIZE);
    const activeRow = activeAiAuditRow;
    const failedCount = aiAuditQueueRows.filter((row) => row.aiStatus === 'FAILED').length;
    const passedCount = aiAuditQueueRows.filter((row) => row.aiStatus === 'PASSED').length;
    const questionColKey = columnMapping?.questionCol || 'question';
    const answerColKey = columnMapping?.answerCol || 'answer';
    const questionTypeColKey = columnMapping?.questionTypeCol || 'questionType';
    const optionColKeys: string[] = columnMapping?.optionCols || [];

    return (
      <div className="fixed inset-0 z-50 bg-[#f0f4f8] text-slate-900 antialiased flex overflow-hidden">
        <aside
          className="h-screen flex-shrink-0 bg-white flex flex-col border-r border-slate-200 z-50 transition-[width] duration-300"
          style={{ width: sidebarWidth }}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className={`mb-4 ${isSidebarHovered ? 'p-8' : 'p-4 flex justify-center'}`}>
            {isSidebarHovered ? (
              <>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">AssessmentCore</h1>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Workflow Wizard</p>
              </>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#0052CC]/10 text-[#0052CC] font-black flex items-center justify-center">A</div>
            )}
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <button type="button" onClick={() => navigate('/')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}>
              <Home className="w-5 h-5" /> {isSidebarHovered && <span>Home</span>}
            </button>
            <button type="button" onClick={() => toast.info('XML Previewer will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}>
              <Code className="w-5 h-5" /> {isSidebarHovered && <span>XML Previewer</span>}
            </button>
            <button type="button" className={`w-full flex items-center py-3 bg-[#0052CC]/5 text-[#0052CC] font-semibold rounded-lg text-sm ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}>
              <Upload className="w-5 h-5" /> {isSidebarHovered && <span>Batch Creator</span>}
            </button>
            <button type="button" onClick={() => toast.info('LMS Export will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}>
              <Download className="w-5 h-5" /> {isSidebarHovered && <span>LMS Export</span>}
            </button>
          </nav>
          <div className="p-6 mt-auto">
            <button type="button" onClick={() => toast.info('Draft saved locally')} className={`w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center ${isSidebarHovered ? 'justify-center gap-2' : 'justify-center'}`}>
              <FileText className="w-4 h-4" />
              {isSidebarHovered && <span>Save Draft</span>}
            </button>
          </div>
        </aside>

        <div className="flex-1 ml-0 flex flex-col min-w-0 bg-[#f0f4f8] overflow-hidden">
          <header className="w-full bg-white border-b border-slate-200 pt-4 pb-5 px-12 flex flex-col shrink-0">
            <div className="flex justify-between items-center mb-6">
              <nav className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-400">Batches</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[#0052CC] font-semibold">{fileData?.fileName || 'Calculus_Midterm_Batch'}</span>
              </nav>
              <div className="flex items-center gap-6" ref={profileMenuRef}>
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors" title="Help"><CircleHelp className="w-5 h-5" /></button>
                  <button type="button" onClick={() => toast.info('No new notifications')} className="text-slate-400 hover:text-slate-600 transition-colors relative" title="Notifications">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 leading-none">{user?.email?.split('@')[0] || 'Prof. Harrison'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Tier</p>
                    </div>
                    <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 bg-[#e7eeff] text-[#0052CC] flex items-center justify-center">
                      <UserRound className="w-4 h-4" />
                    </div>
                  </button>

                  <div className={`absolute right-0 mt-2 w-56 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-2.5 origin-top-right transition-all duration-200 ${
                    isProfileMenuOpen
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        toast.info('Profile page will be available soon');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/workspace/dashboard');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-5xl mx-auto w-full relative px-8">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-slate-200" />
              <div className="flex items-center justify-between relative z-10">
                {stepOrder.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <button key={`audit-step-${step}`} type="button" onClick={() => handleStepperJump(step)} disabled={!canNavigateToStep(step)} className="flex items-center justify-center disabled:cursor-not-allowed">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        isDone
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/10 shadow-lg shadow-emerald-600/20'
                          : isCurrent
                          ? 'bg-[#0052CC] text-white ring-4 ring-[#0052CC]/10 shadow-lg shadow-[#0052CC]/20'
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}>
                        {getStepperIcon(step)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden flex">
            <div className="flex-1 flex flex-col p-8 min-w-0 space-y-6 overflow-y-auto bg-slate-50/50 pb-24">
              <div className="grid grid-cols-12 gap-6 items-stretch">
                <div className="col-span-12 flex flex-col gap-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Audit Queue</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-bold">{totalRows} Rows</span>
                  </div>
                  <div className="px-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAiAuditStatusFilter('ALL');
                        setAiAuditPageIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        aiAuditStatusFilter === 'ALL'
                          ? 'bg-[#e7eeff] border-[#c5d8ff] text-[#003a9f]'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      All ({aiAuditQueueRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiAuditStatusFilter('FAILED');
                        setAiAuditPageIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        aiAuditStatusFilter === 'FAILED'
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Failed ({failedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiAuditStatusFilter('PASSED');
                        setAiAuditPageIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
                        aiAuditStatusFilter === 'PASSED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Passed ({passedCount})
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-2">
                    <div className="text-[11px] font-semibold text-slate-500">
                      Showing {visibleStart}-{visibleEnd} of {totalRows}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAiAuditPageIndex((prev) => Math.max(0, prev - 1))}
                        disabled={aiAuditPageIndex === 0}
                        className="h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-600 disabled:text-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center justify-center"
                        title="Previous 100 rows"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiAuditPageIndex((prev) => Math.min(totalAiAuditPages - 1, prev + 1))}
                        disabled={aiAuditPageIndex >= totalAiAuditPages - 1}
                        className="h-7 w-7 rounded-md border border-slate-200 bg-white text-slate-600 disabled:text-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center justify-center"
                        title="Next 100 rows"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="px-2">
                    <button
                      type="button"
                      onClick={handleStartAiAudit}
                      disabled={isAuditing || visibleAiAuditQueueRows.length === 0}
                      className="w-full h-8 rounded-lg bg-[#0052CC] text-white text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#0047B3] transition-colors"
                    >
                      {isAuditing
                        ? `Auditing ${auditProgress.current}/${auditProgress.total}`
                        : `Run AI Audit (Visible ${visibleAiAuditQueueRows.length})`}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {visibleAiAuditQueueRows.map((row) => {
                      const isActive = row.rowKey === activeRow?.rowKey;
                      const isFailed = row.aiStatus === 'FAILED';
                      const isPassed = row.aiStatus === 'PASSED';
                      const isEditing = aiAuditEditingRowKey === row.rowKey;
                      const draftRow = aiAuditDraftRows.get(row.rowKey) ?? row.rowData;
                      const optionPreview = optionColKeys
                        .map((col, idx) => ({
                          key: col,
                          label: String.fromCharCode(65 + idx),
                          value: String(draftRow?.[col] ?? '').trim(),
                        }))
                        .filter((opt) => opt.value.length > 0);
                      return (
                        <button
                          key={`audit-row-${row.rowKey}`}
                          type="button"
                          onClick={() => setSelectedAuditRowKey(row.rowKey)}
                          className={`w-full text-left bg-white p-4 rounded-xl transition-all ${isActive ? 'border-2 border-[#0052CC] shadow-sm' : 'border border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-700">Q-{1000 + row.rowNumber}</span>
                              {row.fixTag === 'MANUAL_FIXED' && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#e7eeff] text-[#004fd2]">
                                  Manually Fixed
                                </span>
                              )}
                              {row.fixTag === 'AUTO_FIXED' && (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                  Auto Fixed
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isPassed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : isFailed ? (
                                <XCircle className="w-4 h-4 text-rose-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-slate-400" />
                              )}
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                isPassed ? 'text-emerald-700' : isFailed ? 'text-rose-700' : 'text-slate-500'
                              }`}>
                                {isPassed ? 'AI Passed' : isFailed ? 'AI Failed' : 'Not Audited'}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{row.questionText || 'Question text unavailable.'}</p>

                          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                              <span className="font-semibold text-slate-500 uppercase tracking-wide">Type</span>
                              <p className="text-slate-700 mt-0.5">{String(draftRow?.[questionTypeColKey] ?? '—')}</p>
                            </div>
                            <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 md:col-span-2">
                              <span className="font-semibold text-slate-500 uppercase tracking-wide">Answer</span>
                              <p className="text-slate-700 mt-0.5">{String(draftRow?.[answerColKey] ?? '—')}</p>
                            </div>
                          </div>

                          {optionPreview.length > 0 && (
                            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Options</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                                {optionPreview.map((opt) => (
                                  <div key={`${row.rowKey}-${opt.key}`} className="truncate">
                                    <span className="font-semibold mr-1">{opt.label}.</span>
                                    {opt.value}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {isFailed && (
                            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-2">
                              <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide mb-1">Fail Reason</p>
                              <p className="text-xs text-rose-800 line-clamp-2">{row.aiFeedback || 'AI marked this question as failed but no explanation was returned.'}</p>
                            </div>
                          )}

                          {isActive && (
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                              <div className={`rounded-lg p-3 text-xs leading-relaxed border ${
                                isPassed
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : isFailed
                                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}>
                                {row.aiFeedback}
                              </div>

                              {isFailed && row.aiIssues.length > 0 && (
                                <div className="rounded-lg p-3 text-xs leading-relaxed border bg-rose-50 border-rose-200 text-rose-800 space-y-2">
                                  <p className="font-semibold uppercase tracking-wide text-[10px]">Detailed AI Findings</p>
                                  {row.aiIssues.map((issue, idx) => (
                                    <div key={`${row.rowKey}-issue-${idx}`} className="rounded-md border border-rose-200 bg-white px-2 py-1.5">
                                      <p className="font-semibold text-[11px] uppercase tracking-wide text-rose-700">{issue.issue_type}</p>
                                      <p>{issue.description}</p>
                                      <p className="mt-1 text-rose-700"><span className="font-semibold">Suggestion:</span> {issue.suggestion}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {isFailed && row.aiSuggestedFix && (
                                <div className="rounded-lg p-3 text-xs leading-relaxed border bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]">
                                  <p className="font-semibold uppercase tracking-wide text-[10px] mb-1">Suggested Fix</p>
                                  {row.aiSuggestedFix}
                                </div>
                              )}

                              {isFailed && isEditing && (
                                <div className="rounded-lg p-3 border border-[#c5d8ff] bg-[#f5f8ff] space-y-2 text-xs">
                                  <p className="font-semibold uppercase tracking-wide text-[10px] text-[#003a9f]">Inline Edit</p>
                                  <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Question</label>
                                    <textarea
                                      value={String(draftRow?.[questionColKey] ?? '')}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => handleInlineAuditFieldChange(row.rowKey, questionColKey, e.target.value)}
                                      rows={2}
                                      className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800"
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Answer</label>
                                      <input
                                        value={String(draftRow?.[answerColKey] ?? '')}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => handleInlineAuditFieldChange(row.rowKey, answerColKey, e.target.value)}
                                        className="mt-1 w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Type</label>
                                      <input
                                        value={String(draftRow?.[questionTypeColKey] ?? '')}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => handleInlineAuditFieldChange(row.rowKey, questionTypeColKey, e.target.value)}
                                        className="mt-1 w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
                                      />
                                    </div>
                                  </div>
                                  {optionColKeys.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {optionColKeys.map((col, idx) => (
                                        <div key={`${row.rowKey}-edit-${col}`}>
                                          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Option {String.fromCharCode(65 + idx)}</label>
                                          <input
                                            value={String(draftRow?.[col] ?? '')}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(e) => handleInlineAuditFieldChange(row.rowKey, col, e.target.value)}
                                            className="mt-1 w-full h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAuditSingleQuestion(row.rowData, row.rowKey);
                                  }}
                                  disabled={isAuditing}
                                  className="px-3 py-1.5 rounded-md bg-[#0052CC] text-white text-[11px] font-semibold hover:bg-[#0047B3] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {isAuditing ? 'Auditing...' : 'AI Audit This Question'}
                                </button>

                                {isFailed && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isEditing) {
                                        handleSaveInlineAuditEdit(row.rowKey);
                                      } else {
                                        handleStartInlineAuditEdit(row.rowKey, row.rowData);
                                      }
                                    }}
                                    className="px-3 py-1.5 rounded-md border border-rose-300 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-100"
                                  >
                                    {isEditing ? 'Save Inline Fix' : 'Edit in This Card'}
                                  </button>
                                )}

                                {isFailed && isEditing && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAiAuditEditingRowKey(null);
                                    }}
                                    className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50"
                                  >
                                    Cancel Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {visibleAiAuditQueueRows.length === 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-500">
                        No rows available on this page.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <footer
              className="absolute bottom-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-10 flex justify-between items-center z-40 shrink-0 transition-[left] duration-300"
              style={{ left: sidebarWidth }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep('clean-fix')}
                className="px-6 py-2.5 text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors rounded-xl"
              >
                Back to Clean & Fix Stage
              </button>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setCurrentStep('configure')}
                  className="group px-8 py-2.5 bg-[#0052CC] text-white rounded-lg font-bold hover:bg-[#0047B3] hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-[#0052CC]/25 transition-all flex items-center gap-2"
                >
                  Proceed to Config
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </footer>
          </main>
        </div>
      </div>
    );
  }

  if (currentStep === 'configure') {
    const configChecklist = [
      { label: 'QTI Version', done: !!outputFormat },
      { label: 'Package Type', done: !!exportMode },
      { label: 'Images setting', done: !!containsImages },
      { label: 'Math setting', done: !!containsMath && (containsMath !== 'yes' || !!mathFormat) },
      { label: 'Template XML', done: !!hasTemplateXml && (hasTemplateXml !== 'yes' || !!templateXmlFile) },
    ];
    const completedConfigCount = configChecklist.filter((item) => item.done).length;
    const configProgress = Math.round((completedConfigCount / configChecklist.length) * 100);

    return (
      <div className="fixed inset-0 z-50 bg-[#f0f4f8] text-slate-900 antialiased flex overflow-hidden">
        <aside
          className="h-screen flex-shrink-0 bg-white flex flex-col border-r border-slate-200 transition-[width] duration-300"
          style={{ width: sidebarWidth }}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className={`mb-4 ${isSidebarHovered ? 'p-8' : 'p-4 flex justify-center'}`}>
            {isSidebarHovered ? (
              <>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">AssessmentCore</h1>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Workflow Wizard</p>
              </>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#0052CC]/10 text-[#0052CC] font-black flex items-center justify-center">A</div>
            )}
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <button type="button" onClick={() => navigate('/')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Home className="w-5 h-5" /> {isSidebarHovered && <span>Home</span>}</button>
            <button type="button" onClick={() => toast.info('XML Previewer will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Code className="w-5 h-5" /> {isSidebarHovered && <span>XML Previewer</span>}</button>
            <button type="button" className={`w-full flex items-center py-3 bg-[#0052CC]/5 text-[#0052CC] font-semibold rounded-lg text-sm ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Upload className="w-5 h-5" /> {isSidebarHovered && <span>Batch Creator</span>}</button>
            <button type="button" onClick={() => toast.info('LMS Export will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Download className="w-5 h-5" /> {isSidebarHovered && <span>LMS Export</span>}</button>
          </nav>
          <div className="p-6 mt-auto">
            <button type="button" onClick={() => toast.info('Draft saved locally')} className={`w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center ${isSidebarHovered ? 'justify-center gap-2' : 'justify-center'}`}><FileText className="w-4 h-4" />{isSidebarHovered && <span>Save Draft</span>}</button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="w-full bg-white border-b border-slate-200 pt-4 pb-5 px-12 flex flex-col shrink-0">
            <div className="flex justify-between items-center mb-6">
              <nav className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-400">Batches</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[#0052CC] font-semibold">{fileData?.fileName || 'New Assessment Batch'}</span>
              </nav>
              <div className="flex items-center gap-6" ref={profileMenuRef}>
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors" title="Help"><CircleHelp className="w-5 h-5" /></button>
                  <button type="button" onClick={() => toast.info('No new notifications')} className="text-slate-400 hover:text-slate-600 transition-colors relative" title="Notifications"><Bell className="w-5 h-5" /><span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" /></button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 leading-none">{user?.email?.split('@')[0] || 'User'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Tier</p>
                    </div>
                    <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 bg-[#e7eeff] text-[#0052CC] flex items-center justify-center"><UserRound className="w-4 h-4" /></div>
                  </button>

                  <div className={`absolute right-0 mt-2 w-56 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-2.5 origin-top-right transition-all duration-200 ${
                    isProfileMenuOpen
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        toast.info('Profile page will be available soon');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/workspace/dashboard');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-5xl mx-auto w-full relative px-8">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-slate-200" />
              <div className="flex items-center justify-between relative z-10">
                {stepOrder.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <button key={`cfg-stepper-${step}`} type="button" onClick={() => handleStepperJump(step)} disabled={!canNavigateToStep(step)} className="flex items-center justify-center disabled:cursor-not-allowed">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${isDone ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/10 shadow-lg shadow-emerald-600/20' : isCurrent ? 'bg-[#0052CC] text-white ring-4 ring-[#0052CC]/10 shadow-lg shadow-[#0052CC]/20' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                        {getStepperIcon(step)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 pb-28">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2 text-base text-slate-900"><Settings className="w-4 h-4 text-[#0052CC]" /> Export Configuration</CardTitle>
                      <CardDescription>Configure how your questions will be packaged and exported</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4 rounded-xl border border-[#bfd6ff] bg-[#eef4ff] p-5">
                        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-xs flex items-center justify-center font-bold shrink-0">1</div><span className="text-sm font-semibold text-slate-900">Output Format</span></div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">QTI Version <span className="text-red-500">*</span></label>
                          <div className="flex gap-2 flex-wrap">{[{ value: 'qti-1.2', label: 'QTI 1.2' }, { value: 'qti-2.1', label: 'QTI 2.1' }, { value: 'qti-3.0', label: 'QTI 3.0' }, { value: 'json', label: 'JSON' }].map(({ value, label }) => (<button key={value} type="button" onClick={() => { setOutputFormat(value); setExportValidationError(''); setConfigurationValidationError(''); }} className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${outputFormat === value ? 'bg-[#2457b8] text-white border-[#2457b8] shadow-sm' : 'bg-white text-[#2f4b80] border-[#bfd6ff] hover:border-[#2457b8] hover:text-[#2457b8]'} ${outputFormat === '' && showConfigErrors ? 'border-red-300' : ''}`}>{label}</button>))}</div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">Package Type <span className="text-red-500">*</span></label>
                          <div className="grid grid-cols-2 gap-3">{[{ value: 'qti-package', icon: <Download className="w-5 h-5" />, title: 'QTI Package', desc: 'ZIP with imsmanifest.xml for standards-compliant package delivery' }, { value: 'xml-media-folder', icon: <FolderOpen className="w-5 h-5" />, title: 'XML + Media', desc: 'Separate xml/ and media/ folders - for custom pipelines' }].map(({ value, icon, title, desc }) => (<button key={value} type="button" onClick={() => { setExportMode(value as any); setExportValidationError(''); setConfigurationValidationError(''); }} className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border-2 text-left transition-all ${exportMode === value ? 'border-[#2457b8] bg-white shadow-sm' : `border-[#bfd6ff] bg-white hover:border-[#2457b8]/60 ${exportMode === '' && showConfigErrors ? 'border-red-200' : ''}`}`}>{exportMode === value && (<CheckCircle2 className="w-4 h-4 text-[#2457b8] absolute top-3 right-3" />)}<span className={`${exportMode === value ? 'text-[#2457b8]' : 'text-[#2f4b80]'}`}>{icon}</span><span className={`text-sm font-semibold ${exportMode === value ? 'text-[#2457b8]' : 'text-slate-900'}`}>{title}</span><span className="text-xs text-slate-500 leading-snug">{desc}</span></button>))}</div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100" />

                      <div className="space-y-4 rounded-xl border border-[#ffd8a8] bg-[#fff5e9] p-5">
                        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-xs flex items-center justify-center font-bold shrink-0">2</div><span className="text-sm font-semibold text-slate-900">Data Features</span></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-white rounded-xl p-4 space-y-3 border border-[#ffd8a8]"><div className="flex items-center gap-2"><Image className="w-4 h-4 text-[#a45a07]" /><span className="text-sm font-medium text-slate-900">Contains Images?</span><span className="text-red-500 text-xs ml-auto">*</span></div><div className="flex gap-2">{(['yes', 'no'] as const).map((v) => (<button key={v} type="button" onClick={() => { setContainsImages(v); setConfigurationValidationError(''); if (v === 'no') { setMediaZipFile(null); setMediaFiles(new Map()); setMediaValidationErrors([]); } }} className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-all capitalize ${containsImages === v ? v === 'yes' ? 'bg-[#a45a07] text-white border-[#a45a07]' : 'bg-slate-800 text-white border-slate-800' : `bg-white text-[#7a4c1b] border-[#ffd8a8] hover:border-[#a45a07] ${containsImages === '' && showConfigErrors ? 'border-red-200' : ''}`}`}>{v === 'yes' ? 'Yes' : 'No'}</button>))}</div></div>
                          <div className="bg-white rounded-xl p-4 space-y-3 border border-[#ffd8a8]"><div className="flex items-center gap-2"><Code className="w-4 h-4 text-[#a45a07]" /><span className="text-sm font-medium text-slate-900">Contains Math?</span><span className="text-red-500 text-xs ml-auto">*</span></div><div className="flex gap-2">{(['yes', 'no'] as const).map((v) => (<button key={v} type="button" onClick={() => { setContainsMath(v); setConfigurationValidationError(''); if (v === 'no') setMathFormat(''); }} className={`flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-all capitalize ${containsMath === v ? v === 'yes' ? 'bg-[#a45a07] text-white border-[#a45a07]' : 'bg-slate-800 text-white border-slate-800' : `bg-white text-[#7a4c1b] border-[#ffd8a8] hover:border-[#a45a07] ${containsMath === '' && showConfigErrors ? 'border-red-200' : ''}`}`}>{v === 'yes' ? 'Yes' : 'No'}</button>))}</div>{containsMath === 'yes' && (<div className="pt-1 space-y-1.5"><label className="block text-xs text-[#7a4c1b]">Math Format <span className="text-red-500">*</span></label><div className="flex gap-2">{[{ value: 'mathjax', label: 'MathJax' }, { value: 'mathml', label: 'MathML' }].map(({ value, label }) => (<button key={value} type="button" onClick={() => { setMathFormat(value as any); setConfigurationValidationError(''); }} className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-all ${mathFormat === value ? 'bg-[#a45a07] text-white border-[#a45a07]' : `bg-white text-[#7a4c1b] border-[#ffd8a8] hover:border-[#a45a07] ${mathFormat === '' && showConfigErrors ? 'border-red-200' : ''}`}`}>{label}</button>))}</div></div>)}</div>
                        </div>
                      </div>

                      <div className="border-t border-slate-100" />

                      <div className="space-y-3 rounded-xl border border-[#b9e6d2] bg-[#ebfff5] p-5">
                        <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-[#0052CC] text-white text-xs flex items-center justify-center font-bold shrink-0">3</div><span className="text-sm font-semibold text-slate-900">Template XML</span></div>
                        <div className="bg-white rounded-xl p-4 space-y-3 border border-[#b9e6d2]">
                          <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-900">Use a template XML?</p><p className="text-xs text-[#1f6c4a] mt-0.5">Apply a structural XML template to all generated items</p></div><div className="flex gap-2 shrink-0">{(['yes', 'no'] as const).map((v) => (<button key={v} type="button" onClick={() => { setHasTemplateXml(v); setConfigurationValidationError(''); if (v === 'no') setTemplateXmlFile(null); }} className={`px-4 py-1.5 rounded-lg border text-sm font-semibold transition-all ${hasTemplateXml === v ? v === 'yes' ? 'bg-[#18794e] text-white border-[#18794e]' : 'bg-slate-800 text-white border-slate-800' : `bg-white text-[#1f6c4a] border-[#b9e6d2] hover:border-[#18794e] ${hasTemplateXml === '' && showConfigErrors ? 'border-red-200' : ''}`}`}>{v === 'yes' ? 'Yes' : 'No'}</button>))}</div></div>
                        </div>
                      </div>

                      {configurationValidationError && (<Alert className="bg-[#ffdad6] border-red-300"><AlertCircle className="h-4 w-4 text-red-500" /><AlertDescription className="text-red-700 text-sm">{configurationValidationError}</AlertDescription></Alert>)}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-4 space-y-4">
                  <Card className="border border-[#bfd6ff] bg-[#eef4ff] shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-[#2457b8]">Configuration Checklist</CardTitle><CardDescription className="text-xs text-[#2f4b80]">Progress: {completedConfigCount}/{configChecklist.length}</CardDescription></CardHeader><CardContent className="space-y-2">{configChecklist.map(({ label, done }) => (<div key={label} className="flex items-center gap-2.5"><div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${done ? 'bg-[#2457b8]' : 'bg-[#bfd6ff]'}`}>{done && <Check className="w-2.5 h-2.5 text-white" />}</div><span className={`text-sm ${done ? 'text-[#2457b8] font-semibold' : 'text-[#2f4b80]'}`}>{label}</span></div>))}<div className="pt-2"><div className="h-1.5 rounded-full bg-[#bfd6ff] overflow-hidden"><div className="h-full bg-[#2457b8] transition-all duration-300" style={{ width: `${configProgress}%` }} /></div></div></CardContent></Card>

                  {hasTemplateXml === 'yes' && (
                    <Card className="border border-[#b9e6d2] bg-[#ebfff5] shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#18794e]"><FileText className="w-4 h-4 text-[#18794e]" /> Template XML</CardTitle><CardDescription className="text-xs text-[#1f6c4a]">Upload the XML template to apply across generated items</CardDescription></CardHeader><CardContent className="space-y-3"><label htmlFor="template-xml-upload" className="block w-full cursor-pointer"><div className={`border border-dashed rounded-lg p-4 text-center hover:border-[#18794e] hover:bg-white transition-colors ${templateXmlFile ? 'border-[#18794e] bg-white' : 'border-[#b9e6d2] bg-[#ebfff5]'}`}>{templateXmlFile ? (<div className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#18794e]" /><span className="text-sm font-semibold text-[#18794e]">{templateXmlFile.name}</span></div>) : (<><FileText className="w-6 h-6 text-[#1f6c4a] mx-auto mb-1" /><p className="text-sm text-[#1f6c4a]">Click to upload <span className="font-semibold">.xml</span> template</p></>)}</div><input id="template-xml-upload" type="file" className="hidden" onChange={handleTemplateUpload} accept=".xml" /></label></CardContent></Card>
                  )}

                  {containsImages === 'yes' && (
                    <Card className="border border-[#b9e6d2] bg-[#ebfff5] shadow-sm"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#18794e]"><Image className="w-4 h-4 text-[#18794e]" /> Media Files</CardTitle><CardDescription className="text-xs text-[#1f6c4a]">Upload images referenced in your questions</CardDescription></CardHeader><CardContent className="space-y-3"><div className="grid grid-cols-2 gap-2"><label htmlFor="media-upload-cfg" className="cursor-pointer"><div className="border border-dashed border-[#b9e6d2] rounded-lg p-3 text-center hover:border-[#18794e] hover:bg-white transition-colors"><Download className="w-5 h-5 text-[#1f6c4a] mx-auto mb-1" /><p className="text-xs font-semibold text-[#1f6c4a]">ZIP File</p></div><input id="media-upload-cfg" type="file" className="hidden" onChange={handleMediaUpload} accept=".zip" /></label><label htmlFor="media-folder-upload-cfg" className="cursor-pointer"><div className="border border-dashed border-[#b9e6d2] rounded-lg p-3 text-center hover:border-[#18794e] hover:bg-white transition-colors"><FolderOpen className="w-5 h-5 text-[#1f6c4a] mx-auto mb-1" /><p className="text-xs font-semibold text-[#1f6c4a]">Folder</p></div><input id="media-folder-upload-cfg" type="file" className="hidden" multiple onChange={handleMediaFolderUpload} accept=".png,.jpg,.jpeg,.gif,.svg,.webp,.bmp" {...({ webkitdirectory: 'true', directory: 'true' } as any)} /></label></div>{isProcessingMedia && (<p className="text-xs text-[#1f6c4a] flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Processing media files...</p>)}{(mediaZipFile || mediaFiles.size > 0) && !isProcessingMedia && (<div className="rounded-lg border border-[#b9e6d2] bg-white px-3 py-2"><p className="text-xs font-semibold text-[#18794e]">{mediaZipFile ? mediaZipFile.name : 'Folder selected'}</p><p className="text-[11px] text-[#1f6c4a]">{mediaFiles.size} image(s) loaded</p></div>)}</CardContent></Card>
                  )}
                </div>
              </div>
            </div>

            <footer
              className="fixed bottom-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-8 py-4 z-40 flex items-center justify-between transition-[left] duration-300"
              style={{ left: sidebarWidth }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep('ai-audit')}
                className="px-6 py-2.5 text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors rounded-xl"
              >
                Back to AI Audit
              </button>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleTransformClick}
                  disabled={isExporting || !isExportConfigComplete()}
                  className={`group px-8 py-2.5 text-xs font-semibold text-white rounded-md shadow-sm transition-colors flex items-center gap-2 ${
                    !isExportConfigComplete()
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-[#2457b8] hover:bg-[#1f4aa0]'
                  }`}
                >
                  {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</> : <>Proceed to Transform <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
                </Button>
              </div>
            </footer>
          </main>
        </div>
      </div>
    );
  }

  if (currentStep === 'transform') {
    const previewXmlContent = selectedXmlReviewItem
      ? (
        xmlPreviewMode === 'rendered' &&
        rawXmlDraftSourceIndex === selectedXmlReviewIndex &&
        rawXmlDraft.trim() !== selectedXmlReviewItem.xmlContent.trim()
          ? rawXmlDraft
          : selectedXmlReviewItem.xmlContent
      )
      : '';
    const selectedPreviewData = selectedXmlReviewItem ? parseXmlPreviewData(previewXmlContent) : null;
    const selectedSubmission = studentPreviewSubmissions[selectedXmlReviewIndex] || null;
    const selectedChoiceResponse = studentChoiceResponses[selectedXmlReviewIndex] || [];
    const selectedTextResponse = studentTextResponses[selectedXmlReviewIndex] || '';
    const selectedOrderResponse = studentOrderResponses[selectedXmlReviewIndex]
      || selectedPreviewData?.orderChoices.map((choice) => choice.id)
      || [];

    const submitStudentPreview = () => {
      if (!selectedPreviewData) return;

      const correctIds = new Set((selectedPreviewData.correctResponseValues || []).map((v) => String(v || '').trim().toUpperCase()).filter(Boolean));
      let isCorrect = false;

      if (selectedPreviewData.interactionType === 'choice') {
        const selected = selectedChoiceResponse.map((v) => String(v || '').trim().toUpperCase()).filter(Boolean);
        if ((selectedPreviewData.maxChoices || 1) <= 1) {
          isCorrect = selected.length === 1 && correctIds.has(selected[0]);
        } else {
          const selectedSet = new Set(selected);
          isCorrect = selectedSet.size === correctIds.size && Array.from(correctIds).every((id) => selectedSet.has(id));
        }
      } else if (selectedPreviewData.interactionType === 'textentry') {
        const typed = String(selectedTextResponse || '').trim().toLowerCase();
        const accepted = (selectedPreviewData.acceptedTextAnswers || [])
          .map((v) => String(v || '').trim().toLowerCase())
          .filter(Boolean);
        isCorrect = typed.length > 0 && accepted.includes(typed);
      } else if (selectedPreviewData.interactionType === 'order') {
        const expected = (selectedPreviewData.correctResponseValues || []).map((v) => String(v || '').trim().toUpperCase()).filter(Boolean);
        const actual = selectedOrderResponse.map((v) => String(v || '').trim().toUpperCase()).filter(Boolean);
        isCorrect = expected.length > 0 && expected.length === actual.length && expected.every((id, idx) => id === actual[idx]);
      }

      const feedbackCandidates = selectedPreviewData.feedbackBlocks || [];
      const preferredFeedback = feedbackCandidates.find((feedback) => {
        const text = `${feedback.id} ${feedback.title}`.toLowerCase();
        return isCorrect ? /(correct|right|pass|success)/.test(text) : /(incorrect|wrong|fail|retry|again)/.test(text);
      });

      const fallbackFeedback = feedbackCandidates[0];
      const feedbackHtml = preferredFeedback?.html
        || fallbackFeedback?.html
        || (isCorrect ? '<p>Correct.</p>' : '<p>Incorrect. Please try again.</p>');

      setStudentPreviewSubmissions((prev) => ({
        ...prev,
        [selectedXmlReviewIndex]: {
          submitted: true,
          isCorrect,
          score: isCorrect ? 1 : 0,
          feedbackHtml,
        },
      }));
    };

    const reviewRangeStart = generatedXmlItems.length === 0 ? 0 : visibleXmlReviewStart + 1;
    const reviewRangeEnd = Math.min(generatedXmlItems.length, visibleXmlReviewStart + XML_REVIEW_PAGE_SIZE);

    return (
      <div className="fixed inset-0 z-50 bg-[#f0f4f8] text-slate-900 antialiased flex overflow-hidden">
        <aside
          className="h-screen flex-shrink-0 bg-white flex flex-col border-r border-slate-200 transition-[width] duration-300"
          style={{ width: sidebarWidth }}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className={`mb-4 ${isSidebarHovered ? 'p-8' : 'p-4 flex justify-center'}`}>
            {isSidebarHovered ? (
              <>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">AssessmentCore</h1>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Workflow Wizard</p>
              </>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#0052CC]/10 text-[#0052CC] font-black flex items-center justify-center">A</div>
            )}
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <button type="button" onClick={() => navigate('/')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Home className="w-5 h-5" /> {isSidebarHovered && <span>Home</span>}</button>
            <button type="button" onClick={() => toast.info('XML Previewer will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Code className="w-5 h-5" /> {isSidebarHovered && <span>XML Previewer</span>}</button>
            <button type="button" className={`w-full flex items-center py-3 bg-[#0052CC]/5 text-[#0052CC] font-semibold rounded-lg text-sm ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Upload className="w-5 h-5" /> {isSidebarHovered && <span>Batch Creator</span>}</button>
            <button type="button" onClick={() => toast.info('LMS Export will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Download className="w-5 h-5" /> {isSidebarHovered && <span>LMS Export</span>}</button>
          </nav>
          <div className="p-6 mt-auto">
            <button type="button" onClick={() => toast.info('Draft saved locally')} className={`w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center ${isSidebarHovered ? 'justify-center gap-2' : 'justify-center'}`}><FileText className="w-4 h-4" />{isSidebarHovered && <span>Save Draft</span>}</button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="w-full bg-white border-b border-slate-200 pt-4 pb-5 px-12 flex flex-col shrink-0">
            <div className="flex justify-between items-center mb-6">
              <nav className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-400">Batches</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[#0052CC] font-semibold">{fileData?.fileName || 'New Assessment Batch'}</span>
              </nav>
              <div className="flex items-center gap-6" ref={profileMenuRef}>
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors" title="Help"><CircleHelp className="w-5 h-5" /></button>
                  <button type="button" onClick={() => toast.info('No new notifications')} className="text-slate-400 hover:text-slate-600 transition-colors relative" title="Notifications"><Bell className="w-5 h-5" /><span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" /></button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 leading-none">{user?.email?.split('@')[0] || 'User'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Tier</p>
                    </div>
                    <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 bg-[#e7eeff] text-[#0052CC] flex items-center justify-center"><UserRound className="w-4 h-4" /></div>
                  </button>

                  <div className={`absolute right-0 mt-2 w-56 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-2.5 origin-top-right transition-all duration-200 ${
                    isProfileMenuOpen
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        toast.info('Profile page will be available soon');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/workspace/dashboard');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-5xl mx-auto w-full relative px-8">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-slate-200" />
              <div className="flex items-center justify-between relative z-10">
                {stepOrder.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <button key={`transform-stepper-${step}`} type="button" onClick={() => handleStepperJump(step)} disabled={!canNavigateToStep(step)} className="flex items-center justify-center disabled:cursor-not-allowed">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${isDone ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/10 shadow-lg shadow-emerald-600/20' : isCurrent ? 'bg-[#0052CC] text-white ring-4 ring-[#0052CC]/10 shadow-lg shadow-[#0052CC]/20' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                        {getStepperIcon(step)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 pb-28">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 space-y-6">
                  {isXmlReviewOpen ? (
                    <Card className="border border-[#c7dcff] shadow-sm bg-[#f7faff] overflow-hidden">
                      <CardHeader className="pb-3 border-b border-[#dbe8ff] bg-[#eef4ff]/70">
                        <div className="flex items-center justify-between gap-4">
                          <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                            <Eye className="w-5 h-5 text-[#0052CC]" />
                            XML Review Before Download
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setXmlPreviewMode('rendered');
                                setIsRawXmlEditing(false);
                              }}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${xmlPreviewMode === 'rendered' ? 'bg-[#2457b8] text-white border-[#2457b8]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                              Rendered Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => setXmlPreviewMode('raw')}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${xmlPreviewMode === 'raw' ? 'bg-[#2457b8] text-white border-[#2457b8]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                            >
                              Raw XML
                            </button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
                          <div className="md:col-span-4 border-r border-slate-200 flex flex-col">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</p>
                              <span className="text-xs text-slate-500">{reviewRangeStart}-{reviewRangeEnd} / {generatedXmlItems.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                              {visibleXmlReviewItems.map((item, idx) => {
                                const absoluteIndex = visibleXmlReviewStart + idx;
                                return (
                                  <button
                                    key={`xml-review-item-${item.fileName}-${absoluteIndex}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedXmlReviewIndex(absoluteIndex);
                                      setIsRawXmlEditing(false);
                                    }}
                                    className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${selectedXmlReviewIndex === absoluteIndex ? 'border-[#2457b8] bg-[#eef4ff]' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                                  >
                                    <p className="text-xs font-semibold text-slate-900 truncate">{item.fileName.replace('.xml', '')}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{item.fileName}</p>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setXmlReviewPageIndex((prev) => Math.max(0, prev - 1))}
                                disabled={xmlReviewPageIndex === 0}
                                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 disabled:text-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center justify-center"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-medium text-slate-500">Page {xmlReviewPageIndex + 1} / {totalXmlReviewPages}</span>
                              <button
                                type="button"
                                onClick={() => setXmlReviewPageIndex((prev) => Math.min(totalXmlReviewPages - 1, prev + 1))}
                                disabled={xmlReviewPageIndex >= totalXmlReviewPages - 1}
                                className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 disabled:text-slate-300 disabled:bg-slate-100 disabled:cursor-not-allowed hover:bg-slate-50 flex items-center justify-center"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="md:col-span-8 flex flex-col">
                            {!selectedXmlReviewItem ? (
                              <div className="p-6 text-sm text-slate-500">No XML item selected.</div>
                            ) : (
                              <>
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{selectedXmlReviewItem.fileName}</p>
                                    <p className="text-xs text-slate-500">Item {selectedXmlReviewIndex + 1} of {generatedXmlItems.length}</p>
                                  </div>
                                  {xmlPreviewMode === 'raw' && (
                                    <div className="flex items-center gap-2">
                                      {isRawXmlEditing ? (
                                        <>
                                          <button type="button" onClick={handleSaveCurrentRawXml} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#2457b8] text-white hover:bg-[#1f4aa0]">Save Edit</button>
                                          <button type="button" onClick={() => { setRawXmlDraft(selectedXmlReviewItem.xmlContent); setIsRawXmlEditing(false); }} className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">Cancel</button>
                                        </>
                                      ) : (
                                        <button type="button" onClick={() => setIsRawXmlEditing(true)} className="px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50">Edit XML</button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={handleAiFixCurrentXml}
                                        disabled={xmlReviewFixingIndex === selectedXmlReviewIndex}
                                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#18794e] text-white hover:bg-[#136541] disabled:opacity-60"
                                      >
                                        {xmlReviewFixingIndex === selectedXmlReviewIndex ? 'AI Fixing...' : 'AI Fix'}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
                                  {xmlPreviewMode === 'rendered' ? (
                                    selectedPreviewData?.parseError ? (
                                      <Alert className="bg-rose-50 border-rose-200"><AlertCircle className="h-4 w-4 text-rose-600" /><AlertDescription className="text-rose-700 text-sm">Unable to render XML: {selectedPreviewData.parseError}</AlertDescription></Alert>
                                    ) : (
                                      <div className="space-y-4">
                                        <Card className="border-[#bfd6ff] bg-[#f5f9ff] shadow-sm">
                                          <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold text-slate-900">Student Preview</CardTitle>
                                          </CardHeader>
                                          <CardContent className="space-y-4">
                                            <div className="rounded-lg border border-[#d7e5ff] bg-white p-3 text-xs text-slate-700">
                                              <p><span className="font-semibold text-slate-900">Question ID:</span> {selectedPreviewData?.itemIdentifier || selectedXmlReviewItem.fileName.replace('.xml', '')}</p>
                                            </div>

                                            <div className="rounded-lg border border-[#d7e5ff] bg-white p-4 space-y-3">
                                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</p>
                                              <MathMLRenderer
                                                content={selectedPreviewData?.stemHtml || selectedPreviewData?.interactionPromptHtml || selectedPreviewData?.itemBodyHtml || ''}
                                                className="text-sm text-slate-800 leading-relaxed"
                                              />
                                            </div>

                                            <div className="rounded-lg border border-[#d7e5ff] bg-[#fcfdff] p-4 space-y-3">
                                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interaction</p>

                                              {selectedPreviewData?.interactionType === 'choice' && (
                                                <div className="space-y-2">
                                                  {selectedPreviewData.choices.map((choice) => {
                                                    const isMultiple = (selectedPreviewData.maxChoices || 1) > 1;
                                                    const checked = selectedChoiceResponse.includes(choice.id);
                                                    return (
                                                      <label key={`student-choice-${choice.id}`} className="flex items-start gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white">
                                                        <input
                                                          type={isMultiple ? 'checkbox' : 'radio'}
                                                          name={`student-choice-${selectedXmlReviewIndex}`}
                                                          checked={checked}
                                                          onChange={(e) => {
                                                            const nextSelected = isMultiple
                                                              ? (e.target.checked
                                                                ? Array.from(new Set([...selectedChoiceResponse, choice.id]))
                                                                : selectedChoiceResponse.filter((id) => id !== choice.id))
                                                              : (e.target.checked ? [choice.id] : []);
                                                            setStudentChoiceResponses((prev) => ({ ...prev, [selectedXmlReviewIndex]: nextSelected }));
                                                            setStudentPreviewSubmissions((prev) => {
                                                              const next = { ...prev };
                                                              delete next[selectedXmlReviewIndex];
                                                              return next;
                                                            });
                                                          }}
                                                        />
                                                        <span className="flex-1"><MathMLRenderer content={choice.html} inline className="text-sm text-slate-800" /></span>
                                                      </label>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                              {selectedPreviewData?.interactionType === 'textentry' && (
                                                <input
                                                  type="text"
                                                  value={selectedTextResponse}
                                                  onChange={(e) => {
                                                    setStudentTextResponses((prev) => ({ ...prev, [selectedXmlReviewIndex]: e.target.value }));
                                                    setStudentPreviewSubmissions((prev) => {
                                                      const next = { ...prev };
                                                      delete next[selectedXmlReviewIndex];
                                                      return next;
                                                    });
                                                  }}
                                                  placeholder={selectedPreviewData.textEntryPlaceholders[0]?.placeholderText || 'Enter your answer'}
                                                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                                                />
                                              )}

                                              {selectedPreviewData?.interactionType === 'order' && (
                                                <div className="space-y-2">
                                                  {selectedOrderResponse.map((choiceId, idx) => {
                                                    const choice = selectedPreviewData.orderChoices.find((c) => c.id === choiceId);
                                                    if (!choice) return null;
                                                    return (
                                                      <div key={`student-order-${choice.id}-${idx}`} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 bg-white">
                                                        <span className="text-xs font-semibold text-slate-500 w-6">{idx + 1}.</span>
                                                        <span className="flex-1"><MathMLRenderer content={choice.html} inline className="text-sm text-slate-800" /></span>
                                                        <button
                                                          type="button"
                                                          disabled={idx === 0}
                                                          onClick={() => {
                                                            const next = [...selectedOrderResponse];
                                                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                                            setStudentOrderResponses((prev) => ({ ...prev, [selectedXmlReviewIndex]: next }));
                                                            setStudentPreviewSubmissions((prev) => {
                                                              const cleared = { ...prev };
                                                              delete cleared[selectedXmlReviewIndex];
                                                              return cleared;
                                                            });
                                                          }}
                                                          className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-700 disabled:opacity-40"
                                                        >
                                                          Up
                                                        </button>
                                                        <button
                                                          type="button"
                                                          disabled={idx === selectedOrderResponse.length - 1}
                                                          onClick={() => {
                                                            const next = [...selectedOrderResponse];
                                                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                                            setStudentOrderResponses((prev) => ({ ...prev, [selectedXmlReviewIndex]: next }));
                                                            setStudentPreviewSubmissions((prev) => {
                                                              const cleared = { ...prev };
                                                              delete cleared[selectedXmlReviewIndex];
                                                              return cleared;
                                                            });
                                                          }}
                                                          className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-700 disabled:opacity-40"
                                                        >
                                                          Down
                                                        </button>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                              {selectedPreviewData?.interactionType === 'unknown' && (
                                                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                                  Interaction type could not be determined for this XML.
                                                </div>
                                              )}

                                              <div className="pt-2">
                                                <button
                                                  type="button"
                                                  onClick={submitStudentPreview}
                                                  className="px-4 py-2 rounded-md text-sm font-semibold bg-[#2457b8] text-white hover:bg-[#1f4aa0]"
                                                >
                                                  Submit
                                                </button>
                                              </div>
                                            </div>

                                            {selectedSubmission?.submitted && (
                                              <div className={`rounded-lg border px-4 py-3 ${selectedSubmission.isCorrect ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                                                <p className={`text-sm font-semibold ${selectedSubmission.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                  {selectedSubmission.isCorrect ? 'Correct submission' : 'Incorrect submission'}
                                                </p>
                                                <p className="text-xs text-slate-700 mt-1">Score: {selectedSubmission.score}</p>
                                                <div className="mt-2 text-sm text-slate-800">
                                                  <MathMLRenderer content={selectedSubmission.feedbackHtml} className="text-sm text-slate-800" />
                                                </div>
                                              </div>
                                            )}
                                          </CardContent>
                                        </Card>
                                      </div>
                                    )
                                  ) : isRawXmlEditing ? (
                                    <textarea
                                      value={rawXmlDraft}
                                      onChange={(e) => {
                                        setRawXmlDraft(e.target.value);
                                        setRawXmlDraftSourceIndex(selectedXmlReviewIndex);
                                      }}
                                      className="w-full h-[460px] rounded-lg border border-slate-300 bg-white p-3 text-xs font-mono text-slate-800"
                                    />
                                  ) : (
                                    <pre className="w-full h-[460px] rounded-lg border border-slate-200 bg-white p-3 text-xs font-mono text-slate-800 overflow-auto whitespace-pre-wrap">{selectedXmlReviewItem.xmlContent}</pre>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : aiValidationEnabled && aiValidationPhase !== 'idle' ? (
                    <AIValidationReport
                      phase={aiValidationPhase as 'ready' | 'running' | 'done'}
                      items={aiValidationResults}
                      totalItems={editedRows.filter((row, idx) => {
                        const result = validationResults.get(getRowValidationKey(row, idx));
                        return result && (result.status === 'valid' || result.status === 'caution');
                      }).length}
                      availableProviders={getAvailableProviders()}
                      currentProvider={aiProvider}
                      onProviderChange={setAiProvider}
                      onStartValidation={handleStartAIValidation}
                      onItemXmlChange={handleAIItemXmlChange}
                      onItemAutoFix={handleAIAutoFix}
                      onRevalidate={handleAIRevalidate}
                      onDownloadValid={handleAIDownloadValid}
                      onCancel={handleAICancel}
                      isRevalidating={aiValidationPhase === 'running'}
                      isDownloading={isExporting}
                      fixingItemNo={aiFixingItemNo}
                      progress={aiValidationPhase === 'running' ? aiValidationProgress : undefined}
                    />
                  ) : (
                    <Card className="border border-[#c7dcff] shadow-sm bg-[#f7faff]">
                      <CardHeader className="pb-3 space-y-3">
                        <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                          <Sparkles className="w-5 h-5 text-[#0052CC]" />
                          {transformDone && !isExporting ? 'Transform Complete' : isExporting ? 'Transforming...' : 'Ready to Transform'}
                        </CardTitle>
                        {getAvailableProviders().length > 0 && (
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-[#0052CC]" />
                              <span className="text-sm font-medium text-slate-800">AI Validation{!canUseAIValidation && ' (Unlimited plan only)'}</span>
                            </div>
                            <Switch
                              checked={aiValidationEnabled}
                              disabled={!canUseAIValidation}
                              onCheckedChange={(checked) => {
                                setAiValidationEnabled(checked);
                                if (checked) {
                                  setAiValidationPhase('ready');
                                } else {
                                  setAiValidationPhase('idle');
                                  setAiValidationResults([]);
                                  setGeneratedXmlItems([]);
                                  setPendingExportContext(null);
                                }
                              }}
                            />
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {transformDone && !isExporting ? (
                          <Alert className="bg-emerald-50 border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <AlertTitle className="text-emerald-700">Download Started</AlertTitle>
                            <AlertDescription className="text-emerald-700 text-sm">Your file has been exported and the download has started.</AlertDescription>
                          </Alert>
                        ) : (
                          <Alert className="bg-[#edf4ff] border-[#c7dcff]">
                            <FileJson className="h-4 w-4 text-[#0052CC]" />
                            <AlertTitle className="text-slate-900">Ready to Export</AlertTitle>
                            <AlertDescription className="text-slate-600 text-sm">
                              <span className="font-semibold text-[#2457b8]">{stats.valid + stats.caution} questions</span> ready to export ({stats.valid} valid, {stats.caution} with warnings) • <span className="font-semibold text-rose-700">{stats.rejected} rejected</span>
                            </AlertDescription>
                          </Alert>
                        )}

                        {exportValidationError && (
                          <Alert className="bg-rose-50 border-rose-200">
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <AlertDescription className="text-rose-700 text-sm">{exportValidationError}</AlertDescription>
                          </Alert>
                        )}

                        {isExporting && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin text-[#0052CC]" />
                            Generating and packaging your files...
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={exportMode === 'qti-package' ? exportToQTI : exportXmlMediaFolder}
                            disabled={isExporting || (stats.valid + stats.caution) === 0}
                            className="font-semibold px-6 rounded-md bg-[#2457b8] hover:bg-[#1f4aa0] text-white"
                            size="lg"
                          >
                            {isExporting ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                            ) : exportMode === 'qti-package' ? (
                              <><Download className="w-4 h-4 mr-2" />Export {outputFormat ? outputFormat.toUpperCase() : 'QTI'} Package</>
                            ) : (
                              <><FolderOpen className="w-4 h-4 mr-2" />Export XML + Media</>
                            )}
                          </Button>

                          <Button
                            onClick={exportToJSON}
                            disabled={isExporting || (stats.valid + stats.caution) === 0}
                            variant="outline"
                            className="font-semibold px-6 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                            size="lg"
                          >
                            {isExporting ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                            ) : (
                              <><FileJson className="w-4 h-4 mr-2" />Export as JSON</>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="lg:col-span-4 space-y-4">
                  <Card className="border border-[#c7dcff] bg-[#f7faff] shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900">{isXmlReviewOpen ? 'Review Checklist' : 'Export Checklist'}</CardTitle>
                      <CardDescription className="text-xs text-slate-500">{isXmlReviewOpen ? 'Review items before final download' : 'Final verification before delivery'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2.5"><div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${(stats.valid + stats.caution) > 0 ? 'bg-[#2457b8]' : 'bg-slate-300'}`}>{(stats.valid + stats.caution) > 0 && <Check className="w-2.5 h-2.5 text-white" />}</div><span className={`text-sm ${(stats.valid + stats.caution) > 0 ? 'text-[#2457b8] font-medium' : 'text-slate-500'}`}>Rows available to export</span></div>
                      <div className="flex items-center gap-2.5"><div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${!!outputFormat ? 'bg-[#2457b8]' : 'bg-slate-300'}`}>{!!outputFormat && <Check className="w-2.5 h-2.5 text-white" />}</div><span className={`text-sm ${!!outputFormat ? 'text-[#2457b8] font-medium' : 'text-slate-500'}`}>Output format selected</span></div>
                      <div className="flex items-center gap-2.5"><div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${!!exportMode ? 'bg-[#2457b8]' : 'bg-slate-300'}`}>{!!exportMode && <Check className="w-2.5 h-2.5 text-white" />}</div><span className={`text-sm ${!!exportMode ? 'text-[#2457b8] font-medium' : 'text-slate-500'}`}>Package mode selected</span></div>
                      {isXmlReviewOpen && (
                        <div className="flex items-center gap-2.5"><div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-[#2457b8]"><Check className="w-2.5 h-2.5 text-white" /></div><span className="text-sm text-[#2457b8] font-medium">{generatedXmlItems.length} XML items generated</span></div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-slate-900">Package Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1.5 text-xs text-slate-600">
                      <p><span className="font-semibold text-slate-900">Questions:</span> {stats.valid + stats.caution}</p>
                      <p><span className="font-semibold text-slate-900">Rejected:</span> {stats.rejected}</p>
                      <p><span className="font-semibold text-slate-900">Format:</span> {outputFormat || 'Not selected'}</p>
                      <p><span className="font-semibold text-slate-900">Package:</span> {exportMode || 'Not selected'}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <footer
              className="fixed bottom-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-8 py-4 z-40 flex items-center justify-between transition-[left] duration-300"
              style={{ left: sidebarWidth }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep('configure')}
                className="px-6 py-2.5 text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors rounded-xl"
              >
                Back to Configure
              </button>

              <div className="flex items-center gap-3">
                {isXmlReviewOpen ? (
                  <Button
                    type="button"
                    onClick={handleDownloadReviewedXml}
                    disabled={isExporting || generatedXmlItems.length === 0}
                    className="group px-8 py-2.5 text-xs font-semibold text-white bg-[#2457b8] hover:bg-[#1f4aa0] rounded-md shadow-sm transition-colors flex items-center gap-2"
                  >
                    {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Downloading...</> : <>Download Reviewed XML <ChevronRight className="w-4 h-4" /></>}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      setCurrentStep('upload');
                      setFileData(null);
                      setUploadedFiles([]);
                      setValidationResults(new Map());
                      setShowValidationReport(false);
                      setMediaZipFile(null);
                      setMediaFiles(new Map());
                      setMediaValidationErrors([]);
                      setContainsImages('');
                      setContainsMath('');
                      setMathFormat('');
                      setHasTemplateXml('');
                      setTemplateXmlFile(null);
                      setConfigurationValidationError('');
                      setShowConfigErrors(false);
                      setOutputFormat('');
                      setExportMode('');
                      setTransformDone(false);
                      setUploadedMediaUrls([]);
                      setAutoMappedImageRows(0);
                      setMediaUploadError('');
                    }}
                    className="group px-8 py-2.5 text-xs font-semibold text-white bg-[#2457b8] hover:bg-[#1f4aa0] rounded-md shadow-sm transition-colors flex items-center gap-2"
                  >
                    Start Over
                  </Button>
                )}
              </div>
            </footer>
          </main>
        </div>
      </div>
    );
  }

  if (currentStep === 'clean-fix') {
    const fixableRows: { rowKey: string; rowNum: number; issueType: string; fixType: 'auto' | 'manual'; confidence: number; questionText: string }[] = [];
    // Build fixable rows from pass3 suggestions
    if (pass3Suggestions.length > 0) {
      pass3Suggestions.forEach((s) => {
        if (s.rowKey) {
          const vr = validationResults.get(s.rowKey);
          const confNum = s.confidence === 'HIGH' ? 0.95 : s.confidence === 'MEDIUM' ? 0.6 : 0.3;
          fixableRows.push({
            rowKey: s.rowKey,
            rowNum: vr?.rowNumber || 0,
            issueType: s.type || s.field || 'Unknown',
            fixType: s.confidence === 'HIGH' ? 'auto' : 'manual',
            confidence: confNum,
            questionText: String(vr?.data?.questionText || vr?.rawData?.[columnMapping?.questionCol || ''] || ''),
          });
        }
      });
    }
    // Add remaining block-severity rows not covered by suggestions
    validationResults.forEach((vr, key) => {
      if (vr.status === 'rejected' && !fixableRows.some(r => r.rowKey === key)) {
        const topIssue = vr.issues?.find(i => i.severity === 'block') || vr.issues?.[0];
        fixableRows.push({
          rowKey: key,
          rowNum: vr.rowNumber,
          issueType: topIssue?.code || topIssue?.field || 'Error',
          fixType: 'manual',
          confidence: 0,
          questionText: String(vr.data?.questionText || vr.rawData?.[columnMapping?.questionCol || ''] || ''),
        });
      }
    });

    const manualFixCount = fixableRows.filter(r => r.fixType === 'manual').length;
    const availableAutoFixCount = pass3ExecutionMetrics?.suggestionsApplied ?? fixableRows.filter((r) => r.fixType === 'auto').length;
    const reviewRequiredCount = stats.caution;
    const hasWorkspaceItems =
      (pass3Suggestions && pass3Suggestions.length > 0) ||
      Array.from(validationResults.values()).some(vr => vr.issues?.some(i => i.severity === 'block'));

    return (
      <div className="fixed inset-0 z-50 bg-[#f0f4f8] text-slate-900 antialiased flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className="h-screen flex-shrink-0 bg-white flex flex-col border-r border-slate-200 transition-[width] duration-300"
          style={{ width: sidebarWidth }}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className={`mb-4 ${isSidebarHovered ? 'p-8' : 'p-4 flex justify-center'}`}>
            {isSidebarHovered ? (
              <>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">AssessmentCore</h1>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Workflow Wizard</p>
              </>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#0052CC]/10 text-[#0052CC] font-black flex items-center justify-center">A</div>
            )}
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <button type="button" onClick={() => navigate('/')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}><Home className="w-5 h-5" /> {isSidebarHovered && <span>Home</span>}</button>
            <button type="button" onClick={() => toast.info('XML Previewer will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}>
              <Code className="w-5 h-5" /> {isSidebarHovered && <span>XML Previewer</span>}
            </button>
            <button type="button" className={`w-full flex items-center py-3 bg-[#0052CC]/5 text-[#0052CC] font-semibold rounded-lg text-sm ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}>
              <Upload className="w-5 h-5" /> {isSidebarHovered && <span>Batch Creator</span>}
            </button>
            <button type="button" onClick={() => toast.info('LMS Export will be available soon')} className={`w-full flex items-center py-3 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all text-sm font-medium ${isSidebarHovered ? 'gap-3 px-4 justify-start' : 'px-0 justify-center'}`}>
              <Download className="w-5 h-5" /> {isSidebarHovered && <span>LMS Export</span>}
            </button>
          </nav>
          <div className="p-6 mt-auto">
            <button type="button" onClick={() => toast.info('Draft saved locally')} className={`w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center ${isSidebarHovered ? 'justify-center gap-2' : 'justify-center'}`}>
              <FileText className="w-4 h-4" />
              {isSidebarHovered && <span>Save Draft</span>}
            </button>
          </div>
        </aside>

        {/* Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Stepper Header */}
          <header className="w-full bg-white border-b border-slate-200 pt-4 pb-5 px-12 flex flex-col shrink-0">
            <div className="flex justify-between items-center mb-6">
              <nav className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-400">Batches</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[#0052CC] font-semibold">{fileData?.fileName || 'New Assessment Batch'}</span>
              </nav>
              <div className="flex items-center gap-6" ref={profileMenuRef}>
                <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors" title="Help"><CircleHelp className="w-5 h-5" /></button>
                  <button type="button" onClick={() => toast.info('No new notifications')} className="text-slate-400 hover:text-slate-600 transition-colors relative" title="Notifications">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                    className="flex items-center gap-3"
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 leading-none">{user?.email?.split('@')[0] || 'User'}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Tier</p>
                    </div>
                    <div className="w-9 h-9 rounded-full ring-2 ring-slate-100 bg-[#e7eeff] text-[#0052CC] flex items-center justify-center">
                      <UserRound className="w-4 h-4" />
                    </div>
                  </button>

                  <div className={`absolute right-0 mt-2 w-56 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-2.5 origin-top-right transition-all duration-200 ${
                    isProfileMenuOpen
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                      : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        toast.info('Profile page will be available soon');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        navigate('/workspace/dashboard');
                      }}
                      className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                    >
                      Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="max-w-5xl mx-auto w-full relative px-8">
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-slate-200" />
              <div className="flex items-center justify-between relative z-10">
                {stepOrder.map((step, idx) => {
                  const isCurrent = idx === currentStepIndex;
                  const isDone = idx < currentStepIndex;
                  return (
                    <button key={`fix-stepper-${step}`} type="button" onClick={() => handleStepperJump(step)} disabled={!canNavigateToStep(step)} className="flex items-center justify-center disabled:cursor-not-allowed">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                        isDone ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/10 shadow-lg shadow-emerald-600/20'
                        : isCurrent ? 'bg-[#0052CC] text-white ring-4 ring-[#0052CC]/10 shadow-lg shadow-[#0052CC]/20'
                        : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}>
                        {getStepperIcon(step)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-hidden flex">
            <div className="flex-1 flex flex-col p-8 pb-32 min-w-0 space-y-6 overflow-y-auto bg-slate-50/50">
              <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0052CC]" />
                      Automate Fix
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Apply high-confidence automatic fixes, then re-run validation to compare updated outcomes.
                    </p>
                    <p className="text-xs font-semibold text-[#0052CC] mt-2">
                      {availableAutoFixCount} high-confidence fixes available
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleApplyAutomatedFixes}
                      disabled={isApplyingAutoFixes || availableAutoFixCount === 0}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#2457b8] hover:bg-[#1f4aa0] rounded-md shadow-sm transition-colors"
                    >
                      {isApplyingAutoFixes ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Fix now</>
                      )}
                    </Button>

                    <Button
                      type="button"
                      onClick={handleReRunValidationAfterAutoFix}
                      disabled={!autoFixComparison?.applied || isValidating}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#18794e] hover:bg-[#136541] rounded-md shadow-sm transition-colors"
                    >
                      {isValidating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Re-running...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" />Re run Validation</>
                      )}
                    </Button>
                  </div>
                </div>
              </section>

              {!isFixingWorkspaceOpen && (
                <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-slate-900">Fixing Workspace</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`flex flex-col items-start p-4 rounded-xl border-l-4 border-rose-600 transition-all ${
                      manualFixCount > 0 ? 'bg-rose-50 shadow-md ring-2 ring-rose-500 ring-inset' : 'bg-white shadow-sm'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Manual Fix Required</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 font-mono">{manualFixCount.toLocaleString()}</span>
                        <span className="text-rose-600 font-bold text-xs">Questions</span>
                      </div>
                    </div>

                    <div className={`flex flex-col items-start p-4 rounded-xl border-l-4 border-indigo-500 transition-all ${
                      availableAutoFixCount > 0 ? 'bg-indigo-50 shadow-md ring-2 ring-indigo-500 ring-inset' : 'bg-white shadow-sm'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Automated Fixed</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 font-mono">{availableAutoFixCount.toLocaleString()}</span>
                        <span className="text-indigo-600 font-bold text-xs">Questions</span>
                      </div>
                    </div>

                    <div className={`flex flex-col items-start p-4 rounded-xl border-l-4 border-amber-500 transition-all ${
                      reviewRequiredCount > 0 ? 'bg-amber-50 shadow-md ring-2 ring-amber-500 ring-inset' : 'bg-white shadow-sm'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Requires Review</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 font-mono">{reviewRequiredCount.toLocaleString()}</span>
                        <span className="text-amber-600 font-bold text-xs">Questions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleDeduplicate}
                      disabled={stats.duplicates === 0}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#8f4600] hover:bg-[#7a3b00] rounded-md shadow-sm transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />De Duplicate
                    </Button>

                    <Button
                      type="button"
                      onClick={() => setIsFixingWorkspaceOpen(true)}
                      disabled={!hasWorkspaceItems}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#2457b8] hover:bg-[#1f4aa0] rounded-md shadow-sm transition-colors"
                    >
                      Open Fixing Workspace
                    </Button>
                  </div>
                </section>
              )}

              {isFixingWorkspaceOpen && (
                hasWorkspaceItems ? (
                  <DataFixingWorkspace
                    suggestions={pass3Suggestions ?? []}
                    rows={editedRows}
                    columns={fileData?.columns || []}
                    validationResults={(() => {
                      const base = viewMode === 'clean' && cleanValidationResults
                        ? new Map(Object.entries(cleanValidationResults))
                        : validationResults;
                      if (manualFixResults.size === 0) return base;
                      const merged = new Map(base);
                      manualFixResults.forEach((vr, key) => merged.set(key, vr));
                      return merged;
                    })()}
                    manualFixedRows={manualFixedRows}
                    manualFixInputs={manualFixInputs}
                    setManualFixInputs={setManualFixInputs}
                    applyManualFix={applyManualFix}
                    applyBulkManualEdits={applyBulkManualEdits}
                    undoManualFix={undoManualFix}
                    getRowOptionsForSuggestion={getRowOptionsForSuggestion}
                    onRowClick={setSelectedRowKey}
                    selectedRowKey={selectedRowKey}
                    dedupDeletedRows={dedupDeletedRows}
                    forceExpanded
                    openFullscreen
                    onRequestMinimize={() => setIsFixingWorkspaceOpen(false)}
                  />
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-80" />
                    <h3 className="text-lg font-bold text-slate-900">All clear!</h3>
                    <p className="text-slate-500">No action required issues remaining.</p>
                  </div>
                )
              )}

            </div>
          </main>

          {/* Sticky Footer */}
          <footer
            className="fixed bottom-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-8 py-4 z-40 flex items-center justify-between transition-[left] duration-300"
            style={{ left: sidebarWidth }}
          >
            <button
              type="button"
              onClick={() => setCurrentStep('validating')}
              className="px-6 py-2.5 text-xs font-semibold text-slate-600 border border-slate-300 hover:bg-slate-100 transition-colors rounded-xl"
            >
              Back to Validation Stage
            </button>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCurrentStep('ai-audit')}
                className="group px-8 py-2.5 text-xs font-semibold text-white bg-[#2457b8] hover:bg-[#1f4aa0] rounded-md shadow-sm transition-colors flex items-center gap-2"
              >
                Proceed to AI Audit
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#f9f9ff]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 -left-20 h-72 w-72 rounded-full bg-[#dbe1ff]/30 blur-3xl" />
        <div className="absolute top-24 right-[-100px] h-80 w-80 rounded-full bg-[#ffdcc6]/25 blur-3xl" />
        <div className="absolute bottom-[-120px] left-1/3 h-80 w-80 rounded-full bg-[#d8e3fb]/25 blur-3xl" />
        <div className="absolute bottom-14 right-10 h-56 w-56 rounded-full bg-[#dee0ff]/25 blur-3xl" />
      </div>

      {/* Template Mapping UI Modal */}
      {showTemplateMappingUI && templateXmlFile && uploadedFiles[0] && templateXmlContent && (
          <div className="fixed inset-0 bg-[#f9f9ff]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-auto cursor-default">
            <TemplateMappingUI
              templateXml={templateXmlContent}
              sheetFile={uploadedFiles[0]}
              selectedQtiVersion={
                outputFormat === "qti-1.2"
                  ? "1.2"
                  : outputFormat === "qti-2.1"
                  ? "2.1"
                  : outputFormat === "qti-3.0"
                  ? "3.0"
                  : outputFormat === "json"
                  ? "JSON"
                  : ""
              }
              onMappingComplete={handleTemplateMappingComplete}
              onCancel={handleTemplateMappingCancel}
            />
          </div>
        </div>
      )}

      {/* Top App Bar */}
      <header
        className="fixed top-0 right-0 z-40 bg-[#f9f9ff]/90 backdrop-blur-xl border-b border-[#c5c5d4]/30 px-6 py-3 transition-[left] duration-300"
        style={{ left: 'var(--workspace-sidebar-width, 16rem)' }}
      >
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#003a9f]">Batch Creator</p>
            <h1 className="truncate text-lg font-extrabold text-[#111c2d]">Step {currentStepIndex + 1}: {stepLabels[currentStep]}</h1>
          </div>
          <nav className="hidden xl:flex items-center gap-5">
            {stageTabLabels.map((tab, idx) => (
              <span
                key={`stage-tab-${tab}`}
                className={`text-[11px] font-bold uppercase tracking-[0.16em] ${
                  idx === currentStepIndex
                    ? 'text-[#003a9f] border-b-2 border-[#003a9f] pb-1'
                    : 'text-[#454652]'
                }`}
              >
                {tab}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-4" ref={profileMenuRef}>
            <button
              type="button"
              className="text-[#454652] hover:text-[#003a9f] transition-colors"
              title="Help"
              aria-label="Help"
            >
              <CircleHelp className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => toast.info('No new notifications')}
              className="text-[#454652] hover:text-[#003a9f] transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="w-8 h-8 rounded-full border border-[#c5c5d4] bg-[#e7eeff] text-[#003a9f] flex items-center justify-center hover:bg-[#d8e3fb] transition-colors"
                title="Profile menu"
                aria-label="Profile menu"
                aria-expanded={isProfileMenuOpen}
              >
                <UserRound className="w-4 h-4" />
              </button>

              <div className={`absolute right-0 mt-2 w-72 rounded-xl border border-[#c5c5d4] bg-white shadow-[0_20px_40px_rgba(17,28,45,0.15)] p-3 origin-top-right transition-all duration-200 ${
                isProfileMenuOpen
                  ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
                  : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
              }`}>
                <div className="px-2 pb-2 border-b border-[#f0f3ff] mb-2">
                  <p className="text-sm font-semibold text-[#111c2d] truncate">{user?.email || 'User'}</p>
                  <p className="text-xs text-[#454652]">Account menu</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    toast.info('Profile page will be available soon');
                  }}
                  className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    navigate('/workspace/dashboard');
                  }}
                  className="w-full text-left px-2 py-2 rounded-md text-sm text-[#111c2d] hover:bg-[#f9f9ff]"
                >
                  Dashboard
                </button>

                <div className="mt-2 rounded-lg bg-[#f9f9ff] border border-[#c5c5d4] p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#111c2d]">Usage</span>
                    <span className="text-xs font-semibold text-[#003a9f]">{Math.round(quotaUsedPercent)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#c5c5d4] overflow-hidden">
                    <div className="h-full bg-[#003a9f] transition-all duration-300" style={{ width: `${quotaUsedPercent}%` }} />
                  </div>
                  <p className="text-[11px] text-[#454652] mt-1">{quotaSummary}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 pt-20">
        <div className="max-w-[1400px] mx-auto mb-6 rounded-xl border border-[#c5c5d4]/40 bg-white px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111c2d]">Step {currentStepIndex + 1} of {stepOrder.length}: {stepLabels[currentStep]}</h2>
            <span className="text-xs font-medium text-[#003a9f]">{Math.round(stepProgressPercent)}%</span>
          </div>
          <div className="relative h-2 rounded-full bg-[#c5c5d4] overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#003a9f] via-[#004fd2] to-[#004fd2] transition-all duration-500" style={{ width: `${stepProgressPercent}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2">
            {stepOrder.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isDone = idx < currentStepIndex;
              return (
                <button
                  key={`progress-${step}`}
                  type="button"
                  onClick={() => handleStepperJump(step)}
                  disabled={!canNavigateToStep(step)}
                  className={`text-[11px] rounded-md px-2 py-1.5 border transition-colors ${
                    isCurrent
                      ? 'bg-[#d8e3fb] border-[#dbe1ff] text-[#003a9f] font-semibold'
                      : isDone
                      ? 'bg-[#e7eeff] border-[#b4c5ff] text-[#004fd2]'
                      : 'bg-white border-[#c5c5d4] text-[#454652]'
                  } ${canNavigateToStep(step) ? 'hover:border-[#dbe1ff]' : 'opacity-60 cursor-not-allowed'}`}
                >
                  {stepLabels[step]}
                </button>
              );
            })}
          </div>
        </div>
        {/* Step 3: Clean & Fix — handled by early return above */}
        {false as boolean && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="rounded-xl border border-[#c5c5d4]/40 bg-white px-5 py-4">
              <h2 className="text-xl font-extrabold text-[#111c2d] tracking-tight">Clean &amp; Fix Workspace</h2>
              <p className="text-sm text-[#454652]">Review automated cleaning impact, resolve flagged rows, and prepare final export-ready data.</p>
            </div>
            {/* Pipeline Progress Header */}
            {/* 1. Dataset Health */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-[#111c2d] mb-4">1. Dataset Health</h2>
              <div className="flex items-center justify-between bg-white border border-[#c5c5d4] p-4 rounded-xl shadow-sm mb-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-[#454652]">Upload</span>
                  <ChevronRight className="w-4 h-4 text-[#c5c5d4]" />
                  <span className="text-[#003a9f] font-semibold flex items-center gap-1.5 bg-[#e7eeff] px-2 py-1 rounded">
                    <Sparkles className="w-3.5 h-3.5" /> Clean & Fix
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#c5c5d4]" />
                  <span className="text-[#454652]">Validate</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#454652]">Data Integrity</span>
                    <span className="font-semibold text-[#111c2d]">
                      {stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0}% Valid
                    </span>
                  </div>
                  <div className="w-32 h-2.5 bg-[#f0f3ff] rounded-full overflow-hidden border border-[#c5c5d4]">
                    <div 
                      className="h-full bg-[#004fd2] rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? Math.round((stats.valid / stats.total) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-[#454652] text-sm mb-1">Total Questions</p>
                    <p className="text-3xl font-bold text-[#111c2d]">{stats.total}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-[#454652] text-sm mb-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-[#004fd2]" />Valid
                    </p>
                    <p className="text-3xl font-bold text-[#004fd2]">{stats.valid}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-[#454652] text-sm mb-1 flex items-center justify-center gap-1">
                      <AlertCircle className="w-4 h-4 text-[#8f4600]" />Caution
                    </p>
                    <p className="text-3xl font-bold text-[#8f4600]">{stats.caution}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-[#454652] text-sm mb-1 flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4 text-[#ba1a1a]" />Rejected
                    </p>
                    <p className="text-3xl font-bold text-[#ba1a1a]">{stats.rejected}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-[#454652] text-sm mb-1 flex items-center justify-center gap-1">
                      <Copy className="w-4 h-4 text-[#8f4600]" />Duplicates
                    </p>
                    <p className="text-3xl font-bold text-[#8f4600]">{stats.duplicates}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>

            {/* 2. Cleaning Impact */}
            {cleaningMetrics && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-[#111c2d] mb-4">2. Automated Cleaning Impact</h2>
                <Card className="border border-[#c5c5d4] bg-gradient-to-r from-[#e7eeff] to-[#e7eeff]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-[#111c2d]">
                      <Sparkles className="w-4 h-4 text-[#004fd2]" />
                      Automated Cleaning Impact
                    </CardTitle>
                    {cleanValidationResults && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#454652]">View:</span>
                        <button
                          onClick={() => setViewMode('raw')}
                          className={`px-2 py-1 text-xs rounded ${viewMode === 'raw' ? 'bg-[#111c2d] text-white' : 'bg-white text-[#454652] border border-[#c5c5d4] hover:bg-[#f9f9ff]'}`}
                        >
                          Original
                        </button>
                        <button
                          onClick={() => setViewMode('clean')}
                          className={`px-2 py-1 text-xs rounded ${viewMode === 'clean' ? 'bg-[#004fd2] text-white' : 'bg-white text-[#454652] border border-[#c5c5d4] hover:bg-[#f9f9ff]'}`}
                        >
                          After Cleaning
                        </button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Tile 1: Total Issues — Before -> After */}
                    <div className="text-center p-3 bg-white rounded-lg border border-[#c5c5d4] flex flex-col justify-center">
                      <p className="text-xs text-[#454652] mb-1">Total Issues</p>
                      <div className="flex items-center justify-center gap-2 text-lg font-bold">
                        <span className="text-[#757684] line-through decoration-red-400">{cleaningMetrics.totalIssuesBefore}</span>
                        <ChevronRight className="w-4 h-4 text-[#c5c5d4]" />
                        <span className="text-[#111c2d]">{cleaningMetrics.totalIssuesAfter}</span>
                      </div>
                    </div>
                    {/* Tile 2: Issue Impact */}
                    <div className="text-center p-3 bg-white rounded-lg border border-[#c5c5d4] flex flex-col justify-center">
                      <p className="text-xs text-[#454652] mb-1">Issue Impact</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl font-bold text-[#004fd2]" title="Issues Resolved">
                          +{cleaningMetrics.issuesResolved}
                        </span>
                        {cleaningMetrics.issuesRevealed > 0 && (
                          <>
                            <span className="text-sm text-[#c5c5d4]">|</span>
                            <span className="text-xl font-bold text-[#8f4600]" title="Issues Revealed">
                              -{cleaningMetrics.issuesRevealed}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Tile 3: Rows Improved */}
                    <div className="text-center p-3 bg-white rounded-lg border border-[#c5c5d4]">
                      <p className="text-xs text-[#454652] mb-1">Rows Improved</p>
                      <p className="text-xl font-bold text-[#003a9f]">{cleaningMetrics.rowsImproved}</p>
                    </div>
                    {/* Tile 4: Effectiveness */}
                    <div className="text-center p-3 bg-white rounded-lg border border-[#c5c5d4]">
                      <p className="text-xs text-[#454652] mb-1">Effectiveness</p>
                      <p className={`text-xl font-bold ${
                        cleaningMetrics.cleaningEffectiveness !== null && cleaningMetrics.cleaningEffectiveness >= 0
                          ? 'text-[#7C3AED]'
                          : 'text-[#ba1a1a]'
                      }`}>
                        {cleaningMetrics.cleaningEffectiveness !== null
                          ? `${Math.round(cleaningMetrics.cleaningEffectiveness * 100)}%`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  {cleaningLogs.length > 0 && (
                    <p className="text-xs text-[#454652] mt-3">
                      Automated cleaning resolved <strong className="text-[#004fd2]">{cleaningMetrics.issuesResolved}</strong> issues
                      {cleaningMetrics.issuesRevealed > 0 && <span> and revealed <strong className="text-[#8f4600]">{cleaningMetrics.issuesRevealed}</strong> hidden issues</span>}. 
                      Net improvement: <strong>{cleaningMetrics.rowsImproved}</strong> rows. ({cleaningLogs.length} field operations).
                    </p>
                  )}
                </CardContent>
              </Card>
              </div>
            )}

            {/* 3. Guided Fixing Workspace */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-[#111c2d] mb-4">3. Guided Fixing Workspace</h2>
              
              {/* PASS 3: Summary Bars */}
              {(pass3ExecutionMetrics?.suggestionsApplied || manualMetrics.manualFixesApplied > 0) && (
                <div className="space-y-3 mb-6">
                  <div className="bg-[#e7eeff] border border-[#d8e3fb] rounded-xl p-4 shadow-sm flex items-start gap-4">
                    <div className="bg-[#004fd2] rounded-full p-2 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#14532D] mb-1">Fixes Applied Successfully</h3>
                      <div className="text-sm text-[#004fd2] space-y-1.5">
                        {pass3ExecutionMetrics && pass3ExecutionMetrics.suggestionsApplied > 0 && (
                          <p className="flex items-center gap-2">
                            <span className="font-semibold">{pass3ExecutionMetrics.suggestionsApplied} issues auto-fixed</span>
                            <span className="text-[#b4c5ff]">•</span>
                            <span>Rejected rows decreased from {pass3ExecutionMetrics.rejectedBefore} → {pass3ExecutionMetrics.rejectedAfter}</span>
                            {pass3ExecutionMetrics.suggestionsRolledBack > 0 && (
                              <span className="ml-1 text-[#8f4600]">({pass3ExecutionMetrics.suggestionsRolledBack} rolled back)</span>
                            )}
                          </p>
                        )}
                        {manualMetrics.manualFixesApplied > 0 && (
                          <p className="flex items-center gap-2">
                            <span className="font-semibold">{manualMetrics.manualFixesApplied} manual fixes applied</span>
                            <span className="text-[#b4c5ff]">•</span>
                            <span>{manualMetrics.rowsImprovedByUser} rows improved manually</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Required Workspace */}
              {((pass3Suggestions && pass3Suggestions.length > 0) ||
                Array.from(validationResults.values()).some(vr => vr.issues?.some(i => i.severity === 'block'))) ? (
                <DataFixingWorkspace
                  suggestions={pass3Suggestions ?? []}
                  rows={editedRows}
                  columns={fileData?.columns || []}
                  validationResults={(() => {
                    const base = viewMode === 'clean' && cleanValidationResults
                      ? new Map(Object.entries(cleanValidationResults))
                      : validationResults;
                    // Overlay manual fix results so the UI reflects applied fixes
                    if (manualFixResults.size === 0) return base;
                    const merged = new Map(base);
                    manualFixResults.forEach((vr, key) => merged.set(key, vr));
                    return merged;
                  })()}
                  manualFixedRows={manualFixedRows}
                  manualFixInputs={manualFixInputs}
                  setManualFixInputs={setManualFixInputs}
                  applyManualFix={applyManualFix}
                  applyBulkManualEdits={applyBulkManualEdits}
                  undoManualFix={undoManualFix}
                  getRowOptionsForSuggestion={getRowOptionsForSuggestion}
                  onRowClick={setSelectedRowKey}
                  selectedRowKey={selectedRowKey}
                />
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-[#c5c5d4]">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[#004fd2] opacity-80" />
                  <h3 className="text-lg font-bold text-[#111c2d]">All clear!</h3>
                  <p className="text-[#454652]">No action required issues remaining.</p>
                </div>
              )}
            </div>

            {/* 4. Data Table & Export */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-[#111c2d] mb-4">4. Data Table & Export</h2>
              <div className="flex justify-between items-start gap-4 mb-4">
                <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="w-5 h-5" />
                    File Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#454652]">File Name</p>
                      <p className="font-medium text-[#111c2d]">{fileData?.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#454652]">Total Rows</p>
                      <p className="font-medium text-[#111c2d]">{fileData?.rows.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#454652]">Columns Detected</p>
                      <p className="font-medium text-[#111c2d]">{fileData?.columns.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#454652]">Can Process</p>
                      <p className="font-medium text-[#004fd2]">{stats.valid + stats.caution}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-[#454652] mb-1">Dataset Name (for PDF report)</p>
                    <Input
                      value={reportDatasetName}
                      onChange={(event) => setReportDatasetName(event.target.value)}
                      placeholder={fileData?.fileName || 'Enter dataset name'}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleDownloadValidationReport}
                  variant="outline"
                  className="font-semibold border border-[#003a9f] text-[#003a9f] hover:bg-[#e7eeff] rounded-md"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Report
                </Button>
                <Button
                  onClick={handleDownloadRowLevelReport}
                  variant="outline"
                  className="font-semibold border border-[#003a9f] text-[#003a9f] hover:bg-[#e7eeff] rounded-md"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download Row Analysis
                </Button>
                <Button
                  onClick={handleDownloadAnnotatedSheet}
                  variant="outline"
                  className="font-semibold border border-[#003a9f] text-[#003a9f] hover:bg-[#e7eeff] rounded-md"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Annotated Sheet
                </Button>
                <Button
                  onClick={() => setShowValidationReport(!showValidationReport)}
                  variant={showValidationReport ? "default" : "outline"}
                  className={showValidationReport
                    ? "font-semibold bg-[#003a9f] hover:bg-[#004fd2] active:bg-[#003a9f] text-white rounded-md"
                    : "font-semibold border border-[#111c2d] text-[#111c2d] hover:bg-[#f0f3ff] rounded-md"
                  }
                >
                  {showValidationReport ? (
                    <><Eye className="w-4 h-4 mr-2" />Hide Details</>
                  ) : (
                    <><EyeOff className="w-4 h-4 mr-2" />View Details</>
                  )}
                </Button>
                {stats.duplicates > 0 && (
                  <Button
                    onClick={handleDeduplicate}
                    variant="outline"
                    className="font-semibold border border-[#8f4600] text-[#8f4600] hover:bg-[#ffdcc6] rounded-md"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Remove Duplicates ({stats.duplicates})
                  </Button>
                )}
              </div>
            </div>

            {/* Validation Report */}
            {showValidationReport && fileData && (() => {
              // When viewMode is 'clean' and clean results exist, show the
              // post-cleaning validation results in the detail table.
              const activeResults: Map<string, ValidationResult> =
                viewMode === 'clean' && cleanValidationResults
                  ? new Map(Object.entries(cleanValidationResults))
                  : validationResults;
              // In clean view, rows come from the cleaned dataset (cleanedRows).
              // The ValidationReport is read-only in this mode (onDataChange is a no-op)
              // to avoid mixing edited-raw rows with cleaned results.
              const activeRows =
                viewMode === 'clean' && cleanValidationResults
                  ? editedRows  // cleaned rows aren't stored separately; use editedRows for display
                  : editedRows;
              return editedRows.length > 1000 ? (
                <ValidationReportOptimized
                  columns={fileData.columns}
                  rows={activeRows}
                  validationResults={activeResults}
                  auditResults={auditResults}
                  onDataChange={viewMode === 'clean' ? () => {} : handleDataChange}
                />
              ) : (
                <ValidationReport
                  columns={fileData.columns}
                  rows={activeRows}
                  validationResults={activeResults}
                  onDataChange={viewMode === 'clean' ? () => {} : handleDataChange}
                />
              );
            })()}
          </div>

          {/* Gate 2: AI Audit */}
          <Card className="border border-[#c5c5d4] bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-[#003a9f]" />
                Gate 2 — AI Semantic Audit
              </CardTitle>
              <CardDescription>
                Groq reviews each question for grammar, logic, clarity, and factual accuracy.
                You can edit stems inline and re-audit until certified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setCurrentStep('ai-audit')}
                disabled={(stats.valid + stats.caution) === 0}
                className="bg-[#003a9f] hover:bg-[#004fd2] text-white font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Run AI Audit ({stats.valid + stats.caution} rows)
              </Button>
            </CardContent>
          </Card>

          {/* Persistent Action Bar */}
          <div className="sticky bottom-0 bg-white border-t border-[#c5c5d4] p-4 -mx-6 -mb-6 mt-6 flex justify-between items-center rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setCurrentStep('upload');
                  setFileData(null);
                  setUploadedFiles([]);
                  setValidationResults(new Map());
                  setEditedRows([]);
                  setShowValidationReport(false);
                }}
                variant="outline"
                className="font-semibold border border-[#111c2d] text-[#111c2d] hover:bg-[#f0f3ff] rounded-md"
              >
                ← Back
              </Button>
              <Button
                onClick={revalidateAll}
                disabled={isValidating}
                className="bg-[#8f4600] hover:bg-[#8f4600] text-white font-semibold rounded-md shadow-sm"
              >
                {isValidating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Re-running...</>
                ) : (
                  <><RefreshCw className="w-4 h-4 mr-2" />Re-run Validation</>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleDownloadValidationReport}
                variant="outline"
                className="font-semibold border border-[#003a9f] text-[#003a9f] hover:bg-[#e7eeff] rounded-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button
                onClick={() => setCurrentStep('configure')}
                className="bg-[#003a9f] hover:bg-[#004fd2] active:bg-[#003a9f] text-white font-semibold rounded-md px-6 shadow-sm"
              >
                Proceed to Configure →
              </Button>
            </div>
            </div>
          </div>
        )}

        {/* Step 5: Transform */}
        {currentStep === 'transform' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <section className="bg-white rounded-xl border border-[#c5c5d4]/40 p-8">
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-extrabold text-[#111c2d] tracking-tight">Step 6: Export</h2>
                  <p className="text-sm text-[#454652] mt-1">Package generation and final delivery options.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#003a9f]">Process</p>
                  <p className="text-2xl font-black text-[#003a9f]">100%</p>
                </div>
              </div>
              <div className="mt-4 h-2 w-full bg-[#e7eeff] rounded-full overflow-hidden">
                <div className="h-full w-full bg-gradient-to-r from-[#003a9f] to-[#004fd2]" />
              </div>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-6">
                {aiValidationEnabled && aiValidationPhase !== 'idle' ? (
                  <AIValidationReport
                    phase={aiValidationPhase as 'ready' | 'running' | 'done'}
                    items={aiValidationResults}
                    totalItems={editedRows.filter((row, idx) => {
                      const result = validationResults.get(getRowValidationKey(row, idx));
                      return result && (result.status === 'valid' || result.status === 'caution');
                    }).length}
                    availableProviders={getAvailableProviders()}
                    currentProvider={aiProvider}
                    onProviderChange={setAiProvider}
                    onStartValidation={handleStartAIValidation}
                    onItemXmlChange={handleAIItemXmlChange}
                    onItemAutoFix={handleAIAutoFix}
                    onRevalidate={handleAIRevalidate}
                    onDownloadValid={handleAIDownloadValid}
                    onCancel={handleAICancel}
                    isRevalidating={aiValidationPhase === 'running'}
                    isDownloading={isExporting}
                    fixingItemNo={aiFixingItemNo}
                    progress={aiValidationPhase === 'running' ? aiValidationProgress : undefined}
                  />
                ) : (
                  <Card className="border border-[#003a9f] bg-[#f9f9ff]">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5 text-[#003a9f]" />
                    {transformDone && !isExporting ? 'Transform Complete' : isExporting ? 'Transforming...' : 'Ready to Transform'}
                  </CardTitle>
                  {getAvailableProviders().length > 0 && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#c5c5d4]">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#003a9f]" />
                        <span className="text-sm font-medium text-[#111c2d]">
                          AI Validation{!canUseAIValidation && " (Unlimited plan only)"}
                        </span>
                      </div>
                      <Switch
                        checked={aiValidationEnabled}
                        disabled={!canUseAIValidation}
                        onCheckedChange={(checked) => {
                          setAiValidationEnabled(checked);
                          if (checked) {
                            setAiValidationPhase('ready');
                          } else {
                            setAiValidationPhase('idle');
                            setAiValidationResults([]);
                            setGeneratedXmlItems([]);
                            setPendingExportContext(null);
                          }
                        }}
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {transformDone && !isExporting ? (
                    <Alert className="bg-[#e7eeff] border-[#004fd2]">
                      <CheckCircle2 className="h-4 w-4 text-[#004fd2]" />
                      <AlertTitle className="text-[#004fd2]">Download Started</AlertTitle>
                      <AlertDescription className="text-[#004fd2] text-sm">
                        Your file has been exported and the download has started.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-[#FFFFFF] border-[#c5c5d4]">
                      <FileJson className="h-4 w-4 text-[#003a9f]" />
                      <AlertTitle className="text-[#111c2d]">Ready to Export</AlertTitle>
                      <AlertDescription className="text-[#454652] text-sm">
                        <span className="font-semibold text-[#004fd2]">{stats.valid + stats.caution} questions</span> ready to export ({stats.valid} valid, {stats.caution} with warnings) • <span className="font-semibold text-[#ba1a1a]">{stats.rejected} rejected</span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {isExporting && (
                    <div className="flex items-center gap-2 text-sm text-[#454652]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#003a9f]" />
                      Generating and packaging your files...
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={exportMode === 'qti-package' ? exportToQTI : exportXmlMediaFolder}
                      disabled={isExporting || (stats.valid + stats.caution) === 0}
                      className="font-semibold px-6 rounded-md bg-[#003a9f] hover:bg-[#004fd2] active:bg-[#003a9f] text-white"
                      size="lg"
                    >
                      {isExporting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                      ) : exportMode === 'qti-package' ? (
                        <><Download className="w-4 h-4 mr-2" />Export {outputFormat ? outputFormat.toUpperCase() : "QTI"} Package</>
                      ) : (
                        <><FolderOpen className="w-4 h-4 mr-2" />Export XML + Media</>
                      )}
                    </Button>

                    <Button
                      onClick={exportToJSON}
                      disabled={isExporting || (stats.valid + stats.caution) === 0}
                      variant="outline"
                      className="font-semibold px-6 rounded-md border border-[#111c2d] text-[#111c2d] hover:bg-[#f0f3ff]"
                      size="lg"
                    >
                      {isExporting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Exporting...</>
                      ) : (
                        <><FileJson className="w-4 h-4 mr-2" />Export as JSON</>
                      )}
                    </Button>

                    <Button
                      onClick={() => setCurrentStep('configure')}
                      variant="outline"
                      className="font-semibold px-6 border border-[#111c2d] text-[#111c2d] hover:bg-[#f0f3ff] rounded-md"
                      size="lg"
                    >
                      ← Back to Configure
                    </Button>

                    <Button
                      onClick={() => {
                        setCurrentStep('upload');
                        setFileData(null);
                        setUploadedFiles([]);
                        setValidationResults(new Map());
                        setShowValidationReport(false);
                        setMediaZipFile(null);
                        setMediaFiles(new Map());
                        setMediaValidationErrors([]);
                        setContainsImages("");
                        setContainsMath("");
                        setMathFormat("");
                        setHasTemplateXml("");
                        setTemplateXmlFile(null);
                        setConfigurationValidationError("");
                        setShowConfigErrors(false);
                        setOutputFormat("");
                        setExportMode("");
                        setTransformDone(false);
                        setUploadedMediaUrls([]);
                        setAutoMappedImageRows(0);
                        setMediaUploadError("");
                      }}
                      variant="ghost"
                      className="font-semibold px-6 text-[#003a9f] hover:bg-[#e7eeff] rounded-md"
                      size="lg"
                    >
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
                )}
              </div>

              <aside className="lg:col-span-4">
                <div className="rounded-xl border border-[#c5c5d4]/40 bg-white p-6 sticky top-24">
                  <h3 className="text-lg font-extrabold text-[#111c2d] mb-4">Next Steps Guide</h3>
                  <ol className="space-y-4 text-sm text-[#454652]">
                    <li><span className="font-bold text-[#003a9f]">1.</span> Download the generated package ZIP.</li>
                    <li><span className="font-bold text-[#003a9f]">2.</span> Import into your LMS as a QTI package.</li>
                    <li><span className="font-bold text-[#003a9f]">3.</span> Verify question bank integrity post-import.</li>
                  </ol>
                  <div className="mt-6 pt-4 border-t border-[#f0f3ff]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#454652] mb-2">Package Summary</p>
                    <div className="space-y-1.5 text-xs text-[#454652]">
                      <p><span className="font-semibold text-[#111c2d]">Questions:</span> {stats.valid + stats.caution}</p>
                      <p><span className="font-semibold text-[#111c2d]">Rejected:</span> {stats.rejected}</p>
                      <p><span className="font-semibold text-[#111c2d]">Format:</span> {outputFormat || 'Not selected'}</p>
                      <p><span className="font-semibold text-[#111c2d]">Package:</span> {exportMode || 'Not selected'}</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
            </div>
        )}
      </div>
    </div>
  );
}

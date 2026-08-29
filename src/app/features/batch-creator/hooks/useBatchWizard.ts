import { useState, useMemo, useCallback } from "react";
import type { WizardStage } from "../core/stageTypes";
import { ExportConfig } from "../core/exportTypes";
import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";

// ─── Stage metadata ──────────────────────────────────────────────────────────

export interface StageDefinition {
  id: WizardStage;
  label: string;
  description: string;
  /** If true, this stage is only available to premium users. */
  premiumOnly: boolean;
}

const ALL_STAGES: StageDefinition[] = [
  {
    id: "UPLOAD",
    label: "Upload",
    description: "Upload your spreadsheet or CSV",
    premiumOnly: false,
  },
  {
    id: "VALIDATION",
    label: "Validation",
    description: "Validate all questions against rules",
    premiumOnly: false,
  },
  {
    id: "MANUAL_FIX",
    label: "Fix & Clean",
    description: "Apply auto-fixes and manual corrections",
    premiumOnly: false,
  },
  {
    id: "AI_AUDIT",
    label: "AI Audit",
    description: "AI-powered quality audit",
    premiumOnly: true,
  },
  {
    id: "CONFIGURE",
    label: "Configure",
    description: "Set export format and options",
    premiumOnly: true,
  },
  {
    id: "BUILD_PREVIEW",
    label: "Build & Preview",
    description: "Generate XML and download package",
    premiumOnly: true,
  },
];

// ─── Hook return type ────────────────────────────────────────────────────────

export interface UseBatchWizardReturn {
  /** Current active stage. */
  currentStage: WizardStage;
  /** Index (0-based) of the current stage in the visible stage list. */
  currentStageIndex: number;
  /** Ordered array of stage definitions visible to the user. */
  stages: StageDefinition[];
  /** The definition for the currently active stage. */
  currentStageDefinition: StageDefinition;
  /** Whether a given stage has been completed. */
  isStageComplete: (stage: WizardStage) => boolean;
  /** Whether a given stage can be navigated to right now. */
  canNavigateTo: (stage: WizardStage) => boolean;
  /** Navigate to a specific stage (if allowed). Returns false if blocked. */
  goToStage: (stage: WizardStage) => boolean;
  /** Advance to the next stage. Returns false if blocked. */
  goNext: () => boolean;
  /** Go back to the previous stage. Returns false if already at start. */
  goBack: () => boolean;
  /** Whether there is a next stage available. */
  hasNext: boolean;
  /** Whether there is a previous stage available. */
  hasBack: boolean;

  // ── Temporary mock completion state (will be replaced by real business logic) ──
  /** Mark a stage as complete. TEMPORARY: used for mock/testing only. */
  __mockSetComplete: (stage: WizardStage, complete: boolean) => void;
  /** The raw completion map. TEMPORARY: exposed for debug. */
  __mockCompletionMap: Record<WizardStage, boolean>;
  /** The export config saved from ConfigureStage. */
  __exportConfig: ExportConfig;
  /** Persist export config from ConfigureStage so BuildPreviewStage can read it. */
  __setExportConfig: (config: ExportConfig) => void;
  /** Pipeline data state containing the latest working rows (after fixes/audits). */
  __processedRows: any[];
  /** Persist the latest working rows for the next stages. */
  __setProcessedRows: (rows: any[]) => void;
}

// ─── Hook implementation ─────────────────────────────────────────────────────

export function useBatchWizard(options: {
  /** Whether the current user has premium access. */
  isPremium: boolean;
  /** Whether to include the AI Audit stage. */
  enableAiAudit?: boolean;
}): UseBatchWizardReturn {
  const { isPremium, enableAiAudit = true } = options;

  const [currentStage, setCurrentStage] = useState<WizardStage>("UPLOAD");

  // ── TEMPORARY mock completion flags ──────────────────────────────────────
  // These will be replaced by real stage-level hooks (useUploadStage, etc.)
  // that compute completion from actual business state.
  const [mockCompletion, setMockCompletion] = useState<
    Record<WizardStage, boolean>
  >({
    UPLOAD: false,
    VALIDATION: false,
    MANUAL_FIX: false,
    AI_AUDIT: false,
    CONFIGURE: false,
    BUILD_PREVIEW: false,
  });

  const __mockSetComplete = useCallback(
    (stage: WizardStage, complete: boolean) => {
      setMockCompletion((prev) => {
        if (prev[stage] === complete) return prev;
        return { ...prev, [stage]: complete };
      });
    },
    [],
  );
  // ── END temporary mock ──────────────────────────────────────────────────

  // ── Export config (shared from ConfigureStage → BuildPreviewStage) ───────
  const [exportConfig, setExportConfig] = useState<ExportConfig>(
    DEFAULT_EXPORT_CONFIG,
  );
  const __setExportConfig = useCallback(
    (c: ExportConfig) => setExportConfig(c),
    [],
  );
  // ── END export config ────────────────────────────────────────────────────

  // ── Pipeline Data (shared across stages) ─────────────────────────────────
  const [processedRows, setProcessedRows] = useState<any[]>([]);
  const __setProcessedRows = useCallback(
    (rows: any[]) => setProcessedRows(rows),
    [],
  );
  // ── END Pipeline Data ────────────────────────────────────────────────────

  // Compute visible stages (optionally exclude AI_AUDIT)
  const stages = useMemo(() => {
    return ALL_STAGES.filter((s) => {
      if (s.id === "AI_AUDIT" && !enableAiAudit) return false;
      return true;
    });
  }, [enableAiAudit]);

  const currentStageIndex = useMemo(
    () => stages.findIndex((s) => s.id === currentStage),
    [stages, currentStage],
  );

  const currentStageDefinition = useMemo(
    () => stages[currentStageIndex] ?? stages[0],
    [stages, currentStageIndex],
  );

  const isStageComplete = useCallback(
    (stage: WizardStage): boolean => {
      // TEMPORARY: delegate to mock completion flags.
      return mockCompletion[stage] ?? false;
    },
    [mockCompletion],
  );

  const canNavigateTo = useCallback(
    (stage: WizardStage): boolean => {
      const targetIndex = stages.findIndex((s) => s.id === stage);
      if (targetIndex < 0) return false;

      // Can always go backwards
      if (targetIndex <= currentStageIndex) return true;

      // Premium gate: free users cannot access premium stages
      const targetDef = stages[targetIndex];
      if (targetDef.premiumOnly && !isPremium) return false;

      // Can only go forward if all prior stages are complete
      for (let i = 0; i < targetIndex; i++) {
        const priorStageId = stages[i].id;
        // AI_AUDIT is optional, so it doesn't block forward navigation
        if (!isStageComplete(priorStageId) && priorStageId !== "AI_AUDIT")
          return false;
      }

      return true;
    },
    [stages, currentStageIndex, isPremium, isStageComplete],
  );

  const goToStage = useCallback(
    (stage: WizardStage): boolean => {
      if (!canNavigateTo(stage)) return false;
      setCurrentStage(stage);
      return true;
    },
    [canNavigateTo],
  );

  const hasNext = currentStageIndex < stages.length - 1;
  const hasBack = currentStageIndex > 0;

  const goNext = useCallback((): boolean => {
    if (!hasNext) return false;
    const nextStage = stages[currentStageIndex + 1];
    return goToStage(nextStage.id);
  }, [hasNext, stages, currentStageIndex, goToStage]);

  const goBack = useCallback((): boolean => {
    if (!hasBack) return false;
    const prevStage = stages[currentStageIndex - 1];
    return goToStage(prevStage.id);
  }, [hasBack, stages, currentStageIndex, goToStage]);

  return {
    currentStage,
    currentStageIndex,
    stages,
    currentStageDefinition,
    isStageComplete,
    canNavigateTo,
    goToStage,
    goNext,
    goBack,
    hasNext,
    hasBack,
    __mockSetComplete,
    __mockCompletionMap: mockCompletion,
    __exportConfig: exportConfig,
    __setExportConfig,
    __processedRows: processedRows,
    __setProcessedRows,
  };
}

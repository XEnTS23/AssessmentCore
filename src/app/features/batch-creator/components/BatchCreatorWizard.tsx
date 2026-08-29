import { useAuth } from "../../../../contexts/AuthContext";
import { useBatchWizard } from "../hooks/useBatchWizard";
import { useUploadStage } from "../hooks/useUploadStage";
import { UploadStage } from "./UploadStage";
import { ValidationStage } from "./ValidationStage";
import { ManualFixStage } from "./ManualFixStage";
import { AiAuditStage } from "./AiAuditStage";
import { ConfigureStage } from "./ConfigureStage";
import { BuildPreviewStage } from "./BuildPreviewStage";
import { Button } from "../../../components/ui/button";
import type { WizardStage } from "../core/stageTypes";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ErrorBoundary } from "../../../components/ErrorBoundary";

// ─── Stage → Component map ──────────────────────────────────────────────────

const STAGE_PANELS: Record<WizardStage, React.FC<any>> = {
  UPLOAD: UploadStage,
  VALIDATION: ValidationStage,
  MANUAL_FIX: ManualFixStage,
  AI_AUDIT: AiAuditStage,
  CONFIGURE: ConfigureStage,
  BUILD_PREVIEW: BuildPreviewStage,
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function BatchCreatorWizard() {
  const navigate = useNavigate();
  const { userUsage } = useAuth();
  const isPremium = userUsage?.is_premium ?? false;

  const wizard = useBatchWizard({
    isPremium,
    enableAiAudit: true,
  });

  const upload = useUploadStage();

  // Sync upload completion to wizard
  useEffect(() => {
    if (upload.output && !wizard.isStageComplete("UPLOAD")) {
      wizard.__mockSetComplete("UPLOAD", true);
    } else if (!upload.output) {
      if (wizard.isStageComplete("UPLOAD")) {
        wizard.__mockSetComplete("UPLOAD", false);
      }
      wizard.__setProcessedRows([]);
    }
  }, [upload.output, wizard]);

  const StagePanel = STAGE_PANELS[wizard.currentStage] ?? UploadStage;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground transition-colors">
      {/* ── Main content area ────────────────────────────────────────── */}
      <main className="relative min-h-0 flex-1 overflow-y-auto">
        <ErrorBoundary fallbackText="An error occurred while loading this stage. Try resetting the wizard to start over.">
          <StagePanel wizard={wizard} upload={upload} />
        </ErrorBoundary>
      </main>

      {/* ── Navigation Footer ────────────────────────────────────────── */}
      <footer className="flex h-14 shrink-0 items-center justify-between border-t border-border bg-background px-6 transition-colors">
        <div className="flex items-center gap-2">
          {wizard.hasBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => wizard.goBack()}
              className="text-xs h-8"
            >
              Back
            </Button>
          )}

        </div>
        <div id="wizard-footer-right" className="flex items-center gap-2">
          {wizard.hasNext && (
            <Button
              size="sm"
              onClick={() => wizard.goNext()}
              disabled={
                !wizard.isStageComplete(wizard.currentStage) &&
                wizard.currentStage !== "AI_AUDIT"
              }
              className="text-xs h-8"
            >
              {wizard.currentStage === "AI_AUDIT" &&
              !wizard.isStageComplete(wizard.currentStage)
                ? "Skip & Next"
                : "Next"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

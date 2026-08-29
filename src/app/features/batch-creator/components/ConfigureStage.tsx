import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Braces,
  Check,
  CheckCircle2,
  Database,
  FileJson,
  Image,
  Info,
  MessageSquare,
  Package,
  Settings2,
  ShieldAlert,
  Shuffle,
  Sigma,
  Tags,
  Timer,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import { ExportConfig, ExportTarget } from "../core/exportTypes";
import { DEFAULT_EXPORT_CONFIG } from "../configuration/defaultExportConfig";
import { validateExportConfig } from "../configuration/exportConfigValidation";
import { normalizeRow } from "../normalization/normalizeRow";
import { ColumnMapping } from "../normalization/normalizeAnswer";
import { inferColumnMapping } from "../normalization/autoColumnMapping";
import { evaluateExportReadinessGate } from "../export/exportReadinessGate";

const TARGETS = [
  [
    "qti_2_1",
    "QTI 2.1",
    "Canvas, Moodle and broad LMS support",
    "XML package",
    Package,
  ],
  [
    "qti_3_0",
    "QTI 3.0",
    "Modern assessment interoperability",
    "XML package",
    Database,
  ],
  [
    "json",
    "Raw JSON",
    "APIs, databases and custom pipelines",
    "JSON file",
    FileJson,
  ],
  [
    "custom_lms",
    "Custom LMS",
    "Platform-specific integration format",
    "Mapped output",
    Braces,
  ],
] as const;

const TARGET_LABELS: Record<ExportTarget, string> = {
  qti_2_1: "QTI 2.1",
  qti_3_0: "QTI 3.0",
  json: "Raw JSON",
  custom_lms: "Custom LMS",
};
const PACKAGE_LABELS = {
  assessment: "Fixed assessment",
  bank: "Item bank",
} as const;
const MEDIA_LABELS = {
  keep_public_url: "Public URLs",
  download_and_package: "Packaged media",
  upload_to_storage: "Cloud storage",
  custom_lms_reference: "LMS references",
  base64_inline: "Base64 inline",
} as const;
const MATH_LABELS = {
  latex: "Raw LaTeX",
  mathml: "MathML",
  mathjax: "MathJax",
} as const;

function initialConfig(saved?: ExportConfig): ExportConfig {
  const source = saved ?? DEFAULT_EXPORT_CONFIG;
  return {
    ...source,
    scoring: {
      ...source.scoring,
      partialMarking: { ...source.scoring.partialMarking },
      negativeMarking: { ...source.scoring.negativeMarking },
    },
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b px-5 py-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium">{value}</span>
    </div>
  );
}

export function ConfigureStage({
  wizard,
  upload,
}: {
  wizard: any;
  upload: any;
}) {
  const [config, setConfig] = useState<ExportConfig>(() =>
    initialConfig(wizard.__exportConfig),
  );
  const [warningsAcknowledged, setWarningsAcknowledged] = useState(false);
  const validation = useMemo(() => validateExportConfig(config), [config]);

  const mapping: ColumnMapping = useMemo(() => {
    if (upload?.output?.mapping) return upload.output.mapping;
    const rawRows = upload?.output?.rawRows;
    if (!rawRows?.length)
      return { stem: "stem", correctAnswer: "answer", type: "type" };
    const columns = Object.keys(rawRows[0] || {}).filter(
      (column) => !column.startsWith("__"),
    );
    return inferColumnMapping(columns);
  }, [upload?.output?.mapping, upload?.output?.rawRows]);

  const rows = useMemo(() => {
    if (wizard.__processedRows?.length) return wizard.__processedRows;
    return (upload?.output?.rawRows ?? []).map((row: any) =>
      normalizeRow(row, mapping),
    );
  }, [upload?.output?.rawRows, mapping, wizard.__processedRows]);

  const readiness = useMemo(
    () => evaluateExportReadinessGate(rows, config),
    [config, rows],
  );
  const readinessWarnings = useMemo(
    () =>
      readiness.warnings.filter(
        (warning) => warning.code !== "EXPORT_CONFIG_WARNING",
      ),
    [readiness.warnings],
  );
  const warnings = useMemo(
    () => [
      ...validation.warnings,
      ...readinessWarnings.map((warning) => warning.message),
    ],
    [readinessWarnings, validation.warnings],
  );
  const blockers = useMemo(
    () => [
      ...validation.errors,
      ...readiness.blockers
        .filter((issue) => issue.code !== "EXPORT_CONFIG_INVALID")
        .map((issue) => issue.message),
    ],
    [readiness.blockers, validation.errors],
  );
  const warningSignature = JSON.stringify(warnings);
  const hasWarnings = warnings.length > 0;
  const isReady =
    validation.isValid &&
    readiness.isReady &&
    (!hasWarnings || warningsAcknowledged);

  React.useEffect(() => setWarningsAcknowledged(false), [warningSignature]);
  React.useEffect(() => {
    wizard.__mockSetComplete("CONFIGURE", isReady);
    wizard.__setExportConfig?.(config);
    if (rows.length && !wizard.__processedRows?.length) {
      wizard.__setProcessedRows?.(rows);
    }
  }, [config, isReady, rows, wizard]);

  const tone =
    blockers.length > 0
      ? "error"
      : hasWarnings && !warningsAcknowledged
        ? "warning"
        : "success";
  const status =
    tone === "error"
      ? "Action required"
      : tone === "warning"
        ? "Review warnings"
        : "Ready to build";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20 text-sm">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-5 md:px-7 md:py-6">
          <header className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
                <Settings2 className="h-3.5 w-3.5" /> Export configuration
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                Choose how this assessment should be built
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Select a destination, then tune the package, content and
                assessment behavior before generating artifacts.
              </p>
            </div>
            <div
              aria-live="polite"
              className={
                "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium " +
                (tone === "error"
                  ? "border-destructive/25 bg-destructive/10 text-destructive"
                  : tone === "warning"
                    ? "border-warning/30 bg-warning/10 text-foreground"
                    : "border-success/25 bg-success/10 text-success")
              }
            >
              {tone === "error" ? (
                <ShieldAlert className="h-3.5 w-3.5" />
              ) : tone === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {status}
            </div>
          </header>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <main className="min-w-0 space-y-5">
              <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div className="flex items-start gap-3 border-b px-5 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    1
                  </span>
                  <div>
                    <h3 className="font-semibold">Export destination</h3>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      Choose the format expected by the receiving system.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {TARGETS.map(
                    ([value, title, description, detail, TargetIcon]) => {
                      const selected = config.target === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setConfig((current) => ({
                              ...current,
                              target: value,
                            }))
                          }
                          className={
                            "group relative flex min-h-[104px] items-start gap-3 rounded-lg border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                            (selected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "bg-background hover:border-primary/40 hover:bg-muted/30")
                          }
                        >
                          <span
                            className={
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
                              (selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground")
                            }
                          >
                            <TargetIcon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 pr-4">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{title}</span>
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {detail}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                              {description}
                            </span>
                          </span>
                          {selected && (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </section>
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <SectionTitle
                    icon={Package}
                    title="Package & content"
                    hint="Control how questions and embedded content travel."
                  />
                  <div className="space-y-5 p-5">
                    <Field
                      label="Package structure"
                      hint="Export a fixed quiz or a reusable question pool."
                    >
                      <Select
                        value={config.packageStructure}
                        onValueChange={(value) =>
                          setConfig((current) => ({
                            ...current,
                            packageStructure:
                              value as ExportConfig["packageStructure"],
                          }))
                        }
                      >
                        <SelectTrigger aria-label="Package structure">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assessment">
                            Fixed assessment / quiz
                          </SelectItem>
                          <SelectItem value="bank">
                            Item bank / question pool
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field
                      label="Media handling"
                      hint="Choose whether images are linked, packaged or embedded."
                    >
                      <Select
                        value={config.mediaMode}
                        onValueChange={(value) =>
                          setConfig((current) => ({
                            ...current,
                            mediaMode: value as ExportConfig["mediaMode"],
                          }))
                        }
                      >
                        <SelectTrigger aria-label="Media handling">
                          <Image className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keep_public_url">
                            Keep public URLs (live linking)
                          </SelectItem>
                          <SelectItem value="download_and_package">
                            Download and package in ZIP
                          </SelectItem>
                          <SelectItem value="upload_to_storage" disabled>
                            Cloud storage (coming soon)
                          </SelectItem>
                          <SelectItem value="custom_lms_reference">
                            LMS internal references
                          </SelectItem>
                          <SelectItem value="base64_inline">
                            Base64 inline encoding
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field
                      label="Math & formulas"
                      hint="Select the notation supported by the destination."
                    >
                      <Select
                        value={config.mathMode}
                        onValueChange={(value) =>
                          setConfig((current) => ({
                            ...current,
                            mathMode: value as ExportConfig["mathMode"],
                          }))
                        }
                      >
                        <SelectTrigger aria-label="Math and formula mode">
                          <Sigma className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="latex">Raw LaTeX</SelectItem>
                          <SelectItem value="mathml">
                            MathML (standard)
                          </SelectItem>
                          <SelectItem value="mathjax">
                            MathJax script tags
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field
                      label="Metadata"
                      hint="Decide how much source metadata is carried forward."
                    >
                      <Select
                        value={config.metadataMode}
                        onValueChange={(value) =>
                          setConfig((current) => ({
                            ...current,
                            metadataMode: value as ExportConfig["metadataMode"],
                          }))
                        }
                      >
                        <SelectTrigger aria-label="Metadata inclusion">
                          <Tags className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="include_all">
                            Include all metadata
                          </SelectItem>
                          <SelectItem value="include_selected">
                            Include selected only
                          </SelectItem>
                          <SelectItem value="exclude">
                            Exclude all metadata
                          </SelectItem>
                          <SelectItem value="strict_mapping">
                            Strict mapping
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <SectionTitle
                    icon={Settings2}
                    title="Assessment behavior"
                    hint="Set learner feedback, scoring and timing rules."
                  />
                  <div className="space-y-5 p-5">
                    <Field
                      label="Feedback & rationales"
                      hint="Choose when explanatory content is exposed."
                    >
                      <Select
                        value={config.feedbackMode}
                        onValueChange={(value) =>
                          setConfig((current) => ({
                            ...current,
                            feedbackMode: value as ExportConfig["feedbackMode"],
                          }))
                        }
                      >
                        <SelectTrigger aria-label="Feedback and rationales">
                          <MessageSquare className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="post_attempt">
                            Post-attempt feedback
                          </SelectItem>
                          <SelectItem value="hints">Learner hints</SelectItem>
                          <SelectItem value="strip">
                            Remove from export
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/20 p-3.5">
                      <div className="flex items-start gap-3">
                        <Shuffle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Shuffle answer options
                          </p>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                            Randomize MCQ and MSQ options for every attempt.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={config.shuffleOptions}
                        onCheckedChange={(checked) =>
                          setConfig((current) => ({
                            ...current,
                            shuffleOptions: checked,
                          }))
                        }
                        aria-label="Shuffle answer options"
                      />
                    </div>

                    <Field
                      label="Scoring"
                      hint="Use right/wrong scoring or enable advanced rules."
                    >
                      <Select
                        value={config.scoring.mode}
                        onValueChange={(value) =>
                          setConfig((current) => ({
                            ...current,
                            scoring: {
                              ...current.scoring,
                              mode: value as ExportConfig["scoring"]["mode"],
                            },
                          }))
                        }
                      >
                        <SelectTrigger aria-label="Scoring complexity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">
                            Basic — right or wrong
                          </SelectItem>
                          <SelectItem value="advanced">
                            Advanced — partial and negative
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>

                    {config.scoring.mode === "advanced" && (
                      <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              Partial marking
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Award partial MSQ credit.
                            </p>
                          </div>
                          <Switch
                            checked={config.scoring.partialMarking.enabled}
                            onCheckedChange={(enabled) =>
                              setConfig((current) => ({
                                ...current,
                                scoring: {
                                  ...current.scoring,
                                  partialMarking: {
                                    ...current.scoring.partialMarking,
                                    enabled,
                                  },
                                },
                              }))
                            }
                            aria-label="Enable partial marking"
                          />
                        </div>
                        {config.scoring.partialMarking.enabled && (
                          <Select
                            value={config.scoring.partialMarking.strategy}
                            onValueChange={(strategy) =>
                              setConfig((current) => ({
                                ...current,
                                scoring: {
                                  ...current.scoring,
                                  partialMarking: {
                                    ...current.scoring.partialMarking,
                                    strategy:
                                      strategy as ExportConfig["scoring"]["partialMarking"]["strategy"],
                                  },
                                },
                              }))
                            }
                          >
                            <SelectTrigger
                              className="h-9 text-xs"
                              aria-label="Partial marking strategy"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="proportional">
                                Proportional credit
                              </SelectItem>
                              <SelectItem value="right_minus_wrong">
                                Right minus wrong
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <div className="border-t" />
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              Negative marking
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Deduct points for incorrect answers.
                            </p>
                          </div>
                          <Switch
                            checked={config.scoring.negativeMarking.enabled}
                            onCheckedChange={(enabled) =>
                              setConfig((current) => ({
                                ...current,
                                scoring: {
                                  ...current.scoring,
                                  negativeMarking: {
                                    ...current.scoring.negativeMarking,
                                    enabled,
                                  },
                                },
                              }))
                            }
                            aria-label="Enable negative marking"
                          />
                        </div>
                        {config.scoring.negativeMarking.enabled && (
                          <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
                            <Select
                              value={config.scoring.negativeMarking.valueSource}
                              onValueChange={(valueSource) =>
                                setConfig((current) => ({
                                  ...current,
                                  scoring: {
                                    ...current.scoring,
                                    negativeMarking: {
                                      ...current.scoring.negativeMarking,
                                      valueSource: valueSource as
                                        | "global"
                                        | "metadata",
                                    },
                                  },
                                }))
                              }
                            >
                              <SelectTrigger
                                className="h-9 text-xs"
                                aria-label="Penalty source"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="global">
                                  Global value
                                </SelectItem>
                                <SelectItem value="metadata">
                                  Row metadata
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            {config.scoring.negativeMarking.valueSource ===
                              "global" && (
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Penalty"
                                aria-label="Global penalty value"
                                className="h-9 text-xs"
                                value={
                                  config.scoring.negativeMarking.globalValue ??
                                  ""
                                }
                                onChange={(event) =>
                                  setConfig((current) => ({
                                    ...current,
                                    scoring: {
                                      ...current.scoring,
                                      negativeMarking: {
                                        ...current.scoring.negativeMarking,
                                        globalValue:
                                          event.target.value === ""
                                            ? undefined
                                            : Number(event.target.value),
                                      },
                                    },
                                  }))
                                }
                              />
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 border-t pt-4">
                          <div>
                            <p className="text-sm font-medium">Score floor</p>
                            <p className="text-xs text-muted-foreground">
                              Minimum total score.
                            </p>
                          </div>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            aria-label="Minimum score"
                            className="h-9 w-24 text-xs"
                            value={config.scoring.scoreFloor ?? ""}
                            onChange={(event) =>
                              setConfig((current) => ({
                                ...current,
                                scoring: {
                                  ...current.scoring,
                                  scoreFloor:
                                    event.target.value === ""
                                      ? undefined
                                      : Number(event.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    <Field
                      label="Time limit"
                      hint="Leave untimed or set a total/per-question duration."
                    >
                      <div className="grid gap-2 sm:grid-cols-[1fr_112px]">
                        <Select
                          value={config.timeLimitMode}
                          onValueChange={(value) =>
                            setConfig((current) => ({
                              ...current,
                              timeLimitMode:
                                value as ExportConfig["timeLimitMode"],
                              timeLimitValue:
                                value === "none"
                                  ? undefined
                                  : current.timeLimitValue,
                            }))
                          }
                        >
                          <SelectTrigger aria-label="Time limit mode">
                            <Timer className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No time limit</SelectItem>
                            <SelectItem value="global">
                              Assessment total
                            </SelectItem>
                            <SelectItem value="per_question">
                              Per question
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {config.timeLimitMode !== "none" && (
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Minutes"
                            aria-label="Time limit in minutes"
                            value={config.timeLimitValue ?? ""}
                            onChange={(event) =>
                              setConfig((current) => ({
                                ...current,
                                timeLimitValue:
                                  event.target.value === ""
                                    ? undefined
                                    : Number(event.target.value),
                              }))
                            }
                          />
                        )}
                      </div>
                    </Field>
                  </div>
                </section>
              </div>
            </main>
            <aside className="space-y-4 xl:sticky xl:top-5">
              <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                <div
                  className={
                    "border-b px-4 py-4 " +
                    (tone === "error"
                      ? "border-destructive/20 bg-destructive/5"
                      : tone === "warning"
                        ? "border-warning/20 bg-warning/5"
                        : "border-success/20 bg-success/5")
                  }
                >
                  <div className="flex items-start gap-3">
                    {tone === "error" ? (
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-destructive" />
                    ) : tone === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                    )}
                    <div>
                      <h3 className="font-semibold">{status}</h3>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {tone === "error"
                          ? "Resolve the items below to continue."
                          : tone === "warning"
                            ? "The configuration is valid after review."
                            : readiness.summary.total +
                              " question" +
                              (readiness.summary.total === 1 ? "" : "s") +
                              " passed the final gate."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="divide-y px-4">
                  <SummaryRow
                    label="Destination"
                    value={TARGET_LABELS[config.target]}
                  />
                  <SummaryRow
                    label="Structure"
                    value={PACKAGE_LABELS[config.packageStructure]}
                  />
                  <SummaryRow
                    label="Assets"
                    value={MEDIA_LABELS[config.mediaMode]}
                  />
                  <SummaryRow
                    label="Math"
                    value={MATH_LABELS[config.mathMode]}
                  />
                  <SummaryRow
                    label="Scoring"
                    value={
                      config.scoring.mode === "basic" ? "Basic" : "Advanced"
                    }
                  />
                </div>
                <div className="grid grid-cols-3 border-t bg-muted/20">
                  {[
                    [readiness.summary.total, "Questions", "text-foreground"],
                    [readiness.summary.valid, "Valid", "text-success"],
                    [readiness.summary.caution, "Caution", "text-warning"],
                  ].map(([value, label, color], index) => (
                    <div
                      key={label}
                      className={
                        "px-2 py-3 text-center " +
                        (index === 1 ? "border-x" : "")
                      }
                    >
                      <p
                        className={
                          "text-base font-semibold tabular-nums " + color
                        }
                      >
                        {value}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {blockers.length > 0 && (
                <section className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                    <ShieldAlert className="h-4 w-4" /> Export blockers
                  </h4>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-destructive/90">
                    {blockers.map((message, index) => (
                      <li key={"blocker-" + index} className="flex gap-2">
                        <span>•</span>
                        <span>{message}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasWarnings && (
                <section className="rounded-xl border border-warning/25 bg-warning/5 p-4">
                  <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                    <Info className="h-4 w-4 text-warning" /> Review before
                    build
                  </h4>
                  <ul className="mt-3 space-y-2 text-xs leading-5 text-foreground">
                    {warnings.map((message, index) => (
                      <li key={"warning-" + index} className="flex gap-2">
                        <span>•</span>
                        <span>{message}</span>
                      </li>
                    ))}
                  </ul>
                  <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-lg border border-warning/25 bg-background/80 p-3">
                    <Checkbox
                      checked={warningsAcknowledged}
                      onCheckedChange={(checked) =>
                        setWarningsAcknowledged(checked === true)
                      }
                      aria-label="Acknowledge export warnings"
                    />
                    <span className="text-xs leading-5">
                      I reviewed these compatibility warnings and accept the
                      output as configured.
                    </span>
                  </label>
                </section>
              )}

              <div className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Continue to Build & Preview to generate and inspect the final
                artifacts.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

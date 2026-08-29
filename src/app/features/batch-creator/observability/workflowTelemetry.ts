export type WorkflowStage =
  | "upload"
  | "validation"
  | "autofix"
  | "manual_fix"
  | "build";
export type WorkflowEventName =
  | "operation_started"
  | "operation_progress"
  | "operation_completed"
  | "operation_failed"
  | "operation_cancelled";

export interface WorkflowEvent {
  id: string;
  operationId: string;
  name: WorkflowEventName;
  stage: WorkflowStage;
  timestamp: string;
  durationMs?: number;
  progressPercent?: number;
  code?: string;
  metrics: Record<string, number>;
}

export type WorkflowTelemetrySink = (event: Readonly<WorkflowEvent>) => void;

export interface WorkflowOperation {
  readonly id: string;
  progress(percent: number, metrics?: Record<string, number>): void;
  complete(metrics?: Record<string, number>): void;
  fail(code: string, metrics?: Record<string, number>): void;
  cancel(code?: string): void;
}

const MAX_RECENT_EVENTS = 200;
const recentEvents: WorkflowEvent[] = [];
let telemetrySink: WorkflowTelemetrySink | null = null;

function eventId(): string {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `workflow-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function safeCode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 80);
}

function safeMetrics(
  metrics: Record<string, number> = {},
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(metrics)
      .filter(
        ([key, value]) =>
          /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(key) && Number.isFinite(value),
      )
      .slice(0, 20),
  );
}

function publish(event: WorkflowEvent): void {
  recentEvents.push(event);
  if (recentEvents.length > MAX_RECENT_EVENTS) {
    recentEvents.splice(0, recentEvents.length - MAX_RECENT_EVENTS);
  }
  try {
    telemetrySink?.(
      Object.freeze({ ...event, metrics: Object.freeze({ ...event.metrics }) }),
    );
  } catch {
    // Observability must never interrupt the assessment workflow.
  }
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent("assessmentcore:workflow", { detail: event }),
    );
  }
}

export function configureWorkflowTelemetry(
  sink: WorkflowTelemetrySink | null,
): void {
  telemetrySink = sink;
}

export function getRecentWorkflowEvents(): WorkflowEvent[] {
  return recentEvents.map((event) => ({
    ...event,
    metrics: { ...event.metrics },
  }));
}

export function clearRecentWorkflowEvents(): void {
  recentEvents.length = 0;
}

export function createWorkflowOperation(
  stage: WorkflowStage,
  initialMetrics: Record<string, number> = {},
): WorkflowOperation {
  const operationId = eventId();
  const startedAt = Date.now();
  let terminal = false;
  let lastProgressBucket = -1;

  const emit = (
    name: WorkflowEventName,
    metrics: Record<string, number> = {},
    code?: string,
    progressPercent?: number,
  ) =>
    publish({
      id: eventId(),
      operationId,
      name,
      stage,
      timestamp: new Date().toISOString(),
      durationMs:
        name === "operation_started"
          ? undefined
          : Math.max(0, Date.now() - startedAt),
      progressPercent,
      code: safeCode(code),
      metrics: safeMetrics(metrics),
    });

  emit("operation_started", initialMetrics);

  return {
    id: operationId,
    progress(percent, metrics = {}) {
      if (terminal) return;
      const bounded = Math.max(0, Math.min(100, Math.round(percent)));
      const bucket = Math.floor(bounded / 25);
      if (bucket <= lastProgressBucket && bounded !== 100) return;
      lastProgressBucket = bucket;
      emit("operation_progress", metrics, undefined, bounded);
    },
    complete(metrics = {}) {
      if (terminal) return;
      terminal = true;
      emit("operation_completed", metrics);
    },
    fail(code, metrics = {}) {
      if (terminal) return;
      terminal = true;
      emit("operation_failed", metrics, code);
    },
    cancel(code = "cancelled") {
      if (terminal) return;
      terminal = true;
      emit("operation_cancelled", {}, code);
    },
  };
}

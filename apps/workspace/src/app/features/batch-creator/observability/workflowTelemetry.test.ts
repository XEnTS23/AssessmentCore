import { afterEach, describe, expect, it } from "vitest";
import {
  clearRecentWorkflowEvents,
  configureWorkflowTelemetry,
  createWorkflowOperation,
  getRecentWorkflowEvents,
} from "./workflowTelemetry";

afterEach(() => {
  configureWorkflowTelemetry(null);
  clearRecentWorkflowEvents();
});

describe("privacy-safe workflow telemetry", () => {
  it("records lifecycle events without accepting question or file content", () => {
    const operation = createWorkflowOperation("validation", { rows: 100 });
    operation.progress(2, { processed: 2 });
    operation.progress(10, { processed: 10 });
    operation.progress(27, { processed: 27 });
    operation.complete({ valid: 90, rejected: 10 });

    const events = getRecentWorkflowEvents();
    expect(events.map((event) => event.name)).toEqual([
      "operation_started",
      "operation_progress",
      "operation_progress",
      "operation_completed",
    ]);
    expect(
      events.every(
        (event) => JSON.stringify(event).includes("questionText") === false,
      ),
    ).toBe(true);
  });

  it("allows only one terminal event and sanitizes diagnostic codes and metrics", () => {
    const operation = createWorkflowOperation("build");
    operation.fail("BUILD FAILED: secret/path", {
      rows: 3,
      invalid: Number.NaN,
      ["unsafe-key"]: 4,
    });
    operation.complete({ artifacts: 1 });

    const terminal = getRecentWorkflowEvents().filter(
      (event) => event.name !== "operation_started",
    );
    expect(terminal).toHaveLength(1);
    expect(terminal[0].code).toBe("BUILD_FAILED:_secret_path");
    expect(terminal[0].metrics).toEqual({ rows: 3 });
  });

  it("contains sink failures and keeps a bounded diagnostic buffer", () => {
    configureWorkflowTelemetry(() => {
      throw new Error("telemetry backend unavailable");
    });
    expect(() => {
      for (let index = 0; index < 120; index += 1) {
        createWorkflowOperation("upload").complete();
      }
    }).not.toThrow();
    expect(getRecentWorkflowEvents()).toHaveLength(200);
  });
});

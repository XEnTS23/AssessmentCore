import { describe, expect, it } from "vitest";

import { AutofixAuditPanel } from "./AutofixAuditPanel";
import { ConfigureStage } from "./ConfigureStage";
import { ManualFixStage } from "./ManualFixStage";
import { ValidationStage } from "./ValidationStage";

describe("Manual Fix stage module integration", () => {
  it("loads the Manual Fix stage and autofix audit panel together", () => {
    expect(ManualFixStage).toBeTypeOf("function");
    expect(AutofixAuditPanel).toBeTypeOf("function");
    expect(ConfigureStage).toBeTypeOf("function");
    expect(ValidationStage).toBeTypeOf("function");
  });
});

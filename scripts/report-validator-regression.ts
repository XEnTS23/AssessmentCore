import fs from "node:fs";
import path from "node:path";
import {
  renderValidatorRegressionReport,
  runValidatorRegressionFixture,
} from "./validator-regression-runner";

const reportPath = path.resolve(
  "artifacts/validation-report-regression-fixture.md",
);

runValidatorRegressionFixture()
  .then((run) => {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, renderValidatorRegressionReport(run), "utf8");
    console.log(
      JSON.stringify({
        reportPath,
        mappingHash: run.ingestionMappingHash,
        rows: run.rows.length,
        coverage: Object.fromEntries(
          run.coverage.map((item) => [
            item.canonicalProblem,
            `${item.detectedRowIds.length}/${item.expectedRowIds.length}`,
          ]),
        ),
      }),
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

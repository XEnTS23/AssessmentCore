/**
 * Row Audit Service — Gate 2
 * - auditRow:   single row via `audit-row` Edge Function (Groq) — for per-row re-checks
 * - auditBatch: chunked batch via `audit-batch` Edge Function (Gemini) — for Audit All
 * - autoFixStem: AI rewrite via `auto-fix-stem` Edge Function
 * API keys live in Supabase secrets — never exposed to the browser.
 */

import { supabase } from "./supabaseClient";
import type {
  CanonicalItem,
  ValidationResult,
} from "../app/utils/questionValidator";

const CHUNK_SIZE = 50;

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditStatus = "ai_certified" | "ai_rejected";

export type AuditIssueType = "grammar" | "logic" | "clarity" | "factual";

export interface AuditIssue {
  issue_type: AuditIssueType;
  description: string;
  suggestion: string;
}

export interface RowAuditResult {
  rowKey: string;
  status: AuditStatus;
  issues: AuditIssue[];
  error?: string;
}

export interface BatchAuditRow {
  rowKey: string;
  questionType: string;
  stem: string;
  choices: Array<{ identifier: string; text: string }>;
  correctResponseIdentifiers: string[];
  orderItems?: string[];
  numericAnswer?: number;
}

// ── Main function ─────────────────────────────────────────────────────────────

export async function auditRow(
  rowKey: string,
  canonicalItem: CanonicalItem,
  overrideStem?: string,
): Promise<RowAuditResult> {
  const resolvedStem =
    overrideStem?.trim() ||
    canonicalItem.stem?.trim() ||
    String(canonicalItem.rawStem ?? "").trim() ||
    "(no stem text)";

  const resolvedRowKey =
    rowKey?.trim() ||
    canonicalItem.rowKey?.trim() ||
    `row_${canonicalItem.sourceRowIndex + 1}`;

  const payload = {
    rowKey: resolvedRowKey,
    questionType: canonicalItem.canonicalType ?? "unknown",
    stem: resolvedStem,
    choices: canonicalItem.choices.map((c) => ({
      identifier: c.identifier,
      text: (c as any).text ?? c.identifier,
    })),
    correctResponseIdentifiers: canonicalItem.correctResponseIdentifiers ?? [],
    orderItems:
      canonicalItem.orderItems.length > 0
        ? canonicalItem.orderItems
        : undefined,
    numericAnswer: canonicalItem.numericAnswer,
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("audit-row", {
    body: payload,
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  });

  if (error || !data) {
    // Extract the actual response body from the edge function error for diagnostics
    let detail = error?.message ?? "Unknown error";
    try {
      const ctx = (error as any)?.context;
      if (ctx) {
        const body =
          typeof ctx.json === "function" ? await ctx.json() : await ctx.text();
        detail = typeof body === "string" ? body : JSON.stringify(body);
      }
    } catch {
      /* ignore extraction failure */
    }

    console.error("[audit-row] Edge Function error:", detail);

    return {
      rowKey,
      status: "ai_rejected",
      issues: [
        {
          issue_type: "clarity",
          description: `Edge Function error: ${detail}`,
          suggestion:
            "Check Supabase Dashboard → Edge Functions → audit-row → Logs for details.",
        },
      ],
      error: detail,
    };
  }

  const result = data as RowAuditResult;
  return { ...result, rowKey };
}

// ── Batch audit (Gemini — Audit All) ─────────────────────────────────────────

function buildBatchRow(result: ValidationResult): BatchAuditRow | null {
  const c = result.canonicalItem;
  if (!c) return null;
  return {
    rowKey:
      result.rowKey?.trim() ||
      c.rowKey?.trim() ||
      `row_${c.sourceRowIndex + 1}`,
    questionType: c.canonicalType ?? "unknown",
    stem: c.stem?.trim() || String(c.rawStem ?? "").trim() || "(no stem text)",
    choices: c.choices.map((ch) => ({
      identifier: ch.identifier,
      text: (ch as any).text ?? ch.identifier,
    })),
    correctResponseIdentifiers: c.correctResponseIdentifiers ?? [],
    orderItems: c.orderItems.length > 0 ? c.orderItems : undefined,
    numericAnswer: c.numericAnswer,
  };
}

/**
 * Audit all rows in chunks of CHUNK_SIZE using a single Gemini API call per chunk.
 * Results are returned progressively via onProgress as each chunk completes.
 */
export async function auditBatch(
  validationResults: ValidationResult[],
  onProgress: (
    done: number,
    total: number,
    partialResults: Map<string, RowAuditResult>,
  ) => void,
): Promise<Map<string, RowAuditResult>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  // Build batch rows, skipping any without canonicalItem
  const batchRows: BatchAuditRow[] = [];
  for (const result of validationResults) {
    const row = buildBatchRow(result);
    if (row) batchRows.push(row);
  }

  const total = batchRows.length;
  const accumulated = new Map<string, RowAuditResult>();
  let done = 0;

  // Split into chunks and process sequentially to stay under rate limits
  for (let i = 0; i < batchRows.length; i += CHUNK_SIZE) {
    const chunk = batchRows.slice(i, i + CHUNK_SIZE);

    try {
      const { data, error } = await supabase.functions.invoke("audit-batch", {
        body: { rows: chunk },
        headers,
      });

      if (error || !data?.results) {
        // Fill chunk rows with error result — don't abort the whole batch
        let detail = error?.message ?? "Unknown error";
        try {
          const ctx = (error as any)?.context;
          if (ctx) {
            const body =
              typeof ctx.json === "function"
                ? await ctx.json()
                : await ctx.text();
            detail = typeof body === "string" ? body : JSON.stringify(body);
          }
        } catch {
          /* ignore */
        }

        chunk.forEach((row) =>
          accumulated.set(row.rowKey, {
            rowKey: row.rowKey,
            status: "ai_rejected",
            issues: [
              {
                issue_type: "clarity",
                description: `Batch error: ${detail}`,
                suggestion: "Retry with the per-row Audit button.",
              },
            ],
            error: detail,
          }),
        );
      } else {
        (data.results as RowAuditResult[]).forEach((r) =>
          accumulated.set(r.rowKey, r),
        );
      }
    } catch (err: any) {
      chunk.forEach((row) =>
        accumulated.set(row.rowKey, {
          rowKey: row.rowKey,
          status: "ai_rejected",
          issues: [
            {
              issue_type: "clarity",
              description: `Batch failed: ${err?.message ?? String(err)}`,
              suggestion: "Retry with the per-row Audit button.",
            },
          ],
          error: err?.message,
        }),
      );
    }

    done = Math.min(i + CHUNK_SIZE, total);
    onProgress(done, total, new Map(accumulated));
  }

  return accumulated;
}

// ── Auto-fix ──────────────────────────────────────────────────────────────────

/**
 * Calls the `auto-fix-stem` Edge Function to get an AI-rewritten stem
 * that resolves all detected issues in one shot.
 */
export async function autoFixStem(
  canonicalItem: CanonicalItem,
  issues: AuditIssue[],
  currentStem: string,
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("auto-fix-stem", {
    body: {
      stem: currentStem.trim() || canonicalItem.stem,
      questionType: canonicalItem.canonicalType,
      choices: canonicalItem.choices.map((c) => ({
        identifier: c.identifier,
        text: (c as any).text ?? c.identifier,
      })),
      correctResponseIdentifiers: canonicalItem.correctResponseIdentifiers,
      issues: issues.map((i) => ({
        issue_type: i.issue_type,
        description: i.description,
        suggestion: i.suggestion,
      })),
    },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  });

  if (error || !data?.fixedStem) {
    throw new Error(error?.message ?? "Auto-fix did not return a result");
  }

  return data.fixedStem as string;
}

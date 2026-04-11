/**
 * Unified AI Validation Service
 * Calls Supabase Edge Functions (validate-qti, auto-fix-qti) so that
 * Gemini / Groq API keys are never exposed in the browser bundle.
 */

import { supabase } from './supabaseClient';

export type AIProvider = 'groq' | 'gemini';

export interface AIValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}

export interface AIValidationItem {
  itemNo: number;
  fileName: string;
  xmlContent: string;
  isValid: boolean;
  issues: AIValidationIssue[];
  summary: string;
}

// ── Provider availability ────────────────────────────────────────────────────
// Keys now live server-side in Edge Function secrets, so both providers are
// always considered available from the frontend's perspective.

export function isProviderConfigured(_provider: AIProvider): boolean {
  return true;
}

export function getAvailableProviders(): AIProvider[] {
  return ['gemini', 'groq'];
}

// ── Batch Validation ─────────────────────────────────────────────────────────

export async function validateBatch(
  items: Array<{ fileName: string; xmlContent: string }>,
  qtiVersion: string,
  provider: AIProvider,
  onProgress?: (current: number, total: number) => void,
): Promise<AIValidationItem[]> {
  const results: AIValidationItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const { data, error } = await supabase.functions.invoke('validate-qti', {
      body: {
        xmlContent: item.xmlContent,
        fileName: item.fileName,
        itemNo: i,
        provider,
        qtiVersion,
      },
    });

    if (error || !data) {
      results.push({
        itemNo: i,
        fileName: item.fileName,
        xmlContent: item.xmlContent,
        isValid: true,
        issues: [
          {
            severity: 'warning',
            message: `AI validation could not complete: ${error?.message ?? 'Unknown error'}`,
          },
        ],
        summary: 'AI validation encountered an error — manual review recommended',
      });
    } else {
      results.push(data as AIValidationItem);
    }

    onProgress?.(i + 1, items.length);
  }

  return results;
}

// ── Auto-fix ─────────────────────────────────────────────────────────────────

export async function autoFixXml(
  provider: AIProvider,
  xmlContent: string,
  qtiVersion: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('auto-fix-qti', {
    body: { xmlContent, provider, qtiVersion },
  });

  if (error) {
    throw new Error(`Auto-fix failed: ${error.message}`);
  }

  if (!data?.fixedXml || typeof data.fixedXml !== 'string') {
    throw new Error('Auto-fix response did not include fixedXml');
  }

  return data.fixedXml;
}

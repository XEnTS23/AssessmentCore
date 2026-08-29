// ─── Ribbon & UI ───────────────────────────────────────────────

export type RibbonTab =
  | "equation"
  | "symbols"
  | "structures"
  | "formatting"
  | "conversions";

// ─── Symbol System ─────────────────────────────────────────────

export type SymbolCategory =
  | "basic-math"
  | "greek"
  | "relations"
  | "operators"
  | "arrows"
  | "sets-logic"
  | "calculus"
  | "geometry"
  | "letter-like"
  | "miscellaneous";

export interface SymbolEntry {
  id: string;
  label: string;
  latex: string;
  unicode?: string;
  keywords: string[];
  category: SymbolCategory;
}

// ─── Structure System ──────────────────────────────────────────

export type StructureCategory =
  | "fractions"
  | "scripts"
  | "radicals"
  | "integrals"
  | "large-operators"
  | "brackets"
  | "functions"
  | "accents"
  | "limits"
  | "matrices";

export interface StructureTemplate {
  id: string;
  label: string;
  latex: string;
  category: StructureCategory;
  description?: string;
}

// ─── Built-In Equations ────────────────────────────────────────

export interface BuiltInEquation {
  id: string;
  name: string;
  latex: string;
  category: string;
}

// ─── Editor State ──────────────────────────────────────────────

export interface EquationEditorState {
  latex: string;
  displayMode: "inline" | "block";
  activeRibbonTab: RibbonTab;
  activeSymbolCategory: SymbolCategory;
  activeStructureCategory: StructureCategory;
  viewMode: "professional" | "linear";
  validation: {
    valid: boolean;
    errors: string[];
  };
  dirty: boolean;
}

// ─── Output Result (contract with ManualFixStage) ──────────────

export interface EquationEditorResult {
  latex: string;
  mathML: string;
  renderedHTML: string;
  plainText: string;
  displayMode: "inline" | "block";
  label?: string;
  equationNumber?: string;
  altText?: string;
  metadata: {
    sourceFormat: "latex" | "mathml";
    renderer: "mathjax" | "katex";
    createdAt: string;
    updatedAt: string;
  };
}

// ─── Legacy compatibility aliases (keep imports working) ───────

export type EquationCategory = SymbolCategory;

export type EquationSubCategory =
  | "Basic"
  | "Operators"
  | "Relations"
  | "Arrows"
  | "Common Structures"
  | "Greek Letters"
  | "Integrals"
  | "Limits"
  | "Matrices"
  | "Brackets"
  | "Functions";

export interface EquationSymbol {
  id: string;
  category: string;
  subCategory: EquationSubCategory;
  label: string;
  description?: string;
  latex: string;
  mathML?: string;
  unicode?: string;
  keywords?: string[];
  insertion:
    | { type: "text"; value: string }
    | { type: "template"; value: string; placeholders: string[] };
}

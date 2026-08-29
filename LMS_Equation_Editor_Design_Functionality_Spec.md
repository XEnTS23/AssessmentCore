# LMS Equation Editor
## Design and Functional Specification

Version: 1.0  
Target platform: Desktop-first LMS web application  
Primary reference size: 1600 × 956 px  
Figma reference: https://www.figma.com/design/cxmjxLoAmSVn8MZT0RPBAE?node-id=1-2  
Reference image: `a_clean_detailed_screenshot_of_a_modern_equation.png`

---

## 1. Purpose

Build a production-grade equation editor that can be embedded inside an existing LMS question-authoring workflow.

The editor must allow teachers, content creators, reviewers, and administrators to:

- Create equations using visual symbol controls.
- Type or paste LaTeX directly.
- View and edit MathML.
- Insert common mathematical structures.
- Preview equations in real time.
- Insert inline or block equations into the current question.
- Preserve the current cursor position in the parent editor.
- Reopen and edit previously inserted equations.
- Work with keyboard-only navigation.
- Support accessibility labels and alternative descriptions.
- Handle invalid expressions without corrupting question content.

The implementation must not be a static mockup. Every visible control should either work or be explicitly disabled with a tooltip explaining why.

---

## 2. Core Product Principles

### 2.1 Fast for experts

Users who know LaTeX should be able to type directly without using symbol buttons.

### 2.2 Usable for non-experts

Users who do not know LaTeX should be able to construct equations using categorized symbols, templates, snippets, matrices, and guided structures.

### 2.3 Non-destructive

The editor must never overwrite existing question content unless the user explicitly confirms insertion or replacement.

### 2.4 Format-independent

The internal equation model should support:

- LaTeX
- MathML
- Rendered HTML
- Plain-text fallback
- Optional SVG or PNG export

### 2.5 LMS-safe

The output must be suitable for:

- Rich-text question editors
- QTI 2.1
- QTI 3.0
- HTML-based LMS content
- JSON-based assessment models

---

## 3. Main User Flows

### 3.1 Insert a new equation

1. User places the cursor inside the LMS question editor.
2. User clicks the equation toolbar button.
3. The equation editor opens.
4. The parent editor selection and cursor position are stored.
5. User builds or types an equation.
6. The preview updates.
7. User selects inline or display mode.
8. User clicks `Insert`.
9. The editor validates the expression.
10. The equation is inserted at the stored cursor position.
11. The equation editor closes.
12. Focus returns to the parent question editor.

### 3.2 Edit an existing equation

1. User clicks or selects an inserted equation.
2. User clicks `Edit equation` or double-clicks the equation.
3. The editor opens with the equation’s stored source.
4. User updates the expression.
5. User clicks `Update`.
6. The existing equation node is replaced without affecting surrounding text.

### 3.3 Convert LaTeX to MathML

1. User enters valid LaTeX.
2. User clicks `Convert`.
3. The MathML tab is populated.
4. The conversion result is validated.
5. The preview remains visually consistent.

### 3.4 Recover from invalid input

1. User enters malformed LaTeX or MathML.
2. The editor shows the exact error location.
3. The preview displays the last valid result or an error placeholder.
4. The `Insert` button remains disabled until the expression is valid.
5. User may undo the invalid edit or use an automatic correction suggestion.

---

## 4. Screen Structure

The desktop screen is divided into four main areas:

1. Global header
2. Left category sidebar
3. Central editing workspace
4. Right preview and settings panel

Reference dimensions at 1600 × 956 px:

| Region | X | Y | Width | Height |
|---|---:|---:|---:|---:|
| Header | 0 | 0 | 1600 | 70 |
| Category sidebar | 0 | 70 | 188 | 886 |
| Main workspace | 188 | 70 | 950 | 886 |
| Preview/settings panel | 1138 | 70 | 462 | 886 |

The implementation should use CSS Grid or nested flex layouts. Do not recreate the entire screen using absolute positioning.

---

## 5. Design Tokens

### 5.1 Colors

```css
--equation-bg: #F7F8FC;
--equation-panel: #FFFFFF;
--equation-panel-muted: #FBFBFD;
--equation-border: #E4E7EE;
--equation-text: #20242C;
--equation-text-muted: #6D7482;
--equation-accent: #5B3FE6;
--equation-accent-hover: #4E35CE;
--equation-accent-soft: #F1EEFF;
--equation-success: #2EBD85;
--equation-success-soft: #EAF8F2;
--equation-danger: #D64545;
--equation-danger-soft: #FFF0F0;
--equation-warning: #B7791F;
--equation-warning-soft: #FFF8E7;
--equation-preview-text: #111318;
--equation-disabled: #B8BDC7;
--equation-overlay: rgba(17, 19, 24, 0.48);
```

### 5.2 Typography

Primary UI font:

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Math preview font:

```css
font-family: "STIX Two Math", "Latin Modern Math", "Cambria Math", serif;
```

Recommended sizes:

| Usage | Size | Weight |
|---|---:|---:|
| Main title | 18 px | 600 |
| Section title | 13 px | 600 |
| Standard label | 12–13 px | 500 |
| Body text | 12–14 px | 400 |
| Helper text | 10–11 px | 400 |
| Preview equation | 20–32 px | Math font |
| Symbol button | 14–18 px | 500 |

### 5.3 Radius

```css
--radius-sm: 5px;
--radius-md: 7px;
--radius-lg: 9px;
--radius-pill: 999px;
```

### 5.4 Spacing scale

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
```

### 5.5 Shadows

Use minimal shadows.

```css
--shadow-modal: 0 18px 60px rgba(24, 29, 45, 0.18);
--shadow-dropdown: 0 10px 28px rgba(24, 29, 45, 0.14);
```

---

## 6. Header

Height: 70 px

### 6.1 Left section

Contains:

- Sigma logo
- Title: `Equation Editor`
- Subtitle: `Create, edit and insert mathematical expressions`

### 6.2 Right section

Contains:

- Save-state indicator
- Expand/full-screen button
- Clear button
- Primary insert/update split button
- Close button

### 6.3 Save-state indicator

States:

- `Saved`
- `Unsaved changes`
- `Saving…`
- `Save failed`

The indicator should not claim content is saved unless persistent draft storage has actually succeeded.

### 6.4 Insert split button

Primary action:

- Insert equation
- Update equation when editing an existing equation

Dropdown actions:

- Insert inline
- Insert as display block
- Copy LaTeX
- Copy MathML
- Copy rendered HTML
- Export as SVG
- Export as PNG

---

## 7. Left Category Sidebar

Width: 188 px

Categories:

1. Basic
2. Greek
3. Operators
4. Relations
5. Arrows
6. Calculus
7. Matrices
8. Brackets
9. Functions
10. Fonts
11. Diagrams
12. Units
13. Chemistry
14. LaTeX

### 7.1 Sidebar behavior

- Active item uses accent text and a soft accent background.
- Categories are keyboard navigable.
- Each item has an icon and visible label.
- Sidebar remains fixed while the central palette scrolls.
- User selection should persist during the session.
- On smaller screens, the sidebar collapses into a category dropdown or icon rail.

---

## 8. Central Workspace Tabs

Tabs:

- Keyboard
- Templates
- Snippets
- Upload
- Handwriting
- Optional beta badge

### 8.1 Keyboard tab

Displays categorized symbol and structure controls.

### 8.2 Templates tab

Contains complete reusable formulas such as:

- Quadratic formula
- Binomial theorem
- Integration by parts
- Taylor series
- Fourier series
- Matrix determinant
- Vector identities
- Probability distributions
- Common physics equations
- Chemistry equations

### 8.3 Snippets tab

Contains reusable fragments such as:

- Fractions
- Roots
- Superscripts
- Subscripts
- Partial derivatives
- Gradients
- Limits
- Sums
- Products
- Piecewise cases

### 8.4 Upload tab

Supports:

- Image upload
- Screenshot paste
- Optional OCR-to-LaTeX conversion
- PDF page selection if enabled

OCR output must always require user review before insertion.

### 8.5 Handwriting tab

Supports a drawing pad that converts handwriting to LaTeX.

Requirements:

- Undo stroke
- Redo stroke
- Clear canvas
- Pen thickness
- Recognition preview
- Recognition confidence
- Manual correction before insertion

---

## 9. Symbol Palette

### 9.1 Basic symbols

Examples:

```text
x y z a b c α β γ θ π e i ∞
```

### 9.2 Operators

Examples:

```text
+ − ± × ÷ · * / ^ _ √ ∜ ∛ ⁿ√
```

### 9.3 Relations

Examples:

```text
= ≠ < > ≤ ≥ ≈ ∼ ≡ ∝ ⊂ ⊃ ⊆ ∈ ∉
```

### 9.4 Arrows

Examples:

```text
→ ← ↔ ⇒ ⇐ ⇔ ↦ ⟶ ↗ ↘ ↙ ↖ ↑ ↓
```

### 9.5 Common structures

- Fraction
- Superscript
- Subscript
- Square root
- General nth root
- Integral
- Definite integral
- Summation
- Product
- Limit
- Matrix
- Determinant
- Cases
- Binomial coefficient
- Vector notation
- Overline
- Underline
- Accent marks

### 9.6 Button behavior

Clicking a symbol or structure must:

1. Insert at the current source-editor cursor.
2. Replace the selected source text when applicable.
3. Place the cursor inside the nearest editable placeholder.
4. Support keyboard undo.
5. Update the preview.
6. Preserve focus in the source editor.

Example:

Selecting `Fraction` inserts:

```latex
\frac{\placeholder{numerator}}{\placeholder{denominator}}
```

The editor should select `numerator` first. Pressing `Tab` moves to `denominator`.

---

## 10. Source Editor

The source editor supports two primary tabs:

- LaTeX
- MathML

### 10.1 LaTeX editor requirements

- Syntax highlighting
- Line numbers
- Matching bracket highlighting
- Command completion
- Error underlining
- Placeholder navigation
- Undo and redo
- Find and replace
- Auto-indent for multiline structures
- Format command
- Clear command
- Paste sanitization
- Keyboard shortcuts
- Optional Vim bindings only if explicitly enabled

Recommended editor:

- CodeMirror 6
- Monaco Editor, only if bundle size is acceptable

### 10.2 MathML editor requirements

- XML syntax highlighting
- Namespace validation
- Element matching
- XML formatting
- Structural validation
- Prevent malformed output insertion

MathML should use the standard default namespace:

```xml
<math xmlns="http://www.w3.org/1998/Math/MathML">
  ...
</math>
```

Do not automatically generate prefixed MathML unless the target LMS requires it.

### 10.3 Editor toolbar

Controls:

- Source format selector
- Auto-format
- Clear
- Detect equation type
- Convert
- Undo
- Redo
- Search
- Copy
- Paste from clipboard
- Optional AI repair, disabled unless the product supports it

### 10.4 Validation footer

Displays:

- Validation status
- Current line
- Current column
- Error count
- Warning count
- Conversion button
- Detected expression type

States:

```text
Valid LaTeX
Valid MathML
Incomplete expression
Invalid command
Unclosed bracket
Unsupported environment
Unsafe MathML element
Conversion failed
```

---

## 11. Live Preview Panel

### 11.1 Preview content

The preview should render the current valid equation.

Example:

```latex
f(x)=\sum_{n=1}^{\infty}\frac{(-1)^{n+1}}{n^2}e^{-nx}\sin(nx)
```

### 11.2 Preview controls

- Full-screen preview
- Zoom
- Style
- Size
- Color
- Background
- Inline/display toggle
- Baseline guide
- Copy rendered output

### 11.3 Rendering engine

Recommended options:

- MathJax 3 for broad MathML and LaTeX support
- KaTeX for speed, only if unsupported commands are handled clearly

For a versatile LMS editor, MathJax is safer. KaTeX alone does not support every MathML or LaTeX feature users may expect.

### 11.4 Preview behavior

- Debounce rendering by approximately 120–250 ms.
- Cancel stale render operations.
- Do not freeze the interface for large matrices.
- Keep the last valid render when the current expression is temporarily invalid.
- Show an explicit preview error state.
- Sanitize all rendered HTML.

---

## 12. Options Panel

Tabs:

- Options
- Accessibility
- History

### 12.1 Options

#### Equation numbering

Controls:

- Off
- Automatic
- Manual

Fields:

- Equation number
- Reference label
- Optional prefix

Example:

```text
Equation (3.12)
Label: eq:newton-second-law
```

#### Alignment

Options:

- Left
- Center
- Right
- Justified for multiline equations

#### Display style

- Inline style
- Display style
- Large operators
- Compact operators

#### Line breaks

- Allow line breaks
- Prevent line breaks
- Automatic wrapping
- Manual breakpoints

#### Spacing

Controls:

- Horizontal padding
- Vertical padding
- Line height
- Inter-equation spacing
- Baseline offset

#### Borders and background

Controls:

- Background color
- Border color
- Border thickness
- Border radius
- Padding
- Optional equation container

#### Math fonts

Options:

- Computer Modern
- Latin Modern Math
- STIX Two Math
- Cambria Math
- Asana Math
- TeX Gyre Termes Math
- System fallback

Do not load every font by default. Load only the active font to reduce network and rendering overhead.

#### Custom CSS

Custom CSS should be restricted to trusted administrators. Arbitrary CSS supplied by regular users can break the LMS interface or create security issues.

---

## 13. Accessibility Panel

### 13.1 Required fields

- Spoken description
- Alternative text
- Semantic MathML
- Language
- Reading direction
- Complexity level

### 13.2 Automatic description

The editor may generate a draft spoken description, but the user must be able to edit it.

Example:

```text
f of x equals the sum from n equals one to infinity of negative one raised to n plus one, divided by n squared, times e raised to negative n x, times sine of n x.
```

### 13.3 Accessibility rules

- All controls require accessible names.
- Symbol buttons require descriptive tooltips.
- Preview must expose MathML where supported.
- Keyboard focus order must follow the visual order.
- Focus indicators must be clearly visible.
- Color cannot be the only validation indicator.
- Error messages must be associated with the relevant editor.
- Screen readers must receive validation updates through a polite live region.
- The modal must trap focus.
- Escape closes the editor only after handling unsaved changes.

---

## 14. History Panel

The history panel should support:

- Undo and redo
- Recent equations
- Version history
- Restore previous version
- Clear local history
- Search recent equations
- Pin favorite equations

History levels:

1. Current editing session
2. User-level recently used equations
3. Question-level equation versions
4. Optional organization-wide shared snippets

Sensitive or unpublished assessment content should not be placed in organization-wide history automatically.

---

## 15. Templates, Snippets, and Recent Equations

The bottom portion of the desktop interface contains three cards:

- Templates
- Snippets
- Recently Used

### 15.1 Templates card

Each row includes:

- Template name
- Rendered miniature preview
- Insert action
- Favorite action
- Category
- Optional difficulty level

### 15.2 Snippets card

Each row includes:

- Snippet name
- Rendered fragment
- Insert action
- Edit action
- Delete action for user-created snippets

### 15.3 Recently Used card

Each row includes:

- Source preview
- Rendered preview
- Timestamp
- Delete action
- Reinsert action

---

## 16. Search

Provide a global symbol/template search field.

Search must match:

- Symbol names
- LaTeX commands
- Unicode symbols
- Category names
- Template names
- Keywords
- Recently used items

Examples:

```text
Search: integral
Results: ∫, \int, definite integral, contour integral, integration by parts
```

Keyboard shortcut:

```text
Ctrl/Cmd + K
```

---

## 17. Keyboard Shortcuts

Required shortcuts:

| Shortcut | Action |
|---|---|
| Ctrl/Cmd + Enter | Insert or update equation |
| Ctrl/Cmd + / | Toggle LaTeX source |
| Ctrl/Cmd + Shift + M | Toggle MathML |
| Tab | Move to next placeholder |
| Shift + Tab | Move to previous placeholder |
| Ctrl/Cmd + Z | Undo |
| Ctrl/Cmd + Shift + Z | Redo |
| Ctrl/Cmd + K | Search symbols and templates |
| Ctrl/Cmd + S | Save draft |
| Escape | Close dropdown or editor |
| F1 or ? | Open shortcut help |

Keyboard shortcuts must not override browser or screen-reader conventions unnecessarily.

---

## 18. Responsive Behavior

### 18.1 Desktop: 1280 px and above

- Full sidebar
- Central workspace
- Persistent right preview/settings panel
- Bottom cards visible

### 18.2 Tablet: 768–1279 px

- Sidebar collapses to an icon rail or dropdown
- Right panel becomes a tab or drawer
- Preview remains easily accessible
- Bottom cards become horizontally scrollable or stacked
- Header labels may shorten

### 18.3 Mobile: below 768 px

A full desktop editor squeezed onto mobile is unusable. Use a step-based interface:

1. Edit
2. Symbols
3. Preview
4. Options

Requirements:

- Full-width source editor
- Bottom sheet for symbols
- Sticky insert button
- Preview tab
- Accessible large touch targets
- Minimum 44 × 44 px interactive area

---

## 19. Parent LMS Integration

### 19.1 Required integration contract

The equation editor should receive:

```ts
interface EquationEditorInput {
  mode: "insert" | "edit";
  initialLatex?: string;
  initialMathML?: string;
  displayMode?: "inline" | "block";
  equationId?: string;
  parentEditorId: string;
  selectionSnapshot?: unknown;
  targetFormat?: "html" | "qti21" | "qti30" | "json";
}
```

The editor should return:

```ts
interface EquationEditorResult {
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
```

### 19.2 Parent editor adapter

Create an adapter for each rich-text editor used by the LMS.

Examples:

- TipTap
- ProseMirror
- Lexical
- Slate
- Quill
- CKEditor
- TinyMCE
- Plain textarea

Do not put editor-specific cursor logic inside the core equation editor.

Recommended adapter interface:

```ts
interface EquationEditorAdapter {
  captureSelection(): unknown;
  restoreSelection(snapshot: unknown): void;
  insertEquation(result: EquationEditorResult): void;
  updateEquation(equationId: string, result: EquationEditorResult): void;
  focusParentEditor(): void;
}
```

---

## 20. Equation Storage Model

Store both source and rendered representations.

Recommended HTML wrapper:

```html
<span
  class="lms-equation"
  data-equation-id="eq_123"
  data-latex="E=mc^2"
  data-display-mode="inline"
  role="math"
  aria-label="E equals m c squared"
>
  <!-- sanitized rendered math -->
</span>
```

For block equations:

```html
<div
  class="lms-equation lms-equation--block"
  data-equation-id="eq_124"
  data-latex="\int_0^\infty e^{-x}\,dx"
  data-display-mode="block"
  role="math"
>
  <!-- sanitized rendered math -->
</div>
```

Do not rely only on rendered HTML. Store the original source so equations remain editable.

---

## 21. QTI Output Requirements

### 21.1 QTI 2.1

MathML must be valid XML and compatible with the item body.

Example:

```xml
<math xmlns="http://www.w3.org/1998/Math/MathML">
  <msup>
    <mi>E</mi>
    <mn>2</mn>
  </msup>
</math>
```

### 21.2 QTI 3.0

Preserve semantic MathML and ensure the surrounding QTI namespace remains valid.

### 21.3 Escaping

When storing LaTeX inside XML attributes or JSON:

- Escape quotation marks
- Escape ampersands
- Avoid double-escaping
- Preserve backslashes correctly
- Sanitize user-created MathML

---

## 22. Validation Rules

### 22.1 LaTeX validation

Check:

- Unclosed braces
- Invalid commands
- Unsupported environments
- Missing arguments
- Invalid alignment structures
- Excessive nesting
- Potential performance abuse
- Unsupported macros
- Unsafe HTML extensions

### 22.2 MathML validation

Check:

- XML well-formedness
- Correct namespace
- Supported MathML elements
- Invalid nesting
- Disallowed script/style elements
- External references
- Event-handler attributes
- Unsafe URLs
- Excessive tree depth

### 22.3 Insertion guard

The editor must not insert when:

- Source is empty
- Source is invalid
- Conversion failed
- Rendered output is unsafe
- Required accessibility data is missing under an enforced policy

---

## 23. Error States

Design explicit states for:

- Empty editor
- Invalid LaTeX
- Invalid MathML
- Conversion unavailable
- Preview rendering failed
- Clipboard permission denied
- OCR failed
- Handwriting recognition failed
- Font failed to load
- Draft save failed
- Network unavailable
- Equation too large
- Unsupported command
- Parent cursor selection lost

Each state must provide:

- Clear error title
- Plain-language explanation
- Suggested correction
- Retry action where applicable
- Non-destructive recovery path

---

## 24. Loading States

Loading states are required for:

- Math renderer initialization
- LaTeX-to-MathML conversion
- MathML-to-LaTeX conversion
- OCR
- Handwriting recognition
- Font loading
- Template loading
- History loading
- Draft saving

Use inline progress indicators. Do not block the whole editor unless the operation affects every section.

---

## 25. Performance Requirements

- Editor opens within 300 ms after initial bundle load.
- Typing remains responsive for large expressions.
- Preview updates should normally complete within 250 ms.
- Symbol categories should render using virtualization if lists become large.
- Lazy-load OCR and handwriting modules.
- Lazy-load uncommon math fonts.
- Avoid rerendering the entire editor on each keystroke.
- Cache parsed and rendered expressions.
- Cancel stale conversion and preview tasks.
- Consider a Web Worker for expensive parsing or conversion.

---

## 26. Security Requirements

- Sanitize all rendered HTML.
- Sanitize MathML.
- Block scripts and event-handler attributes.
- Prevent `javascript:` and unsafe data URLs.
- Restrict custom macros.
- Restrict custom CSS to trusted roles.
- Validate uploaded files by MIME type and file signature.
- Apply file-size limits.
- Do not send assessment content to third-party OCR or AI services without consent.
- Avoid persisting confidential equations in browser logs.
- Never use raw `dangerouslySetInnerHTML` without sanitization.

---

## 27. Suggested Component Architecture

```text
src/
└── components/
    └── equation-editor/
        ├── EquationEditor.tsx
        ├── EquationEditorModal.tsx
        ├── EquationEditorHeader.tsx
        ├── EquationCategorySidebar.tsx
        ├── EquationWorkspaceTabs.tsx
        ├── SymbolPalette.tsx
        ├── SymbolButton.tsx
        ├── StructureButton.tsx
        ├── LatexSourceEditor.tsx
        ├── MathMLSourceEditor.tsx
        ├── EquationPreview.tsx
        ├── EquationOptionsPanel.tsx
        ├── EquationAccessibilityPanel.tsx
        ├── EquationHistoryPanel.tsx
        ├── EquationTemplates.tsx
        ├── EquationSnippets.tsx
        ├── RecentEquations.tsx
        ├── EquationSearch.tsx
        ├── EquationShortcutBar.tsx
        ├── EquationErrorBoundary.tsx
        ├── adapters/
        │   ├── EquationEditorAdapter.ts
        │   ├── TipTapEquationAdapter.ts
        │   ├── LexicalEquationAdapter.ts
        │   └── TextareaEquationAdapter.ts
        ├── hooks/
        │   ├── useEquationEditor.ts
        │   ├── useEquationHistory.ts
        │   ├── useEquationPreview.ts
        │   ├── useEquationValidation.ts
        │   └── useEquationShortcuts.ts
        ├── services/
        │   ├── latex.service.ts
        │   ├── mathml.service.ts
        │   ├── equation-conversion.service.ts
        │   ├── equation-sanitization.service.ts
        │   └── equation-storage.service.ts
        ├── data/
        │   ├── symbols.ts
        │   ├── templates.ts
        │   └── snippets.ts
        ├── types/
        │   └── equation-editor.types.ts
        └── equation-editor.css
```

Do not place the entire implementation in one component.

---

## 28. Recommended State Model

```ts
interface EquationEditorState {
  sourceMode: "latex" | "mathml";
  latex: string;
  mathML: string;
  lastValidLatex: string;
  lastValidMathML: string;
  renderedHTML: string;
  validation: {
    valid: boolean;
    errors: EquationValidationError[];
    warnings: EquationValidationWarning[];
  };
  displayMode: "inline" | "block";
  activeCategory: EquationCategory;
  activeWorkspaceTab:
    | "keyboard"
    | "templates"
    | "snippets"
    | "upload"
    | "handwriting";
  activeSettingsTab: "options" | "accessibility" | "history";
  options: EquationDisplayOptions;
  accessibility: EquationAccessibilityData;
  history: EquationHistoryEntry[];
  dirty: boolean;
  saving: boolean;
}
```

Use a reducer, state machine, or focused store. Avoid dozens of unrelated `useState` calls.

---

## 29. Symbol Data Model

```ts
interface EquationSymbol {
  id: string;
  category: EquationCategory;
  label: string;
  description: string;
  latex: string;
  mathML?: string;
  unicode?: string;
  keywords: string[];
  insertion:
    | { type: "text"; value: string }
    | {
        type: "template";
        value: string;
        placeholders: string[];
      };
}
```

Example:

```ts
const fractionSymbol: EquationSymbol = {
  id: "fraction",
  category: "structures",
  label: "Fraction",
  description: "Insert a numerator over a denominator",
  latex: "\\frac{numerator}{denominator}",
  keywords: ["fraction", "divide", "numerator", "denominator"],
  insertion: {
    type: "template",
    value: "\\frac{${1:numerator}}{${2:denominator}}",
    placeholders: ["numerator", "denominator"]
  }
};
```

---

## 30. Draft Persistence

Store unsaved drafts locally using:

- IndexedDB for complex state
- Local storage only for small preferences

Persist:

- Current source
- Active category
- Display options
- Accessibility data
- Recent equations
- User-created snippets

Do not automatically persist confidential content indefinitely. Provide a clear history-retention policy.

---

## 31. Visual Interaction States

Every interactive component must define:

- Default
- Hover
- Active
- Focus-visible
- Disabled
- Loading
- Error
- Selected

Example symbol button:

```css
.symbol-button {
  min-width: 56px;
  height: 34px;
  border: 1px solid var(--equation-border);
  border-radius: var(--radius-md);
  background: var(--equation-panel);
}

.symbol-button:hover {
  border-color: var(--equation-accent);
  background: var(--equation-accent-soft);
}

.symbol-button:focus-visible {
  outline: 2px solid var(--equation-accent);
  outline-offset: 2px;
}
```

---

## 32. Modal Behavior

If implemented as a modal:

- Maximum width: 1600 px
- Maximum height: calc(100vh - 32px)
- Minimum desktop width: 1100 px
- Use a full-screen mode below the minimum width
- Trap focus
- Lock background scroll
- Restore focus to the launch control when closed
- Warn before closing with unsaved changes
- Close nested popovers before closing the modal
- Support Escape
- Do not close when the user clicks inside dropdown portals

---

## 33. Empty States

### No recent equations

```text
No recent equations yet.
Equations you insert will appear here.
```

### No templates found

```text
No matching templates.
Try another term or clear the current filters.
```

### Empty source editor

Show a lightweight example, but do not insert it automatically.

```latex
E = mc^2
```

---

## 34. Analytics Events

Optional events:

```text
equation_editor_opened
equation_editor_closed
equation_inserted
equation_updated
equation_conversion_requested
equation_conversion_failed
equation_validation_failed
equation_template_used
equation_symbol_used
equation_ocr_requested
equation_handwriting_requested
```

Do not include raw equation content in analytics by default.

---

## 35. Testing Requirements

### 35.1 Unit tests

Test:

- Symbol insertion
- Placeholder navigation
- LaTeX validation
- MathML sanitization
- Conversion logic
- Display-mode output
- Storage serialization
- Parent editor adapters
- Accessibility description generation
- Unsafe input blocking

### 35.2 Integration tests

Test:

- Open editor from question toolbar
- Preserve cursor position
- Insert inline equation
- Insert block equation
- Edit existing equation
- Cancel without changes
- Warn on unsaved changes
- Recover from invalid input
- Reopen stored equation source
- Convert LaTeX to MathML
- Export QTI-compatible MathML

### 35.3 End-to-end tests

Test with:

- Chrome
- Edge
- Firefox
- Safari
- Keyboard-only navigation
- Screen reader
- 200% browser zoom
- Tablet width
- Mobile width

### 35.4 Sample test equations

```latex
x^2 + y^2 = r^2
```

```latex
\frac{-b\pm\sqrt{b^2-4ac}}{2a}
```

```latex
\int_0^\infty e^{-x}\,dx = 1
```

```latex
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
```

```latex
f(x)=
\begin{cases}
x^2, & x\ge 0 \\
-x, & x<0
\end{cases}
```

```latex
\nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}
```

```latex
\ce{2H2 + O2 -> 2H2O}
```

The chemistry example requires a compatible extension such as `mhchem`.

---

## 36. Acceptance Criteria

The implementation is complete only when all of the following are true:

### Visual

- Matches the supplied Figma layout at 1600 × 956 px.
- Uses the specified spacing, typography, colors, borders, and radii.
- Has no overlapping or clipped controls.
- Supports responsive layouts.
- Includes visible interaction states.

### Functional

- Symbol buttons insert valid source.
- LaTeX and MathML are editable.
- Conversion works in both supported directions or clearly declares a one-way limitation.
- Preview updates in real time.
- Invalid source cannot be inserted.
- Inline and display insertion both work.
- Existing equations can be reopened and edited.
- Parent cursor position is preserved.
- Undo and redo work.
- Templates, snippets, and recent equations work.
- Accessibility data is preserved.
- Output is sanitized.
- QTI-compatible MathML can be generated.

### Quality

- No single oversized component.
- No global mutable state.
- No raw unsafe HTML injection.
- No hardcoded parent-editor dependency.
- No visual-only controls without behavior.
- No silent conversion failure.
- No loss of existing question content.
- No console errors.
- Core flows are covered by automated tests.

---

## 37. Instructions for the AI Implementation Agent

```text
Implement the equation editor described in this specification inside the existing LMS project.

Before writing code:

1. Inspect package.json, the routing structure, the current question editor, the toolbar, global styles, design tokens, and reusable UI components.
2. Identify the rich-text editor library currently used.
3. Identify how question content is stored and serialized.
4. Identify how QTI 2.1, QTI 3.0, HTML, and JSON outputs are generated.
5. Reuse existing buttons, tabs, dialogs, inputs, dropdowns, tooltips, and accordion components where practical.
6. Do not replace unrelated existing functionality.
7. Do not create a standalone demo page unless it is also integrated into the real question-authoring flow.

Implementation requirements:

1. Create modular equation-editor components.
2. Open the equation editor from the existing question toolbar.
3. Preserve and restore the parent editor selection.
4. Insert inline or block equations at the correct cursor position.
5. Store the original equation source for future editing.
6. Use MathJax unless the existing project already has a renderer that meets all requirements.
7. Sanitize rendered HTML and MathML.
8. Add keyboard navigation and accessible labels.
9. Match the Figma frame at desktop size.
10. Implement responsive tablet and mobile layouts.
11. Add loading, empty, validation, and error states.
12. Add unit and integration tests for the main workflows.
13. Keep all existing project conventions, lint rules, TypeScript rules, and folder structure.
14. Document any unavoidable deviations from the Figma or specification.
15. Do not mark the task complete while visible controls are non-functional.

Reference:

Figma:
https://www.figma.com/design/cxmjxLoAmSVn8MZT0RPBAE?node-id=1-2

Reference image:
a_clean_detailed_screenshot_of_a_modern_equation.png
```

---

## 38. Final Implementation Warning

A Figma screen and a Markdown specification are not enough to guarantee exact integration.

The implementation agent must also receive access to:

- The complete project repository
- The existing question-editor component
- The current toolbar component
- The rich-text editor configuration
- The equation rendering logic, if any
- Global and component-level styles
- Existing UI primitives
- QTI generation code
- Question data types and validation schemas

Without those files, the agent can only build a visually similar standalone component. It cannot safely implement the editor inside the existing application.

import {
  createRef,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import type {
  AuthoringSection,
  ConditionalFeedbackOperator,
  ConditionalFeedbackRule,
  OptionalAuthoringSectionType,
} from "../core/authoringTypes";
import {
  isRequiredAuthoringSection,
  OPTIONAL_AUTHORING_SECTION_LABELS,
} from "../core/authoringTypes";
import type {
  EditorFormState,
  EditorMediaReference,
} from "../fixing/manualFixEngine";
import { getConditionalFeedbackRuleProblem } from "../fixing/conditionalFeedback";
import {
  addOptionalAuthoringSection,
  moveAuthoringSection,
} from "../fixing/manualFixSections";
import {
  ContentEditable,
  getActiveTableHtml,
  RichToolbar,
} from "./ManualFixRichTextEditor";
import { TableModal } from "./TableModal";

const OPTIONAL_SECTION_TYPES = Object.keys(
  OPTIONAL_AUTHORING_SECTION_LABELS,
) as OptionalAuthoringSectionType[];

const TEXT_OPERATORS: Array<{
  value: ConditionalFeedbackOperator;
  label: string;
}> = [
  { value: "equals", label: "Exactly equals" },
  { value: "contains", label: "Contains" },
  { value: "numeric_range", label: "Is within range" },
  { value: "greater_than", label: "Is greater than" },
  { value: "less_than", label: "Is less than" },
];

interface EditorTarget {
  sectionId: string;
  ruleId?: string;
}

interface ManualFixOptionalSectionsProps {
  editorState: EditorFormState;
  setEditorState: Dispatch<SetStateAction<EditorFormState | null>>;
  draggedSectionId: string | null;
  onDragStart(sectionId: string): void;
  onDrop(sectionId: string): void;
  onOpenAsset(sectionId: string, ruleId?: string): void;
  onOpenSource: () => void;
  onOpenMatrixModal?: (initialLatex?: string, targetRef?: React.RefObject<HTMLDivElement | null>, onChange?: (html: string) => void) => void;
  onOpenEquationModal?: (initialLatex?: string, displayMode?: "inline" | "block", targetRef?: React.RefObject<HTMLDivElement | null>, onChange?: (html: string) => void) => void;
  onOpenImageModal?: (imageEl: HTMLImageElement) => void;
}

function mediaRoleForSection(
  type: OptionalAuthoringSectionType,
): EditorMediaReference["role"] {
  return type;
}

function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

export function ManualFixOptionalSections({
  editorState,
  setEditorState,
  draggedSectionId,
  onDragStart,
  onDrop,
  onOpenAsset,
  onOpenSource,
  onOpenMatrixModal,
  onOpenEquationModal,
  onOpenImageModal,
}: ManualFixOptionalSectionsProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [tableTarget, setTableTarget] = useState<EditorTarget | null>(null);
  const [tableInitialHtml, setTableInitialHtml] = useState("");
  const editorRefs = useRef(
    new Map<string, RefObject<HTMLDivElement | null>>(),
  );

  const updateSections = (sections: AuthoringSection[]) => {
    setEditorState((current) => (current ? { ...current, sections } : current));
  };

  const updateSection = (
    sectionId: string,
    updater: (section: AuthoringSection) => AuthoringSection,
  ) => {
    setEditorState((current) => {
      if (!current) return current;
      const sections = current.sections.map((section) =>
        section.id === sectionId ? updater(section) : section,
      );
      const explanation = sections.find(
        (section) => section.type === "explanation",
      );
      return {
        ...current,
        sections,
        explanation: explanation?.content ?? current.explanation,
      };
    });
  };

  const updateContent = (section: AuthoringSection, content: string) => {
    updateSection(section.id, (current) => ({ ...current, content }));
  };

  const updateRule = (
    sectionId: string,
    ruleId: string,
    updater: (rule: ConditionalFeedbackRule) => ConditionalFeedbackRule,
  ) => {
    updateSection(sectionId, (section) => ({
      ...section,
      conditionalFeedbackRules: (section.conditionalFeedbackRules || []).map(
        (rule) => (rule.id === ruleId ? updater(rule) : rule),
      ),
    }));
  };

  const addRule = (sectionId: string) => {
    const isChoice = editorState.type === "MCQ" || editorState.type === "MSQ";
    updateSection(sectionId, (section) => {
      const rules = section.conditionalFeedbackRules || [];
      return {
        ...section,
        conditionalFeedbackRules: [
          ...rules,
          {
            id: `conditional-rule-${crypto.randomUUID()}`,
            condition: isChoice
              ? { operator: "choice_selected", optionId: "" }
              : { operator: "equals", value: "", caseSensitive: false },
            content: "",
            priority: rules.length,
          },
        ],
      };
    });
  };

  const moveRule = (sectionId: string, ruleId: string, direction: -1 | 1) => {
    updateSection(sectionId, (section) => {
      const rules = [...(section.conditionalFeedbackRules || [])];
      const from = rules.findIndex((rule) => rule.id === ruleId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= rules.length) return section;
      const [moved] = rules.splice(from, 1);
      rules.splice(to, 0, moved);
      return {
        ...section,
        conditionalFeedbackRules: rules.map((rule, priority) => ({
          ...rule,
          priority,
        })),
      };
    });
  };

  const removeRule = (sectionId: string, ruleId: string) => {
    editorRefs.current.delete(ruleId);
    setEditorState((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                conditionalFeedbackRules: (
                  section.conditionalFeedbackRules || []
                )
                  .filter((rule) => rule.id !== ruleId)
                  .map((rule, priority) => ({ ...rule, priority })),
              }
            : section,
        ),
        mediaReferences: current.mediaReferences.filter(
          (reference) => reference.ownerId !== ruleId,
        ),
      };
    });
  };

  const getEditorRef = (key: string) => {
    const existing = editorRefs.current.get(key);
    if (existing) return existing;
    const created = createRef<HTMLDivElement>();
    editorRefs.current.set(key, created);
    return created;
  };

  const openTableEditor = (target: EditorTarget, table?: HTMLTableElement) => {
    const editor = getEditorRef(target.ruleId || target.sectionId).current;
    let initialHtml = "";
    if (table) {
      table.setAttribute("data-editing", "true");
      initialHtml = table.outerHTML;
    } else {
      initialHtml = getActiveTableHtml(editor);
    }
    setTableTarget(target);
    setTableInitialHtml(initialHtml);
    setIsTableModalOpen(true);
  };

  const handleInsertTable = (html: string) => {
    if (!tableTarget) return;
    const editor = getEditorRef(
      tableTarget.ruleId || tableTarget.sectionId,
    ).current;
    if (!editor) return;
    editor.focus();

    const editingTable = editor.querySelector('table[data-editing="true"]');
    if (editingTable) {
      const temporary = document.createElement("div");
      temporary.innerHTML = html;
      const replacement = temporary.firstElementChild;
      if (replacement)
        editingTable.parentNode?.replaceChild(replacement, editingTable);
    } else {
      document.execCommand("insertHTML", false, html);
    }

    editor
      .querySelectorAll('table[data-editing="true"]')
      .forEach((element) => element.removeAttribute("data-editing"));
    const content = editor.innerHTML;
    if (tableTarget.ruleId) {
      updateRule(tableTarget.sectionId, tableTarget.ruleId, (rule) => ({
        ...rule,
        content,
      }));
    } else {
      const section = editorState.sections.find(
        (candidate) => candidate.id === tableTarget.sectionId,
      );
      if (section) updateContent(section, content);
    }
  };

  const closeTableEditor = () => {
    setIsTableModalOpen(false);
    editorRefs.current.forEach((reference) =>
      reference.current
        ?.querySelectorAll('table[data-editing="true"]')
        .forEach((element) => element.removeAttribute("data-editing")),
    );
    setTableTarget(null);
  };

  const removeSection = (section: AuthoringSection) => {
    if (isRequiredAuthoringSection(section.type)) return;
    editorRefs.current.delete(section.id);
    const ruleIds = new Set(
      (section.conditionalFeedbackRules || []).map((rule) => rule.id),
    );
    ruleIds.forEach((ruleId) => editorRefs.current.delete(ruleId));
    setEditorState((current) => {
      if (!current) return current;
      return {
        ...current,
        explanation: section.type === "explanation" ? "" : current.explanation,
        sections: current.sections.filter(
          (candidate) => candidate.id !== section.id,
        ),
        mediaReferences: current.mediaReferences.filter(
          (reference) =>
            reference.role !==
              mediaRoleForSection(
                section.type as OptionalAuthoringSectionType,
              ) && !ruleIds.has(reference.ownerId || ""),
        ),
      };
    });
  };

  const optionalSections = editorState.sections.filter(
    (section) => !isRequiredAuthoringSection(section.type),
  );
  const conditionalFeedbackOptions =
    editorState.type === "MCQ"
      ? editorState.options.filter(
          (option) => option.id !== editorState.correctAnswerId,
        )
      : editorState.options;
  const mathPattern = new RegExp("\\$|\\\\\\(|\\\\\\[");

  const renderContentFooter = (content: string) => (
    <div className="flex h-[27px] items-center justify-between border-t border-border/50 bg-muted/5 px-3 text-[10px] text-muted-foreground">
      <span>chars: {plainText(content).length}</span>
      <span>
        Math{" "}
        {mathPattern.test(content) ? (
          <b className="rounded-full bg-success px-1.5 py-0.5 text-[8px] text-success-foreground">
            ON
          </b>
        ) : (
          <b className="text-[8px] text-muted-foreground">OFF</b>
        )}
      </span>
    </div>
  );

  const renderRuleCondition = (
    section: AuthoringSection,
    rule: ConditionalFeedbackRule,
  ) => {
    const isChoice = editorState.type === "MCQ" || editorState.type === "MSQ";
    if (isChoice) {
      return (
        <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
          If the learner selects
          <select
            value={rule.condition.optionId || ""}
            onChange={(event) =>
              updateRule(section.id, rule.id, (current) => ({
                ...current,
                condition: {
                  operator: "choice_selected",
                  optionId: event.target.value,
                },
              }))
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          >
            <option value="">Select an option...</option>
            {conditionalFeedbackOptions.map((option, index) => (
              <option key={option.id} value={option.id}>
                {option.id || String.fromCharCode(65 + index)}.{" "}
                {plainText(option.text) || "Untitled option"}
              </option>
            ))}
          </select>
        </label>
      );
    }

    const operator = rule.condition.operator;
    return (
      <div className="grid gap-2 sm:grid-cols-[170px_1fr]">
        <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
          If the learner response
          <select
            value={operator}
            onChange={(event) => {
              const nextOperator = event.target
                .value as ConditionalFeedbackOperator;
              updateRule(section.id, rule.id, (current) => ({
                ...current,
                condition:
                  nextOperator === "numeric_range"
                    ? { operator: nextOperator }
                    : {
                        operator: nextOperator,
                        value: "",
                        caseSensitive: false,
                      },
              }));
            }}
            className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
          >
            {TEXT_OPERATORS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        {operator === "numeric_range" ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
              Minimum (inclusive)
              <input
                type="number"
                value={rule.condition.min ?? ""}
                onChange={(event) =>
                  updateRule(section.id, rule.id, (current) => ({
                    ...current,
                    condition: {
                      ...current.condition,
                      min:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    },
                  }))
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
            </label>
            <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
              Maximum (inclusive)
              <input
                type="number"
                value={rule.condition.max ?? ""}
                onChange={(event) =>
                  updateRule(section.id, rule.id, (current) => ({
                    ...current,
                    condition: {
                      ...current.condition,
                      max:
                        event.target.value === ""
                          ? undefined
                          : Number(event.target.value),
                    },
                  }))
                }
                className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              />
            </label>
          </div>
        ) : (
          <label className="grid gap-1 text-[10px] font-medium text-muted-foreground">
            Match value
            <input
              type={
                operator === "greater_than" || operator === "less_than"
                  ? "number"
                  : "text"
              }
              value={rule.condition.value || ""}
              onChange={(event) =>
                updateRule(section.id, rule.id, (current) => ({
                  ...current,
                  condition: {
                    ...current.condition,
                    value: event.target.value,
                  },
                }))
              }
              placeholder={
                operator === "contains" ? "Text to find" : "Answer value"
              }
              className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            />
          </label>
        )}
        {(operator === "equals" || operator === "contains") && (
          <label className="col-span-full flex items-center gap-2 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={rule.condition.caseSensitive || false}
              onChange={(event) =>
                updateRule(section.id, rule.id, (current) => ({
                  ...current,
                  condition: {
                    ...current.condition,
                    caseSensitive: event.target.checked,
                  },
                }))
              }
            />
            Match uppercase and lowercase exactly
          </label>
        )}
      </div>
    );
  };

  const renderConditionalSection = (section: AuthoringSection) => {
    const rules = section.conditionalFeedbackRules || [];
    return (
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">
            These rules run only for an incorrect response. The first matching
            rule is shown before general incorrect feedback.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => addRule(section.id)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add response rule
          </Button>
        </div>
        {rules.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
            Add a rule to show tailored feedback for a particular incorrect
            answer.
          </div>
        )}
        {rules.map((rule, index) => {
          const editorRef = getEditorRef(rule.id);
          const problem = getConditionalFeedbackRuleProblem(
            rule,
            conditionalFeedbackOptions.map((option) => option.id),
          );
          return (
            <div
              key={rule.id}
              className="overflow-hidden rounded-md border bg-background"
            >
              <div className="flex min-h-[38px] items-center justify-between border-b bg-muted/15 px-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                    Rule {index + 1}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Priority {index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0}
                    onClick={() => moveRule(section.id, rule.id, -1)}
                    aria-label={`Move rule ${index + 1} up`}
                    title="Move rule up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === rules.length - 1}
                    onClick={() => moveRule(section.id, rule.id, 1)}
                    aria-label={`Move rule ${index + 1} down`}
                    title="Move rule down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeRule(section.id, rule.id)}
                    aria-label={`Delete rule ${index + 1}`}
                    title="Delete rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-3">{renderRuleCondition(section, rule)}</div>
              <div className="border-t">
                <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground">
                  Feedback shown for this response
                </div>
                <RichToolbar
                  textareaRef={editorRef}
                  value={rule.content}
                  onChange={(content) =>
                    updateRule(section.id, rule.id, (current) => ({
                      ...current,
                      content,
                    }))
                  }
                  onOpenAsset={() => onOpenAsset(section.id, rule.id)}
                  onOpenSource={onOpenSource}
                  onOpenTable={() =>
                    openTableEditor({ sectionId: section.id, ruleId: rule.id })
                  }
                  onOpenMatrixModal={onOpenMatrixModal}
                  onOpenEquationModal={onOpenEquationModal}
                  variant="full"
                />
                <ContentEditable
                  innerRef={editorRef}
                  value={rule.content}
                  onChange={(content) =>
                    updateRule(section.id, rule.id, (current) => ({
                      ...current,
                      content,
                    }))
                  }
                  onOpenTable={(table) =>
                    openTableEditor(
                      { sectionId: section.id, ruleId: rule.id },
                      table,
                    )
                  }
                  onOpenMatrixModal={onOpenMatrixModal}
                  onOpenEquationModal={onOpenEquationModal}
                  onOpenImageModal={onOpenImageModal}
                  className="min-h-[112px] border-0"
                  placeholder="Add feedback for this response..."
                />
                {renderContentFooter(rule.content)}
              </div>
              {problem && (
                <div className="flex items-center gap-1.5 border-t border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {problem}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {optionalSections.map((section) => {
        const type = section.type as OptionalAuthoringSectionType;
        const content =
          type === "explanation"
            ? editorState.explanation
            : section.content || "";
        const order = editorState.sections.findIndex(
          (candidate) => candidate.id === section.id,
        );
        const editorRef = getEditorRef(section.id);

        return (
          <section
            key={section.id}
            className={`shrink-0 overflow-hidden rounded-lg border bg-background ${
              draggedSectionId === section.id
                ? "border-primary/60 opacity-70"
                : "border-border"
            }`}
            style={{ order }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(section.id)}
            data-authoring-section={type}
          >
            <div className="flex min-h-[43px] items-center justify-between border-b px-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  draggable
                  onDragStart={() => onDragStart(section.id)}
                  className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                  aria-label={`Drag ${OPTIONAL_AUTHORING_SECTION_LABELS[type]}`}
                  title="Drag to reorder"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <strong className="text-[11px] font-semibold">
                  {OPTIONAL_AUTHORING_SECTION_LABELS[type]}
                </strong>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[8px] font-semibold uppercase text-muted-foreground">
                  Optional
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    updateSections(
                      moveAuthoringSection(
                        editorState.sections,
                        section.id,
                        -1,
                      ),
                    )
                  }
                  title="Move section up"
                  aria-label="Move section up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    updateSections(
                      moveAuthoringSection(editorState.sections, section.id, 1),
                    )
                  }
                  title="Move section down"
                  aria-label="Move section down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeSection(section)}
                  title="Delete section"
                  aria-label="Delete section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {type === "conditional_feedback" ? (
              renderConditionalSection(section)
            ) : (
              <>
                <RichToolbar
                  textareaRef={editorRef}
                  value={content}
                  onChange={(value) => updateContent(section, value)}
                  onOpenAsset={() => onOpenAsset(section.id)}
                  onOpenSource={onOpenSource}
                  onOpenTable={() => openTableEditor({ sectionId: section.id })}
                  onOpenMatrixModal={onOpenMatrixModal}
                  onOpenEquationModal={onOpenEquationModal}
                  variant="full"
                />
                <ContentEditable
                  innerRef={editorRef}
                  value={content}
                  onChange={(value) => updateContent(section, value)}
                  onOpenTable={(table) =>
                    openTableEditor({ sectionId: section.id }, table)
                  }
                  onOpenMatrixModal={onOpenMatrixModal}
                  onOpenEquationModal={onOpenEquationModal}
                  onOpenImageModal={onOpenImageModal}
                  className="min-h-[112px] border-0"
                  placeholder={`Add ${OPTIONAL_AUTHORING_SECTION_LABELS[
                    type
                  ].toLowerCase()}...`}
                />
                {renderContentFooter(content)}
              </>
            )}
          </section>
        );
      })}

      <div
        className="relative flex shrink-0 justify-center py-1"
        style={{ order: editorState.sections.length + 1 }}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-dashed text-xs"
          onClick={() => setIsAddMenuOpen((open) => !open)}
          aria-expanded={isAddMenuOpen}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add section
        </Button>
        {isAddMenuOpen && (
          <div className="absolute bottom-10 z-20 w-64 rounded-lg border bg-popover p-1.5 shadow-xl">
            {OPTIONAL_SECTION_TYPES.map((type) => {
              const alreadyAdded = editorState.sections.some(
                (section) => section.type === type,
              );
              return (
                <button
                  key={type}
                  type="button"
                  disabled={alreadyAdded}
                  className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => {
                    updateSections(
                      addOptionalAuthoringSection(editorState.sections, type),
                    );
                    setIsAddMenuOpen(false);
                  }}
                >
                  <span>{OPTIONAL_AUTHORING_SECTION_LABELS[type]}</span>
                  {alreadyAdded && (
                    <span className="text-[9px] text-muted-foreground">
                      Added
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TableModal
        isOpen={isTableModalOpen}
        onClose={closeTableEditor}
        initialHtml={tableInitialHtml}
        onInsert={handleInsertTable}
      />
    </>
  );
}

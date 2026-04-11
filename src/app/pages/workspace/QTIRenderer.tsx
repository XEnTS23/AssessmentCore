import { useState, useRef, useMemo, useEffect } from "react";
import {
  Upload,
  Play,
  Download,
  FileCode,
  FileJson,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Archive,
  FolderOpen,
  Eraser,
  ChevronLeft,
  ChevronRight,
  List,
  Sparkles,
  Copy,
  Eye,
  EyeOff,
  Filter,
  Search,
  Code,
  Pencil,
  X,
  ClipboardPaste,
} from "lucide-react";
import JSZip from "jszip";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { cn } from "../../components/ui/utils";
import { MathMLRenderer } from "../../components/MathMLRenderer";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ParsedChoice {
  identifier: string;
  content: string;
}

interface ParsedQuestion {
  identifier: string;
  title: string;
  type: 'mcq' | 'textentry';
  stem: string;
  textEntryExpectedLength?: number;
  choices?: ParsedChoice[];
  correctAnswer?: string;
  correctAnswers?: string[];
  feedbackText?: string;
  correctFeedback?: string;
  incorrectFeedback?: string;
  warnings?: string[];
}

interface FileMetadata {
  fileName: string;
  format: 'xml' | 'json' | 'unknown';
  qtiVersion: string;
  totalItems: number;
}

interface QuestionNavigatorItem {
  index: number;
  identifier: string;
  title: string;
  type: 'mcq' | 'textentry';
  preview: string;
}

// ── XML helpers ────────────────────────────────────────────────────────────────

const serializer = new XMLSerializer();

/**
 * Serialize an XML element's child nodes to an HTML string, preserving
 * markup such as `<math>`, `<p>`, `<span>`, etc.  This is the key fix:
 * `.textContent` strips all tags (including MathML), whereas this keeps them.
 */
function getInnerHTML(el: Element): string {
  let html = '';
  for (let i = 0; i < el.childNodes.length; i++) {
    html += serializer.serializeToString(el.childNodes[i]);
  }
  // XMLSerializer adds xmlns declarations on every element; strip them so the
  // HTML output is clean for the browser to render via MathMLRenderer.
  return html
    .replace(/ xmlns="[^"]*"/g, '')
    .trim();
}

/**
 * Get the inner HTML of an element, but strip out child elements that match
 * certain tag names (e.g. feedbackBlock, qti-modal-feedback) so their text
 * doesn't pollute the stem.
 */
function getInnerHTMLExcluding(el: Element, excludeSelectors: string[]): string {
  // Clone so we don't mutate the parsed document
  const clone = el.cloneNode(true) as Element;
  for (const sel of excludeSelectors) {
    clone.querySelectorAll(sel).forEach(node => node.parentNode?.removeChild(node));
  }
  return getInnerHTML(clone);
}

const FEEDBACK_SELECTORS = 'feedbackBlock, modalFeedback, qti-modal-feedback, qti-feedback-block';

function isIncorrectFeedbackNode(node: Element): boolean {
  const identifier = (node.getAttribute('identifier') || '').toLowerCase();
  const outcomeIdentifier = (
    node.getAttribute('outcomeIdentifier')
    || node.getAttribute('outcome-identifier')
    || ''
  ).toLowerCase();

  return (
    identifier === 'incorrect'
    || identifier.includes('incorrect')
    || identifier.includes('wrong')
    || outcomeIdentifier.includes('incorrect')
    || outcomeIdentifier.includes('wrong')
  );
}

function isCorrectFeedbackNode(node: Element): boolean {
  const identifier = (node.getAttribute('identifier') || '').toLowerCase();
  const outcomeIdentifier = (
    node.getAttribute('outcomeIdentifier')
    || node.getAttribute('outcome-identifier')
    || ''
  ).toLowerCase();

  if (isIncorrectFeedbackNode(node)) {
    return false;
  }

  return (
    identifier === 'correct'
    || identifier.includes('correct')
    || outcomeIdentifier.includes('correct')
  );
}

function extractFeedback(item: Element, itemBody: Element | null): {
  feedbackText: string;
  correctFeedback: string;
  incorrectFeedback: string;
} {
  let feedbackText = '';
  let correctFeedback = '';
  let incorrectFeedback = '';

  const itemBodyFeedbacks = itemBody ? Array.from(itemBody.querySelectorAll(FEEDBACK_SELECTORS)) : [];
  const itemLevelFeedbacks = Array.from(item.querySelectorAll(FEEDBACK_SELECTORS));

  const seen = new Set<Element>();
  const allFeedbacks = [...itemBodyFeedbacks, ...itemLevelFeedbacks].filter((fb) => {
    if (seen.has(fb)) return false;
    seen.add(fb);
    return true;
  });

  for (const fb of allFeedbacks) {
    const text = getInnerHTML(fb).trim();
    if (!text) continue;

    if (isIncorrectFeedbackNode(fb) && !incorrectFeedback) {
      incorrectFeedback = text;
      continue;
    }

    if (isCorrectFeedbackNode(fb) && !correctFeedback) {
      correctFeedback = text;
      continue;
    }

    if (!feedbackText) {
      feedbackText = text;
    }
  }

  return { feedbackText, correctFeedback, incorrectFeedback };
}

// Rebuild a QTI XML document from a JSON-shaped question (matches the
// shape the SourceViewer emits in JSON mode) so edits can round-trip.
function jsonQuestionToXml(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('JSON must be a question object.');
  }
  const q = data as {
    identifier?: string;
    title?: string;
    type?: string;
    stem?: string;
    choices?: { identifier: string; content: string }[];
    correctAnswer?: string;
    correctAnswers?: string[];
    textEntryExpectedLength?: number;
  };

  const identifier = q.identifier || 'edited-item';
  const title = q.title || 'Edited Item';
  const type = q.type;
  const stem = q.stem || '';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<assessmentItem identifier="${identifier}" title="${title}">\n`;

  if (type === 'mcq') {
    xml += `  <responseDeclaration identifier="RESPONSE">\n`;
    xml += `    <correctResponse>\n`;
    xml += `      <value>${q.correctAnswer || ''}</value>\n`;
    xml += `    </correctResponse>\n`;
    xml += `  </responseDeclaration>\n`;
    xml += `  <itemBody>\n`;
    xml += `    <choiceInteraction responseIdentifier="RESPONSE">\n`;
    xml += `      <prompt>${stem}</prompt>\n`;
    (q.choices || []).forEach((c) => {
      xml += `      <simpleChoice identifier="${c.identifier}">${c.content}</simpleChoice>\n`;
    });
    xml += `    </choiceInteraction>\n`;
    xml += `  </itemBody>\n`;
  } else if (type === 'textentry') {
    xml += `  <responseDeclaration identifier="RESPONSE">\n`;
    xml += `    <correctResponse>\n`;
    (q.correctAnswers || []).forEach((a) => {
      xml += `      <value>${a}</value>\n`;
    });
    xml += `    </correctResponse>\n`;
    xml += `  </responseDeclaration>\n`;
    xml += `  <itemBody>\n`;
    xml += `    <div>\n`;
    xml += `      <p>${stem}</p>\n`;
    xml += `      <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="${q.textEntryExpectedLength || 50}"/>\n`;
    xml += `    </div>\n`;
    xml += `  </itemBody>\n`;
  } else {
    throw new Error('Unsupported question type in JSON. Expected "mcq" or "textentry".');
  }

  xml += `</assessmentItem>`;
  return xml;
}

// ── QTI XML Parser ─────────────────────────────────────────────────────────────

function parseQTIXml(xmlString: string): ParsedQuestion[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString.trim(), 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML: ' + parseError.textContent);
  }

  const questions: ParsedQuestion[] = [];

  let items = doc.querySelectorAll('assessmentItem');
  if (items.length === 0) {
    items = doc.querySelectorAll('qti-assessment-item');
  }

  const itemsToProcess = items.length > 0 ? Array.from(items) : [doc.documentElement];

  for (const item of itemsToProcess) {
    if (item.tagName === 'parsererror') continue;

    const identifier = item.getAttribute('identifier') || 'unknown';
    const title = item.getAttribute('title') || 'Untitled Question';

    let choiceInteraction = item.querySelector('choiceInteraction');
    if (!choiceInteraction) {
      choiceInteraction = item.querySelector('qti-choice-interaction');
    }

    let textEntryInteraction = item.querySelector('textEntryInteraction');
    if (!textEntryInteraction) {
      textEntryInteraction = item.querySelector('qti-text-entry-interaction');
    }

    if (choiceInteraction) {
      let prompt = choiceInteraction.querySelector('prompt');
      if (!prompt) {
        prompt = choiceInteraction.querySelector('qti-prompt');
      }

      let itemBody = item.querySelector('itemBody');
      if (!itemBody) {
        itemBody = item.querySelector('qti-item-body');
      }

      let stem = '';
      if (prompt) {
        stem = getInnerHTML(prompt);
      } else if (itemBody) {
        const pTags = itemBody.querySelectorAll('p, qti-content-body > *');
        for (const p of Array.from(pTags)) {
          if (!p.closest(FEEDBACK_SELECTORS)) {
            const html = getInnerHTML(p);
            if (html) {
              stem += (stem ? '<br/>' : '') + html;
            }
          }
        }
      }

      let simpleChoices = choiceInteraction.querySelectorAll('simpleChoice');
      if (simpleChoices.length === 0) {
        simpleChoices = choiceInteraction.querySelectorAll('qti-simple-choice');
      }

      const choices: ParsedChoice[] = Array.from(simpleChoices).map(choice => ({
        identifier: choice.getAttribute('identifier') || '',
        content: getInnerHTML(choice),
      }));

      let correctAnswer = '';
      let responseDecl = item.querySelector('responseDeclaration');
      if (!responseDecl) {
        responseDecl = item.querySelector('qti-response-declaration');
      }

      if (responseDecl) {
        let correctValue = responseDecl.querySelector('correctResponse > value');
        if (!correctValue) {
          correctValue = responseDecl.querySelector('qti-correct-response > qti-value');
        }
        if (correctValue) {
          correctAnswer = correctValue.textContent?.trim() || '';
        }
      }

      const { feedbackText, correctFeedback, incorrectFeedback } = extractFeedback(item, itemBody);

      questions.push({
        identifier,
        title,
        type: 'mcq',
        stem,
        choices,
        correctAnswer,
        feedbackText,
        correctFeedback,
        incorrectFeedback,
      });

    } else if (textEntryInteraction) {
      const expectedLengthAttr = textEntryInteraction.getAttribute('expectedLength')
        || textEntryInteraction.getAttribute('expected-length');
      const parsedExpectedLength = expectedLengthAttr ? Number(expectedLengthAttr) : NaN;
      const expectedLength = Number.isFinite(parsedExpectedLength) && parsedExpectedLength > 0
        ? Math.round(parsedExpectedLength)
        : undefined;

      let itemBody = item.querySelector('itemBody');
      if (!itemBody) {
        itemBody = item.querySelector('qti-item-body');
      }

      let stem = '';
      if (itemBody) {
        const pTags = itemBody.querySelectorAll('p, qti-content-body > *');
        for (const p of Array.from(pTags)) {
          if (!p.closest(FEEDBACK_SELECTORS)) {
            const html = getInnerHTML(p);
            if (html) {
              stem += (stem ? '<br/>' : '') + html;
            }
          }
        }
        if (!stem) {
          // Fallback: serialize the itemBody excluding interactions and feedback
          stem = getInnerHTMLExcluding(itemBody, [
            'textEntryInteraction', 'qti-text-entry-interaction',
            'feedbackBlock', 'modalFeedback', 'qti-modal-feedback', 'qti-feedback-block',
          ]);
        }
      }

      const correctAnswers: string[] = [];
      let responseDecl = item.querySelector('responseDeclaration');
      if (!responseDecl) {
        responseDecl = item.querySelector('qti-response-declaration');
      }

      if (responseDecl) {
        let values = responseDecl.querySelectorAll('correctResponse > value');
        if (values.length === 0) {
          values = responseDecl.querySelectorAll('qti-correct-response > qti-value');
        }
        values.forEach(v => {
          const text = v.textContent?.trim();
          if (text) correctAnswers.push(text);
        });
      }

      const { feedbackText, correctFeedback, incorrectFeedback } = extractFeedback(item, itemBody);

      questions.push({
        identifier,
        title,
        type: 'textentry',
        stem,
        textEntryExpectedLength: expectedLength,
        correctAnswers,
        feedbackText,
        correctFeedback,
        incorrectFeedback,
      });
    }
  }

  return questions;
}

// ── Feedback Block ─────────────────────────────────────────────────────────────

function FeedbackBlock({ isCorrect, question }: { isCorrect: boolean; question: ParsedQuestion }) {
  const correctChoice = question.type === 'mcq'
    ? question.choices?.find((choice) => choice.identifier === question.correctAnswer)
    : null;

  return (
    <div
      className={cn(
        "mt-4 flex items-start gap-2 rounded-xl p-3 transition-all duration-300",
        isCorrect
          ? "bg-white border-2 border-[#22C55E]"
          : "bg-white border-2 border-[#EF4444]"
      )}
    >
      {isCorrect ? (
        <CheckCircle2 className="w-5 h-5 text-[#475569] mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-[#475569] mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#111827]">
          {isCorrect ? "Correct!" : "Incorrect"}
        </p>
        {!isCorrect && question.type === 'mcq' && question.correctAnswer && (
          <div className="text-sm mt-1 text-[#111827]">
            <p>The correct answer is:</p>
            {correctChoice?.content ? (
              <MathMLRenderer content={correctChoice.content} className="mt-1 font-medium" inline />
            ) : (
              <strong>{question.correctAnswer}</strong>
            )}
          </div>
        )}
        {!isCorrect && question.type === 'textentry' && question.correctAnswers && question.correctAnswers.length > 0 && (
          <p className="text-sm mt-1 text-[#111827]">
            Expected answer: <strong>{question.correctAnswers.join(' / ')}</strong>
          </p>
        )}
        {isCorrect && question.correctFeedback && (
          <MathMLRenderer content={question.correctFeedback} className="text-sm mt-1.5" />
        )}
        {!isCorrect && question.incorrectFeedback && (
          <MathMLRenderer content={question.incorrectFeedback} className="text-sm mt-1.5" />
        )}
        {!question.correctFeedback && !question.incorrectFeedback && question.feedbackText && (
          <MathMLRenderer content={question.feedbackText} className="text-sm mt-1.5 opacity-90" />
        )}
      </div>
    </div>
  );
}

// ── File Header Component ──────────────────────────────────────────────────────

interface FileHeaderProps {
  metadata: FileMetadata | null;
  parsedQuestions: ParsedQuestion[];
}

function FileHeader({ metadata, parsedQuestions }: FileHeaderProps) {
  if (!metadata) return null;

  return (
    <div className="bg-[linear-gradient(180deg,_#ffffff_0%,_#f3f9ff_58%,_#eefbf6_100%)] border-b border-[#d7e5ff] px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 bg-[linear-gradient(120deg,_#2457b8_0%,_#2f7ecf_55%,_#1f9d86_100%)] rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <FileCode className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-[#111827] truncate">{metadata.fileName}</h1>
          <span className="text-xs text-[#94A3B8] bg-[#F1F5F9] px-2 py-1 rounded">
            {metadata.format.toUpperCase()}
          </span>
          <span className="text-xs text-[#94A3B8] bg-[#F1F5F9] px-2 py-1 rounded">
            {metadata.qtiVersion}
          </span>
        </div>
      </div>

      <Badge variant="secondary" className="bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] hover:bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-xs flex-shrink-0 border border-[#bfd6ff]">
        {parsedQuestions.length} item{parsedQuestions.length !== 1 ? 's' : ''}
      </Badge>
    </div>
  );
}

// ── Question Navigator Component ───────────────────────────────────────────────

interface QuestionNavigatorProps {
  questions: QuestionNavigatorItem[];
  activeIndex: number;
  onSelectQuestion: (index: number) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  filters: Set<string>;
  onFilterToggle: (type: string) => void;
}

function QuestionNavigator({
  questions,
  activeIndex,
  onSelectQuestion,
  searchText,
  onSearchChange,
  filters,
  onFilterToggle,
}: QuestionNavigatorProps) {
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      // Apply type filter
      if (filters.size > 0 && !filters.has(q.type)) {
        return false;
      }
      // Apply search filter
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        return (
          q.title.toLowerCase().includes(searchLower) ||
          q.preview.toLowerCase().includes(searchLower) ||
          q.identifier.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [questions, searchText, filters]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.type)));
  }, [questions]);

  return (
    <div className="h-full flex flex-col min-w-0 overflow-hidden">
      {/* Search */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-[#d7e5ff] bg-[linear-gradient(180deg,_#fbfdff_0%,_#f5fbf9_100%)]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#d7e5ff] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2457b8] bg-white"
          />
        </div>
      </div>

      {/* Type Filters */}
      {uniqueTypes.length > 1 && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-[#d7e5ff] flex gap-2 overflow-x-auto bg-[#fbfdff]">
          {uniqueTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                const newFilters = new Set(filters);
                if (newFilters.has(type)) {
                  newFilters.delete(type);
                } else {
                  newFilters.add(type);
                }
                onFilterToggle(type);
              }}
              className={cn(
                "px-2 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors",
                filters.has(type)
                  ? "bg-[linear-gradient(135deg,_#e8f0ff_0%,_#e7f9f0_100%)] text-[#1f4aa0] border border-[#bfd6ff]"
                  : "bg-[#f2f6fb] text-[#475569] hover:bg-[#e8f1fb]"
              )}
            >
              {type === 'mcq' ? 'MCQ' : 'Text Entry'}
            </button>
          ))}
        </div>
      )}

      {/* Question List */}
      <div className="flex-1 overflow-y-auto min-w-0">
        {filteredQuestions.length === 0 ? (
          <div className="p-4 text-center text-[#94A3B8] text-xs">
            {searchText || filters.size > 0 ? 'No questions match filter' : 'No questions loaded'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredQuestions.map((q) => (
              <button
                key={q.index}
                onClick={() => onSelectQuestion(q.index)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200 border",
                  activeIndex === q.index
                    ? "bg-[#EFF6FF] border-[#0F6CBD] shadow-sm"
                    : "border-transparent hover:bg-[#F8FAFC]"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-[#111827]">Q{q.index + 1}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs h-5",
                      q.type === 'mcq'
                        ? "bg-[#E0F2FE] text-[#0F6CBD] border-[#0F6CBD]"
                        : "bg-[#FEF3C7] text-[#92400E] border-[#92400E]"
                    )}
                  >
                    {q.type === 'mcq' ? 'MCQ' : 'Text'}
                  </Badge>
                </div>
                <p className="text-[#475569] font-medium line-clamp-1">{q.title}</p>
                <p
                  className="text-[#94A3B8] line-clamp-2 mt-0.5"
                  dangerouslySetInnerHTML={{ __html: q.preview }}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Source Viewer Component ────────────────────────────────────────────────────

interface SourceViewerProps {
  question: ParsedQuestion | null;
  sourceMode: 'xml' | 'json';
  onSourceModeChange: (mode: 'xml' | 'json') => void;
  onSave?: (editedContent: string, mode: 'xml' | 'json') => { ok: boolean; error?: string };
}

function SourceViewer({ question, sourceMode, onSourceModeChange, onSave }: SourceViewerProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!question) {
    return (
      <div className="h-full flex items-center justify-center text-[#94A3B8] text-sm">
        Select a question to view source
      </div>
    );
  }

  // Convert question back to XML
  const generateXml = (): string => {
    const serializer = new XMLSerializer();
    const doc = new DOMParser().parseFromString('<?xml version="1.0"?><root/>', 'application/xml');
    
    // Build XML representation
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<assessmentItem identifier="${question.identifier}" title="${question.title}">\n`;
    
    if (question.type === 'mcq') {
      xml += `  <responseDeclaration identifier="RESPONSE">\n`;
      xml += `    <correctResponse>\n`;
      xml += `      <value>${question.correctAnswer || ''}</value>\n`;
      xml += `    </correctResponse>\n`;
      xml += `  </responseDeclaration>\n`;
      xml += `  <itemBody>\n`;
      xml += `    <choiceInteraction responseIdentifier="RESPONSE">\n`;
      xml += `      <prompt>${question.stem}</prompt>\n`;
      question.choices?.forEach((choice) => {
        xml += `      <simpleChoice identifier="${choice.identifier}">${choice.content}</simpleChoice>\n`;
      });
      xml += `    </choiceInteraction>\n`;
      xml += `  </itemBody>\n`;
    } else {
      xml += `  <responseDeclaration identifier="RESPONSE">\n`;
      xml += `    <correctResponse>\n`;
      question.correctAnswers?.forEach((ans) => {
        xml += `      <value>${ans}</value>\n`;
      });
      xml += `    </correctResponse>\n`;
      xml += `  </responseDeclaration>\n`;
      xml += `  <itemBody>\n`;
      xml += `    <div>\n`;
      xml += `      <p>${question.stem}</p>\n`;
      xml += `      <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="${question.textEntryExpectedLength || 50}"/>\n`;
      xml += `    </div>\n`;
      xml += `  </itemBody>\n`;
    }
    
    xml += `</assessmentItem>`;
    return xml;
  };

  const generateJson = (): string => {
    return JSON.stringify(
      {
        identifier: question.identifier,
        title: question.title,
        type: question.type,
        stem: question.stem,
        choices: question.choices,
        correctAnswer: question.correctAnswer,
        correctAnswers: question.correctAnswers,
        feedbackText: question.feedbackText,
        correctFeedback: question.correctFeedback,
        incorrectFeedback: question.incorrectFeedback,
      },
      null,
      2
    );
  };

  const sourceContent = sourceMode === 'xml' ? generateXml() : generateJson();
  const displayContent = isEditing ? editedContent : sourceContent;

  // Exit edit mode and clear errors when the selected question or mode changes.
  useEffect(() => {
    setIsEditing(false);
    setEditError(null);
  }, [question.identifier, sourceMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch {
      setEditError('Clipboard copy failed. Your browser may block clipboard access.');
    }
  };

  const handleStartEdit = () => {
    setEditedContent(sourceContent);
    setIsEditing(true);
    setEditError(null);
    // Focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent("");
    setEditError(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setEditError('Clipboard is empty.');
        return;
      }
      if (!isEditing) {
        setEditedContent(text);
        setIsEditing(true);
        setTimeout(() => textareaRef.current?.focus(), 0);
      } else {
        const el = textareaRef.current;
        if (el) {
          const start = el.selectionStart ?? editedContent.length;
          const end = el.selectionEnd ?? editedContent.length;
          const next = editedContent.slice(0, start) + text + editedContent.slice(end);
          setEditedContent(next);
          setTimeout(() => {
            if (textareaRef.current) {
              const pos = start + text.length;
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(pos, pos);
            }
          }, 0);
        } else {
          setEditedContent(text);
        }
      }
      setEditError(null);
    } catch {
      setEditError('Paste failed. Your browser may block clipboard access.');
    }
  };

  const handleSave = () => {
    if (!onSave) {
      setEditError('Save is not available.');
      return;
    }
    const result = onSave(editedContent, sourceMode);
    if (result.ok) {
      setIsEditing(false);
      setEditError(null);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } else {
      setEditError(result.error || 'Failed to apply changes.');
    }
  };

  return (
    <div className="h-full flex flex-col min-w-0 overflow-hidden bg-[linear-gradient(180deg,_#fbfdff_0%,_#f7fbff_70%,_#f3faf7_100%)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[#d7e5ff] flex items-center justify-between gap-2 bg-[linear-gradient(180deg,_#ffffff_0%,_#f5fbff_100%)]">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-[#64748B]" />
          <span className="text-xs font-semibold text-[#111827]">Source</span>
          {isEditing && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-[#0F6CBD] text-[#0F6CBD]">
              Editing
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tabs
            value={sourceMode}
            onValueChange={(value) => onSourceModeChange(value as 'xml' | 'json')}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-2 bg-[#e9f0fb] h-7 border border-[#d7e5ff]">
              <TabsTrigger value="xml" className="text-xs" disabled={isEditing}>XML</TabsTrigger>
              <TabsTrigger value="json" className="text-xs" disabled={isEditing}>JSON</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-xs h-7 px-2"
            title="Copy to clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            className="text-xs h-7 px-2"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </Button>
          {!isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="text-xs h-7 px-2"
              title="Edit source"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                className="text-xs h-7 px-2 bg-[#2457b8] hover:bg-[#1f4aa0] text-white gap-1"
                title="Render pasted source (Ctrl+Enter)"
              >
                <Play className="w-3.5 h-3.5" />
                Render
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="text-xs h-7 px-2 text-[#DC2626] hover:text-[#991B1B]"
                title="Cancel edit (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
          spellCheck={false}
          className="flex-1 overflow-auto p-4 font-mono text-xs text-[#111827] bg-white resize-none outline-none border-0 focus:ring-2 focus:ring-[#2457b8] focus:ring-inset"
          placeholder={sourceMode === 'xml' ? 'Paste or edit QTI XML…' : 'Paste or edit question JSON…'}
        />
      ) : (
        <pre className="flex-1 overflow-auto p-4 font-mono text-xs text-[#111827] bg-white whitespace-pre-wrap break-words">
          {sourceContent}
        </pre>
      )}

      {editError && (
        <div className="flex-shrink-0 px-4 py-2 bg-[#FEE2E2] text-[#991B1B] text-xs border-t border-[#FCA5A5]">
          {editError}
        </div>
      )}
      {copiedToClipboard && (
        <div className="flex-shrink-0 px-4 py-2 bg-[#22C55E] text-white text-xs text-center">
          Copied to clipboard!
        </div>
      )}
      {savedNotice && (
        <div className="flex-shrink-0 px-4 py-2 bg-[linear-gradient(120deg,_#2457b8_0%,_#1f9d86_100%)] text-white text-xs text-center">
          Changes applied
        </div>
      )}
    </div>
  );
}

// ── Warning Panel Component ────────────────────────────────────────────────────

interface WarningPanelProps {
  warnings: { questionIndex: number; message: string }[];
  parseError: string | null;
}

function WarningPanel({ warnings, parseError }: WarningPanelProps) {
  if (!warnings.length && !parseError) return null;

  return (
    <div className="flex-shrink-0 px-4 py-3 border-t border-[#E2E8F0] space-y-2 bg-[#FEF3C7]">
      {parseError && (
        <Alert className="border-[#F59E0B] bg-[#FFFBEB]">
          <AlertCircle className="h-4 w-4 text-[#D97706]" />
          <AlertTitle className="text-[#92400E]">Parse Error</AlertTitle>
          <AlertDescription className="text-[#92400E] text-xs">{parseError}</AlertDescription>
        </Alert>
      )}
      {warnings.length > 0 && (
        <div className="text-xs text-[#92400E]">
          <p className="font-semibold mb-1">{warnings.length} Warning(s)</p>
          <ul className="space-y-0.5">
            {warnings.slice(0, 5).map((w, idx) => (
              <li key={idx} className="text-[#92400E]">
                Q{w.questionIndex + 1}: {w.message}
              </li>
            ))}
            {warnings.length > 5 && <li className="text-[#92400E]">... and {warnings.length - 5} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Controls Bar Component ─────────────────────────────────────────────────────

interface ControlsBarProps {
  currentIndex: number;
  totalQuestions: number;
  onPrevious: () => void;
  onNext: () => void;
  showCorrectAnswer: boolean;
  onToggleCorrectAnswer: () => void;
  showSourcePanel: boolean;
  onToggleSourcePanel: () => void;
}

function ControlsBar({
  currentIndex,
  totalQuestions,
  onPrevious,
  onNext,
  showCorrectAnswer,
  onToggleCorrectAnswer,
  showSourcePanel,
  onToggleSourcePanel,
}: ControlsBarProps) {
  return (
    <div className="bg-[linear-gradient(180deg,_#ffffff_0%,_#f5fbff_100%)] border-t border-[#d7e5ff] px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[#475569] font-medium">
          {totalQuestions > 0 ? `Question ${currentIndex + 1}` : 'No'} / {totalQuestions}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={currentIndex <= 0}
          className="h-8 px-3 text-xs border-[#E2E8F0]"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentIndex >= totalQuestions - 1}
          className="h-8 px-3 text-xs border-[#E2E8F0]"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        <div className="h-6 w-px bg-[#E2E8F0]" />

        <Button
          variant={showCorrectAnswer ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleCorrectAnswer}
          className={cn(
            "h-8 px-3 text-xs",
            showCorrectAnswer && "bg-[#2457b8] hover:bg-[#1f4aa0] text-white border-transparent"
          )}
          title="Show/Hide correct answers"
        >
          {showCorrectAnswer ? (
            <>
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Answers Visible
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5 mr-1.5" />
              Hide Answers
            </>
          )}
        </Button>

        <Button
          variant={showSourcePanel ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleSourcePanel}
          className={cn(
            "h-8 px-3 text-xs",
            showSourcePanel && "bg-[#2457b8] hover:bg-[#1f4aa0] text-white border-transparent"
          )}
          title="Toggle source panel"
        >
          {showSourcePanel ? (
            <>
              <Code className="w-3.5 h-3.5 mr-1.5" />
              Source On
            </>
          ) : (
            <>
              <Code className="w-3.5 h-3.5 mr-1.5" />
              Source Off
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── MCQ Renderer Component ─────────────────────────────────────────────────────

function MCQRenderer({ question }: { question: ParsedQuestion }) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleCheck = () => {
    if (selectedAnswer) setShowResult(true);
  };

  const handleReset = () => {
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block px-2.5 py-0.5 bg-[#E0F2FE] text-[#0F6CBD] rounded-full text-xs font-semibold">
          MCQ
        </span>
        <span className="text-xs text-[#94A3B8] font-mono">{question.identifier}</span>
      </div>

      <MathMLRenderer content={question.stem} className="text-base font-normal text-[#111827] mb-4 leading-relaxed" />

      <div className="space-y-2.5">
        {question.choices?.map((choice, index) => {
          const isSelected = selectedAnswer === choice.identifier;
          const isCorrectChoice = choice.identifier === question.correctAnswer;
          const choiceLabel = index < 26 ? String.fromCharCode(65 + index) : `${index + 1}`;

          return (
            <button
              key={choice.identifier}
              type="button"
              onClick={() => {
                if (!showResult) setSelectedAnswer(choice.identifier);
              }}
              disabled={showResult}
              className={cn(
                "w-full flex items-center gap-3 p-4 border rounded-xl text-left transition-all duration-200",
                showResult && isCorrectChoice && "border-[#16A34A] bg-[#F0FDF4]",
                showResult && isSelected && !isCorrectChoice && "border-[#DC2626] bg-[#FEF2F2]",
                showResult && !isCorrectChoice && !isSelected && "border-[#E2E8F0] opacity-60",
                !showResult && isSelected && "border-[#0F6CBD] bg-[#EFF6FF] shadow-sm",
                !showResult && !isSelected && "border-[#E2E8F0] hover:border-[#94A3B8] hover:bg-[#F8FAFC]",
              )}
            >
              {/* Custom radio circle */}
              <div
                className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200",
                  showResult && isCorrectChoice && "border-[#16A34A] bg-[#16A34A]",
                  showResult && isSelected && !isCorrectChoice && "border-[#DC2626] bg-[#DC2626]",
                  showResult && !isCorrectChoice && !isSelected && "border-[#D1D5DB]",
                  !showResult && isSelected && "border-[#0F6CBD] bg-[#0F6CBD]",
                  !showResult && !isSelected && "border-[#CBD5E1]",
                )}
              >
                {showResult && isCorrectChoice && (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                )}
                {showResult && isSelected && !isCorrectChoice && (
                  <XCircle className="w-3 h-3 text-white" />
                )}
                {!showResult && isSelected && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              <span className="font-medium text-[#64748B] min-w-[20px] text-sm">{choiceLabel}.</span>
              <MathMLRenderer content={choice.content} className="text-[#111827] flex-1 text-sm" inline />
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          onClick={handleCheck}
          disabled={!selectedAnswer || showResult}
          className="bg-[#2457b8] hover:bg-[#1f4aa0] text-white rounded-lg px-5"
        >
          Check Answer
        </Button>
        {showResult && (
          <Button variant="outline" onClick={handleReset} className="rounded-lg border-[#E2E8F0]">
            Try Again
          </Button>
        )}
      </div>

      {showResult && <FeedbackBlock isCorrect={isCorrect} question={question} />}
    </div>
  );
}

// ── Text Entry Renderer Component ──────────────────────────────────────────────

function TextEntryRenderer({ question }: { question: ParsedQuestion }) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);

  const expectedLength = question.textEntryExpectedLength;
  // Keep width responsive while honoring XML-provided expected length.
  const dynamicWidth = expectedLength
    ? `min(100%, ${Math.max(12, Math.min(expectedLength + 2, 80))}ch)`
    : undefined;

  const handleCheck = () => {
    if (userAnswer.trim()) setShowResult(true);
  };

  const handleReset = () => {
    setUserAnswer('');
    setShowResult(false);
  };

  const isCorrect = question.correctAnswers?.some(
    ans => ans.toLowerCase().trim() === userAnswer.toLowerCase().trim()
  ) || false;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block px-2.5 py-0.5 bg-[#FEF3C7] text-[#92400E] rounded-full text-xs font-semibold">
          Text Entry
        </span>
        <span className="text-xs text-[#94A3B8] font-mono">{question.identifier}</span>
      </div>

      <MathMLRenderer content={question.stem} className="text-base font-normal text-[#111827] mb-4 leading-relaxed" />

      <input
        type="text"
        value={userAnswer}
        size={expectedLength}
        onChange={(e) => { if (!showResult) setUserAnswer(e.target.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter' && userAnswer.trim() && !showResult) handleCheck(); }}
        placeholder="Type your answer here..."
        disabled={showResult}
        style={dynamicWidth ? { width: dynamicWidth } : undefined}
        className="max-w-full px-4 py-3 border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0F6CBD] focus:border-transparent text-[#111827] text-sm transition-all duration-200 placeholder:text-[#94A3B8]"
      />

      <div className="mt-5 flex gap-2">
        <Button
          onClick={handleCheck}
          disabled={!userAnswer.trim() || showResult}
          className="bg-[#2457b8] hover:bg-[#1f4aa0] text-white rounded-lg px-5"
        >
          Check Answer
        </Button>
        {showResult && (
          <Button variant="outline" onClick={handleReset} className="rounded-lg border-[#E2E8F0]">
            Try Again
          </Button>
        )}
      </div>

      {showResult && <FeedbackBlock isCorrect={isCorrect} question={question} />}
    </div>
  );
}

// ── Sample XML ─────────────────────────────────────────────────────────────────

const SAMPLE_MCQ_XML = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem
  xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="q_geography_01"
  title="Capital of France"
  adaptive="false"
  timeDependent="false">

  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="identifier">
    <correctResponse>
      <value>B</value>
    </correctResponse>
  </responseDeclaration>

  <itemBody>
    <choiceInteraction responseIdentifier="RESPONSE" shuffle="false" maxChoices="1">
      <prompt>What is the capital of France?</prompt>
      <simpleChoice identifier="A">London</simpleChoice>
      <simpleChoice identifier="B">Paris</simpleChoice>
      <simpleChoice identifier="C">Berlin</simpleChoice>
      <simpleChoice identifier="D">Madrid</simpleChoice>
    </choiceInteraction>
  </itemBody>
</assessmentItem>`;

const SAMPLE_TEXTENTRY_XML = `<?xml version="1.0" encoding="UTF-8"?>
<assessmentItem
  xmlns="http://www.imsglobal.org/xsd/imsqti_v2p1"
  identifier="q_math_01"
  title="Basic Addition"
  adaptive="false"
  timeDependent="false">

  <responseDeclaration identifier="RESPONSE" cardinality="single" baseType="string">
    <correctResponse>
      <value>4</value>
    </correctResponse>
  </responseDeclaration>

  <itemBody>
    <div>
      <p>What is 2 + 2?</p>
      <textEntryInteraction responseIdentifier="RESPONSE" expectedLength="10" />
    </div>
  </itemBody>
</assessmentItem>`;

// ── Main QTI Renderer Page ─────────────────────────────────────────────────────

export function QTIRenderer() {
  // ── File Input & Parsing ─────────────────────────────────────────────────────
  const [qtiInput, setQtiInput] = useState("");
  const [inputMode, setInputMode] = useState<'xml' | 'zip' | 'folder' | 'json'>('xml');
  
  // ── Parsed Questions ─────────────────────────────────────────────────────────
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [hasRendered, setHasRendered] = useState(false);
  
  // ── Navigation & Navigation Panel ────────────────────────────────────────────
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  
  // ── UI Toggles ───────────────────────────────────────────────────────────────
  const [showSourcePanel, setShowSourcePanel] = useState(true);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [sourceMode, setSourceMode] = useState<'xml' | 'json'>('xml');
  
  // ── File Refs ────────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // ── Computed Values ─────────────────────────────────────────────────────────
  const fileMetadata = useMemo<FileMetadata | null>(() => {
    if (!hasRendered || !qtiInput.trim()) return null;
    
    const fileName = inputMode === 'xml' || inputMode === 'json'
      ? `input.${inputMode}`
      : 'uploaded-file';
    
    return {
      fileName,
      format: (inputMode === 'json' ? 'json' : 'xml') as 'xml' | 'json',
      qtiVersion: 'QTI 2.1',
      totalItems: parsedQuestions.length,
    };
  }, [inputMode, qtiInput, hasRendered, parsedQuestions]);

  const questionNavigatorItems = useMemo<QuestionNavigatorItem[]>(() => {
    return parsedQuestions.map((q, index) => {
      // Extract plain text preview from stem, removing HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = q.stem;
      const preview = tempDiv.textContent || q.stem;
      
      return {
        index,
        identifier: q.identifier,
        title: q.title,
        type: q.type,
        preview: preview.substring(0, 100),
      };
    });
  }, [parsedQuestions]);

  const warnings = useMemo<{ questionIndex: number; message: string }[]>(() => {
    const warningsList: { questionIndex: number; message: string }[] = [];
    
    parsedQuestions.forEach((q, index) => {
      if (q.type === 'mcq' && !q.correctAnswer) {
        warningsList.push({ questionIndex: index, message: 'Missing correct answer' });
      }
      if (q.type === 'textentry' && (!q.correctAnswers || q.correctAnswers.length === 0)) {
        warningsList.push({ questionIndex: index, message: 'Missing correct answer(s)' });
      }
      if (!q.stem || q.stem.trim().length === 0) {
        warningsList.push({ questionIndex: index, message: 'Empty question stem' });
      }
      if (q.type === 'mcq' && (!q.choices || q.choices.length < 2)) {
        warningsList.push({ questionIndex: index, message: 'MCQ must have at least 2 options' });
      }
    });
    
    return warningsList;
  }, [parsedQuestions]);

  // ── Parsing Functions ───────────────────────────────────────────────────────

  const parseAndRenderXml = (xml: string, noQuestionError: string) => {
    setParseError(null);
    setParsedQuestions([]);
    setHasRendered(true);
    setActiveQuestionIndex(0);
    setSearchText("");
    setTypeFilters(new Set());

    const input = xml.trim();
    if (!input) {
      setParseError('Please enter some QTI XML content.');
      return;
    }

    try {
      const questions = parseQTIXml(input);
      if (questions.length === 0) {
        setParseError(noQuestionError);
        return;
      }
      setParsedQuestions(questions);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse QTI XML');
    }
  };

  const handleRender = () => {
    if (inputMode === 'json') {
      const raw = qtiInput.trim();
      if (!raw) {
        setParseError('Please enter JSON content.');
        setHasRendered(true);
        setParsedQuestions([]);
        return;
      }

      try {
        const parsedJson = JSON.parse(raw);
        const xml = typeof parsedJson === 'string'
          ? parsedJson
          : parsedJson.xml || parsedJson.qtiXml || parsedJson.qti || parsedJson.content;

        if (typeof xml !== 'string') {
          setParseError('JSON must contain XML string in one of: xml, qtiXml, qti, or content.');
          setHasRendered(true);
          setParsedQuestions([]);
          return;
        }

        parseAndRenderXml(xml, 'No supported question types found in the JSON payload.');
      } catch {
        setParseError('Invalid JSON input.');
        setHasRendered(true);
        setParsedQuestions([]);
      }
      return;
    }

    parseAndRenderXml(
      qtiInput,
      'No supported question types found. Make sure your XML contains <choiceInteraction> or <textEntryInteraction>.'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setQtiInput(content);
      setInputMode('xml');
      parseAndRenderXml(content, 'No supported question types found in the uploaded file.');
    };
    reader.readAsText(file);
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const zip = await JSZip.loadAsync(file);
      const xmlFiles = Object.values(zip.files).filter(
        (zipFile) => !zipFile.dir && zipFile.name.toLowerCase().endsWith('.xml')
      );

      if (xmlFiles.length === 0) {
        setHasRendered(true);
        setParsedQuestions([]);
        setParseError('No .xml files found inside the ZIP archive.');
        return;
      }

      const firstXml = await xmlFiles[0].async('string');
      setQtiInput(firstXml);
      setInputMode('xml');
      parseAndRenderXml(firstXml, 'No supported question types found in the ZIP XML file.');
    } catch {
      setHasRendered(true);
      setParsedQuestions([]);
      setParseError('Failed to read ZIP archive.');
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((file) =>
      file.name.toLowerCase().endsWith('.xml')
    );

    if (files.length === 0) {
      setHasRendered(true);
      setParsedQuestions([]);
      setParseError('No .xml files found in the selected folder.');
      return;
    }

    try {
      const firstXml = await files[0].text();
      setQtiInput(firstXml);
      setInputMode('xml');
      parseAndRenderXml(firstXml, 'No supported question types found in the folder XML file.');
    } catch {
      setHasRendered(true);
      setParsedQuestions([]);
      setParseError('Failed to read folder contents.');
    }
  };

  const handleDownloadXml = () => {
    if (!qtiInput.trim()) return;
    const blob = new Blob([qtiInput], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qti-export-${Date.now()}.xml`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = (type: 'mcq' | 'textentry') => {
    const xml = type === 'mcq' ? SAMPLE_MCQ_XML : SAMPLE_TEXTENTRY_XML;
    setQtiInput(xml);
    setInputMode('xml');
    parseAndRenderXml(xml, 'Failed to parse sample XML.');
  };

  const handleClear = () => {
    setQtiInput("");
    setParsedQuestions([]);
    setParseError(null);
    setHasRendered(false);
    setActiveQuestionIndex(0);
    setSearchText("");
    setTypeFilters(new Set());
  };

  // ── Handlers for Navigation & Toggles ─────────────────────────────────────

  const handlePrevious = () => {
    setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1));
  };

  const handleNext = () => {
    setActiveQuestionIndex(Math.min(parsedQuestions.length - 1, activeQuestionIndex + 1));
  };

  const handleSelectQuestion = (index: number) => {
    setActiveQuestionIndex(index);
  };

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    setActiveQuestionIndex(0);
  };

  const handleFilterToggle = (type: string) => {
    const newFilters = new Set(typeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setTypeFilters(newFilters);
    setActiveQuestionIndex(0);
  };

  const questionsToRender = parsedQuestions.length > 0
    ? [parsedQuestions[activeQuestionIndex]]
    : [];

  // Apply edits made in the Source panel back to the current question.
  const handleSourceSave = (
    editedContent: string,
    mode: 'xml' | 'json'
  ): { ok: boolean; error?: string } => {
    if (parsedQuestions.length === 0) {
      return { ok: false, error: 'No question selected to update.' };
    }
    const trimmed = editedContent.trim();
    if (!trimmed) {
      return { ok: false, error: 'Source content is empty.' };
    }

    try {
      let xmlToParse: string;
      if (mode === 'json') {
        const parsed = JSON.parse(trimmed);
        // Support either a raw QTI question JSON (rebuild XML) or a wrapper
        // carrying an xml string (same shape handleRender accepts for top-level JSON input).
        if (typeof parsed === 'string') {
          xmlToParse = parsed;
        } else if (parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).xml === 'string') {
          xmlToParse = (parsed as { xml: string }).xml;
        } else {
          xmlToParse = jsonQuestionToXml(parsed);
        }
      } else {
        xmlToParse = trimmed;
      }

      const questions = parseQTIXml(xmlToParse);
      if (questions.length === 0) {
        return { ok: false, error: 'No supported question found in the edited source.' };
      }

      const updated = [...parsedQuestions];
      updated[activeQuestionIndex] = questions[0];
      setParsedQuestions(updated);
      setParseError(null);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to parse edited source.',
      };
    }
  };

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top_left,_rgba(36,87,184,0.13),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#f3faf7_100%)] flex flex-col">
      {/* ── File Header ───────────────────────────────────────────────────────── */}
      <FileHeader metadata={fileMetadata} parsedQuestions={parsedQuestions} />

      {/* ── Main Layout with 3 Panels ────────────────────────────────────────── */}
      {!hasRendered ? (
        // Empty State
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 rounded-2xl bg-[#E0F2FE] flex items-center justify-center mx-auto mb-6">
              <FileJson className="w-12 h-12 text-[#0F6CBD]" />
            </div>
            <h2 className="text-lg font-semibold text-[#111827] mb-2">QTI Preview & Debugging</h2>
            <p className="text-sm text-[#475569] mb-6">
              Load QTI XML or JSON to browse questions with instant navigation, source viewing, and validation.
            </p>
            <div className="flex gap-3 justify-center mb-6">
              <Button
                onClick={() => handleLoadSample('mcq')}
                className="bg-[#2457b8] hover:bg-[#1f4aa0] text-white rounded-lg"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                MCQ Example
              </Button>
              <Button
                onClick={() => handleLoadSample('textentry')}
                variant="outline"
                className="rounded-lg border-[#E2E8F0]"
              >
                Text Entry Example
              </Button>
            </div>
            <div className="border-t border-[#E2E8F0] pt-6">
              <p className="text-xs text-[#94A3B8] mb-4">Or paste your QTI content:</p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs rounded-lg border-[#E2E8F0]"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Upload XML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => zipInputRef.current?.click()}
                  className="text-xs rounded-lg border-[#E2E8F0]"
                >
                  <Archive className="w-3.5 h-3.5 mr-1.5" />
                  Upload ZIP
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : parseError ? (
        // Error State
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <Alert variant="destructive" className="max-w-md border-[#FCA5A5] bg-[#FEF2F2]">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle>Parse Error</AlertTitle>
            <AlertDescription className="text-sm mt-2">{parseError}</AlertDescription>
          </Alert>
        </div>
      ) : (
        // Main Content with 3 panels
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <PanelGroup direction="horizontal" className="h-full">
              {/* Panel 1: Input/Setup (hidden when rendering) */}
              <Panel defaultSize={0} minSize={0} maxSize={0} className="hidden">
                <Card className="hidden" />
              </Panel>

              {/* Panel 2: Question Navigator */}
              <Panel defaultSize={22} minSize={18} maxSize={35} className="flex flex-col min-w-0">
                <Card className="flex-1 flex flex-col min-h-0 shadow-sm border-[#d7e5ff] bg-white/95 overflow-hidden rounded-lg m-4 mt-0 mb-0 mr-0">
                  <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                    <QuestionNavigator
                      questions={questionNavigatorItems}
                      activeIndex={activeQuestionIndex}
                      onSelectQuestion={handleSelectQuestion}
                      searchText={searchText}
                      onSearchChange={handleSearchChange}
                      filters={typeFilters}
                      onFilterToggle={handleFilterToggle}
                    />
                  </CardContent>
                </Card>
              </Panel>

              {/* Resize Handle */}
              <PanelResizeHandle className="w-2 rounded-full bg-[#d7e5ff] hover:bg-[#2457b8] transition-colors cursor-col-resize" />

              {/* Panel 3: Preview */}
              <Panel defaultSize={showSourcePanel ? 40 : 78} minSize={35} className="flex flex-col min-w-0">
                <Card className="flex-1 flex flex-col min-h-0 shadow-sm border-[#d7e5ff] bg-white/95 overflow-hidden rounded-lg m-4 mt-0 mb-0 ml-0 mr-0">
                  <CardContent className="flex-1 flex flex-col overflow-y-auto overflow-x-visible p-6">
                    {questionsToRender.length > 0 && (
                      <div className="space-y-6">
                        {questionsToRender.map((question) => (
                          <div key={question.identifier}>
                            {question.type === 'mcq' && <MCQRenderer question={question} />}
                            {question.type === 'textentry' && <TextEntryRenderer question={question} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Panel>

              {/* Resize Handle */}
              {showSourcePanel && (
                <>
                  <PanelResizeHandle className="w-2 rounded-full bg-[#d7e5ff] hover:bg-[#2457b8] transition-colors cursor-col-resize" />

                  {/* Panel 4: Source Viewer */}
                  <Panel defaultSize={38} minSize={25} maxSize={50} className="flex flex-col min-w-0">
                    <Card className="flex-1 flex flex-col min-h-0 shadow-sm border-[#d7e5ff] bg-white/95 overflow-hidden rounded-lg m-4 mt-0 mb-0 ml-0">
                      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                        <SourceViewer
                          question={questionsToRender.length > 0 ? questionsToRender[0] : null}
                          sourceMode={sourceMode}
                          onSourceModeChange={setSourceMode}
                          onSave={handleSourceSave}
                        />
                      </CardContent>
                    </Card>
                  </Panel>
                </>
              )}
            </PanelGroup>
          </div>

          {/* ── Warning Panel ─────────────────────────────────────────────────── */}
          {warnings.length > 0 && <WarningPanel warnings={warnings} parseError={null} />}

          {/* ── Controls Bar ──────────────────────────────────────────────────── */}
          <ControlsBar
            currentIndex={activeQuestionIndex}
            totalQuestions={parsedQuestions.length}
            onPrevious={handlePrevious}
            onNext={handleNext}
            showCorrectAnswer={showCorrectAnswer}
            onToggleCorrectAnswer={() => setShowCorrectAnswer(!showCorrectAnswer)}
            showSourcePanel={showSourcePanel}
            onToggleSourcePanel={() => setShowSourcePanel(!showSourcePanel)}
          />
        </div>
      )}

      {/* ── Input Editor Panel (collapsible overlay/modal approach) ───────────── */}
      {(!hasRendered || parseError) && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" style={{ display: 'none' }}>
          {/* This could be a modal for editing - kept for reference */}
        </div>
      )}

      {/* ── Hidden File Inputs ────────────────────────────────────────────────── */}
      <input ref={fileInputRef} type="file" accept=".xml" onChange={handleFileUpload} className="hidden" />
      <input ref={zipInputRef} type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        onChange={handleFolderUpload}
        className="hidden"
      />

      {/* ── Input Editor Sidebar or Modal ─────────────────────────────────────– */}
      {/* For adding/editing QTI input, consider using a keyboard shortcut or menu option */}
    </div>
  );
}

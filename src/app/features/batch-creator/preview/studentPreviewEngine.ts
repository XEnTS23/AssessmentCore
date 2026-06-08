/**
 * Student Preview Engine
 *
 * Converts a QuestionRow into a self-contained HTML string that simulates
 * how a student would see the question in a browser-based LMS.
 *
 * Kept pure (no React) so it can be assigned to an <iframe srcdoc> or a
 * sandboxed <div dangerouslySetInnerHTML>.
 */

import { QuestionRow } from '../core/rowTypes';
import { McqQuestion, MsqQuestion, TextEntryQuestion, OrderQuestion } from '../core/questionTypes';
import { ExportConfig } from '../core/exportTypes';
import { renderRichContent } from '../builders/shared/richContentRenderer';

const BASE_STYLES = `
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.6;
           color: #1a1a2e; background: #f8f8fc; margin: 0; padding: 20px; }
    .question-card { background: #fff; border: 1px solid #e0e0f0; border-radius: 10px;
                     padding: 20px 24px; max-width: 720px; margin: 0 auto; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .question-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .badge { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
             padding: 2px 8px; border-radius: 99px; }
    .badge-type   { background: #ede9fe; color: #6d28d9; }
    .badge-marks  { background: #dcfce7; color: #166534; }
    .badge-id     { background: #f1f5f9; color: #64748b; }
    .stem { font-size: 15px; font-weight: 500; margin-bottom: 16px; }
    .options { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .option { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px;
              border: 1.5px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: border-color .15s; }
    .option:hover { border-color: #818cf8; }
    .option-label { font-weight: 600; min-width: 20px; color: #6d28d9; }
    .text-input { width: 100%; padding: 10px 14px; border: 1.5px solid #e5e7eb; border-radius: 8px;
                  font-size: 14px; outline: none; margin-top: 4px; }
    .text-input:focus { border-color: #818cf8; }
    .hint { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .option.selected { border-color: #6d28d9; background: #f5f3ff; }
    .submit-btn { display: block; width: 100%; padding: 12px; margin-top: 20px; background: #6d28d9; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .submit-btn:hover { background: #5b21b6; }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .feedback { margin-top: 16px; padding: 12px; border-radius: 8px; font-weight: 500; display: none; }
    .feedback.correct { display: block; background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .feedback.incorrect { display: block; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
  </style>
`;

function escHtml(s: string | undefined | null): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function typeLabel(t: string): string {
  const map: Record<string, string> = { MCQ: 'Single Choice', MSQ: 'Multiple Select', TEXT_ENTRY: 'Text Entry', ORDER: 'Ordering' };
  return map[t] ?? t;
}

export function renderStudentPreviewHtml(row: QuestionRow, config: ExportConfig): string {
  const q = row.normalizedQuestion;
  const qid = row.metadata?.questionId || `row-${row.sourceRowNumber}`;
  const marks = row.scoringConfig?.marks ?? 1;

  let bodyHtml = '';
  let correctPayload: any = null;

  if (!q || q.type === 'UNKNOWN') {
    bodyHtml = `<p class="stem" style="color:#ef4444">⚠ This question could not be rendered (UNKNOWN type).</p>`;
  } else if (q.type === 'MCQ') {
    const mcq = q as McqQuestion;
    correctPayload = mcq.correctAnswerId;
    const optionsHtml = mcq.options.map(o =>
      `<li class="option" data-id="${escHtml(o.id)}" onclick="selectOption('${escHtml(o.id)}', 'MCQ')">
         <input type="radio" name="mcq" value="${escHtml(o.id)}" style="pointer-events: none; margin-top: 4px;" />
         <span class="option-label">${escHtml(o.label)}.</span><span>${renderRichContent(o.text, config.mathMode, true)}</span>
       </li>`
    ).join('');
    bodyHtml = `
      <p class="stem">${renderRichContent(mcq.stem, config.mathMode, true)}</p>
      <ul class="options">${optionsHtml}</ul>`;
  } else if (q.type === 'MSQ') {
    const msq = q as MsqQuestion;
    correctPayload = msq.correctAnswerIds;
    const optionsHtml = msq.options.map(o =>
      `<li class="option" data-id="${escHtml(o.id)}" onclick="selectOption('${escHtml(o.id)}', 'MSQ')">
         <input type="checkbox" name="msq" value="${escHtml(o.id)}" style="pointer-events: none; margin-top: 4px;" />
         <span class="option-label">${escHtml(o.label)}.</span><span>${renderRichContent(o.text, config.mathMode, true)}</span>
       </li>`
    ).join('');
    bodyHtml = `
      <p class="stem">${renderRichContent(msq.stem, config.mathMode, true)}</p>
      <ul class="options">${optionsHtml}</ul>`;
  } else if (q.type === 'TEXT_ENTRY') {
    const te = q as TextEntryQuestion;
    correctPayload = (te.acceptedAnswers || []).map(a => String(a).toLowerCase());
    const hint = te.mode === 'numeric' ? `Numeric answer${te.units ? ' (' + escHtml(te.units) + ')' : ''}` : 'Type your answer';
    bodyHtml = `
      <p class="stem">${renderRichContent(te.stem, config.mathMode, true)}</p>
      <input class="text-input" type="${te.mode === 'numeric' ? 'number' : 'text'}" placeholder="${escHtml(hint)}" onkeypress="handleEnter(event)" />
      <p class="hint">${escHtml(hint)}</p>`;
  } else if (q.type === 'ORDER') {
    const order = q as OrderQuestion;
    // Visually simulate an ordered list with draggable-looking handles
    const optionsHtml = order.options.map((o, idx) =>
      `<li class="option" style="cursor: grab;">
         <span style="color: #94a3b8; margin-right: 8px;">≡</span>
         <span class="option-label">${idx + 1}.</span>
         <span>${renderRichContent(o.text, config.mathMode, true)}</span>
       </li>`
    ).join('');
    bodyHtml = `
      <p class="stem">${renderRichContent(order.stem, config.mathMode, true)}</p>
      <p class="hint" style="margin-bottom: 8px;">Drag items to reorder them:</p>
      <ul class="options">${optionsHtml}</ul>`;
  }
  
  const cacheBustedUrl = row.metadata?.mediaUrl ? `${row.metadata.mediaUrl}${row.metadata.mediaUrl.includes('?') ? '&' : '?'}t=${Date.now()}` : '';
  const mediaHtml = cacheBustedUrl ? `<div style="margin-bottom: 16px;"><img src="${escHtml(cacheBustedUrl)}" style="max-width: 100%; height: auto; border-radius: 8px;" alt="Question Media" /></div>` : '';
  bodyHtml = mediaHtml + bodyHtml;

  if (q && q.type !== 'UNKNOWN') {
    bodyHtml += `
      <button class="submit-btn" onclick="submitAnswer()">Submit Answer</button>
      <div id="feedback-banner" class="feedback"></div>
    `;
  }

  const mathScript = config.mathMode === 'mathjax' || config.mathMode === 'latex' ? `
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
      },
      svg: {
        fontCache: 'global'
      }
    };
  </script>
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Preview</title>${BASE_STYLES}
  ${mathScript}
</head>
<body>
  <div class="question-card">
    <div class="question-meta">
      <span class="badge badge-type">${escHtml(typeLabel(q?.type ?? 'UNKNOWN'))}</span>
      <span class="badge badge-marks">${marks} mark${marks !== 1 ? 's' : ''}</span>
      <span class="badge badge-id">${escHtml(qid)}</span>
    </div>
    ${bodyHtml}
  </div>
  <script>
    const correctPayload = ${JSON.stringify(correctPayload)};
    const qType = "${q?.type ?? 'UNKNOWN'}";
    let selected = new Set();

    function selectOption(id, type) {
      if (type === 'MCQ') {
        selected.clear();
        document.querySelectorAll('.option').forEach(el => {
          el.classList.remove('selected');
          el.querySelector('input').checked = false;
        });
        selected.add(id);
        const el = document.querySelector('.option[data-id="'+id+'"]');
        if(el) {
          el.classList.add('selected');
          el.querySelector('input').checked = true;
        }
      } else if (type === 'MSQ') {
        const el = document.querySelector('.option[data-id="'+id+'"]');
        if (selected.has(id)) {
          selected.delete(id);
          el.classList.remove('selected');
          el.querySelector('input').checked = false;
        } else {
          selected.add(id);
          el.classList.add('selected');
          el.querySelector('input').checked = true;
        }
      }
    }

    function handleEnter(e) {
      if (e.key === 'Enter') submitAnswer();
    }

    function submitAnswer() {
      let isCorrect = false;
      if (qType === 'MCQ') {
        isCorrect = selected.has(correctPayload);
      } else if (qType === 'MSQ') {
        if (!correctPayload || selected.size !== correctPayload.length) {
          isCorrect = false;
        } else {
          isCorrect = correctPayload.every(id => selected.has(id));
        }
      } else if (qType === 'TEXT_ENTRY') {
        const val = document.querySelector('.text-input').value.trim().toLowerCase();
        isCorrect = correctPayload && correctPayload.includes(val);
      } else if (qType === 'ORDER') {
        alert("Ordering preview validation is not currently supported in the browser.");
        return;
      }

      const banner = document.getElementById('feedback-banner');
      if (banner) {
        banner.className = 'feedback ' + (isCorrect ? 'correct' : 'incorrect');
        banner.innerHTML = isCorrect ? '✅ Correct!' : '❌ Incorrect.';
      }
    }
  </script>
</body>
</html>`;
}

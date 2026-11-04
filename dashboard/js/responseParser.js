/**
 * dashboard/js/responseParser.js
 * Polaris Hermes AI Agent — Structured Response Engine & AST Renderer
 * 
 * Bertanggung jawab memproses seluruh output respons AI:
 * 1. Raw mode detection ("kasih raw", "markdown mentah", dll.)
 * 2. AST / Block Tokenizer (Math display, Code fence, Table, List, Checklist, Callout, Headings, Paragraphs)
 * 3. Specialized Component Renderers (KaTeX Math, Highlight.js Code, Semantic Table, JSON, Checklist, Callouts)
 * 4. Custom Copy Behaviors (Clean table TSV/Markdown, clean raw source code, clean LaTeX, valid JSON)
 * 5. XSS Sanitization via DOMPurify with KaTeX MathML whitelist
 * 6. Resilient Error Boundary Fallback (tidak pernah crash)
 */

(function (global) {
  'use strict';

  // Helper Escape HTML
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Memory cache untuk konten raw copy
  const copyStore = new Map();

  function storeCopyContent(type, content) {
    const id = 'hrc_' + Math.random().toString(36).substring(2, 9);
    copyStore.set(id, { type, content });
    return id;
  }

  function getCopyContent(id) {
    return copyStore.get(id);
  }

  // ==================== 1. RAW MODE DETECTOR ====================
  function isRawModeRequested(userPrompt, options = {}) {
    if (options.forceRaw) return true;
    if (!userPrompt || typeof userPrompt !== 'string') return false;
    const p = userPrompt.toLowerCase().trim();
    const rawPatterns = [
      /\b(kasih|minta|tampilkan|format)\s+(raw|mentah|markdown\s+mentah|kode\s+mentah)\b/i,
      /\b(jangan\s+render|format\s+mentah|raw\s+markdown|raw\s+text)\b/i,
      /\bkasih\s+raw\b/i,
      /\bmarkdown\s+mentah\b/i,
    ];
    return rawPatterns.some((rx) => rx.test(p));
  }

  // ==================== 2. INLINE MARKDOWN & MATH PARSER ====================
  function renderInlineMarkdown(text) {
    if (!text || typeof text !== 'string') return '';

    let s = text;

    // 1. Inline Math: \(...\) atau $...$
    // Hindari dollar currency seperti $100 atau \$
    s = s.replace(/\\\(([\s\S]*?)\\\)/g, (match, expr) => {
      return renderInlineMath(expr);
    });

    s = s.replace(/(?<![\$\\\w])\$([^\$\n]+?)\$(?![\$\w])/g, (match, expr) => {
      // Pastikan bukan angka harga seperti $25 atau $500
      if (/^\s*\d+([.,]\d+)?\s*$/.test(expr)) return match;
      return renderInlineMath(expr);
    });

    // 2. Inline Code: `code`
    s = s.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="hermes-inline-code">${escapeHtml(code)}</code>`;
    });

    // 3. Bold & Italic: ***text***
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');

    // 4. Bold: **text** atau __text__
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 5. Italic: *text* atau _text_
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<em>$1</em>');

    // 6. Strikethrough: ~~text~~
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 7. Links: [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, (match, label, url) => {
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="hermes-link">${escapeHtml(label)} ↗</a>`;
    });

    return s;
  }

  function renderInlineMath(expr) {
    const rawExpr = expr.trim();
    if (!rawExpr) return '';

    if (typeof global.katex !== 'undefined' && typeof global.katex.renderToString === 'function') {
      try {
        return global.katex.renderToString(rawExpr, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (_) {
        return `<span class="hermes-math-inline font-mono">\\(${escapeHtml(rawExpr)}\\)</span>`;
      }
    }
    return `<span class="hermes-math-inline font-mono">\\(${escapeHtml(rawExpr)}\\)</span>`;
  }

  // ==================== 3. SPECIALIZED COMPONENT RENDERERS ====================

  // --- 3A. MATH DISPLAY BLOCK COMPONENT ---
  function renderMathBlockComponent(latex) {
    const cleanLatex = latex.trim();
    const copyId = storeCopyContent('math', cleanLatex);

    let renderedMath = '';
    if (typeof global.katex !== 'undefined' && typeof global.katex.renderToString === 'function') {
      try {
        renderedMath = global.katex.renderToString(cleanLatex, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        renderedMath = `<div class="hermes-math-fallback font-mono text-center">$$ ${escapeHtml(cleanLatex)} $$</div>`;
      }
    } else {
      renderedMath = `<div class="hermes-math-fallback font-mono text-center">$$ ${escapeHtml(cleanLatex)} $$</div>`;
    }

    return `
      <div class="hermes-math-block-container" data-copy-id="${copyId}">
        <div class="hermes-math-toolbar">
          <span class="hermes-math-badge">∑ FORMULA / PERSAMAAN</span>
          <button type="button" class="btn-copy-math hermes-btn-copy" data-copy-id="${copyId}" title="Salin kode LaTeX">
            📋 Salin LaTeX
          </button>
        </div>
        <div class="hermes-math-display-wrapper">
          ${renderedMath}
        </div>
      </div>
    `;
  }

  // --- 3B. CODE & JSON BLOCK COMPONENT ---
  function renderCodeBlockComponent(code, rawLang) {
    let lang = (rawLang || '').trim().toLowerCase();
    const rawCode = code.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
    const lines = rawCode.split('\n');
    const lineCount = lines.length;

    // Cek jika konten adalah JSON
    let isJson = lang === 'json';
    let formattedJson = null;
    if (!isJson && (rawCode.startsWith('{') || rawCode.startsWith('['))) {
      try {
        const parsed = JSON.parse(rawCode);
        formattedJson = JSON.stringify(parsed, null, 2);
        isJson = true;
        lang = 'json';
      } catch (_) {}
    } else if (isJson) {
      try {
        const parsed = JSON.parse(rawCode);
        formattedJson = JSON.stringify(parsed, null, 2);
      } catch (_) {
        formattedJson = rawCode;
      }
    }

    const codeToUse = formattedJson || rawCode;
    const copyType = isJson ? 'json' : 'code';
    const copyId = storeCopyContent(copyType, codeToUse);

    // Syntax Highlight via Highlight.js jika tersedia
    let highlightedHtml = '';
    if (typeof global.hljs !== 'undefined' && typeof global.hljs.highlight === 'function') {
      try {
        if (lang && global.hljs.getLanguage(lang)) {
          highlightedHtml = global.hljs.highlight(codeToUse, { language: lang, ignoreIllegals: true }).value;
        } else {
          highlightedHtml = global.hljs.highlightAuto(codeToUse).value;
        }
      } catch (_) {
        highlightedHtml = escapeHtml(codeToUse);
      }
    } else {
      highlightedHtml = escapeHtml(codeToUse);
    }

    const displayLang = (lang || (isJson ? 'json' : 'code')).toUpperCase();
    const icon = isJson ? '📦' : (lang === 'js' || lang === 'javascript' ? '📜' : (lang === 'python' || lang === 'py' ? '🐍' : (lang === 'html' ? '🌐' : (lang === 'css' ? '🎨' : '💻'))));

    return `
      <div class="hermes-code-block-container" data-copy-id="${copyId}">
        <div class="hermes-code-header">
          <div class="hermes-code-meta">
            <span class="hermes-code-icon">${icon}</span>
            <span class="hermes-code-lang">${escapeHtml(displayLang)}</span>
            <span class="hermes-code-lines">${lineCount} baris</span>
          </div>
          <button type="button" class="btn-copy-code hermes-btn-copy" data-copy-id="${copyId}" title="Salin kode sumber">
            📋 Salin ${isJson ? 'JSON' : 'Kode'}
          </button>
        </div>
        <pre class="hermes-code-pre"><code class="hljs language-${escapeHtml(lang)}">${highlightedHtml}</code></pre>
      </div>
    `;
  }

  // --- 3C. TABLE COMPONENT ---
  function renderTableComponent(tableLines) {
    if (!tableLines || tableLines.length < 2) return '';

    // Bersihkan garis pemisah
    const cleanLines = tableLines.map((l) => l.trim()).filter(Boolean);
    if (cleanLines.length < 2) return '';

    // Ambil Header
    const parseRow = (line) => {
      // Pisahkan kolom dengan pipa '|' namun abaikan pipa di dalam inline code atau escape \|
      const cells = [];
      let current = '';
      let inCode = false;
      let escaped = false;

      const trimmed = line.replace(/^\|/, '').replace(/\|$/, '');

      for (let i = 0; i < trimmed.length; i++) {
        const c = trimmed[i];
        if (escaped) {
          current += c;
          escaped = false;
        } else if (c === '\\') {
          escaped = true;
          current += c;
        } else if (c === '`') {
          inCode = !inCode;
          current += c;
        } else if (c === '|' && !inCode) {
          cells.push(current.trim());
          current = '';
        } else {
          current += c;
        }
      }
      cells.push(current.trim());
      return cells;
    };

    const headerCells = parseRow(cleanLines[0]);
    const alignLine = cleanLines[1];
    const rawAlignCells = parseRow(alignLine);

    // Deteksi alignment kolom
    const alignments = headerCells.map((_, i) => {
      const a = (rawAlignCells[i] || '').trim();
      const leftColon = a.startsWith(':');
      const rightColon = a.endsWith(':');
      if (leftColon && rightColon) return 'center';
      if (rightColon) return 'right';
      return 'left';
    });

    // Data rows
    const bodyRows = [];
    for (let r = 2; r < cleanLines.length; r++) {
      const rowCells = parseRow(cleanLines[r]);
      bodyRows.push(rowCells);
    }

    // Bangun representasi Markdown & TSV untuk tombol salin
    let markdownTableStr = '| ' + headerCells.join(' | ') + ' |\n';
    markdownTableStr += '| ' + alignments.map((al) => al === 'center' ? ':---:' : (al === 'right' ? '---:' : ':---')).join(' | ') + ' |\n';
    bodyRows.forEach((row) => {
      markdownTableStr += '| ' + headerCells.map((_, idx) => row[idx] || '').join(' | ') + ' |\n';
    });

    const copyId = storeCopyContent('table', markdownTableStr.trim());

    // Generate Semantic HTML Table
    const theadHtml = '<thead><tr>' +
      headerCells.map((h, i) => {
        const alignStyle = alignments[i] ? `text-align:${alignments[i]};` : '';
        return `<th style="${alignStyle}">${renderInlineMarkdown(h)}</th>`;
      }).join('') +
      '</tr></thead>';

    const tbodyHtml = '<tbody>' +
      bodyRows.map((row) => {
        const cellsHtml = headerCells.map((_, i) => {
          const val = row[i] || '';
          const alignStyle = alignments[i] ? `text-align:${alignments[i]};` : '';
          return `<td style="${alignStyle}">${renderInlineMarkdown(val)}</td>`;
        }).join('');
        return `<tr>${cellsHtml}</tr>`;
      }).join('') +
      '</tbody>';

    return `
      <div class="hermes-table-wrapper" data-copy-id="${copyId}">
        <div class="hermes-table-toolbar">
          <span class="hermes-table-badge">📊 TABEL DATA (${bodyRows.length} baris)</span>
          <button type="button" class="btn-copy-table hermes-btn-copy" data-copy-id="${copyId}" title="Salin tabel sebagai Markdown / TSV">
            📋 Salin Tabel
          </button>
        </div>
        <div class="hermes-table-scroll">
          <table class="hermes-table">
            ${theadHtml}
            ${tbodyHtml}
          </table>
        </div>
      </div>
    `;
  }

  // --- 3D. CHECKLIST COMPONENT ---
  function renderChecklistComponent(items) {
    if (!items || items.length === 0) return '';
    const html = items.map((it) => {
      const isChecked = it.checked;
      const content = renderInlineMarkdown(it.text);
      return `
        <li class="hermes-checklist-item ${isChecked ? 'is-checked' : 'is-unchecked'}">
          <span class="hermes-checkbox-box ${isChecked ? 'checked' : ''}" aria-hidden="true">
            ${isChecked ? '✓' : ''}
          </span>
          <span class="hermes-checkbox-label ${isChecked ? 'text-strikethrough' : ''}">
            ${content}
          </span>
        </li>
      `;
    }).join('');

    return `<ul class="hermes-checklist">${html}</ul>`;
  }

  // --- 3E. LIST COMPONENT ---
  function renderListComponent(items, isOrdered = false) {
    if (!items || items.length === 0) return '';
    const tag = isOrdered ? 'ol' : 'ul';
    const html = items.map((it) => `<li>${renderInlineMarkdown(it)}</li>`).join('');
    return `<${tag} class="hermes-list ${isOrdered ? 'hermes-list-ordered' : 'hermes-list-unordered'}">${html}</${tag}>`;
  }

  // --- 3F. CALLOUT / ALERT COMPONENT ---
  function renderCalloutComponent(type, title, content) {
    const lowerType = (type || 'note').toLowerCase();
    let icon = 'ℹ️';
    let displayTitle = title || 'Catatan';
    let themeClass = 'hermes-callout-note';

    if (lowerType.includes('warn') || lowerType.includes('caution')) {
      icon = '⚠️';
      displayTitle = title || 'Peringatan';
      themeClass = 'hermes-callout-warning';
    } else if (lowerType.includes('tip')) {
      icon = '💡';
      displayTitle = title || 'Tips Efisiensi';
      themeClass = 'hermes-callout-tip';
    } else if (lowerType.includes('important')) {
      icon = '❗';
      displayTitle = title || 'Penting';
      themeClass = 'hermes-callout-important';
    }

    return `
      <div class="hermes-callout ${themeClass}">
        <div class="hermes-callout-header">
          <span class="hermes-callout-icon">${icon}</span>
          <strong class="hermes-callout-title">${escapeHtml(displayTitle)}</strong>
        </div>
        <div class="hermes-callout-body">
          ${renderInlineMarkdown(content)}
        </div>
      </div>
    `;
  }

  // --- 3G. RAW MODE COMPONENT ---
  function renderRawModeComponent(rawText) {
    const copyId = storeCopyContent('raw', rawText);
    return `
      <div class="hermes-raw-box">
        <div class="hermes-raw-header">
          <span class="hermes-raw-badge">📄 FORMAT MENTAH (RAW MARKDOWN)</span>
          <button type="button" class="btn-copy-raw hermes-btn-copy" data-copy-id="${copyId}">
            📋 Salin Teks Mentah
          </button>
        </div>
        <pre class="hermes-raw-pre"><code>${escapeHtml(rawText)}</code></pre>
      </div>
    `;
  }

  // ==================== 4. MAIN AST / BLOCK PARSER ====================
  function parseAndRenderAST(text) {
    if (!text || typeof text !== 'string') return '';

    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const outputBlocks = [];
    let i = 0;
    const len = lines.length;

    while (i < len) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Math Display Block: $$ ... $$ atau \[ ... \]
      if (trimmed.startsWith('$$') || trimmed.startsWith('\\[')) {
        const isBracket = trimmed.startsWith('\\[');
        const closeToken = isBracket ? '\\]' : '$$';

        // Kasus satu baris: $$ E = mc^2 $$
        if (trimmed.length > 2 && trimmed.endsWith(closeToken) && trimmed !== closeToken) {
          const expr = trimmed.slice(2, -closeToken.length);
          outputBlocks.push(renderMathBlockComponent(expr));
          i++;
          continue;
        }

        // Kasus multi-baris
        let mathLines = [];
        if (trimmed !== '$$' && trimmed !== '\\[') {
          mathLines.push(trimmed.slice(2));
        }
        i++;
        while (i < len) {
          const nextL = lines[i];
          const nextTrimmed = nextL.trim();
          if (nextTrimmed.endsWith(closeToken) || nextTrimmed === closeToken) {
            if (nextTrimmed !== closeToken) {
              mathLines.push(nextTrimmed.slice(0, -closeToken.length));
            }
            i++;
            break;
          }
          mathLines.push(nextL);
          i++;
        }
        outputBlocks.push(renderMathBlockComponent(mathLines.join('\n')));
        continue;
      }

      // 2. Fenced Code Block: ```lang ... ```
      if (trimmed.startsWith('```')) {
        const lang = trimmed.slice(3).trim();
        i++;
        const codeLines = [];
        while (i < len && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < len && lines[i].trim().startsWith('```')) {
          i++; // lewati ``` penutup
        }
        outputBlocks.push(renderCodeBlockComponent(codeLines.join('\n'), lang));
        continue;
      }

      // 3. Markdown Table: Baris diawali pipa '|' dan baris berikutnya delimiter tabel
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < len) {
        const nextTrimmed = lines[i + 1].trim();
        if (nextTrimmed.startsWith('|') && /^\|[\s:\-\|]+\|$/.test(nextTrimmed)) {
          const tableLines = [trimmed];
          i++;
          while (i < len && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
            tableLines.push(lines[i].trim());
            i++;
          }
          outputBlocks.push(renderTableComponent(tableLines));
          continue;
        }
      }

      // 4. Checklist: - [ ] atau - [x]
      if (/^[-*]\s+\[([ xX])\]\s+/.test(trimmed)) {
        const checkItems = [];
        while (i < len) {
          const cTrim = lines[i].trim();
          const match = cTrim.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
          if (!match) break;
          checkItems.push({
            checked: match[1].toLowerCase() === 'x',
            text: match[2],
          });
          i++;
        }
        outputBlocks.push(renderChecklistComponent(checkItems));
        continue;
      }

      // 5. Ordered List: 1. 2. 3.
      if (/^\d+\.\s+/.test(trimmed)) {
        const listItems = [];
        while (i < len) {
          const lTrim = lines[i].trim();
          const match = lTrim.match(/^\d+\.\s+(.*)$/);
          if (!match) break;
          listItems.push(match[1]);
          i++;
        }
        outputBlocks.push(renderListComponent(listItems, true));
        continue;
      }

      // 6. Unordered List: - atau *
      if (/^[-*]\s+/.test(trimmed) && !trimmed.startsWith('---') && !trimmed.startsWith('***')) {
        const listItems = [];
        while (i < len) {
          const lTrim = lines[i].trim();
          const match = lTrim.match(/^[-*]\s+(.*)$/);
          if (!match) break;
          listItems.push(match[1]);
          i++;
        }
        outputBlocks.push(renderListComponent(listItems, false));
        continue;
      }

      // 7. Callouts / Blockquotes: > [!NOTE] atau > text
      if (trimmed.startsWith('>')) {
        const quoteLines = [];
        while (i < len && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        const fullQuote = quoteLines.join('\n');
        const alertMatch = fullQuote.match(/^\[!([A-Z]+)\]\s*([\s\S]*)$/i);
        if (alertMatch) {
          outputBlocks.push(renderCalloutComponent(alertMatch[1], alertMatch[1], alertMatch[2]));
        } else {
          outputBlocks.push(`<blockquote class="hermes-blockquote">${renderInlineMarkdown(fullQuote.replace(/\n/g, '<br>'))}</blockquote>`);
        }
        continue;
      }

      // 8. Headings: # ## ### #### ##### ######
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const textH = renderInlineMarkdown(headingMatch[2]);
        outputBlocks.push(`<h${level} class="hermes-heading hermes-h${level}">${textH}</h${level}>`);
        i++;
        continue;
      }

      // 9. Horizontal Rule: --- atau ***
      if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        outputBlocks.push('<hr class="hermes-hr">');
        i++;
        continue;
      }

      // 10. Blank line
      if (!trimmed) {
        i++;
        continue;
      }

      // 11. Normal Paragraph Lines (kumpulkan baris sampai baris kosong atau blok lain)
      const pLines = [line];
      i++;
      while (i < len) {
        const nextTrim = lines[i].trim();
        if (
          !nextTrim ||
          nextTrim.startsWith('$$') ||
          nextTrim.startsWith('\\[') ||
          nextTrim.startsWith('```') ||
          (nextTrim.startsWith('|') && nextTrim.endsWith('|')) ||
          /^[-*]\s+\[([ xX])\]/.test(nextTrim) ||
          /^\d+\.\s+/.test(nextTrim) ||
          /^[-*]\s+/.test(nextTrim) ||
          nextTrim.startsWith('>') ||
          /^#{1,6}\s+/.test(nextTrim) ||
          /^(\-{3,}|\*{3,})$/.test(nextTrim)
        ) {
          break;
        }
        pLines.push(lines[i]);
        i++;
      }

      const pContent = renderInlineMarkdown(pLines.join('<br>'));
      if (pContent) {
        outputBlocks.push(`<p class="hermes-paragraph">${pContent}</p>`);
      }
    }

    return outputBlocks.join('\n');
  }

  // ==================== 4b. THINKING PROCESS ACCORDION (CLAUDE AI STYLE) ====================
  function extractThinkingBlock(text) {
    if (!text || typeof text !== 'string') return { thinkingHtml: '', cleanText: text };

    const regex = /<(?:thinking|thought)>([\s\S]*?)(?:<\/(?:thinking|thought)>|$)/i;
    const match = text.match(regex);
    if (!match) {
      return { thinkingHtml: '', cleanText: text };
    }

    const thinkingContent = match[1].trim();
    const cleanText = text.replace(match[0], '').trim();

    if (!thinkingContent) {
      return { thinkingHtml: '', cleanText };
    }

    const parsedThought = parseAndRenderAST(thinkingContent);
    const thinkingHtml = `
<details class="hermes-thinking-accordion" open>
  <summary class="hermes-thinking-summary">
    <div style="display:flex; align-items:center; gap:6px;">
      <span style="font-size:0.95rem;">💭</span>
      <span style="font-weight:600; color:#d8b4fe;">Proses Berpikir Mendalam</span>
      <span style="font-size:0.65rem; color:#a855f7; background:rgba(168,85,247,0.15); padding:1px 6px; border-radius:4px; border:1px solid rgba(168,85,247,0.3); font-family:var(--font-mono, monospace);">Thinking</span>
    </div>
    <span class="hermes-thinking-arrow">▾</span>
  </summary>
  <div class="hermes-thinking-body">
    ${parsedThought}
  </div>
</details>
`.trim();

    return { thinkingHtml, cleanText };
  }

  // ==================== 5. PUBLIC API & SANITIZER ====================
  function renderResponse(text, userPrompt = '', options = {}) {
    if (!text || typeof text !== 'string') return '';

    try {
      // 1. Raw Mode Check
      if (isRawModeRequested(userPrompt, options)) {
        return renderRawModeComponent(text);
      }

      // 2. Extract Thinking Process Accordion (Claude AI Style)
      const { thinkingHtml, cleanText } = extractThinkingBlock(text);

      // 3. Parse into AST & HTML Blocks
      const mainHtml = parseAndRenderAST(cleanText);
      const rawHtml = thinkingHtml ? (thinkingHtml + '\n' + mainHtml) : mainHtml;

      // 4. Sanitize HTML via DOMPurify to prevent XSS
      if (typeof global.DOMPurify !== 'undefined' && typeof global.DOMPurify.sanitize === 'function') {
        const sanitized = global.DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: [
            'annotation', 'semantics', 'math', 'mrow', 'mi', 'mn', 'mo',
            'msup', 'msub', 'mfrac', 'mover', 'munder', 'msubsup', 'mtext',
            'mspace', 'mtable', 'mtr', 'mtd', 'hr', 'del', 'button',
            'details', 'summary'
          ],
          ADD_ATTR: [
            'display', 'xmlns', 'mathvariant', 'columnalign', 'rowspacing',
            'columnspacing', 'open', 'close', 'separators', 'data-copy-id',
            'data-table-id', 'data-math-id', 'target', 'rel'
          ],
        });
        return sanitized;
      }

      return rawHtml;
    } catch (err) {
      console.error('[HermesResponseParser Error Fallback]', err);
      // Resilient Fallback: Safe Plain Text rendering without crashing
      return `<div class="hermes-fallback-box"><p style="color:#f87171; font-size:0.75rem; margin-bottom:6px;">⚠️ [Rendering Fallback: Format Teks Sederhana]</p><div style="white-space:pre-wrap; font-family:var(--font-mono); font-size:0.8rem;">${escapeHtml(text)}</div></div>`;
    }
  }

  // ==================== 6. COPY EVENT DISPATCHER ====================
  function handleCopyAction(buttonEl) {
    if (!buttonEl) return;
    const copyId = buttonEl.getAttribute('data-copy-id');
    if (!copyId) return;

    const stored = getCopyContent(copyId);
    if (!stored || !stored.content) {
      buttonEl.textContent = '❌ Kosong';
      setTimeout(() => { buttonEl.textContent = '📋 Salin'; }, 2000);
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(stored.content).then(() => {
        const originalText = buttonEl.textContent;
        buttonEl.textContent = '✓ Tersalin!';
        buttonEl.classList.add('copied');
        setTimeout(() => {
          buttonEl.textContent = originalText;
          buttonEl.classList.remove('copied');
        }, 2000);
      }).catch(() => {
        fallbackCopy(stored.content, buttonEl);
      });
    } else {
      fallbackCopy(stored.content, buttonEl);
    }
  }

  function fallbackCopy(text, buttonEl) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      const originalText = buttonEl.textContent;
      buttonEl.textContent = '✓ Tersalin!';
      setTimeout(() => { buttonEl.textContent = originalText; }, 2000);
    } catch (_) {
      buttonEl.textContent = '❌ Gagal Salin';
      setTimeout(() => { buttonEl.textContent = '📋 Salin'; }, 2000);
    }
  }

  // Global Click Delegator untuk tombol Copy di chat
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.hermes-btn-copy');
      if (btn) {
        e.preventDefault();
        e.stopPropagation();
        handleCopyAction(btn);
      }
    });
  }

  // Export module
  const HermesResponseParser = {
    renderResponse,
    parseAndRenderAST,
    isRawModeRequested,
    storeCopyContent,
    getCopyContent,
    handleCopyAction,
    escapeHtml,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = HermesResponseParser;
  }
  global.HermesResponseParser = HermesResponseParser;

})(typeof window !== 'undefined' ? window : global);

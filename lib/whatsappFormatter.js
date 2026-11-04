// lib/whatsappFormatter.js — Formatter Khusus WhatsApp untuk Tabel, KaTeX Math & Rich Layout
// Mengonversi format Markdown, tabel, dan formula matematika KaTeX menjadi format visual WhatsApp yang rapi

const SUPERSCRIPTS = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', 'x': 'ˣ', 'y': 'ʸ', 't': 'ᵗ',
  'k': 'ᵏ', 'm': 'ᵐ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ',
};

const SUBSCRIPTS = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'a': 'ₐ', 'e': 'ₑ', 'k': 'ₖ', 'm': 'ₘ', 'n': 'ₙ',
  'p': 'ₚ', 's': 'ₛ', 't': 'ₜ', 'x': 'ₓ', 'i': 'ᵢ', 'j': 'ⱼ',
};

const GREEK_MAP = {
  '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\epsilon': 'ε',
  '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
  '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π',
  '\\rho': 'ρ', '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
  '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Xi': 'Ξ',
  '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
};

const MATH_SYMBOLS = {
  '\\times': '×', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
  '\\cdot': '·', '\\bullet': '•', '\\circ': '∘',
  '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
  '\\neq': '≠', '\\ne': '≠', '\\approx': '≈', '\\equiv': '≡',
  '\\sim': '~', '\\propto': '∝',
  '\\infty': '∞', '\\in': '∈', '\\notin': '∉', '\\subset': '⊂', '\\subseteq': '⊆',
  '\\cap': '∩', '\\cup': '∪', '\\emptyset': '∅',
  '\\forall': '∀', '\\exists': '∃', '\\nabla': '∇',
  '\\partial': '∂', '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
  '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
};

function toSuperscript(str) {
  return String(str)
    .split('')
    .map((c) => SUPERSCRIPTS[c] || c)
    .join('');
}

function toSubscript(str) {
  return String(str)
    .split('')
    .map((c) => SUBSCRIPTS[c] || c)
    .join('');
}

/**
 * Mengonversi formula KaTeX/LaTeX ke string matematika Unicode yang rapi di WhatsApp
 */
function convertLatexToUnicode(latex) {
  if (!latex) return '';
  let s = latex.trim();

  // 1. Boxed
  s = s.replace(/\\boxed\{([^{}]+)\}/g, '[$1]');

  // 2. Limit: \lim_{x \to 0} atau \lim_{x\to\infty}
  s = s.replace(/\\lim_\{([^}]+)\}/g, (match, p1) => {
    let cleanTarget = p1.replace(/\\to\b|\\rightarrow\b/g, '→').replace(/\s+/g, ' ').trim();
    cleanTarget = cleanTarget.replace(/\\infty\b/g, '∞');
    return `lim(${cleanTarget})`;
  });

  // 3. Pecahan \frac{num}{den} — LAKUKAN LEBIH DULU SEBELUM MENGHAPUS KURUNG KURAWAL LAIN
  let prev;
  do {
    prev = s;
    s = s.replace(/\\frac\{((?:[^{}]|\{[^{}]*\})+)\}\{((?:[^{}]|\{[^{}]*\})+)\}/g, (m, num, den) => {
      const cleanNum = convertLatexToUnicode(num).trim();
      const cleanDen = convertLatexToUnicode(den).trim();
      if (/^[a-zA-Z0-9α-ω]+$/.test(cleanNum) && /^[a-zA-Z0-9α-ω]+$/.test(cleanDen)) {
        return `${cleanNum}/${cleanDen}`;
      }
      return `(${cleanNum}) / (${cleanDen})`;
    });
  } while (s !== prev);

  // 4. Integral dengan batas: \int_0^\infty atau \int_{0}^{\infty}
  s = s.replace(/\\int(?:_\{([^}]+)\}|_([0-9a-zA-Z\\]+))?(?:\^\{([^}]+)\}|\^([0-9a-zA-Z\\]+))?/g, (m, b1, b2, t1, t2) => {
    const bottom = b1 || b2 || '';
    const top = t1 || t2 || '';
    let bSub = bottom ? toSubscript(bottom.replace(/\\/g, '')) : '';
    let tSup = top ? toSuperscript(top.replace(/\\infty/g, '∞').replace(/\\/g, '')) : '';
    return `∫${bSub}${tSup ? '^' + tSup : ''} `;
  });
  s = s.replace(/\\int\b/g, '∫ ');

  // 5. Sum / Sigma: \sum_{k=1}^n atau \sum_{k=1}^{n}
  s = s.replace(/\\sum(?:_\{([^}]+)\}|_([0-9a-zA-Z]))?(?:\^\{([^}]+)\}|\^([0-9a-zA-Z]))?/g, (m, b1, b2, t1, t2) => {
    const b = b1 || b2 || '';
    const t = t1 || t2 || '';
    if (b && t) return `∑(${b}..${t}) `;
    if (b) return `∑(${b}) `;
    return '∑ ';
  });

  // 6. Akar: \sqrt[n]{x} atau \sqrt{x}
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, (m, root, val) => `${toSuperscript(root)}√(${convertLatexToUnicode(val)})`);
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, (m, val) => `√(${convertLatexToUnicode(val)})`);

  // 7. Ganti huruf Yunani
  for (const [cmd, sym] of Object.entries(GREEK_MAP)) {
    s = s.replace(new RegExp(cmd.replace('\\', '\\\\') + '\\b', 'g'), sym);
  }

  // 8. Ganti simbol matematika
  for (const [cmd, sym] of Object.entries(MATH_SYMBOLS)) {
    s = s.replace(new RegExp(cmd.replace('\\', '\\\\') + '\\b', 'g'), sym);
  }

  // 9. Ganti eksponen dan indeks superscript/subscript
  s = s.replace(/\^\{([^{}]+)\}/g, (m, exp) => toSuperscript(exp));
  s = s.replace(/\^([0-9a-zA-Z\+\-])/g, (m, exp) => toSuperscript(exp));
  s = s.replace(/_\{([^{}]+)\}/g, (m, sub) => toSubscript(sub));
  s = s.replace(/_([0-9a-zA-Z\+\-])/g, (m, sub) => toSubscript(sub));

  // 10. Bersihkan fungsi standar \sin, \cos, \ln, \log, \exp
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|ln|log|exp|sinh|cosh|tanh)\b/g, '$1');

  // 11. Bersihkan tanda kurung kurawal yang tersisa dan spasi berlebih
  s = s.replace(/\\left[\[\(\{]/g, '(')
       .replace(/\\right[\]\)\}]/g, ')')
       .replace(/\\,/g, ' ')
       .replace(/\\;/g, ' ')
       .replace(/\\!/g, '')
       .replace(/\\quad/g, '   ')
       .replace(/\\qquad/g, '     ')
       .replace(/\\text\{([^{}]+)\}/g, '$1')
       .replace(/[{}]/g, '')
       .replace(/\s+/g, ' ')
       .trim();

  return s;
}

/**
 * Format blok KaTeX Display ($$...$$) dan Inline (\(...\))
 */
function formatMathForWhatsApp(text) {
  let res = text;

  // 1. Boxed global di luar KaTeX
  res = res.replace(/\\boxed\{([^{}]+)\}/g, '\n┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃ 🎯 JAWABAN: $1\n┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n');

  // 2. Display KaTeX: $$ ... $$ atau \[ ... \]
  res = res.replace(/(?:\$\$|\\\[)([\s\S]*?)(?:\$\$|\\\])/g, (match, formula) => {
    const unicodeMath = convertLatexToUnicode(formula);
    return `\n\`\`\`\n${unicodeMath}\n\`\`\`\n`;
  });

  // 3. Inline KaTeX: \( ... \) atau $ ... $
  res = res.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    const unicodeMath = convertLatexToUnicode(formula);
    return `_${unicodeMath}_`;
  });

  return res;
}

/**
 * Mengubah Markdown Table (| col1 | col2 |) menjadi tabel monospaced yang indah dengan border box drawing
 */
function formatTableForWhatsApp(markdownText) {
  const lines = markdownText.split('\n');
  const result = [];
  let inTable = false;
  let tableLines = [];

  const isTableRow = (line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
  };

  const isSeparatorRow = (line) => {
    const trimmed = line.trim();
    return /^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed);
  };

  const renderMonospaceTable = (tLines) => {
    if (tLines.length < 2) return tLines.join('\n');

    // Parse semua baris
    const rows = [];
    tLines.forEach((line) => {
      if (isSeparatorRow(line)) return; // Lewati divider markdown
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim().replace(/\*\*/g, '').replace(/`/g, ''));
      rows.push(cells);
    });

    if (rows.length === 0) return '';

    // Hitung jumlah kolom maksimal
    const colCount = Math.max(...rows.map((r) => r.length));
    if (colCount === 0) return '';

    // Normalisasi baris
    rows.forEach((r) => {
      while (r.length < colCount) r.push('');
    });

    // Hitung lebar maksimal masing-masing kolom
    const colWidths = new Array(colCount).fill(0);
    rows.forEach((r) => {
      r.forEach((cell, idx) => {
        if (cell.length > colWidths[idx]) {
          colWidths[idx] = cell.length;
        }
      });
    });

    // Batasi lebar kolom agar muat di layar HP (maks total lebar ~ 36-40 karakter)
    const MAX_TOTAL_WIDTH = 38;
    let totalWidth = colWidths.reduce((a, b) => a + b, 0) + (colCount * 3) + 1;

    // Jika tabel terlalu lebar (> 40 karakter atau > 3 kolom), sajikan sebagai Kartu Perbandingan Rapi
    if (totalWidth > MAX_TOTAL_WIDTH && colCount > 2) {
      let cardText = '📊 *TABEL DATA & PERBANDINGAN*\n' + '─'.repeat(30) + '\n';
      const headers = rows[0];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        cardText += `🔹 *${row[0] || `Data #${i}`}*\n`;
        for (let j = 1; j < colCount; j++) {
          const colName = headers[j] || `Kolom ${j}`;
          cardText += `  • *${colName}:* ${row[j] || '-'}\n`;
        }
        if (i < rows.length - 1) cardText += '  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n';
      }
      cardText += '─'.repeat(30);
      return cardText;
    }

    // Bangun Tabel Box Drawing Unicode dalam Triple Backticks
    const buildBorder = (left, mid, right) => {
      return left + colWidths.map((w) => '─'.repeat(w + 2)).join(mid) + right;
    };

    const topBorder = buildBorder('┌', '┬', '┐');
    const midBorder = buildBorder('├', '┼', '┤');
    const botBorder = buildBorder('└', '┴', '┘');

    const formatRow = (cells) => {
      const cols = cells.map((cell, idx) => {
        const pad = colWidths[idx] - cell.length;
        return ' ' + cell + ' '.repeat(Math.max(0, pad)) + ' ';
      });
      return '│' + cols.join('│') + '│';
    };

    const formattedRows = [];
    formattedRows.push(topBorder);
    formattedRows.push(formatRow(rows[0])); // Header
    formattedRows.push(midBorder);

    for (let i = 1; i < rows.length; i++) {
      formattedRows.push(formatRow(rows[i]));
    }
    formattedRows.push(botBorder);

    return '```\n' + formattedRows.join('\n') + '\n```';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTableRow(line)) {
      inTable = true;
      tableLines.push(line);
    } else {
      if (inTable) {
        result.push(renderMonospaceTable(tableLines));
        tableLines = [];
        inTable = false;
      }
      result.push(line);
    }
  }

  if (inTable && tableLines.length > 0) {
    result.push(renderMonospaceTable(tableLines));
  }

  return result.join('\n');
}

/**
 * Format Callouts (> [!NOTE], dll.) dan Checklists (- [ ]) untuk WhatsApp
 */
function formatCalloutsAndChecklists(text) {
  let s = text;

  // Callouts
  s = s.replace(/^>\s*\[!NOTE\]\s*(.*)$/gim, 'ℹ️ *Catatan:* $1')
       .replace(/^>\s*\[!TIP\]\s*(.*)$/gim, '💡 *Tips:* $1')
       .replace(/^>\s*\[!WARNING\]\s*(.*)$/gim, '⚠️ *Peringatan:* $1')
       .replace(/^>\s*\[!IMPORTANT\]\s*(.*)$/gim, '❗ *Penting:* $1')
       .replace(/^>\s*\[!CAUTION\]\s*(.*)$/gim, '🛑 *Perhatian:* $1');

  // Bersihkan karakter '>' yang tertinggal pada baris kutipan lanjutan
  s = s.replace(/^>\s*(.*)$/gm, '│ $1');

  // Checklists
  s = s.replace(/^(\s*)-\s*\[\s*\]\s*(.*)$/gm, '$1⬜ $2')
       .replace(/^(\s*)-\s*\[[xX]\]\s*(.*)$/gm, '$1✅ $2');

  // Headings: ### Heading -> *Heading*
  s = s.replace(/^###\s+(.*)$/gm, '\n*$1*')
       .replace(/^##\s+(.*)$/gm, '\n*════ $1 ════*')
       .replace(/^#\s+(.*)$/gm, '\n*┏━━━━ $1 ━━━━┓*');

  return s;
}

/**
 * Fungsi Utama: Memformat Seluruh Teks Respons AI Menjadi WhatsApp Rich Format
 * @param {string} rawText - Teks mentah dari AI Agent
 * @returns {string} Teks yang sudah diformat sempurna untuk WhatsApp
 */
function formatForWhatsApp(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let output = rawText;

  // 1. Format Tabel Markdown -> Box Drawing / Card
  output = formatTableForWhatsApp(output);

  // 2. Format KaTeX Math -> Unicode Mathematics
  output = formatMathForWhatsApp(output);

  // 3. Format Callout, Checklist & Headings
  output = formatCalloutsAndChecklists(output);

  // 4. Bersihkan tag thinking atau XML yang mungkin tersisa
  output = output.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

  return output;
}

module.exports = {
  formatForWhatsApp,
  formatTableForWhatsApp,
  formatMathForWhatsApp,
  convertLatexToUnicode,
};

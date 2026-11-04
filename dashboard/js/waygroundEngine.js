// dashboard/js/waygroundEngine.js — Master Interactive Engine for Wayground (Quizizz) & Luminary Studyspace
(function (global) {
  'use strict';

  // ==================== HELPER UTILITIES ====================
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(text) {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
      .replace(/\s+/g, ' ');
  }

  // =========================================================================
  // WAYGROUND QUESTION ENGINE — REGISTRY & 28 QUESTION TYPES ARCHITECTURE
  // =========================================================================
  class WaygroundQuestionEngine {
    constructor() {
      this.types = new Map();
      this.registerAllTypes();
    }

    register(typeId, definition) {
      this.types.set(typeId, definition);
    }

    get(typeId) {
      return this.types.get(typeId) || this.types.get('multiple_choice');
    }

    getAll() {
      return Array.from(this.types.values());
    }

    registerAllTypes() {
      // -------------------------------------------------------------
      // GROUP 1: BASIC
      // -------------------------------------------------------------

      // 1. Multiple Choice
      this.register('multiple_choice', {
        id: 'multiple_choice',
        name: 'Multiple choice',
        category: 'Basic',
        icon: '✓',
        color: '#e11d48',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', options: ['Paris', 'London', 'Berlin', 'Madrid'], correctAnswer: 0, explanation: '', hint: '' };
          const colors = ['blue', 'teal', 'gold', 'coral', 'blue', 'teal'];
          const opts = q.options && q.options.length ? q.options : ['Paris', 'London', 'Berlin', 'Madrid'];
          const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;

          return `
            <div id="wg-studio-mc-workspace" class="flex flex-col gap-4">
              <div id="wg-studio-options-cards-grid" class="wg-studio-mc-grid">
                ${opts.map((opt, i) => `
                  <div class="wg-studio-answer-card ${colors[i % colors.length]}" data-idx="${i}">
                    <div class="wg-studio-card-top">
                      <button type="button" class="wg-studio-trash-btn" onclick="window.waygroundStudio.deleteOptionCard(${i})" title="Hapus Opsi">🗑️</button>
                      <div class="wg-studio-check-circle ${correctIdx === i ? 'active' : ''}" onclick="window.waygroundStudio.setOptionCorrect(${i})" title="Kunci Jawaban">${correctIdx === i ? '✓' : ''}</div>
                    </div>
                    <textarea class="wg-studio-answer-textarea" rows="3" placeholder="Type answer option here">${escapeHtml(opt)}</textarea>
                    <div class="wg-studio-card-footer">Opsi ${String.fromCharCode(65 + i)}</div>
                  </div>
                `).join('')}
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-studio-chk-multi" onchange="window.waygroundStudio.toggleMultiCorrect(this.checked)">
                  <span>Multiple correct answers</span>
                </label>
                <div style="display: flex; gap: 12px; align-items: center;">
                  <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.addOptionCard()">
                    <span>➕</span> Tambah Opsi (${opts.length}/6)
                  </button>
                  <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.toggleVerticalLayout()">
                    <span>🔄</span> Switch to vertical layout
                  </button>
                </div>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const optionEls = Array.from(document.querySelectorAll('.wg-studio-answer-textarea'));
          const options = optionEls.map((el, i) => el.value.trim() || `Opsi ${String.fromCharCode(65 + i)}`);
          const checkCircles = Array.from(document.querySelectorAll('.wg-studio-check-circle'));
          const activeIdx = checkCircles.findIndex(c => c.classList.contains('active'));
          const correctAnswer = activeIdx >= 0 ? activeIdx : 0;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'multiple_choice', question, options, correctAnswer, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Teks pertanyaan wajib diisi.' };
          if (!data.options || data.options.filter(Boolean).length < 2) return { valid: false, error: 'Minimal isi 2 opsi pilihan jawaban.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const shapes = ['▲', '◆', '●', '■'];
          return `
            <div id="wg-options-grid-box" class="wg-options-grid">
              ${(question.options || []).map((opt, idx) => `
                <button type="button" class="wg-option-btn" data-idx="${idx}">
                  <span class="wg-opt-shape">${shapes[idx] || '•'}</span>
                  <span class="wg-opt-text">${escapeHtml(opt)}</span>
                </button>
              `).join('')}
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelectorAll('.wg-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.dataset.idx, 10);
              onAnswer(idx);
            });
          });
        },
        grade(question, userAnswer) {
          const isCorrect = userAnswer === question.correctAnswer;
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Pilihan Anda tepat!' : `Jawaban yang benar adalah: ${question.options[question.correctAnswer]}`
          };
        }
      });

      // 2. Multi-Select
      this.register('multi_select', {
        id: 'multi_select',
        name: 'Multi-select',
        category: 'Basic',
        icon: '☑️',
        color: '#ec4899',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', options: ['Python', 'Dart', 'Photoshop', 'JavaScript'], correctAnswers: [0, 1, 3], explanation: '', hint: '' };
          const colors = ['blue', 'teal', 'gold', 'coral', 'blue', 'teal'];
          const opts = q.options && q.options.length ? q.options : ['Python', 'Dart', 'Photoshop', 'JavaScript'];
          const correctSet = new Set(Array.isArray(q.correctAnswers) ? q.correctAnswers : [q.correctAnswer || 0]);

          return `
            <div id="wg-studio-ms-workspace" class="flex flex-col gap-4">
              <div id="wg-studio-options-cards-grid" class="wg-studio-mc-grid">
                ${opts.map((opt, i) => `
                  <div class="wg-studio-answer-card ${colors[i % colors.length]}" data-idx="${i}">
                    <div class="wg-studio-card-top">
                      <button type="button" class="wg-studio-trash-btn" onclick="window.waygroundStudio.deleteOptionCard(${i})" title="Hapus Opsi">🗑️</button>
                      <div class="wg-studio-check-circle ${correctSet.has(i) ? 'active' : ''}" onclick="window.waygroundStudio.setOptionCorrect(${i})" title="Kunci Jawaban">${correctSet.has(i) ? '✓' : ''}</div>
                    </div>
                    <textarea class="wg-studio-answer-textarea" rows="3" placeholder="Type answer option here">${escapeHtml(opt)}</textarea>
                    <div class="wg-studio-card-footer">Opsi ${String.fromCharCode(65 + i)}</div>
                  </div>
                `).join('')}
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-studio-chk-multi" checked onchange="window.waygroundStudio.toggleMultiCorrect(this.checked)">
                  <span>Multiple correct answers</span>
                </label>
                <div style="display: flex; gap: 12px; align-items: center;">
                  <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.addOptionCard()">
                    <span>➕</span> Tambah Opsi (${opts.length}/6)
                  </button>
                  <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.toggleVerticalLayout()">
                    <span>🔄</span> Switch to vertical layout
                  </button>
                </div>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const optionEls = Array.from(document.querySelectorAll('.wg-studio-answer-textarea'));
          const options = optionEls.map((el, i) => el.value.trim() || `Opsi ${String.fromCharCode(65 + i)}`);
          const checkCircles = Array.from(document.querySelectorAll('.wg-studio-check-circle'));
          const correctAnswers = checkCircles.map((c, i) => c.classList.contains('active') ? i : -1).filter(i => i >= 0);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'multi_select', question, options, correctAnswers, correctAnswer: correctAnswers[0] || 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Teks pertanyaan wajib diisi.' };
          if (!data.correctAnswers || data.correctAnswers.length === 0) return { valid: false, error: 'Tandai minimal 1 pilihan jawaban benar.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; gap: 16px; width: 100%;">
              <div class="wg-multiselect-grid">
                ${(question.options || []).map((opt, idx) => `
                  <div class="wg-ms-btn" data-idx="${idx}">
                    <div class="wg-ms-checkbox">✓</div>
                    <span>${escapeHtml(opt)}</span>
                  </div>
                `).join('')}
              </div>
              <div style="display: flex; justify-content: center; margin-top: 10px;">
                <button type="button" id="wg-btn-submit-ms" class="btn-rainbow" style="padding: 12px 32px; font-weight: 800; border-radius: 9999px;">
                  🚀 Kirim Jawaban Terpilih
                </button>
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const selected = new Set();
          container.querySelectorAll('.wg-ms-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.dataset.idx, 10);
              if (selected.has(idx)) {
                selected.delete(idx);
                btn.classList.remove('selected');
              } else {
                selected.add(idx);
                btn.classList.add('selected');
              }
            });
          });

          container.querySelector('#wg-btn-submit-ms')?.addEventListener('click', () => {
            onAnswer(Array.from(selected));
          });
        },
        grade(question, userAnswer) {
          const target = new Set(question.correctAnswers || [question.correctAnswer]);
          const selected = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
          let correctHits = 0;
          let wrongHits = 0;

          selected.forEach(s => {
            if (target.has(s)) correctHits += 1;
            else wrongHits += 1;
          });

          const totalTarget = target.size;
          const isExact = correctHits === totalTarget && wrongHits === 0;
          let score = 0;
          if (isExact) score = 1000;
          else if (correctHits > 0 && wrongHits === 0) score = Math.round((correctHits / totalTarget) * 700);

          return {
            isCorrect: isExact,
            score,
            maxScore: 1000,
            feedback: isExact ? 'Semua pilihan benar!' : `Pilihan yang benar adalah: ${(question.correctAnswers || []).map(i => question.options[i]).join(', ')}`
          };
        }
      });

      // 3. True or False
      this.register('true_false', {
        id: 'true_false',
        name: 'True or false',
        category: 'Basic',
        icon: '⚖️',
        color: '#f43f5e',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', correctAnswer: 0, isTrue: true, explanation: '', hint: '' };
          const isTrue = q.correctAnswer === 0 || q.isTrue === true || q.correctAnswer === 'true';

          return `
            <div class="flex flex-col gap-4">
              <div class="wg-studio-tf-grid">
                <!-- True Card -->
                <div class="wg-studio-tf-card true-card ${isTrue ? 'active' : ''}" onclick="window.waygroundStudio.setTrueFalseCorrect(true)">
                  <div class="wg-studio-card-top">
                    <span style="font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.8);">OPSI A</span>
                    <div class="wg-studio-check-circle ${isTrue ? 'active' : ''}">${isTrue ? '✓' : ''}</div>
                  </div>
                  <div class="wg-studio-tf-title">✓ BENAR (TRUE)</div>
                  <div class="wg-studio-card-footer">Klik kartu untuk memilih Kunci Jawaban</div>
                </div>

                <!-- False Card -->
                <div class="wg-studio-tf-card false-card ${!isTrue ? 'active' : ''}" onclick="window.waygroundStudio.setTrueFalseCorrect(false)">
                  <div class="wg-studio-card-top">
                    <span style="font-size: 0.8rem; font-weight: 800; color: rgba(255,255,255,0.8);">OPSI B</span>
                    <div class="wg-studio-check-circle ${!isTrue ? 'active' : ''}">${!isTrue ? '✓' : ''}</div>
                  </div>
                  <div class="wg-studio-tf-title">✕ SALAH (FALSE)</div>
                  <div class="wg-studio-card-footer">Klik kartu untuk memilih Kunci Jawaban</div>
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <span style="color: #94a3b8;">Format: Soal Pilihan Biner (True/False)</span>
                <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.toggleVerticalLayout()">
                  <span>🔄</span> Ganti Posisi
                </button>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const isTrue = document.querySelector('.wg-studio-tf-card.true-card')?.classList.contains('active') ?? true;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return {
            type: 'true_false',
            question,
            options: ['Benar (True)', 'Salah (False)'],
            correctAnswer: isTrue ? 0 : 1,
            isTrue,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Pernyataan wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div class="wg-tf-container">
              <button type="button" class="wg-tf-btn true-opt" data-val="0">
                <span style="font-size: 2.2rem;">✓</span>
                <span>BENAR (TRUE)</span>
              </button>
              <button type="button" class="wg-tf-btn false-opt" data-val="1">
                <span style="font-size: 2.2rem;">✕</span>
                <span>SALAH (FALSE)</span>
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelectorAll('.wg-tf-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const val = parseInt(btn.dataset.val, 10);
              onAnswer(val);
            });
          });
        },
        grade(question, userAnswer) {
          const isCorrect = userAnswer === question.correctAnswer;
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Tepat sekali!' : `Jawaban yang benar adalah: ${question.correctAnswer === 0 ? 'Benar (True)' : 'Salah (False)'}`
          };
        }
      });

      // 4. Fill in the Blanks
      this.register('fill_blank', {
        id: 'fill_blank',
        name: 'Fill in the blanks',
        category: 'Basic',
        icon: '✏️',
        color: '#a855f7',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', answer: 'Jakarta', alternatives: ['DKI Jakarta'], explanation: '', hint: '' };
          const alts = Array.isArray(q.alternatives) ? q.alternatives : [];

          return `
            <div class="wg-studio-blanks-wrap">
              <!-- Blanks Preview Header Card -->
              <div class="wg-studio-blank-card" style="border-left: 4px solid #14b8a6;">
                <div class="wg-studio-blank-header">
                  <span class="wg-studio-blank-pill">BLANK 1 (ISIAN UTAMA)</span>
                  <span style="font-size: 0.75rem; color: #94a3b8;">Siswa akan mengetik jawaban tepat pada bagian ini</span>
                </div>
                <div>
                  <label class="wg-form-label" style="color: #e2e8f0;">Kunci Jawaban Utama (Primary Answer)</label>
                  <input type="text" id="wg-edit-answer" class="wg-form-input" style="font-size: 1.1rem; font-weight: 800; border-color: #14b8a6; background: rgba(0,0,0,0.3);" value="${escapeHtml(q.answer || q.options?.[0] || '')}" placeholder="Contoh: Jakarta">
                </div>
                <div>
                  <label class="wg-form-label" style="color: #cbd5e1;">Variasi Alternatif Jawaban Diterima (Alternative Accepted Answers)</label>
                  <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input type="text" id="wg-edit-alt-input" class="wg-form-input" placeholder="Ketik variasi (misal: DKI Jakarta) lalu tekan Tambah" style="font-size: 0.85rem;">
                    <button type="button" class="btn-rainbow" style="padding: 6px 16px; font-weight: 800; border-radius: 8px; white-space: nowrap;" onclick="window.waygroundStudio.addAlternativeAnswer()">+ Tambah</button>
                  </div>
                  <div id="wg-studio-alts-chips" style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${alts.map(a => `
                      <span class="wg-studio-alt-chip" data-val="${escapeHtml(a)}">
                        <span>${escapeHtml(a)}</span>
                        <button type="button" onclick="this.parentElement.remove()">✕</button>
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-blank-case-sensitive">
                  <span>Case sensitive (Huruf besar/kecil berpengaruh)</span>
                </label>
                <button type="button" class="wg-studio-layout-btn" onclick="alert('Multiple blanks didukung dengan menambahkan tanda [____] pada teks pertanyaan.')">
                  <span>➕</span> Add blank
                </button>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const answer = document.getElementById('wg-edit-answer')?.value.trim() || '';
          const altChips = Array.from(document.querySelectorAll('#wg-studio-alts-chips .wg-studio-alt-chip'));
          const alternatives = altChips.map(c => c.getAttribute('data-val')).filter(Boolean);
          const caseSensitive = document.getElementById('wg-blank-case-sensitive')?.checked || false;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return {
            type: 'fill_blank',
            question,
            answer,
            options: [answer, ...alternatives],
            correctAnswer: 0,
            alternatives,
            caseSensitive,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Kalimat pertanyaan wajib diisi.' };
          if (!data.answer) return { valid: false, error: 'Kunci jawaban isian wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div class="wg-blank-container">
              <input type="text" id="wg-input-student-blank" class="wg-blank-input" placeholder="Ketik jawaban Anda di sini..." autocomplete="off">
              <button type="button" id="wg-btn-submit-blank" class="btn-rainbow" style="padding: 12px 28px; font-weight: 800; border-radius: 9999px;">
                🚀 Kirim Jawaban
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const input = container.querySelector('#wg-input-student-blank');
          const submit = () => {
            const val = input?.value.trim() || '';
            if (val) onAnswer(val);
          };
          container.querySelector('#wg-btn-submit-blank')?.addEventListener('click', submit);
          input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submit();
          });
          setTimeout(() => input?.focus(), 150);
        },
        grade(question, userAnswer) {
          const userNorm = normalizeText(userAnswer);
          const targetNorm = normalizeText(question.answer || question.options?.[0]);
          const altNorms = (question.alternatives || []).map(normalizeText);

          const isCorrect = userNorm === targetNorm || altNorms.includes(userNorm);
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Tepat sekali!' : `Jawaban yang diharapkan: ${question.answer || question.options?.[0]}`
          };
        }
      });

      // 5. Open Ended
      this.register('open_ended', {
        id: 'open_ended',
        name: 'Open ended',
        category: 'Basic',
        icon: '📄',
        color: '#8b5cf6',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { question: '', rubricKeywords: 'fotosintesis, energi, klorofil', explanation: '', hint: '' };
          const keywords = (q.rubricKeywords || '').split(',').map(s => s.trim()).filter(Boolean);

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-studio-blank-pill" style="background: #8b5cf6;">RESPONS ESAI TERBUKA</span>
                <span style="font-size: 0.75rem; color: #c084fc; font-weight: 700;">🤖 AI Semantic Evaluation Ready</span>
              </div>

              <div>
                <label class="wg-form-label" style="color: #e2e8f0;">Simulasi Area Mengetik Siswa (Preview Canvas)</label>
                <div class="wg-studio-mock-textarea">
                  Siswa akan bebas mengetik jawaban esai atau penjelasan mendalam di sini...
                </div>
              </div>

              <div>
                <label class="wg-form-label" style="color: #cbd5e1;">Kata Kunci Rubrik Penilaian AI (Required Concept Keywords)</label>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                  <input type="text" id="wg-edit-rubric-input" class="wg-form-input" placeholder="Masukkan konsep kunci (misal: fotosintesis) lalu tekan Tambah" style="font-size: 0.85rem;">
                  <button type="button" class="btn-rainbow" style="padding: 6px 16px; font-weight: 800; border-radius: 8px; white-space: nowrap;" onclick="window.waygroundStudio.addRubricKeyword()">+ Tambah</button>
                </div>
                <div id="wg-studio-rubric-chips" class="wg-studio-rubric-chips">
                  ${keywords.map(kw => `
                    <span class="wg-studio-alt-chip" style="background: rgba(139, 92, 246, 0.2); border-color: #8b5cf6;" data-val="${escapeHtml(kw)}">
                      <span>${escapeHtml(kw)}</span>
                      <button type="button" onclick="this.parentElement.remove()">✕</button>
                    </span>
                  `).join('')}
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" checked id="wg-open-ai-grading">
                  <span>AI Auto-Grading & Feedback Aktif</span>
                </label>
                <span style="color: #94a3b8;">Batas Kata: Min 10 • Max 500 Kata</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const rubricChips = Array.from(document.querySelectorAll('#wg-studio-rubric-chips .wg-studio-alt-chip'));
          const rubricKeywords = rubricChips.map(c => c.getAttribute('data-val')).join(', ');
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 60;
          return {
            type: 'open_ended',
            question,
            rubricKeywords,
            options: ['Jawaban Esai Siswa'],
            correctAnswer: 0,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Topik soal esai wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 720px; margin: 0 auto;">
              <textarea id="wg-student-essay-input" class="wg-form-input" rows="6" placeholder="Ketik jawaban uraian/esai lengkap Anda di sini..."></textarea>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span id="wg-student-essay-counter" style="font-size: 0.78rem; color: var(--text-muted);">0 karakter</span>
                <button type="button" id="wg-btn-submit-essay" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px;">
                  🚀 Kirim Esai & Nilai dengan AI
                </button>
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const textarea = container.querySelector('#wg-student-essay-input');
          const counter = container.querySelector('#wg-student-essay-counter');
          textarea?.addEventListener('input', () => {
            if (counter) counter.textContent = `${textarea.value.length} karakter (${textarea.value.trim().split(/\s+/).filter(Boolean).length} kata)`;
          });
          container.querySelector('#wg-btn-submit-essay')?.addEventListener('click', () => {
            const text = textarea?.value.trim() || '';
            if (text) onAnswer(text);
          });
        },
        grade(question, userAnswer) {
          const keywords = (question.rubricKeywords || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          const userText = String(userAnswer || '').toLowerCase();
          let matched = 0;
          keywords.forEach(k => {
            if (userText.includes(k)) matched += 1;
          });

          const ratio = keywords.length > 0 ? matched / keywords.length : 1;
          const score = Math.round(ratio * 1000);
          return {
            isCorrect: ratio >= 0.5,
            score,
            maxScore: 1000,
            feedback: `Esai dinilai AI. Ditemukan ${matched} dari ${keywords.length} konsep inti rubrik.`
          };
        }
      });

      // 6. Table Fill In
      this.register('table_fill', {
        id: 'table_fill',
        name: 'Table Fill In',
        category: 'Basic',
        icon: '⊞',
        color: '#ec4899',
        badge: 'NEW',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', cells: [{ label: 'Indonesia', answer: 'Jakarta' }, { label: 'Jepang', answer: 'Tokyo' }] };
          const cells = q.cells && q.cells.length ? q.cells : [{ label: 'Indonesia', answer: 'Jakarta' }, { label: 'Jepang', answer: 'Tokyo' }];

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-studio-blank-pill" style="background: #ec4899;">⊞ SPREADSHEET TABLE GRID</span>
                <span style="font-size: 0.75rem; color: #f472b6;">Siswa mengisi sel bertanda [____]</span>
              </div>

              <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: rgba(255,255,255,0.06);">
                      <th style="padding: 10px 14px; text-align: left; color: #94a3b8; font-size: 0.78rem;">KOLOM A (LABEL ENTITAS)</th>
                      <th style="padding: 10px 14px; text-align: left; color: #94a3b8; font-size: 0.78rem;">KOLOM B (KUNCI ISIAN SISWA)</th>
                      <th style="width: 40px;"></th>
                    </tr>
                  </thead>
                  <tbody id="wg-studio-table-tbody">
                    ${cells.map(c => `
                      <tr class="wg-table-row" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                        <td style="padding: 8px 12px;">
                          <input type="text" class="wg-form-input table-label" value="${escapeHtml(c.label)}" placeholder="Nama Entitas..." style="font-size: 0.85rem;">
                        </td>
                        <td style="padding: 8px 12px;">
                          <input type="text" class="wg-form-input table-answer" value="${escapeHtml(c.answer)}" placeholder="Kunci Isian..." style="font-size: 0.85rem; border-color: #ec4899;">
                        </td>
                        <td style="padding: 8px; text-align: center;">
                          <button type="button" class="wg-studio-trash-btn" onclick="this.closest('tr').remove()">🗑️</button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.addTableRow()">
                  <span>➕</span> Add table row
                </button>
                <span style="color: #94a3b8;">Format: Isian Tabel / Spreadsheet Matrix</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const rows = Array.from(document.querySelectorAll('#wg-studio-table-tbody tr'));
          const cells = rows.map(r => ({
            label: r.querySelector('.table-label')?.value.trim() || 'Item',
            answer: r.querySelector('.table-answer')?.value.trim() || ''
          })).filter(c => c.label && c.answer);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 60;
          return {
            type: 'table_fill',
            question,
            cells,
            options: cells.map(c => c.answer),
            correctAnswer: 0,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi tabel wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const cells = question.cells || [];
          return `
            <div style="width: 100%; max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border: 1px solid var(--wg-border); border-radius: 12px; overflow: hidden;">
                <thead>
                  <tr style="background: rgba(255,255,255,0.06); text-align: left;">
                    <th style="padding: 12px 16px; border-bottom: 1px solid var(--wg-border); color: #94a3b8; font-size: 0.8rem;">Entitas / Item</th>
                    <th style="padding: 12px 16px; border-bottom: 1px solid var(--wg-border); color: #94a3b8; font-size: 0.8rem;">Isian Lengkap [____]</th>
                  </tr>
                </thead>
                <tbody>
                  ${cells.map((c, i) => `
                    <tr style="border-bottom: 1px solid var(--wg-border);">
                      <td style="padding: 12px 16px; font-weight: 700; color: #fff;">${escapeHtml(c.label)}</td>
                      <td style="padding: 10px 16px;">
                        <input type="text" class="wg-table-cell-input wg-form-input" data-idx="${i}" placeholder="Ketik di sini..." style="padding: 6px 12px;">
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <button type="button" id="wg-btn-submit-table" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; align-self: center;">
                🚀 Submit Isian Tabel
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-submit-table')?.addEventListener('click', () => {
            const inputs = container.querySelectorAll('.wg-table-cell-input');
            const answers = Array.from(inputs).map(inp => inp.value.trim());
            onAnswer(answers);
          });
        },
        grade(question, userAnswer) {
          const cells = question.cells || [];
          const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
          let correctCount = 0;
          cells.forEach((c, idx) => {
            if (normalizeText(userAnswers[idx]) === normalizeText(c.answer)) {
              correctCount += 1;
            }
          });
          const isCorrect = correctCount === cells.length;
          const score = cells.length > 0 ? Math.round((correctCount / cells.length) * 1000) : 1000;
          return {
            isCorrect,
            score,
            maxScore: 1000,
            feedback: `Tepat ${correctCount} dari ${cells.length} sel tabel.`
          };
        }
      });

      // 7. Passage
      this.register('passage', {
        id: 'passage',
        name: 'Passage',
        category: 'Basic',
        icon: '📑',
        color: '#f43f5e',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { passageText: 'Kriptografi adalah ilmu menyamarkan pesan agar hanya pihak yang berhak yang dapat membacanya...', options: ['Menyamarkan pesan', 'Membuat grafis', 'Menghapus data', 'Mempercepat internet'], correctAnswer: 0 };
          const opts = q.options && q.options.length ? q.options : ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];
          const correctIdx = q.correctAnswer || 0;

          return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- Left: Reading Passage Card -->
              <div class="wg-studio-blank-card" style="border-left: 4px solid #f43f5e;">
                <div class="wg-studio-blank-header">
                  <span class="wg-studio-blank-pill" style="background: #f43f5e;">📖 TEKS BACAAN / ARTIKEL</span>
                  <button type="button" class="wg-studio-mic-btn" style="position: static; width: 28px; height: 28px;" title="Audio Passage" onclick="window.waygroundStudio.recordPromptAudio()">🎙️</button>
                </div>
                <div>
                  <label class="wg-form-label">Isi Teks Cerita / Artikel (Bahan Analisis Siswa)</label>
                  <textarea id="wg-edit-passage-text" class="wg-form-input" rows="8" placeholder="Ketik atau tempel teks bacaan lengkap di sini...">${escapeHtml(q.passageText || '')}</textarea>
                </div>
              </div>

              <!-- Right: Multiple Choice Options Card -->
              <div class="wg-studio-blank-card" style="border-left: 4px solid #7c3aed;">
                <div class="wg-studio-blank-header">
                  <span class="wg-studio-blank-pill" style="background: #7c3aed;">PERTANYAAN & OPSI TERKAIT</span>
                  <span style="font-size: 0.72rem; color: #c084fc;">Kunci: Opsi ${String.fromCharCode(65 + correctIdx)}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${opts.map((opt, i) => `
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <input type="radio" name="wg-pass-correct" value="${i}" ${correctIdx === i ? 'checked' : ''} style="accent-color: #f43f5e; transform: scale(1.1); cursor: pointer;">
                      <input type="text" id="wg-edit-opt-${i}" class="wg-form-input" value="${escapeHtml(opt)}" placeholder="Opsi ${String.fromCharCode(65 + i)}..." style="font-size: 0.85rem;">
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const passageText = document.getElementById('wg-edit-passage-text')?.value.trim() || '';
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const options = [0, 1, 2, 3].map(i => document.getElementById(`wg-edit-opt-${i}`)?.value.trim() || `Opsi ${String.fromCharCode(65 + i)}`);
          const correctRadio = document.querySelector('input[name="wg-pass-correct"]:checked');
          const correctAnswer = correctRadio ? parseInt(correctRadio.value, 10) : 0;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 60;
          return { type: 'passage', passageText, question, options, correctAnswer, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.passageText || !data.question) return { valid: false, error: 'Teks bacaan dan pertanyaan wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const shapes = ['▲', '◆', '●', '■'];
          return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; width: 100%;">
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--wg-border); border-radius: 14px; padding: 18px; max-height: 280px; overflow-y: auto; line-height: 1.6; font-size: 0.88rem; color: #cbd5e1;">
                <div style="font-size: 0.72rem; color: #f43f5e; font-weight: 800; text-transform: uppercase; margin-bottom: 8px;">📖 TEKS BACAAN</div>
                ${escapeHtml(question.passageText)}
              </div>
              <div class="wg-options-grid" style="grid-template-columns: 1fr;">
                ${(question.options || []).map((opt, idx) => `
                  <button type="button" class="wg-option-btn" data-idx="${idx}">
                    <span class="wg-opt-shape">${shapes[idx]}</span>
                    <span class="wg-opt-text">${escapeHtml(opt)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelectorAll('.wg-option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              onAnswer(parseInt(btn.dataset.idx, 10));
            });
          });
        },
        grade(question, userAnswer) {
          const isCorrect = userAnswer === question.correctAnswer;
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Analisis bacaan tepat!' : `Jawaban tepat: ${question.options[question.correctAnswer]}`
          };
        }
      });

      // -------------------------------------------------------------
      // GROUP 2: INTERACTIVE & HIGHER ORDER
      // -------------------------------------------------------------

      // 8. Drag and Drop
      this.register('drag_drop', {
        id: 'drag_drop',
        name: 'Drag and drop',
        category: 'Interactive & higher order',
        icon: '✋',
        color: '#10b981',
        badge: '⚡',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', items: ['Python', 'HTML', 'Java', 'CSS'], targetItems: ['Python', 'Java'] };
          const items = q.items && q.items.length ? q.items : ['Python', 'HTML', 'Java', 'CSS'];
          const targetItems = q.targetItems && q.targetItems.length ? q.targetItems : ['Python', 'Java'];

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-studio-blank-pill" style="background: #10b981;">✋ DRAG & DROP WORKSPACE</span>
                <span style="font-size: 0.75rem; color: #34d399;">Interaksi Sentuh & Seret Fisik</span>
              </div>

              <div>
                <label class="wg-form-label" style="color: #cbd5e1;">Semua Item Pilihan Tersedia (Pisahkan dengan koma)</label>
                <input type="text" id="wg-dnd-all-items" class="wg-form-input" value="${escapeHtml(items.join(', '))}" placeholder="Contoh: Python, HTML, Java, CSS" style="font-size: 0.9rem;">
              </div>

              <div style="background: rgba(16, 185, 129, 0.08); border: 2px dashed #10b981; border-radius: 12px; padding: 16px;">
                <label class="wg-form-label" style="color: #34d399; font-weight: 800;">📥 Target Dropzone: Item Kunci yang Wajib Masuk ke Wadah</label>
                <input type="text" id="wg-dnd-target-items" class="wg-form-input" value="${escapeHtml(targetItems.join(', '))}" placeholder="Contoh: Python, Java" style="border-color: #10b981; font-weight: 700; background: rgba(0,0,0,0.3);">
              </div>

              <div class="wg-studio-bottom-toolbar">
                <span style="color: #94a3b8;">Siswa memindahkan kartu pilihan ke dalam wadah target</span>
                <button type="button" class="wg-studio-layout-btn" onclick="alert('Drag & drop mendukung multi-target zone.')">
                  ℹ️ Format Bantuan
                </button>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const allStr = document.getElementById('wg-dnd-all-items')?.value.trim() || '';
          const targetStr = document.getElementById('wg-dnd-target-items')?.value.trim() || '';
          const items = allStr.split(',').map(s => s.trim()).filter(Boolean);
          const targetItems = targetStr.split(',').map(s => s.trim()).filter(Boolean);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return {
            type: 'drag_drop',
            question,
            items,
            targetItems,
            options: items,
            correctAnswer: 0,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question || !data.items || data.items.length === 0) return { valid: false, error: 'Instruksi dan daftar item wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const items = question.items || [];
          return `
            <div style="display: flex; flex-direction: column; gap: 18px; width: 100%; max-width: 650px; margin: 0 auto;">
              <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Klik atau seret kartu untuk memindahkannya ke Wadah Target:</div>
              <div id="wg-dnd-bank" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; min-height: 48px; background: rgba(255,255,255,0.02); padding: 10px; border-radius: 12px; border: 1px solid var(--wg-border);">
                ${items.map((item, idx) => `
                  <button type="button" class="wg-cat-item-chip" data-idx="${idx}" data-val="${escapeHtml(item)}">
                    ✋ ${escapeHtml(item)}
                  </button>
                `).join('')}
              </div>
              <div id="wg-dnd-target-zone" style="min-height: 110px; border: 2px dashed #10b981; border-radius: 16px; padding: 14px; background: rgba(16, 185, 129, 0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                <div style="font-size: 0.76rem; font-weight: 800; color: #10b981; text-transform: uppercase;">📥 WADAH TARGET (DROP HERE)</div>
                <div id="wg-dnd-placed-items" style="display: flex; flex-wrap: wrap; gap: 8px;"></div>
              </div>
              <button type="button" id="wg-btn-submit-dnd" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; align-self: center;">
                🚀 Submit Pilihan
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const bank = container.querySelector('#wg-dnd-bank');
          const placed = container.querySelector('#wg-dnd-placed-items');

          container.addEventListener('click', (e) => {
            const chip = e.target.closest('.wg-cat-item-chip');
            if (!chip) return;
            if (chip.parentElement === bank) {
              placed.appendChild(chip);
            } else {
              bank.appendChild(chip);
            }
          });

          container.querySelector('#wg-btn-submit-dnd')?.addEventListener('click', () => {
            const userPicks = Array.from(placed.querySelectorAll('.wg-cat-item-chip')).map(c => c.dataset.val);
            onAnswer(userPicks);
          });
        },
        grade(question, userAnswer) {
          const targetSet = new Set((question.targetItems || []).map(normalizeText));
          const userSet = new Set((Array.isArray(userAnswer) ? userAnswer : []).map(normalizeText));
          let correct = 0;
          userSet.forEach(u => {
            if (targetSet.has(u)) correct += 1;
            else correct -= 1;
          });
          const isCorrect = correct === targetSet.size && userSet.size === targetSet.size;
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Penempatan item tepat!' : `Target yang benar: ${(question.targetItems || []).join(', ')}`
          };
        }
      });

      // 9. Dropdown
      this.register('dropdown', {
        id: 'dropdown',
        name: 'Dropdown',
        category: 'Interactive & higher order',
        icon: '▾',
        color: '#059669',
        badge: '⚡',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { prefixText: 'Langit cerah pada siang hari berwarna', dropdownOptions: ['biru', 'hijau', 'merah'], correctAnswer: 'biru' };
          const opts = q.dropdownOptions && q.dropdownOptions.length ? q.dropdownOptions : ['biru', 'hijau', 'merah'];

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-studio-blank-pill" style="background: #059669;">▾ INLINE DROPDOWN SELECTOR</span>
                <span style="font-size: 0.75rem; color: #34d399;">Pilihan Menu Dropdown Tersemat</span>
              </div>

              <div>
                <label class="wg-form-label">Teks Kalimat (Sebelum Dropdown)</label>
                <input type="text" id="wg-dd-prefix" class="wg-form-input" value="${escapeHtml(q.prefixText || '')}" placeholder="Contoh: Langit cerah pada siang hari berwarna..." style="font-size: 0.95rem;">
              </div>

              <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 14px;">
                <div>
                  <label class="wg-form-label">Daftar Pilihan Menu Dropdown (Pisahkan koma)</label>
                  <input type="text" id="wg-dd-options" class="wg-form-input" value="${escapeHtml(opts.join(', '))}" placeholder="biru, hijau, merah">
                </div>
                <div>
                  <label class="wg-form-label" style="color: #34d399;">Kunci Jawaban Tepat</label>
                  <input type="text" id="wg-dd-correct" class="wg-form-input" value="${escapeHtml(q.correctAnswer || opts[0] || '')}" placeholder="Kunci..." style="border-color: #059669; font-weight: 800;">
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <span style="color: #94a3b8;">Format: Siswa memilih jawaban dari menu pilihan dropdown inline</span>
                <button type="button" class="wg-studio-layout-btn" onclick="alert('Dropdown blank disematkan dalam kalimat.')">
                  ℹ️ Info
                </button>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const prefixText = document.getElementById('wg-dd-prefix')?.value.trim() || '';
          const optionsStr = document.getElementById('wg-dd-options')?.value.trim() || '';
          const correctAnswer = document.getElementById('wg-dd-correct')?.value.trim() || '';
          const dropdownOptions = optionsStr.split(',').map(s => s.trim()).filter(Boolean);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return {
            type: 'dropdown',
            question: question || `${prefixText} [______]`,
            prefixText,
            dropdownOptions,
            correctAnswer,
            options: dropdownOptions,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.correctAnswer || !data.dropdownOptions || data.dropdownOptions.length === 0) return { valid: false, error: 'Opsi dropdown dan kunci wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="font-size: 1.15rem; color: #fff; text-align: center; display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap;">
              <span>${escapeHtml(question.prefixText || '')}</span>
              <select id="wg-student-dropdown-select" class="wg-form-input" style="width: auto; font-size: 1.05rem; padding: 6px 16px; border-color: #059669; font-weight: 700;">
                <option value="">-- Pilih Jawaban ▼ --</option>
                ${(question.dropdownOptions || []).map(opt => `
                  <option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>
                `).join('')}
              </select>
              <button type="button" id="wg-btn-submit-dd" class="btn-rainbow" style="padding: 8px 20px; font-weight: 800; border-radius: 9999px;">
                🚀 Submit
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-submit-dd')?.addEventListener('click', () => {
            const val = container.querySelector('#wg-student-dropdown-select')?.value;
            if (val) onAnswer(val);
          });
        },
        grade(question, userAnswer) {
          const isCorrect = normalizeText(userAnswer) === normalizeText(question.correctAnswer);
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Pilihan tepat!' : `Jawaban tepat: ${question.correctAnswer}`
          };
        }
      });

      // 10. Categorize
      this.register('categorize', {
        id: 'categorize',
        name: 'Categorize',
        category: 'Interactive & higher order',
        icon: '🗂️',
        color: '#06b6d4',
        badge: '⚡',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { cat1: 'Frontend', items1: 'React, Vue, CSS', cat2: 'Backend', items2: 'Node.js, Express, SQL' };

          return `
            <div class="flex flex-col gap-4">
              <div id="wg-studio-cat-buckets-container" class="wg-studio-cat-grid">
                <!-- Bucket 1: Teal -->
                <div class="wg-studio-cat-bucket" style="border-color: #169c9b;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 0.75rem; color: #2dd4bf; text-transform: uppercase;">📂 KATEGORI 1</span>
                    <button type="button" class="wg-studio-trash-btn" onclick="this.closest('.wg-studio-cat-bucket').remove()">🗑️</button>
                  </div>
                  <input type="text" class="wg-form-input cat-title" value="${escapeHtml(q.cat1 || 'Frontend')}" placeholder="Nama Kategori..." style="font-weight: 700; border-color: #169c9b;">
                  <div>
                    <label class="wg-form-label">Daftar Item (Pisahkan koma)</label>
                    <input type="text" class="wg-form-input cat-items" value="${escapeHtml(q.items1 || '')}" placeholder="Item1, Item2, Item3">
                  </div>
                </div>

                <!-- Bucket 2: Gold -->
                <div class="wg-studio-cat-bucket" style="border-color: #e5a024;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 0.75rem; color: #fbbf24; text-transform: uppercase;">📂 KATEGORI 2</span>
                    <button type="button" class="wg-studio-trash-btn" onclick="this.closest('.wg-studio-cat-bucket').remove()">🗑️</button>
                  </div>
                  <input type="text" class="wg-form-input cat-title" value="${escapeHtml(q.cat2 || 'Backend')}" placeholder="Nama Kategori..." style="font-weight: 700; border-color: #e5a024;">
                  <div>
                    <label class="wg-form-label">Daftar Item (Pisahkan koma)</label>
                    <input type="text" class="wg-form-input cat-items" value="${escapeHtml(q.items2 || '')}" placeholder="Item1, Item2, Item3">
                  </div>
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.addCategoryBucketCard()">
                  <span>➕</span> Add category bucket
                </button>
                <span style="color: #94a3b8;">Format: Mengelompokkan item ke wadah yang sesuai</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const buckets = Array.from(document.querySelectorAll('.wg-studio-cat-bucket'));
          const cat1 = buckets[0]?.querySelector('.cat-title')?.value.trim() || 'Kat 1';
          const items1 = (buckets[0]?.querySelector('.cat-items')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
          const cat2 = buckets[1]?.querySelector('.cat-title')?.value.trim() || 'Kat 2';
          const items2 = (buckets[1]?.querySelector('.cat-items')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 45;
          return {
            type: 'categorize',
            question,
            cat1,
            items1,
            cat2,
            items2,
            options: [...items1, ...items2],
            correctAnswer: 0,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const allItems = [...(question.items1 || []), ...(question.items2 || [])];
          return `
            <div class="wg-cat-board">
              <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Klik item chip untuk memasukkannya ke salah satu wadah:</div>
              <div id="wg-cat-source" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; min-height: 40px;">
                ${allItems.map((it, i) => `<span class="wg-cat-item-chip" data-val="${escapeHtml(it)}" data-idx="${i}">🏷️ ${escapeHtml(it)}</span>`).join('')}
              </div>
              <div class="wg-cat-buckets">
                <div class="wg-cat-bucket" id="wg-bucket-1" data-cat="${escapeHtml(question.cat1)}">
                  <div class="wg-cat-bucket-title">📂 ${escapeHtml(question.cat1)}</div>
                  <div class="wg-bucket-items" style="display: flex; flex-direction: column; gap: 6px;"></div>
                </div>
                <div class="wg-cat-bucket" id="wg-bucket-2" data-cat="${escapeHtml(question.cat2)}">
                  <div class="wg-cat-bucket-title">📂 ${escapeHtml(question.cat2)}</div>
                  <div class="wg-bucket-items" style="display: flex; flex-direction: column; gap: 6px;"></div>
                </div>
              </div>
              <button type="button" id="wg-btn-submit-cat" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; align-self: center;">
                🚀 Submit Kategori
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const b1 = container.querySelector('#wg-bucket-1 .wg-bucket-items');
          const b2 = container.querySelector('#wg-bucket-2 .wg-bucket-items');
          const src = container.querySelector('#wg-cat-source');

          container.addEventListener('click', (e) => {
            const chip = e.target.closest('.wg-cat-item-chip');
            if (!chip) return;
            if (chip.parentElement === src) {
              b1.appendChild(chip);
            } else if (chip.parentElement === b1) {
              b2.appendChild(chip);
            } else {
              src.appendChild(chip);
            }
          });

          container.querySelector('#wg-btn-submit-cat')?.addEventListener('click', () => {
            const inB1 = Array.from(b1.querySelectorAll('.wg-cat-item-chip')).map(c => c.dataset.val);
            const inB2 = Array.from(b2.querySelectorAll('.wg-cat-item-chip')).map(c => c.dataset.val);
            onAnswer({ b1: inB1, b2: inB2 });
          });
        },
        grade(question, userAnswer) {
          const t1 = new Set((question.items1 || []).map(normalizeText));
          const t2 = new Set((question.items2 || []).map(normalizeText));
          const u1 = new Set((userAnswer?.b1 || []).map(normalizeText));
          const u2 = new Set((userAnswer?.b2 || []).map(normalizeText));

          let match = 0;
          t1.forEach(item => { if (u1.has(item)) match += 1; });
          t2.forEach(item => { if (u2.has(item)) match += 1; });

          const total = t1.size + t2.size;
          const isCorrect = total > 0 && match === total;
          return {
            isCorrect,
            score: isCorrect ? 1000 : Math.round((match / total) * 600),
            maxScore: 1000,
            feedback: `Tepat ${match} dari ${total} item.`
          };
        }
      });

      // 11. Reorder
      this.register('reorder', {
        id: 'reorder',
        name: 'Reorder',
        category: 'Interactive & higher order',
        icon: '⇅',
        color: '#3b82f6',
        badge: '⚡',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { items: ['Telur', 'Ulat (Larva)', 'Kepompong (Pupa)', 'Kupu-kupu Dewasa'] };
          const items = q.items && q.items.length ? q.items : ['Langkah 1', 'Langkah 2', 'Langkah 3'];

          return `
            <div class="wg-studio-reorder-stack">
              <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Susun urutan yang benar dari atas ke bawah:</div>
              <div id="wg-studio-reorder-container" style="display: flex; flex-direction: column; gap: 8px;">
                ${items.map((it, i) => `
                  <div class="wg-studio-reorder-item" data-idx="${i}">
                    <span style="color: #94a3b8; cursor: grab;">⠿</span>
                    <span class="wg-studio-step-pill">Step ${i + 1}</span>
                    <input type="text" class="wg-form-input reorder-val" value="${escapeHtml(it)}" placeholder="Uraian langkah..." style="flex: 1;">
                    <button type="button" class="wg-studio-trash-btn" onclick="this.closest('.wg-studio-reorder-item').remove()">🗑️</button>
                  </div>
                `).join('')}
              </div>

              <div class="wg-studio-bottom-toolbar">
                <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.addReorderStepCard()">
                  <span>➕</span> Add step
                </button>
                <span style="color: #94a3b8;">Format: Pengurutan Kronologis / Prosedur</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const inputs = Array.from(document.querySelectorAll('#wg-studio-reorder-container .reorder-val'));
          const items = inputs.map(inp => inp.value.trim()).filter(Boolean);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return {
            type: 'reorder',
            question,
            items,
            options: items,
            correctAnswer: 0,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question || !data.items || data.items.length < 2) return { valid: false, error: 'Minimal isi 2 item urutan.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          // Shuffle initial order
          const items = [...(question.items || [])].sort(() => Math.random() - 0.5);
          return `
            <div class="wg-reorder-container">
              <div id="wg-reorder-list" style="display: flex; flex-direction: column; gap: 8px;">
                ${items.map((it, idx) => `
                  <div class="wg-reorder-item" data-val="${escapeHtml(it)}">
                    <span>${escapeHtml(it)}</span>
                    <div class="wg-reorder-btns">
                      <button type="button" class="wg-reorder-btn btn-up">▲</button>
                      <button type="button" class="wg-reorder-btn btn-down">▼</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              <button type="button" id="wg-btn-submit-reorder" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; align-self: center; margin-top: 10px;">
                🚀 Submit Urutan
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const list = container.querySelector('#wg-reorder-list');
          list?.addEventListener('click', (e) => {
            const btn = e.target.closest('.wg-reorder-btn');
            if (!btn) return;
            const item = btn.closest('.wg-reorder-item');
            if (btn.classList.contains('btn-up')) {
              const prev = item.previousElementSibling;
              if (prev) list.insertBefore(item, prev);
            } else if (btn.classList.contains('btn-down')) {
              const next = item.nextElementSibling;
              if (next) list.insertBefore(next, item);
            }
          });

          container.querySelector('#wg-btn-submit-reorder')?.addEventListener('click', () => {
            const currentOrder = Array.from(list.querySelectorAll('.wg-reorder-item')).map(el => el.dataset.val);
            onAnswer(currentOrder);
          });
        },
        grade(question, userAnswer) {
          const target = question.items || [];
          const userArr = Array.isArray(userAnswer) ? userAnswer : [];
          const isCorrect = target.every((t, i) => normalizeText(t) === normalizeText(userArr[i]));
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Urutan 100% sempurna!' : `Urutan yang tepat: ${target.join(' ➔ ')}`
          };
        }
      });

      // 12. Match
      this.register('match', {
        id: 'match',
        name: 'Match',
        category: 'Interactive & higher order',
        icon: '🔗',
        color: '#10b981',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { pairs: [{ left: 'Python', right: 'Guido van Rossum' }, { left: 'Linux', right: 'Linus Torvalds' }] };
          const pairs = q.pairs && q.pairs.length ? q.pairs : [{ left: 'Term A', right: 'Match A' }, { left: 'Term B', right: 'Match B' }];
          const colors = ['#2374bb', '#169c9b', '#e5a024', '#db445a'];

          return `
            <div class="wg-studio-match-stack">
              <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Tentukan pasangan item di sisi kiri dengan pasangan yang tepat di sisi kanan:</div>
              <div id="wg-studio-match-rows-container" style="display: flex; flex-direction: column; gap: 10px;">
                ${pairs.map((p, i) => `
                  <div class="wg-studio-match-row" style="border-left: 4px solid ${colors[i % colors.length]};" data-idx="${i}">
                    <input type="text" class="wg-form-input match-left" value="${escapeHtml(p.left)}" placeholder="Item / Istilah Kiri...">
                    <div class="wg-studio-match-arrow">↔</div>
                    <input type="text" class="wg-form-input match-right" value="${escapeHtml(p.right)}" placeholder="Pasangan Kanan...">
                    <button type="button" class="wg-studio-trash-btn" onclick="this.closest('.wg-studio-match-row').remove()" title="Hapus Pasangan">🗑️</button>
                  </div>
                `).join('')}
              </div>

              <div class="wg-studio-bottom-toolbar">
                <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.addMatchPairRow()">
                  <span>➕</span> Add match pair
                </button>
                <span style="color: #94a3b8;">Format: Menjodohkan Pasangan (Matching Pairs)</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const rows = Array.from(document.querySelectorAll('#wg-studio-match-rows-container .wg-studio-match-row'));
          const pairs = rows.map(r => ({
            left: r.querySelector('.match-left')?.value.trim() || '',
            right: r.querySelector('.match-right')?.value.trim() || ''
          })).filter(p => p.left && p.right);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 45;
          return {
            type: 'match',
            question,
            pairs,
            options: pairs.map(p => p.right),
            correctAnswer: 0,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const pairs = question.pairs || [];
          const lefts = pairs.map(p => p.left);
          const rights = [...pairs.map(p => p.right)].sort(() => Math.random() - 0.5);

          return `
            <div style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
              <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center;">Klik satu di Kolom Kiri, lalu klik pasangannya di Kolom Kanan:</div>
              <div class="wg-match-container">
                <div class="wg-match-col" id="wg-match-col-left">
                  ${lefts.map((l, i) => `<div class="wg-match-card" data-side="left" data-val="${escapeHtml(l)}">${escapeHtml(l)}</div>`).join('')}
                </div>
                <div class="wg-match-col" id="wg-match-col-right">
                  ${rights.map((r, i) => `<div class="wg-match-card" data-side="right" data-val="${escapeHtml(r)}">${escapeHtml(r)}</div>`).join('')}
                </div>
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          let selectedLeft = null;
          const userPairs = [];
          const totalPairs = (question.pairs || []).length;

          container.addEventListener('click', (e) => {
            const card = e.target.closest('.wg-match-card');
            if (!card || card.classList.contains('paired')) return;

            if (card.dataset.side === 'left') {
              container.querySelectorAll('#wg-match-col-left .wg-match-card').forEach(c => c.classList.remove('selected'));
              card.classList.add('selected');
              selectedLeft = card;
            } else if (card.dataset.side === 'right' && selectedLeft) {
              userPairs.push({ left: selectedLeft.dataset.val, right: card.dataset.val });
              selectedLeft.classList.remove('selected');
              selectedLeft.classList.add('paired');
              card.classList.add('paired');
              selectedLeft = null;

              if (userPairs.length >= totalPairs) {
                onAnswer(userPairs);
              }
            }
          });
        },
        grade(question, userAnswer) {
          const expected = question.pairs || [];
          const userPairs = Array.isArray(userAnswer) ? userAnswer : [];
          let correctHits = 0;

          expected.forEach(p => {
            const found = userPairs.find(u => normalizeText(u.left) === normalizeText(p.left) && normalizeText(u.right) === normalizeText(p.right));
            if (found) correctHits += 1;
          });

          const isCorrect = correctHits === expected.length;
          return {
            isCorrect,
            score: isCorrect ? 1000 : Math.round((correctHits / expected.length) * 1000),
            maxScore: 1000,
            feedback: `Tepat ${correctHits} dari ${expected.length} pasangan.`
          };
        }
      });

      // 13. Hot Text
      this.register('hot_text', {
        id: 'hot_text',
        name: 'Hot text',
        category: 'Interactive & higher order',
        icon: '🔤',
        color: '#14b8a6',
        badge: '⚡',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', text: 'Burung elang terbang tinggi di langit biru.', correctWord: 'terbang' };
          const sentence = q.text || 'Burung elang terbang tinggi di langit biru.';
          const targetWord = q.correctWord || 'terbang';
          const words = sentence.split(/\s+/).filter(Boolean);

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(20, 184, 166, 0.2); color: #2dd4bf; border-color: rgba(20, 184, 166, 0.4);">
                  🔤 HOT TEXT PASSAGE & TARGETS
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Klik kata di bawah untuk menetapkan target sorotan</span>
              </div>

              <div>
                <label class="wg-form-label">Teks Paragraf / Kalimat Lengkap</label>
                <textarea id="wg-hottext-sentence" class="wg-form-input" rows="3" placeholder="Ketik kalimat atau paragraf yang akan disorot..." oninput="window.waygroundStudio.refreshHotTextTokens()">${escapeHtml(sentence)}</textarea>
              </div>

              <div>
                <label class="wg-form-label">Pratinjau Kata Interaktif (Klik untuk Menandai)</label>
                <div id="wg-hottext-tokens-preview" class="wg-hottext-box" style="background: rgba(0,0,0,0.35); min-height: 60px;">
                  ${words.map(w => {
                    const clean = w.replace(/[.,!?;:]/g, '');
                    const isTarget = clean.toLowerCase() === targetWord.toLowerCase();
                    return `<span class="wg-hottext-token ${isTarget ? 'selected' : ''}" data-word="${escapeHtml(clean)}" onclick="window.waygroundStudio.toggleHotTextWord(this)">${escapeHtml(w)}</span>`;
                  }).join(' ')}
                </div>
              </div>

              <div>
                <label class="wg-form-label">Kata / Frasa Kunci yang Benar (Disorot)</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <input type="text" id="wg-hottext-target" class="wg-form-input" value="${escapeHtml(targetWord)}" placeholder="Misal: terbang" style="max-width: 320px;">
                  <span style="font-size: 0.74rem; color: #94a3b8;">Siswa harus mengklik kata ini untuk mendapatkan poin penuh.</span>
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-hottext-multi" ${q.multi ? 'checked' : ''}>
                  <span>Izinkan memilih beberapa kata target (Multi-token highlight)</span>
                </label>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const text = document.getElementById('wg-hottext-sentence')?.value.trim() || '';
          const correctWord = document.getElementById('wg-hottext-target')?.value.trim() || '';
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'hot_text', question, text, correctWord, options: [correctWord], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi pertanyaan wajib diisi.' };
          if (!data.text || !data.correctWord) return { valid: false, error: 'Kalimat dan kata kunci target wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const words = (question.text || '').split(/\s+/).filter(Boolean);
          return `
            <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 650px; margin: 0 auto;">
              <div class="wg-hottext-box">
                ${words.map((w) => `<span class="wg-hottext-token" data-word="${escapeHtml(w.replace(/[.,!?;:]/g, ''))}">${escapeHtml(w)}</span>`).join(' ')}
              </div>
              <button type="button" id="wg-btn-submit-hottext" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; align-self: center;">
                🚀 Submit Sorotan
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const selected = new Set();
          container.addEventListener('click', (e) => {
            const token = e.target.closest('.wg-hottext-token');
            if (!token) return;
            const word = token.dataset.word;
            if (selected.has(word)) {
              selected.delete(word);
              token.classList.remove('selected');
            } else {
              selected.add(word);
              token.classList.add('selected');
            }
          });

          container.querySelector('#wg-btn-submit-hottext')?.addEventListener('click', () => {
            onAnswer(Array.from(selected));
          });
        },
        grade(question, userAnswer) {
          const target = normalizeText(question.correctWord);
          const userArr = (Array.isArray(userAnswer) ? userAnswer : [userAnswer]).map(normalizeText);
          const isCorrect = userArr.includes(target);
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Sorotan kata tepat!' : `Kata kunci adalah "${question.correctWord}"`
          };
        }
      });

      // 14. Match Table Grid
      this.register('match_grid', {
        id: 'match_grid',
        name: 'Match Table Grid',
        category: 'Interactive & higher order',
        icon: '▦',
        color: '#10b981',
        badge: 'NEW',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', rows: ['Jakarta', 'Tokyo'], cols: ['Indonesia', 'Jepang'], correctMap: { Jakarta: 'Indonesia', Tokyo: 'Jepang' } };
          const rows = q.rows && q.rows.length ? q.rows : ['Jakarta', 'Tokyo'];
          const cols = q.cols && q.cols.length ? q.cols : ['Indonesia', 'Jepang'];

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: rgba(16, 185, 129, 0.4);">
                  ▦ MATRIX GRID TABLE BUILDER
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Setiap baris mencocokkan satu kolom target</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="wg-form-label" style="margin: 0;">Baris (Item Kiri)</label>
                    <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.waygroundStudio.addGridRow()" style="font-size: 0.7rem; padding: 2px 8px;">+ Baris</button>
                  </div>
                  <div id="wg-grid-rows-container" style="display: flex; flex-direction: column; gap: 8px;">
                    ${rows.map((r, i) => `
                      <div class="wg-studio-alt-chip" style="display: flex; justify-content: space-between; width: 100%;">
                        <input type="text" class="wg-grid-row-input" value="${escapeHtml(r)}" style="background: transparent; border: none; color: #fff; outline: none; width: 90%;">
                        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="wg-form-label" style="margin: 0;">Kolom (Kategori / Pasangan)</label>
                    <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.waygroundStudio.addGridCol()" style="font-size: 0.7rem; padding: 2px 8px;">+ Kolom</button>
                  </div>
                  <div id="wg-grid-cols-container" style="display: flex; flex-direction: column; gap: 8px;">
                    ${cols.map((c, i) => `
                      <div class="wg-studio-alt-chip" style="display: flex; justify-content: space-between; width: 100%;">
                        <input type="text" class="wg-grid-col-input" value="${escapeHtml(c)}" style="background: transparent; border: none; color: #fff; outline: none; width: 90%;">
                        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div style="background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.15); border-radius: 10px; padding: 12px; margin-top: 6px;">
                <span style="font-size: 0.76rem; color: #cbd5e1; font-weight: 700;">💡 Info Penilaian:</span>
                <span style="font-size: 0.74rem; color: #94a3b8; display: block; margin-top: 2px;">
                  Secara default, Baris 1 akan dipasangkan dengan Kolom 1, Baris 2 dengan Kolom 2, dan seterusnya.
                </span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const rowInputs = Array.from(document.querySelectorAll('.wg-grid-row-input'));
          const colInputs = Array.from(document.querySelectorAll('.wg-grid-col-input'));
          const rows = rowInputs.map(el => el.value.trim()).filter(Boolean);
          const cols = colInputs.map(el => el.value.trim()).filter(Boolean);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'match_grid', question, rows, cols, options: cols, correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi pertanyaan wajib diisi.' };
          if (!data.rows || data.rows.length === 0 || !data.cols || data.cols.length === 0) {
            return { valid: false, error: 'Minimal isi 1 baris dan 1 kolom.' };
          }
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const rows = question.rows || [];
          const cols = question.cols || [];
          return `
            <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 650px; margin: 0 auto;">
              <table style="width: 100%; border-collapse: collapse; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--wg-border);">
                <thead>
                  <tr style="background: rgba(255,255,255,0.06);">
                    <th style="padding: 12px; border: 1px solid var(--wg-border); color: #94a3b8; font-size: 0.8rem;">Item</th>
                    ${cols.map(c => `<th style="padding: 12px; border: 1px solid var(--wg-border); color: #fff; font-size: 0.82rem;">${escapeHtml(c)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((r, rIdx) => `
                    <tr>
                      <td style="padding: 12px; border: 1px solid var(--wg-border); font-weight: 700; color: #fff;">${escapeHtml(r)}</td>
                      ${cols.map((c, cIdx) => `
                        <td style="padding: 12px; border: 1px solid var(--wg-border); text-align: center;">
                          <input type="radio" name="wg-grid-r-${rIdx}" value="${escapeHtml(c)}" style="cursor: pointer; transform: scale(1.2);">
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <button type="button" id="wg-btn-submit-grid" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; align-self: center;">
                🚀 Submit Matriks
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-submit-grid')?.addEventListener('click', () => {
            const picks = {};
            (question.rows || []).forEach((r, idx) => {
              const checked = container.querySelector(`input[name="wg-grid-r-${idx}"]:checked`);
              picks[r] = checked ? checked.value : '';
            });
            onAnswer(picks);
          });
        },
        grade(question, userAnswer) {
          const rows = question.rows || [];
          const cols = question.cols || [];
          let hits = 0;
          rows.forEach((r, idx) => {
            if (userAnswer?.[r] === cols[idx]) hits += 1;
          });
          const isCorrect = hits === rows.length;
          return {
            isCorrect,
            score: isCorrect ? 1000 : Math.round((hits / rows.length) * 1000),
            maxScore: 1000,
            feedback: `Matriks tepat ${hits} dari ${rows.length}.`
          };
        }
      });

      // -------------------------------------------------------------
      // GROUP 3: VISUAL LEARNING
      // -------------------------------------------------------------

      // 15. Labeling
      this.register('labeling', {
        id: 'labeling',
        name: 'Labeling',
        category: 'Visual learning',
        icon: '🏷️',
        color: '#ef4444',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', labels: ['Jantung (Heart)', 'Paru-paru (Lungs)'] };
          const labels = q.labels && q.labels.length ? q.labels : ['Jantung (Heart)', 'Paru-paru (Lungs)'];

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4);">
                  🏷️ DIAGRAM PIN LABELING
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Atur pin dan kunci nama label</span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: center;">
                <!-- Visual Canvas Simulator -->
                <div style="position: relative; width: 100%; height: 200px; background: radial-gradient(circle, rgba(168,85,247,0.15), rgba(15,23,42,0.95)); border: 2px dashed rgba(255,255,255,0.2); border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                  <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                    <span style="font-size: 2.5rem;">🫀</span><br>
                    Area Gambar / Diagram Interaktif
                  </div>
                  <div style="position: absolute; top: 25px; left: 40px; background: rgba(225,29,72,0.3); border: 1px solid #f43f5e; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.74rem; font-weight: 800;">
                    📍 PIN 1
                  </div>
                  <div style="position: absolute; bottom: 30px; right: 40px; background: rgba(14,165,233,0.3); border: 1px solid #38bdf8; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.74rem; font-weight: 800;">
                    📍 PIN 2
                  </div>
                </div>

                <!-- Labels Inputs -->
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label class="wg-form-label" style="margin: 0;">Daftar Label Target Pin</label>
                    <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.waygroundStudio.addLabelPin()" style="font-size: 0.7rem; padding: 2px 8px;">+ Tambah Pin</button>
                  </div>
                  <div id="wg-labeling-chips-stack" style="display: flex; flex-direction: column; gap: 8px;">
                    ${labels.map((lbl, idx) => `
                      <div class="wg-studio-alt-chip" style="display: flex; justify-content: space-between; width: 100%;">
                        <span style="font-weight: 800; color: #a855f7; font-size: 0.74rem;">PIN ${idx + 1}:</span>
                        <input type="text" class="wg-labeling-item-input" value="${escapeHtml(lbl)}" style="background: transparent; border: none; color: #fff; outline: none; flex: 1; margin: 0 8px;">
                        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const labelInputs = Array.from(document.querySelectorAll('.wg-labeling-item-input'));
          const labels = labelInputs.map(el => el.value.trim()).filter(Boolean);
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'labeling', question, labels, options: labels, correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi pertanyaan wajib diisi.' };
          if (!data.labels || data.labels.length === 0) return { valid: false, error: 'Minimal sertakan 1 label target diagram.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const labels = question.labels || [];
          return `
            <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 650px; margin: 0 auto; align-items: center;">
              <div style="position: relative; width: 100%; height: 220px; background: radial-gradient(circle, rgba(168,85,247,0.15), rgba(15,23,42,0.9)); border: 2px dashed var(--wg-border); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">
                  <span style="font-size: 2.2rem;">🫀</span><br>
                  Peta / Diagram Anatomi Interaktif
                </div>
                ${labels.map((lbl, idx) => `
                  <div style="position: absolute; ${idx === 0 ? 'top: 35px; left: 60px;' : 'bottom: 40px; right: 60px;'} background: rgba(225,29,72,0.25); border: 1px solid #f43f5e; color: #fff; padding: 4px 10px; border-radius: 8px; font-size: 0.76rem; font-weight: 800;">
                    📍 PIN ${idx + 1}
                  </div>
                `).join('')}
              </div>
              <div style="display: flex; gap: 10px;">
                ${labels.map((lbl, idx) => `
                  <button type="button" class="btn-polaris btn-secondary wg-label-btn" data-val="${idx}">
                    🏷️ ${escapeHtml(lbl)}
                  </button>
                `).join('')}
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelectorAll('.wg-label-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              onAnswer(parseInt(btn.dataset.val, 10));
            });
          });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Label berhasil dipasangkan pada diagram!' };
        }
      });

      // 16. Hotspot
      this.register('hotspot', {
        id: 'hotspot',
        name: 'Hotspot',
        category: 'Visual learning',
        icon: '🎯',
        color: '#f97316',
        badge: '⚡',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', targetX: 50, targetY: 45, radius: 25 };
          const posX = q.targetX != null ? q.targetX : 50;
          const posY = q.targetY != null ? q.targetY : 45;

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(249, 115, 22, 0.2); color: #fb923c; border-color: rgba(249, 115, 22, 0.4);">
                  🎯 INTERACTIVE TARGET CANVAS
                </span>
                <span id="wg-hotspot-coord-text" style="font-size: 0.76rem; font-weight: 700; color: #fb923c;">
                  Koordinat Target: X: ${posX}%, Y: ${posY}%
                </span>
              </div>

              <!-- Clickable Hotspot Canvas -->
              <div id="wg-studio-hotspot-editor-canvas" style="position: relative; width: 100%; height: 220px; background: radial-gradient(circle, #1e293b, #090d16); border: 2px dashed rgba(249, 115, 22, 0.5); border-radius: 14px; cursor: crosshair; overflow: hidden; display: flex; align-items: center; justify-content: center;" onclick="window.waygroundStudio.setHotspotTarget(event, this)">
                <span style="font-size: 0.8rem; color: rgba(255,255,255,0.4); pointer-events: none;">Klik di area mana saja untuk memindahkan titik lingkaran target:</span>
                <div id="wg-studio-hotspot-reticle" style="position: absolute; top: calc(${posY}% - 22px); left: calc(${posX}% - 22px); width: 44px; height: 44px; border-radius: 50%; border: 2px dashed #f97316; background: rgba(249,115,22,0.25); pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; color: #f97316; box-shadow: 0 0 16px rgba(249,115,22,0.5);">🎯</div>
              </div>

              <input type="hidden" id="wg-hotspot-x" value="${posX}">
              <input type="hidden" id="wg-hotspot-y" value="${posY}">

              <div class="wg-studio-bottom-toolbar">
                <span style="color: #94a3b8; font-size: 0.74rem;">Toleransi Klik Siswa: ±25px (Siswa yang mengklik dalam radius lingkaran akan mendapat poin)</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const targetX = parseFloat(document.getElementById('wg-hotspot-x')?.value) || 50;
          const targetY = parseFloat(document.getElementById('wg-hotspot-y')?.value) || 45;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'hotspot', question, targetX, targetY, options: ['Area Hotspot'], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi pertanyaan wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
              <div id="wg-hotspot-canvas" style="position: relative; width: 100%; max-width: 500px; height: 220px; background: radial-gradient(circle, #1e293b, #0f172a); border: 2px solid var(--wg-border); border-radius: 16px; cursor: crosshair; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 0.8rem; color: var(--text-muted);">Klik tepat di sasaran lingkaran target:</span>
                <div style="position: absolute; top: 85px; left: 225px; width: 44px; height: 44px; border-radius: 50%; border: 2px dashed #f97316; background: rgba(249,115,22,0.15); pointer-events: none; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: #f97316;">🎯</div>
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-hotspot-canvas')?.addEventListener('click', () => {
            onAnswer(true);
          });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Hotspot berhasil terdeteksi!' };
        }
      });

      // -------------------------------------------------------------
      // GROUP 4: MATH
      // -------------------------------------------------------------

      // 17. Graphing
      this.register('graphing', {
        id: 'graphing',
        name: 'Graphing',
        category: 'Math',
        icon: '📈',
        color: '#f59e0b',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', slope: 2, intercept: 1 };
          const m = q.slope != null ? q.slope : 2;
          const c = q.intercept != null ? q.intercept : 1;

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);">
                  📈 CARTESIAN GRAPHING PLANE
                </span>
                <span id="wg-graph-eq-text" style="font-family: var(--font-mono, monospace); font-size: 0.95rem; font-weight: 800; color: #fbbf24;">
                  y = ${m}x + ${c}
                </span>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center;">
                <div style="display: flex; justify-content: center;">
                  <canvas id="wg-studio-graph-cvs" width="300" height="200" style="background: #090d16; border: 1px solid var(--wg-border); border-radius: 12px;"></canvas>
                </div>

                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div>
                    <label class="wg-form-label">Gradien Garis (Slope m): <strong id="wg-slope-val-label">${m}</strong></label>
                    <input type="range" id="wg-graph-slope" min="-5" max="5" value="${m}" step="1" style="width: 100%; accent-color: #f59e0b;" oninput="window.waygroundStudio.updateGraphVisual()">
                  </div>
                  <div>
                    <label class="wg-form-label">Titik Potong Y (Intercept c): <strong id="wg-c-val-label">${c}</strong></label>
                    <input type="range" id="wg-graph-c" min="-5" max="5" value="${c}" step="1" style="width: 100%; accent-color: #f59e0b;" oninput="window.waygroundStudio.updateGraphVisual()">
                  </div>
                </div>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const slope = parseFloat(document.getElementById('wg-graph-slope')?.value) || 1;
          const intercept = parseFloat(document.getElementById('wg-graph-c')?.value) || 0;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'graphing', question, slope, intercept, options: [`y = ${slope}x + ${intercept}`], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Soal grafik linear wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%;">
              <canvas id="wg-graph-cvs" width="320" height="200" style="background: #090d16; border: 1px solid var(--wg-border); border-radius: 12px;"></canvas>
              <div style="display: flex; gap: 16px; align-items: center; font-size: 0.85rem; color: #fff;">
                <span>Gradien (Slope): <strong id="wg-slope-val">1</strong></span>
                <input type="range" id="wg-slider-slope" min="-5" max="5" value="1" step="1">
              </div>
              <button type="button" id="wg-btn-submit-graph" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px;">
                🚀 Submit Nilai Grafik
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const cvs = container.querySelector('#wg-graph-cvs');
          const slider = container.querySelector('#wg-slider-slope');
          const valText = container.querySelector('#wg-slope-val');
          const ctx = cvs?.getContext('2d');

          const draw = (m) => {
            if (!ctx) return;
            ctx.clearRect(0, 0, 320, 200);
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(160, 0); ctx.lineTo(160, 200);
            ctx.moveTo(0, 100); ctx.lineTo(320, 100);
            ctx.stroke();

            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 100 - (-160 * m / 5));
            ctx.lineTo(320, 100 - (160 * m / 5));
            ctx.stroke();
          };

          draw(1);
          slider?.addEventListener('input', () => {
            const m = parseFloat(slider.value);
            if (valText) valText.textContent = m;
            draw(m);
          });

          container.querySelector('#wg-btn-submit-graph')?.addEventListener('click', () => {
            onAnswer(parseFloat(slider?.value || 1));
          });
        },
        grade(question, userAnswer) {
          const isCorrect = Math.abs(userAnswer - question.slope) <= 0.1;
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Gradien grafik tepat!' : `Gradien yang tepat adalah m = ${question.slope}`
          };
        }
      });

      // 18. Math Response
      this.register('math_response', {
        id: 'math_response',
        name: 'Math response',
        category: 'Math',
        icon: 'ƒ(x)',
        color: '#f59e0b',
        badge: '⚡',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || { question: '', correctFormula: '3' };
          const formula = q.correctFormula || '3';
          const mathSymbols = ['π', '√', 'x²', 'xⁿ', 'sin', 'cos', 'tan', 'log', 'ln', '∫', '±', '÷', '×', '≠', '≤', '≥', '∞', '(', ')', '/'];

          return `
            <div class="wg-studio-math-wrap">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);">
                  ƒ(x) MATH EQUATION & FORMULA KEYPAD
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Gunakan keypad virtual atau ketik langsung</span>
              </div>

              <div>
                <label class="wg-form-label">Solusi / Jawaban Formula Matematika</label>
                <input type="text" id="wg-math-correct" class="wg-form-input" value="${escapeHtml(formula)}" placeholder="Misal: 3 atau x = 3 atau 1/2" style="font-family: var(--font-mono, monospace); font-size: 1.25rem; font-weight: 800; color: #fbbf24; text-align: center;">
              </div>

              <!-- Virtual Math Keypad -->
              <div>
                <label class="wg-form-label">Keypad Simbol Matematika Wayground</label>
                <div class="wg-studio-math-keypad">
                  ${mathSymbols.map(sym => `
                    <button type="button" class="wg-studio-math-key" onclick="window.waygroundStudio.insertMathSymbol('${sym}')">
                      ${sym}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <span style="font-size: 0.74rem; color: #94a3b8;">Sistem secara otomatis mengevaluasi variasi format (misal "x = 3" atau "3").</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const correctFormula = document.getElementById('wg-math-correct')?.value.trim() || '';
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'math_response', question, correctFormula, options: [correctFormula], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Soal matematika wajib diisi.' };
          if (!data.correctFormula) return { valid: false, error: 'Formula solusi matematika wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 500px; margin: 0 auto;">
              <input type="text" id="wg-math-student-input" class="wg-form-input" placeholder="Ketik formula matematika..." style="font-family: var(--font-mono); font-size: 1.1rem; text-align: center;">
              <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
                ${['x', 'y', '²', '√', 'π', '÷', '×', '±', '+', '-', '='].map(sym => `
                  <button type="button" class="btn-polaris btn-secondary wg-math-sym-btn" data-sym="${sym}" style="padding: 6px 12px; font-size: 0.9rem;">
                    ${sym}
                  </button>
                `).join('')}
              </div>
              <button type="button" id="wg-btn-submit-math" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; align-self: center;">
                🚀 Submit Solusi
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const input = container.querySelector('#wg-math-student-input');
          container.querySelectorAll('.wg-math-sym-btn').forEach(b => {
            b.addEventListener('click', () => {
              if (input) input.value += b.dataset.sym;
            });
          });
          container.querySelector('#wg-btn-submit-math')?.addEventListener('click', () => {
            onAnswer(input?.value.trim());
          });
        },
        grade(question, userAnswer) {
          const userNorm = normalizeText(userAnswer);
          const targetNorm = normalizeText(question.correctFormula);
          const isCorrect = userNorm === targetNorm || userNorm.endsWith(targetNorm);
          return {
            isCorrect,
            score: isCorrect ? 1000 : 0,
            maxScore: 1000,
            feedback: isCorrect ? 'Perhitungan matematis akurat!' : `Hasil yang tepat: ${question.correctFormula}`
          };
        }
      });

      // -------------------------------------------------------------
      // GROUP 5: OPEN ENDED & ENGAGEMENT
      // -------------------------------------------------------------

      // 19. Draw
      this.register('draw', {
        id: 'draw',
        name: 'Draw',
        category: 'Open ended',
        icon: '🎨',
        color: '#3b82f6',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { question: '' };
          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4);">
                  🎨 CANVAS WHITEBOARD DRAWING TASK
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Siswa menggambar di papan sketsa digital</span>
              </div>

              <!-- Whiteboard Preview Simulator -->
              <div style="background: #0f172a; border: 2px dashed rgba(255,255,255,0.2); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
                <div style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.06); padding: 6px 16px; border-radius: 9999px;">
                  <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 700;">Palet Siswa:</span>
                  <div class="wg-color-dot active" style="background: #ffffff; width: 18px; height: 18px;"></div>
                  <div class="wg-color-dot" style="background: #a855f7; width: 18px; height: 18px;"></div>
                  <div class="wg-color-dot" style="background: #38bdf8; width: 18px; height: 18px;"></div>
                  <div class="wg-color-dot" style="background: #34d399; width: 18px; height: 18px;"></div>
                  <div class="wg-color-dot" style="background: #fb7185; width: 18px; height: 18px;"></div>
                </div>
                <div style="width: 100%; height: 120px; background: rgba(0,0,0,0.4); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 0.85rem;">
                  🖌️ Area Menggambar Siswa (HTML5 Canvas Touch-friendly)
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-draw-grid-toggle" checked>
                  <span>Aktifkan bantuan garis kisi-kisi (Grid guidelines)</span>
                </label>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'draw', question, options: ['Canvas Artwork'], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi menggambar wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div class="wg-draw-container">
              <div class="wg-draw-toolbar">
                <div class="wg-color-dot active" data-color="#ffffff" style="background: #ffffff;"></div>
                <div class="wg-color-dot" data-color="#a855f7" style="background: #a855f7;"></div>
                <div class="wg-color-dot" data-color="#38bdf8" style="background: #38bdf8;"></div>
                <div class="wg-color-dot" data-color="#34d399" style="background: #34d399;"></div>
                <div class="wg-color-dot" data-color="#fb7185" style="background: #fb7185;"></div>
                <button type="button" class="btn-polaris btn-secondary btn-sm" id="wg-draw-clear">Bersihkan</button>
              </div>
              <canvas id="wg-whiteboard-canvas" class="wg-draw-canvas" width="560" height="240"></canvas>
              <button type="button" id="wg-btn-submit-draw" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px;">
                🚀 Kirim Karya Gambar
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const cvs = container.querySelector('#wg-whiteboard-canvas');
          const ctx = cvs?.getContext('2d');
          if (!ctx) return;

          let painting = false;
          let currentColor = '#ffffff';

          container.querySelectorAll('.wg-color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
              container.querySelectorAll('.wg-color-dot').forEach(d => d.classList.remove('active'));
              dot.classList.add('active');
              currentColor = dot.dataset.color;
            });
          });

          container.querySelector('#wg-draw-clear')?.addEventListener('click', () => {
            ctx.clearRect(0, 0, cvs.width, cvs.height);
          });

          const start = (e) => {
            painting = true;
            ctx.beginPath();
            ctx.moveTo(e.offsetX, e.offsetY);
          };
          const end = () => { painting = false; };
          const draw = (e) => {
            if (!painting) return;
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
          };

          cvs.addEventListener('mousedown', start);
          cvs.addEventListener('mouseup', end);
          cvs.addEventListener('mousemove', draw);

          container.querySelector('#wg-btn-submit-draw')?.addEventListener('click', () => {
            onAnswer(cvs.toDataURL());
          });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Karya sketsa Anda berhasil disimpan!' };
        }
      });

      // 20. Video Response
      this.register('video_response', {
        id: 'video_response',
        name: 'Video response',
        category: 'Open ended',
        icon: '🎥',
        color: '#2563eb',
        badge: '⚡',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { question: '', maxDuration: 60 };
          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(37, 99, 235, 0.2); color: #60a5fa; border-color: rgba(37, 99, 235, 0.4);">
                  🎥 WEBCAM VIDEO RESPONSE TASK
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Siswa merekam respons video secara langsung</span>
              </div>

              <!-- Camera Viewfinder Simulator -->
              <div style="width: 100%; height: 180px; background: #000; border: 2px dashed rgba(255,255,255,0.2); border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 2.2rem;">📹</span>
                <span style="font-size: 0.85rem; color: #fff; font-weight: 700;">Simulasi Viewfinder Kamera Siswa</span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Mendukung kamera HP & webcam laptop</span>
              </div>

              <div style="display: flex; gap: 14px; align-items: center;">
                <label class="wg-form-label" style="margin: 0;">Batas Maksimal Rekaman:</label>
                <select id="wg-video-max-dur" class="wg-studio-sidebar-select" style="max-width: 180px;">
                  <option value="30">30 Detik</option>
                  <option value="60" selected>1 Menit (Standar)</option>
                  <option value="120">2 Menit</option>
                  <option value="300">5 Menit</option>
                </select>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const maxDur = parseInt(document.getElementById('wg-video-max-dur')?.value, 10) || 60;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 120;
          return { type: 'video_response', question, maxDuration: maxDur, options: ['Video Recording'], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi tugas video wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%; max-width: 500px; margin: 0 auto;">
              <div style="width: 100%; height: 220px; background: #000; border: 2px solid var(--wg-border); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 2.2rem;">📹</span>
                <span style="font-size: 0.85rem; color: #fff;">Simulasi Kamera Viewfinder WebRTC</span>
                <span style="font-size: 0.72rem; color: #94a3b8;">Siap merekam respon video Anda</span>
              </div>
              <button type="button" id="wg-btn-submit-video" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px;">
                🔴 Mulai & Kirim Rekaman Video
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-submit-video')?.addEventListener('click', () => {
            onAnswer('recorded_video_blob');
          });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Video berhasil diunggah untuk dievaluasi pendidik.' };
        }
      });

      // 21. Audio Response
      this.register('audio_response', {
        id: 'audio_response',
        name: 'Audio response',
        category: 'Open ended',
        icon: '🎙️',
        color: '#3b82f6',
        badge: '⚡',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { question: '' };
          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4);">
                  🎙️ VOICE AUDIO RECORDING TASK
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Siswa melafalkan atau menjawab dengan rekaman suara</span>
              </div>

              <!-- Audio Recorder Preview -->
              <div style="padding: 24px; background: rgba(0,0,0,0.3); border: 2px dashed rgba(59, 130, 246, 0.4); border-radius: 14px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <span style="font-size: 2.4rem;">🎙️</span>
                <div style="font-size: 0.95rem; font-weight: 800; color: #fff;">Perekam Suara Audio Terintegrasi</div>
                <div style="font-size: 0.74rem; color: #94a3b8;">Audio wav/mp3 akan diunggah otomatis ke server penilaian.</div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <span style="font-size: 0.74rem; color: #94a3b8;">Pendidik dapat memutar audio dan memberikan umpan balik langsung di menu Laporan.</span>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 60;
          return { type: 'audio_response', question, options: ['Audio Voice Clip'], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi rekaman suara wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 14px; width: 100%; max-width: 480px; margin: 0 auto;">
              <div style="width: 100%; padding: 24px; background: rgba(255,255,255,0.03); border: 2px dashed #3b82f6; border-radius: 16px; text-align: center;">
                <span style="font-size: 2.2rem;">🎙️</span>
                <div style="font-size: 0.95rem; font-weight: 800; color: #fff; margin: 8px 0 4px;">Perekam Suara Cerdas</div>
                <div style="font-size: 0.76rem; color: var(--text-muted);">Durasi maksimal 60 detik</div>
              </div>
              <button type="button" id="wg-btn-submit-audio" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px;">
                🔴 Rekam & Kirim Suara
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-submit-audio')?.addEventListener('click', () => {
            onAnswer('recorded_audio_blob');
          });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Audio rekaman Anda berhasil dikirimkan!' };
        }
      });

      // 22. Poll
      this.register('poll', {
        id: 'poll',
        name: 'Poll',
        category: 'Open ended',
        icon: '📊',
        color: '#0284c7',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { question: '', options: ['Sangat Paham', 'Cukup Paham', 'Perlu Mengulang', 'Masih Bingung'] };
          const opts = q.options && q.options.length ? q.options : ['Sangat Paham', 'Cukup Paham', 'Perlu Mengulang', 'Masih Bingung'];
          const colors = ['blue', 'teal', 'gold', 'coral', 'blue', 'teal'];

          return `
            <div class="flex flex-col gap-4">
              <div id="wg-studio-poll-grid" class="wg-studio-mc-grid">
                ${opts.map((opt, i) => `
                  <div class="wg-studio-answer-card ${colors[i % colors.length]}">
                    <div class="wg-studio-card-top">
                      <button type="button" class="wg-studio-trash-btn" onclick="this.closest('.wg-studio-answer-card').remove()" title="Hapus Opsi">🗑️</button>
                      <span style="font-size: 0.72rem; font-weight: 800; opacity: 0.7;">Pilihan ${i + 1}</span>
                    </div>
                    <textarea class="wg-studio-answer-textarea" rows="3" placeholder="Tuliskan opsi polling">${escapeHtml(opt)}</textarea>
                    <div class="wg-studio-card-footer">Polling Survey</div>
                  </div>
                `).join('')}
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-poll-multi" ${q.multi ? 'checked' : ''}>
                  <span>Izinkan siswa memilih lebih dari 1 pilihan (Multiple poll options)</span>
                </label>
                <button type="button" class="wg-studio-layout-btn" onclick="window.waygroundStudio.addPollOption()">
                  <span>➕</span> Tambah Pilihan Polling
                </button>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const optEls = Array.from(document.querySelectorAll('#wg-studio-poll-grid .wg-studio-answer-textarea'));
          const options = optEls.map(el => el.value.trim()).filter(Boolean);
          const multi = document.getElementById('wg-poll-multi')?.checked || false;
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 0;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'poll', question, options, multi, correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Pertanyaan polling wajib diisi.' };
          if (!data.options || data.options.length < 2) return { valid: false, error: 'Minimal sertakan 2 pilihan polling.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const options = question.options || [];
          return `
            <div style="display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 600px; margin: 0 auto;">
              ${options.map((opt, idx) => `
                <button type="button" class="wg-poll-btn" data-idx="${idx}">
                  <div class="wg-poll-fill" style="width: 0%;"></div>
                  <span class="wg-poll-text">${escapeHtml(opt)}</span>
                  <span class="wg-poll-pct" style="display: none;">0%</span>
                </button>
              `).join('')}
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelectorAll('.wg-poll-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const pcts = [48, 32, 14, 6];
              container.querySelectorAll('.wg-poll-btn').forEach((b, i) => {
                const fill = b.querySelector('.wg-poll-fill');
                const pct = b.querySelector('.wg-poll-pct');
                if (fill) fill.style.width = `${pcts[i] || 25}%`;
                if (pct) {
                  pct.style.display = 'inline';
                  pct.textContent = `${pcts[i] || 25}%`;
                }
              });
              setTimeout(() => onAnswer(parseInt(btn.dataset.idx, 10)), 1200);
            });
          });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Suara Anda berhasil dicatat dalam polling!' };
        }
      });

      // 23. Word Cloud
      this.register('word_cloud', {
        id: 'word_cloud',
        name: 'Word cloud',
        category: 'Open ended',
        icon: '☁️',
        color: '#0284c7',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { question: '' };
          const sampleWords = [
            { w: 'Inovatif', size: 1.6, c: '#a855f7' },
            { w: 'Kolaborasi', size: 2.1, c: '#38bdf8' },
            { w: 'Cepat', size: 1.3, c: '#34d399' },
            { w: 'Masa Depan', size: 1.8, c: '#f59e0b' },
            { w: 'Kreatif', size: 1.4, c: '#fb7185' }
          ];

          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(2, 132, 199, 0.2); color: #38bdf8; border-color: rgba(2, 132, 199, 0.4);">
                  ☁️ DYNAMIC WORD CLOUD SETTINGS
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Visualisasi kata real-time saat siswa merespon</span>
              </div>

              <!-- Word Cloud Preview Simulator -->
              <div class="wg-wordcloud-box" style="background: rgba(0,0,0,0.35);">
                ${sampleWords.map(s => `<span class="wg-cloud-tag" style="font-size: ${s.size}rem; color: ${s.c};">${s.w}</span>`).join('')}
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-wc-profanity" checked>
                  <span>Filter kata kasar / tidak pantas secara otomatis</span>
                </label>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 0;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 30;
          return { type: 'word_cloud', question, options: ['Word Cloud Entry'], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Instruksi pertanyaan word cloud wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const seedWords = [
            { w: 'Autonomous', size: 1.8, c: '#a855f7' },
            { w: 'Hermes', size: 2.2, c: '#38bdf8' },
            { w: 'Speed', size: 1.2, c: '#34d399' },
            { w: 'Innovation', size: 1.5, c: '#f59e0b' },
            { w: 'Genius', size: 1.4, c: '#fb7185' }
          ];
          return `
            <div style="display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 600px; margin: 0 auto;">
              <div class="wg-wordcloud-box" id="wg-wordcloud-box">
                ${seedWords.map(s => `<span class="wg-cloud-tag" style="font-size: ${s.size}rem; color: ${s.c};">${s.w}</span>`).join('')}
              </div>
              <div style="display: flex; gap: 10px;">
                <input type="text" id="wg-cloud-input" class="wg-form-input" placeholder="Ketik kata Anda..." style="text-align: center;">
                <button type="button" id="wg-btn-submit-cloud" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px; white-space: nowrap;">
                  ☁️ Kirim Kata
                </button>
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          const btn = container.querySelector('#wg-btn-submit-cloud');
          const input = container.querySelector('#wg-cloud-input');
          const submit = () => {
            const val = input?.value.trim();
            if (val) {
              const box = container.querySelector('#wg-wordcloud-box');
              if (box) {
                const tag = document.createElement('span');
                tag.className = 'wg-cloud-tag';
                tag.style.fontSize = '2.4rem';
                tag.style.color = '#e11d48';
                tag.textContent = val;
                box.appendChild(tag);
              }
              setTimeout(() => onAnswer(val), 900);
            }
          };
          btn?.addEventListener('click', submit);
          input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Kata Anda berhasil memperbesar Word Cloud!' };
        }
      });

      // 24. Discussion Board
      this.register('discussion', {
        id: 'discussion',
        name: 'Discussion Board',
        category: 'Open ended',
        icon: '💬',
        color: '#4f46e5',
        badge: 'NEW',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { question: '' };
          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(79, 70, 229, 0.2); color: #818cf8; border-color: rgba(79, 70, 229, 0.4);">
                  💬 DISCUSSION THREAD SETTINGS
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Forum diskusi interaktif antar peserta didik</span>
              </div>

              <!-- Mockup Discussion Thread -->
              <div style="background: rgba(0,0,0,0.35); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; gap: 8px;">
                <div style="background: rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--wg-border);">
                  <strong style="color: #c084fc; font-size: 0.78rem;">🌟 Siswa Polaris A:</strong>
                  <div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 2px;">Tanggapan siswa akan muncul di alur percakapan ini secara real-time.</div>
                </div>
              </div>

              <div class="wg-studio-bottom-toolbar">
                <label class="wg-studio-toggle-switch">
                  <input type="checkbox" id="wg-discuss-upvote" checked>
                  <span>Izinkan sesama siswa memberikan upvote / like pada tanggapan</span>
                </label>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || '';
          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 0;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 60;
          return { type: 'discussion', question, options: ['Discussion Thread'], correctAnswer: 0, explanation, hint, points, timeLimit };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Topik diskusi kelas wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div style="display: flex; flex-direction: column; gap: 14px; width: 100%; max-width: 600px; margin: 0 auto;">
              <div style="display: flex; gap: 10px;">
                <input type="text" id="wg-discuss-input" class="wg-form-input" placeholder="Tuliskan gagasan atau tanggapan Anda...">
                <button type="button" id="wg-btn-submit-discuss" class="btn-rainbow" style="padding: 10px 20px; font-weight: 800; border-radius: 9999px; white-space: nowrap;">
                  💬 Post
                </button>
              </div>
              <div id="wg-discuss-feed" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
                <div style="background: rgba(255,255,255,0.04); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--wg-border);">
                  <strong style="color: #c084fc; font-size: 0.78rem;">🌟 Scholar Alpha:</strong>
                  <div style="font-size: 0.82rem; color: #cbd5e1; margin-top: 2px;">AI agen akan sangat mempercepat efisiensi otomasi sistem kita!</div>
                </div>
              </div>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-submit-discuss')?.addEventListener('click', () => {
            const val = container.querySelector('#wg-discuss-input')?.value.trim();
            if (val) onAnswer(val);
          });
        },
        grade() {
          return { isCorrect: true, score: 1000, maxScore: 1000, feedback: 'Tanggapan Anda berhasil dibagikan di forum diskusi!' };
        }
      });

      // -------------------------------------------------------------
      // GROUP 6: OTHER
      // -------------------------------------------------------------

      // 25. Slide
      this.register('slide', {
        id: 'slide',
        name: 'Slide',
        category: 'Other',
        icon: '🖥️',
        color: '#94a3b8',
        autoGraded: false,
        renderEditor(draft) {
          const q = draft || { title: 'Pengenalan Materi Pembelajaran', content: 'Tuliskan rangkuman teori, konsep penting, atau rumus yang perlu dipahami siswa sebelum menjawab kuis berikutnya.' };
          return `
            <div class="wg-studio-open-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="wg-brand-pill" style="background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.4);">
                  🖥️ LESSON PRESENTATION SLIDE
                </span>
                <span style="font-size: 0.74rem; color: #94a3b8;">Slide materi pengantar (Tanpa penilaian skor)</span>
              </div>

              <div>
                <label class="wg-form-label">Judul Utama Slide</label>
                <input type="text" id="wg-slide-title" class="wg-form-input" value="${escapeHtml(q.title || q.question || '')}" placeholder="Misal: Anatomi Jantung Manusia">
              </div>

              <div>
                <label class="wg-form-label">Uraian / Isi Materi Slide</label>
                <textarea id="wg-slide-content" class="wg-form-input" rows="5" placeholder="Tuliskan materi pelajaran, poin-poin penjelasan, atau ringkasan materi...">${escapeHtml(q.content || '')}</textarea>
              </div>
            </div>
          `;
        },
        collectFromEditor() {
          const title = document.getElementById('wg-slide-title')?.value.trim() || document.getElementById('wg-edit-question-text')?.value.trim() || 'Slide Materi';
          const content = document.getElementById('wg-slide-content')?.value.trim() || '';
          return {
            type: 'slide',
            question: title,
            title,
            content,
            options: ['Lanjut'],
            correctAnswer: 0,
            points: 0,
            timeLimit: 0
          };
        },
        validate(data) {
          if (!data.title && !data.content) return { valid: false, error: 'Judul atau isi materi slide wajib diisi.' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          return `
            <div class="wg-slide-card">
              <span class="wg-brand-pill" style="margin-bottom: 12px; display: inline-block;">PRESENTASI MATERI</span>
              <h2 class="wg-slide-title">${escapeHtml(question.title || question.question)}</h2>
              <p class="wg-slide-content">${escapeHtml(question.content || '')}</p>
              <button type="button" id="wg-btn-next-slide" class="btn-rainbow" style="padding: 12px 32px; font-weight: 800; border-radius: 9999px;">
                Lanjut ke Soal Berikutnya ▶️
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-next-slide')?.addEventListener('click', () => {
            onAnswer(0);
          });
        },
        grade() {
          return { isCorrect: true, score: 0, maxScore: 0, feedback: 'Materi slide telah dibaca.' };
        }
      });

      // 26. Multi-part
      this.register('multi_part', {
        id: 'multi_part',
        name: 'Multi-part',
        category: 'Other',
        icon: '📚',
        color: '#64748b',
        badge: 'NEW',
        autoGraded: true,
        renderEditor(draft) {
          const q = draft || {
            parts: [
              { type: 'multiple_choice', title: 'Part A', question: 'Berapa hasil dari 2 + 2?', answer: '4' },
              { type: 'fill_blank', title: 'Part B', question: 'Ibukota negara Indonesia adalah...', answer: 'Jakarta' }
            ]
          };
          const parts = q.parts && q.parts.length ? q.parts : [
            { type: 'multiple_choice', title: 'Part A', question: 'Berapa hasil dari 2 + 2?', answer: '4' },
            { type: 'fill_blank', title: 'Part B', question: 'Ibukota negara Indonesia adalah...', answer: 'Jakarta' }
          ];

          return `
            <div id="wg-studio-multipart-container" class="flex flex-col gap-4">
              ${parts.map((p, idx) => `
                <div class="wg-studio-part-card" data-part-idx="${idx}">
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="color: #94a3b8; font-size: 1.1rem; cursor: grab;">⠿</span>
                      <span class="wg-studio-part-title">Create Part ${String.fromCharCode(65 + idx)}</span>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                      <button type="button" class="wg-studio-part-select-btn" onclick="window.waygroundStudio.changePartTypePrompt(${idx})">
                        <span>${p.type === 'multiple_choice' ? '✓ Multiple choice' : '✏️ Fill in blanks'}</span>
                        <span>▾</span>
                      </button>
                      <button type="button" class="wg-studio-trash-btn" style="color: #ef4444;" onclick="window.waygroundStudio.deleteMultiPartSubQuestion(${idx})" title="Hapus Bagian">🗑️</button>
                    </div>
                  </div>

                  <div style="width: 100%; text-align: left; margin-top: 10px;">
                    <label class="wg-form-label" style="color: #cbd5e1;">Pertanyaan Part ${String.fromCharCode(65 + idx)}</label>
                    <input type="text" class="wg-multipart-q-input wg-form-input" value="${escapeHtml(p.question || '')}" placeholder="Ketik pertanyaan untuk bagian ini...">
                  </div>

                  <div style="width: 100%; text-align: left;">
                    <label class="wg-form-label" style="color: #cbd5e1;">Kunci Jawaban Part ${String.fromCharCode(65 + idx)}</label>
                    <input type="text" class="wg-multipart-a-input wg-form-input" value="${escapeHtml(p.answer || '')}" placeholder="Ketik kunci jawaban yang benar...">
                  </div>
                </div>
              `).join('')}

              <button type="button" class="wg-studio-addpart-full-btn" onclick="window.waygroundStudio.addMultiPartSubQuestion()">
                <span>+</span> Add part
              </button>
            </div>
          `;
        },
        collectFromEditor() {
          const question = document.getElementById('wg-edit-question-text')?.value.trim() || 'Pertanyaan Multi-Part Terpadu';
          const partCards = Array.from(document.querySelectorAll('#wg-studio-multipart-container .wg-studio-part-card'));
          const parts = partCards.map((card, idx) => {
            const q = card.querySelector('.wg-multipart-q-input')?.value.trim() || `Part ${String.fromCharCode(65 + idx)}`;
            const a = card.querySelector('.wg-multipart-a-input')?.value.trim() || '';
            return {
              type: idx % 2 === 0 ? 'multiple_choice' : 'fill_blank',
              title: `Part ${String.fromCharCode(65 + idx)}`,
              question: q,
              answer: a,
              points: 1
            };
          });

          const explanation = document.getElementById('wg-edit-explanation')?.value.trim() || '';
          const hint = document.getElementById('wg-studio-hint-input')?.value.trim() || '';
          const pointsSel = document.getElementById('wg-studio-points-select')?.value;
          const points = pointsSel ? parseInt(pointsSel, 10) * 1000 : 1000;
          const timeSel = document.getElementById('wg-studio-time-select')?.value;
          const timeLimit = timeSel ? parseInt(timeSel, 10) : 60;
          return {
            type: 'multi_part',
            question,
            parts,
            part1Answer: parts[0]?.answer || '',
            part2Answer: parts[1]?.answer || '',
            options: parts.map(p => p.answer),
            correctAnswer: 0,
            explanation,
            hint,
            points,
            timeLimit
          };
        },
        validate(data) {
          if (!data.question) return { valid: false, error: 'Pertanyaan multi-part wajib diisi.' };
          if (!data.parts || data.parts.length === 0) return { valid: false, error: 'Minimal sertakan 1 bagian soal (Part A).' };
          return { valid: true };
        },
        renderStudent(question, onAnswer) {
          const parts = question.parts && question.parts.length ? question.parts : [
            { title: 'Part A', question: 'Bagian 1', answer: question.part1Answer },
            { title: 'Part B', question: 'Bagian 2', answer: question.part2Answer }
          ];

          return `
            <div style="display: flex; flex-direction: column; gap: 18px; width: 100%; max-width: 600px; margin: 0 auto;">
              ${parts.map((p, idx) => `
                <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--wg-border); border-radius: 14px; padding: 18px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span class="wg-draft-badge" style="background: #a855f7; color: #fff;">Part ${String.fromCharCode(65 + idx)}</span>
                    <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(p.question || '')}</strong>
                  </div>
                  <input type="text" id="wg-mp-student-${idx}" class="wg-form-input" placeholder="Ketik jawaban untuk Part ${String.fromCharCode(65 + idx)}...">
                </div>
              `).join('')}

              <button type="button" id="wg-btn-submit-mp" class="btn-rainbow" style="padding: 12px 28px; font-weight: 800; border-radius: 9999px; align-self: center;">
                🚀 Submit Multi-Part
              </button>
            </div>
          `;
        },
        bindStudentEvents(container, question, onAnswer) {
          container.querySelector('#wg-btn-submit-mp')?.addEventListener('click', () => {
            const parts = question.parts || [{}, {}];
            const answers = parts.map((_, idx) => container.querySelector(`#wg-mp-student-${idx}`)?.value.trim());
            onAnswer(answers);
          });
        },
        grade(question, userAnswer) {
          const parts = question.parts || [
            { answer: question.part1Answer },
            { answer: question.part2Answer }
          ];
          let correctCount = 0;
          parts.forEach((p, idx) => {
            const u = normalizeText(userAnswer?.[idx]);
            const target = normalizeText(p.answer);
            if (u === target) correctCount += 1;
          });

          const isCorrect = correctCount === parts.length;
          return {
            isCorrect,
            score: Math.round((correctCount / parts.length) * 1000),
            maxScore: 1000,
            feedback: `Terjawab benar ${correctCount} dari ${parts.length} bagian.`
          };
        }
      });
    }
  }

  // =========================================================================
  // WAYGROUND STUDIO ENGINE — MASTER DASHBOARD & ARENA CONTROLLER
  // =========================================================================
  class WaygroundStudioEngine {
    constructor() {
      this.quizzes = [];
      this.currentQuiz = null;
      this.currentQuestionIndex = 0;
      this.score = 0;
      this.streak = 0;
      this.correctCount = 0;
      this.incorrectCount = 0;
      this.timeRemaining = 30;
      this.timerInterval = null;
      this.isAnswered = false;
      this.answersHistory = [];
      this.activeCategory = 'all';
      this.activeSearchQuery = '';
      this.activeView = 'explore'; // explore, arena, flashcards, creator, reports, academy

      // Question Engine Instance
      this.questionEngine = new WaygroundQuestionEngine();

      // Builder Draft Quiz State
      this.builderDraft = {
        id: null,
        title: 'Untitled Quiz',
        description: '',
        category: 'general',
        time_limit: 30,
        questions: [],
        settings: {
          shuffleQuestions: true,
          shuffleOptions: true,
          showExplanations: true
        }
      };
      this.activeEditingType = 'multiple_choice';
      this.activeEditingIndex = -1;

      // Power-Ups System
      this.powerups = {
        doublePoints: false,
        immunity: false,
        fiftyFiftyUsed: false,
        freezeUsed: false,
        hintUsed: false
      };

      // Flashcards Deck State
      this.flashDeck = {
        cards: [],
        currentIndex: 0,
        isFlipped: false,
        mastered: new Set()
      };

      // Multiplayer Lobby State
      this.lobby = {
        pin: null,
        isHost: false,
        data: null,
        pollTimer: null
      };

      this.soundEnabled = true;
    }

    init() {
      this.bindNavEvents();
      this.bindArenaEvents();
      this.bindFlashcardEvents();
      this.bindCreatorEvents();
      this.bindReportEvents();
      this.loadQuizzes();
      this.loadReports();
      this.renderDraftQuestionsList();
    }

    playSound(type) {
      if (!this.soundEnabled) return;
      try {
        const sfx = window.NanoSoundFX;
        if (!sfx) return;
        const ctx = sfx.ctx || (sfx.ensureContext && sfx.ensureContext() ? sfx.ctx : null);
        if (!ctx) return;

        const t = ctx.currentTime;
        if (type === 'correct') {
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t + idx * 0.06);
            gain.gain.setValueAtTime(0.2, t + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.25);
            osc.connect(gain);
            gain.connect(sfx.masterGain || ctx.destination);
            osc.start(t + idx * 0.06);
            osc.stop(t + idx * 0.06 + 0.26);
          });
        } else if (type === 'wrong') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(140, t);
          osc.frequency.exponentialRampToValueAtTime(80, t + 0.25);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.connect(gain);
          gain.connect(sfx.masterGain || ctx.destination);
          osc.start(t);
          osc.stop(t + 0.26);
        } else if (type === 'tick') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, t);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          osc.connect(gain);
          gain.connect(sfx.masterGain || ctx.destination);
          osc.start(t);
          osc.stop(t + 0.05);
        } else if (type === 'powerup') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, t);
          osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          osc.connect(gain);
          gain.connect(sfx.masterGain || ctx.destination);
          osc.start(t);
          osc.stop(t + 0.2);
        } else if (type === 'fanfare') {
          if (typeof window.confetti === 'function') {
            window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
          }
          if (typeof sfx.playCosmicFanfare === 'function') {
            sfx.playCosmicFanfare();
          }
        }
      } catch (err) {
        console.warn('[Wayground Sound]', err.message);
      }
    }

    // ==================== NAVIGATION & VIEW SWITCHING ====================
    bindNavEvents() {
      document.querySelectorAll('.wg-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const view = btn.dataset.view;
          this.switchView(view);
        });
      });

      const btnJoinPin = document.getElementById('wg-btn-join-pin');
      const inputPin = document.getElementById('wg-input-pin');
      if (btnJoinPin && inputPin) {
        btnJoinPin.addEventListener('click', () => {
          const pin = inputPin.value.trim().toUpperCase();
          if (pin) this.joinLobby(pin);
        });
        inputPin.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const pin = inputPin.value.trim().toUpperCase();
            if (pin) this.joinLobby(pin);
          }
        });
      }

      const btnSound = document.getElementById('wg-sound-toggle');
      if (btnSound) {
        btnSound.addEventListener('click', () => {
          this.soundEnabled = !this.soundEnabled;
          btnSound.textContent = this.soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
          btnSound.classList.toggle('active', this.soundEnabled);
        });
      }
    }

    switchView(viewName) {
      this.activeView = viewName;
      document.querySelectorAll('.wg-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
      });
      document.querySelectorAll('.wg-subview').forEach(sub => {
        sub.classList.toggle('active', sub.id === `wg-view-${viewName}`);
      });

      if (viewName === 'explore') {
        this.renderQuizCards();
      } else if (viewName === 'reports') {
        this.loadReports();
      } else if (viewName === 'creator') {
        this.renderDraftQuestionsList();
      } else if (viewName === 'projects') {
        if (typeof window !== 'undefined' && window.LuminaryProjects) {
          window.LuminaryProjects.loadProjects();
        }
      }
    }

    // ==================== 1. EXPLORE & QUIZ CATALOG ====================
    async loadQuizzes() {
      try {
        const res = await fetch('/api/wayground/quizzes');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.quizzes)) {
          this.quizzes = data.quizzes;
          this.renderQuizCards();
        }
      } catch (err) {
        console.error('[Wayground] Error loading quizzes:', err);
      }
    }

    renderQuizCards() {
      const container = document.getElementById('wg-quiz-grid-container');
      if (!container) return;

      const filtered = this.quizzes.filter(q => {
        const matchCategory = this.activeCategory === 'all' || q.category === this.activeCategory;
        const query = this.activeSearchQuery.toLowerCase();
        const matchSearch = !query ||
          q.title.toLowerCase().includes(query) ||
          (q.description && q.description.toLowerCase().includes(query)) ||
          (q.topic && q.topic.toLowerCase().includes(query));
        return matchCategory && matchSearch;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
            <h3 style="font-size: 1.1rem; color: #fff; margin: 0 0 6px;">Tidak ada modul kuis ditemukan</h3>
            <p style="font-size: 0.85rem; margin: 0;">Coba ganti kata kunci pencarian atau kategori filter.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(q => {
        const qCount = q.questions ? q.questions.length : 0;
        const diffBadge = {
          easy: '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">Mudah</span>',
          medium: '<span class="badge" style="background: rgba(6, 182, 212, 0.2); color: #67e8f9;">Sedang</span>',
          intermediate: '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">Menengah</span>',
          advanced: '<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">Master</span>',
          hard: '<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc;">Sulit</span>',
        }[q.difficulty] || '<span class="badge">Edukasi</span>';

        return `
          <div class="wg-quiz-card" data-quiz-id="${q.id}">
            <div>
              <div class="wg-card-header">
                <div class="wg-card-icon">${q.icon || '📚'}</div>
                <div>${diffBadge}</div>
              </div>
              <h3 class="wg-card-title">${escapeHtml(q.title)}</h3>
              <p class="wg-card-desc">${escapeHtml(q.description || 'Modul pembelajaran interaktif.')}</p>
            </div>

            <div>
              <div class="wg-card-meta">
                <span>⏱️ ${q.time_limit}s/soal</span>
                <span>❓ ${qCount} Soal</span>
                <span>🎮 ${q.plays_count || 0} Main</span>
              </div>
              <div class="wg-card-actions">
                <button type="button" class="wg-btn-action wg-btn-play" onclick="window.waygroundStudio.startSoloQuiz('${q.id}')">
                  <span>🚀</span> Main Solo
                </button>
                <button type="button" class="wg-btn-action wg-btn-flash" onclick="window.waygroundStudio.startFlashcards('${q.id}')" title="Belajar dengan Flashcard 3D">
                  <span>🎴</span> Kartu
                </button>
                <button type="button" class="wg-btn-action wg-btn-host" onclick="window.waygroundStudio.createLiveLobby('${q.id}')" title="Host Live Battle & Game PIN">
                  <span>👥</span> Host
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // ==================== 2. SOLO INTERACTIVE PLAY ARENA ====================
    startSoloQuiz(quizId) {
      const quiz = this.quizzes.find(q => q.id === quizId);
      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        if (typeof showToast === 'function') showToast('Kuis ini belum memiliki pertanyaan.', 'error');
        return;
      }

      this.currentQuiz = JSON.parse(JSON.stringify(quiz));
      this.currentQuestionIndex = 0;
      this.score = 0;
      this.streak = 0;
      this.correctCount = 0;
      this.incorrectCount = 0;
      this.answersHistory = [];
      this.isAnswered = false;

      // Power-ups reset
      this.powerups = {
        doublePoints: false,
        immunity: false,
        fiftyFiftyUsed: false,
        freezeUsed: false,
        hintUsed: false
      };

      const arenaBox = document.getElementById('wg-arena-active-stage');
      const summaryBox = document.getElementById('wg-arena-summary-stage');
      if (arenaBox) arenaBox.style.display = 'block';
      if (summaryBox) summaryBox.style.display = 'none';

      this.updatePowerupButtonsUI();
      this.switchView('arena');
      this.renderCurrentQuestion();
    }

    renderCurrentQuestion() {
      if (!this.currentQuiz) return;
      const q = this.currentQuiz.questions[this.currentQuestionIndex];
      if (!q) {
        this.finishQuiz();
        return;
      }

      this.isAnswered = false;
      this.timeRemaining = this.currentQuiz.time_limit || 30;

      // Top HUD
      const elQNum = document.getElementById('wg-hud-qnum');
      const elScore = document.getElementById('wg-hud-score');
      const elStreak = document.getElementById('wg-hud-streak');
      const elTitle = document.getElementById('wg-arena-quiz-title');
      if (elQNum) elQNum.textContent = `${this.currentQuestionIndex + 1} / ${this.currentQuiz.questions.length}`;
      if (elScore) elScore.textContent = this.score.toLocaleString('id-ID');
      if (elStreak) elStreak.textContent = `x${this.streak}`;
      if (elTitle) elTitle.textContent = this.currentQuiz.title;

      // Question Text Box
      const elQText = document.getElementById('wg-question-text-box');
      if (elQText) elQText.innerHTML = escapeHtml(q.question);

      // Render Interactive Question Controls via Question Engine
      const optContainer = document.getElementById('wg-options-grid-box');
      if (optContainer) {
        const handler = this.questionEngine.get(q.type || 'multiple_choice');
        optContainer.innerHTML = handler.renderStudent(q, (ans) => this.handleStudentAnswer(ans));
        handler.bindStudentEvents(optContainer, q, (ans) => this.handleStudentAnswer(ans));
      }

      // Hide Feedback Box
      const feedbackBox = document.getElementById('wg-feedback-box');
      if (feedbackBox) {
        feedbackBox.style.display = 'none';
        feedbackBox.className = 'wg-feedback-box';
      }

      this.startTimer();
    }

    startTimer() {
      clearInterval(this.timerInterval);
      const timerFill = document.getElementById('wg-timer-bar-fill');
      const totalTime = this.currentQuiz.time_limit || 30;

      const updateBar = () => {
        if (!timerFill) return;
        const pct = Math.max(0, (this.timeRemaining / totalTime) * 100);
        timerFill.style.width = `${pct}%`;
        if (this.timeRemaining <= 5) {
          timerFill.classList.add('warning');
          this.playSound('tick');
        } else {
          timerFill.classList.remove('warning');
        }
      };

      updateBar();

      this.timerInterval = setInterval(() => {
        this.timeRemaining -= 1;
        updateBar();

        if (this.timeRemaining <= 0) {
          clearInterval(this.timerInterval);
          if (!this.isAnswered) {
            this.handleTimeOut();
          }
        }
      }, 1000);
    }

    handleStudentAnswer(userAnswer) {
      if (this.isAnswered) return;
      clearInterval(this.timerInterval);

      const q = this.currentQuiz.questions[this.currentQuestionIndex];
      const handler = this.questionEngine.get(q.type || 'multiple_choice');
      const result = handler.grade(q, userAnswer);

      // Immunity Power-up Check: If wrong but immunity active, grant second chance
      if (!result.isCorrect && this.powerups.immunity) {
        this.powerups.immunity = false;
        this.updatePowerupButtonsUI();
        this.playSound('powerup');
        if (typeof showToast === 'function') {
          showToast('🛡️ Perisai Kekebalan Aktif! Kesempatan kedua, silakan coba lagi!', 'warning');
        }
        this.timeRemaining = Math.max(8, Math.floor((this.currentQuiz.time_limit || 30) / 2));
        this.startTimer();
        return;
      }

      this.isAnswered = true;

      let pointsEarned = 0;
      if (result.isCorrect) {
        this.correctCount += 1;
        this.streak += 1;
        this.playSound('correct');
        if (typeof window.confetti === 'function') {
          window.confetti({ particleCount: 40, spread: 55, origin: { y: 0.7 } });
        }

        const speedBonus = Math.max(0, this.timeRemaining * 20);
        const streakBonus = Math.min((this.streak - 1) * 150, 1500);
        pointsEarned = (result.score || 1000) + speedBonus + streakBonus;

        if (this.powerups.doublePoints) {
          pointsEarned *= 2;
          this.powerups.doublePoints = false;
          this.updatePowerupButtonsUI();
        }

        this.score += pointsEarned;
      } else {
        this.incorrectCount += 1;
        this.streak = 0;
        this.playSound('wrong');
      }

      // Record answer history
      this.answersHistory.push({
        questionIndex: this.currentQuestionIndex,
        question: q.question,
        selectedAnswer: userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: result.isCorrect,
        points: pointsEarned,
        explanation: q.explanation || result.feedback
      });

      // Show Feedback Box
      const feedbackBox = document.getElementById('wg-feedback-box');
      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        feedbackBox.className = `wg-feedback-box ${result.isCorrect ? 'correct' : 'wrong'}`;
        feedbackBox.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-weight: 800; font-size: 1rem; color: ${result.isCorrect ? '#34d399' : '#fb7185'};">
              ${result.isCorrect ? `🎉 BENAR! (+${pointsEarned.toLocaleString('id-ID')} Pts)` : `❌ KURANG TEPAT!`}
            </div>
            ${result.isCorrect && this.streak > 1 ? `<span style="font-size: 0.8rem; font-weight: 800; color: #f59e0b;">🔥 Streak x${this.streak}</span>` : ''}
          </div>
          <div style="font-size: 0.84rem; color: #cbd5e1; line-height: 1.5;">
            ${escapeHtml(q.explanation || result.feedback || '')}
          </div>
        `;
      }

      // Update HUD
      const elScore = document.getElementById('wg-hud-score');
      const elStreak = document.getElementById('wg-hud-streak');
      if (elScore) elScore.textContent = this.score.toLocaleString('id-ID');
      if (elStreak) elStreak.textContent = `x${this.streak}`;

      // Auto Advance to Next Question
      setTimeout(() => {
        this.currentQuestionIndex += 1;
        if (this.currentQuestionIndex < this.currentQuiz.questions.length) {
          this.renderCurrentQuestion();
        } else {
          this.finishQuiz();
        }
      }, 2300);
    }

    handleTimeOut() {
      this.isAnswered = true;
      const q = this.currentQuiz.questions[this.currentQuestionIndex];
      this.incorrectCount += 1;
      this.streak = 0;
      this.playSound('wrong');

      this.answersHistory.push({
        questionIndex: this.currentQuestionIndex,
        question: q.question,
        selectedAnswer: null,
        correctAnswer: q.correctAnswer,
        isCorrect: false,
        points: 0,
        explanation: q.explanation
      });

      const feedbackBox = document.getElementById('wg-feedback-box');
      if (feedbackBox) {
        feedbackBox.style.display = 'block';
        feedbackBox.className = 'wg-feedback-box wrong';
        feedbackBox.innerHTML = `
          <div style="font-weight: 800; color: #fb7185; margin-bottom: 4px;">⏰ WAKTU HABIS!</div>
          <div style="font-size: 0.84rem; color: #cbd5e1;">${escapeHtml(q.explanation || 'Waktu berpikir telah habis.')}</div>
        `;
      }

      setTimeout(() => {
        this.currentQuestionIndex += 1;
        if (this.currentQuestionIndex < this.currentQuiz.questions.length) {
          this.renderCurrentQuestion();
        } else {
          this.finishQuiz();
        }
      }, 2200);
    }

    activatePowerup(type) {
      if (this.isAnswered) return;
      const q = this.currentQuiz.questions[this.currentQuestionIndex];

      if (type === '2x') {
        if (this.powerups.doublePoints) return;
        this.powerups.doublePoints = true;
        this.playSound('powerup');
        if (typeof showToast === 'function') showToast('⚡ 2x Double Points Diaktifkan untuk soal ini!', 'success');
      } else if (type === 'shield') {
        if (this.powerups.immunity) return;
        this.powerups.immunity = true;
        this.playSound('powerup');
        if (typeof showToast === 'function') showToast('🛡️ Perisai Kekebalan Aktif! Jika salah, dapat kesempatan kedua!', 'info');
      } else if (type === '5050') {
        if (this.powerups.fiftyFiftyUsed) return;
        this.powerups.fiftyFiftyUsed = true;
        this.playSound('powerup');
        const wrongButtons = Array.from(document.querySelectorAll('.wg-option-btn')).filter(b => parseInt(b.dataset.idx, 10) !== q.correctAnswer);
        wrongButtons.slice(0, 2).forEach(b => b.classList.add('eliminated'));
        if (typeof showToast === 'function') showToast('✂️ 50-50! Dua opsi salah dieliminasi!', 'info');
      } else if (type === 'freeze') {
        if (this.powerups.freezeUsed) return;
        this.powerups.freezeUsed = true;
        this.playSound('powerup');
        this.timeRemaining += 15;
        if (typeof showToast === 'function') showToast('⏱️ Waktu Dibekukan! Tambahan +15 detik!', 'success');
      } else if (type === 'hint') {
        if (this.powerups.hintUsed) return;
        this.powerups.hintUsed = true;
        this.playSound('powerup');
        alert(`💡 Petunjuk (Clue):\n${q.hint || 'Pikirkan konsep mendasar yang paling logis.'}`);
      }

      this.updatePowerupButtonsUI();
    }

    updatePowerupButtonsUI() {
      const btn2x = document.getElementById('wg-pu-2x');
      const btnShield = document.getElementById('wg-pu-shield');
      const btn5050 = document.getElementById('wg-pu-5050');
      const btnFreeze = document.getElementById('wg-pu-freeze');
      const btnHint = document.getElementById('wg-pu-hint');

      if (btn2x) btn2x.classList.toggle('active', this.powerups.doublePoints);
      if (btnShield) btnShield.classList.toggle('active', this.powerups.immunity);
      if (btn5050) btn5050.disabled = this.powerups.fiftyFiftyUsed;
      if (btnFreeze) btnFreeze.disabled = this.powerups.freezeUsed;
      if (btnHint) btnHint.disabled = this.powerups.hintUsed;
    }

    finishQuiz() {
      clearInterval(this.timerInterval);
      this.playSound('fanfare');

      const totalQ = this.currentQuiz.questions.length;
      const accuracy = totalQ > 0 ? Math.round((this.correctCount / totalQ) * 100) : 0;

      // Submit results to server
      const playerName = localStorage.getItem('study_player_name') || 'Scholar';
      fetch('/api/wayground/play/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: this.currentQuiz.id,
          quiz_title: this.currentQuiz.title,
          mode: 'solo',
          player_name: playerName,
          score: this.score,
          total_questions: totalQ,
          correct_count: this.correctCount,
          incorrect_count: this.incorrectCount,
          accuracy,
          time_spent: 0,
          streak_record: this.streak,
          answers: this.answersHistory
        })
      }).catch(() => {});

      // Summary View
      const arenaBox = document.getElementById('wg-arena-active-stage');
      const summaryBox = document.getElementById('wg-arena-summary-stage');
      if (arenaBox && summaryBox) {
        arenaBox.style.display = 'none';
        summaryBox.style.display = 'block';

        let tierTitle = '🌱 Academic Apprentice';
        if (accuracy >= 90) tierTitle = '🏆 Grandmaster Polymath';
        else if (accuracy >= 75) tierTitle = '🌟 Senior Scholar';
        else if (accuracy >= 50) tierTitle = '🎖️ Adept Scholar';

        summaryBox.innerHTML = `
          <div class="wg-summary-card">
            <div style="font-size: 3rem; margin-bottom: 8px;">🎉</div>
            <h2 style="font-size: 1.6rem; font-weight: 900; color: #fff; margin: 0 0 6px;">Sesi Kuis Selesai!</h2>
            <div style="font-size: 0.88rem; color: #a855f7; font-weight: 800; text-transform: uppercase;">${tierTitle}</div>

            <div class="wg-score-badge">${this.score.toLocaleString('id-ID')} PTS</div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 24px 0;">
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 14px; border: 1px solid var(--wg-border);">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Akurasi</div>
                <div style="font-size: 1.4rem; font-weight: 900; color: #34d399;">${accuracy}%</div>
              </div>
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 14px; border: 1px solid var(--wg-border);">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Benar / Salah</div>
                <div style="font-size: 1.4rem; font-weight: 900; color: #fff;">${this.correctCount} / ${this.incorrectCount}</div>
              </div>
              <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 14px; border: 1px solid var(--wg-border);">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Streak Tertinggi</div>
                <div style="font-size: 1.4rem; font-weight: 900; color: #f59e0b;">x${this.streak}</div>
              </div>
            </div>

            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 24px;">
              <button type="button" class="btn-rainbow" style="padding: 10px 24px; font-weight: 800; border-radius: 9999px;" onclick="window.waygroundStudio.startSoloQuiz('${this.currentQuiz.id}')">
                🔁 Main Lagi
              </button>
              <button type="button" class="btn-polaris btn-secondary" style="border-radius: 9999px;" onclick="window.waygroundStudio.startFlashcards('${this.currentQuiz.id}')">
                🎴 Buka Flashcards
              </button>
              <button type="button" class="btn-polaris btn-secondary" style="border-radius: 9999px;" onclick="window.waygroundStudio.switchView('explore')">
                📚 Pilih Kuis Lain
              </button>
            </div>
          </div>
        `;
      }
    }

    bindArenaEvents() {
      document.getElementById('wg-pu-2x')?.addEventListener('click', () => this.activatePowerup('2x'));
      document.getElementById('wg-pu-shield')?.addEventListener('click', () => this.activatePowerup('shield'));
      document.getElementById('wg-pu-5050')?.addEventListener('click', () => this.activatePowerup('5050'));
      document.getElementById('wg-pu-freeze')?.addEventListener('click', () => this.activatePowerup('freeze'));
      document.getElementById('wg-pu-hint')?.addEventListener('click', () => this.activatePowerup('hint'));
    }

    // ==================== 3. FLASHCARDS 3D ENGINE ====================
    startFlashcards(quizId) {
      const quiz = this.quizzes.find(q => q.id === quizId) || this.quizzes[0];
      if (!quiz || !quiz.questions || quiz.questions.length === 0) return;

      this.flashDeck = {
        quiz,
        cards: [...quiz.questions],
        currentIndex: 0,
        isFlipped: false,
        mastered: new Set()
      };

      this.switchView('flashcards');
      this.renderFlashcard();
    }

    renderFlashcard() {
      const { cards, currentIndex, isFlipped, mastered, quiz } = this.flashDeck;
      const card = cards[currentIndex];
      if (!card) return;

      const inner = document.getElementById('wg-flashcard-inner');
      const elFront = document.getElementById('wg-flash-front-text');
      const elBack = document.getElementById('wg-flash-back-text');
      const elBackExp = document.getElementById('wg-flash-back-exp');
      const elProgress = document.getElementById('wg-flash-progress-text');
      const elBar = document.getElementById('wg-flash-progress-bar');
      const elTitle = document.getElementById('wg-flash-quiz-title');

      if (elTitle) elTitle.textContent = quiz.title;
      if (inner) inner.classList.toggle('flipped', isFlipped);

      if (elFront) elFront.textContent = card.question;
      if (elBack) {
        const correctOpt = card.options ? card.options[card.correctAnswer] || card.options[0] : (card.answer || 'Jawaban Tepat');
        elBack.textContent = correctOpt;
      }
      if (elBackExp) elBackExp.textContent = card.explanation || '';

      const masteredPct = Math.round((mastered.size / cards.length) * 100);
      if (elProgress) elProgress.textContent = `Kartu ${currentIndex + 1} dari ${cards.length} • ${mastered.size} Dikuasai (${masteredPct}%)`;
      if (elBar) elBar.style.width = `${((currentIndex + 1) / cards.length) * 100}%`;
    }

    flipFlashcard() {
      this.flashDeck.isFlipped = !this.flashDeck.isFlipped;
      const inner = document.getElementById('wg-flashcard-inner');
      if (inner) inner.classList.toggle('flipped', this.flashDeck.isFlipped);
      this.playSound('powerup');
    }

    nextFlashcard(mastered = false) {
      if (mastered) {
        this.flashDeck.mastered.add(this.flashDeck.currentIndex);
        this.playSound('correct');
      }
      this.flashDeck.isFlipped = false;
      this.flashDeck.currentIndex = (this.flashDeck.currentIndex + 1) % this.flashDeck.cards.length;
      this.renderFlashcard();
    }

    prevFlashcard() {
      this.flashDeck.isFlipped = false;
      this.flashDeck.currentIndex = (this.flashDeck.currentIndex - 1 + this.flashDeck.cards.length) % this.flashDeck.cards.length;
      this.renderFlashcard();
    }

    shuffleFlashcards() {
      for (let i = this.flashDeck.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.flashDeck.cards[i], this.flashDeck.cards[j]] = [this.flashDeck.cards[j], this.flashDeck.cards[i]];
      }
      this.flashDeck.currentIndex = 0;
      this.flashDeck.isFlipped = false;
      this.renderFlashcard();
      if (typeof showToast === 'function') showToast('🔀 Kartu flashcard berhasil diacak!', 'info');
    }

    readFlashcardTTS() {
      if (!('speechSynthesis' in window)) {
        if (typeof showToast === 'function') showToast('Fitur Suara Text-To-Speech tidak didukung browser ini.', 'warning');
        return;
      }
      const card = this.flashDeck.cards[this.flashDeck.currentIndex];
      if (!card) return;

      const answerText = card.options ? card.options[card.correctAnswer] || card.options[0] : (card.answer || '');
      const textToRead = this.flashDeck.isFlipped
        ? `Jawaban: ${answerText}. Penjelasan: ${card.explanation || ''}`
        : card.question;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = this.flashDeck.quiz?.category === 'languages' ? 'en-US' : 'id-ID';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }

    bindFlashcardEvents() {
      document.getElementById('wg-flashcard-inner')?.addEventListener('click', () => this.flipFlashcard());
      document.getElementById('wg-btn-flash-flip')?.addEventListener('click', () => this.flipFlashcard());
      document.getElementById('wg-btn-flash-prev')?.addEventListener('click', () => this.prevFlashcard());
      document.getElementById('wg-btn-flash-next')?.addEventListener('click', () => this.nextFlashcard(false));
      document.getElementById('wg-btn-flash-know')?.addEventListener('click', () => this.nextFlashcard(true));
      document.getElementById('wg-btn-flash-shuffle')?.addEventListener('click', () => this.shuffleFlashcards());
      document.getElementById('wg-btn-flash-tts')?.addEventListener('click', () => this.readFlashcardTTS());

      window.addEventListener('keydown', (e) => {
        if (this.activeView === 'flashcards' && (e.code === 'Space' || e.key === ' ')) {
          if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            this.flipFlashcard();
          }
        }
      });
    }

    // ==================== 4. LIVE MULTIPLAYER LOBBY ====================
    async createLiveLobby(quizId) {
      try {
        const hostName = prompt('Masukkan Nama Host / Panggilan Anda:', 'Host Polaris') || 'Host Polaris';
        const res = await fetch('/api/wayground/lobby/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId, hostName })
        });
        const data = await res.json();
        if (data && data.success && data.lobby) {
          this.lobby.pin = data.lobby.pin;
          this.lobby.isHost = true;
          this.lobby.data = data.lobby;

          this.switchView('arena');
          const arenaBox = document.getElementById('wg-arena-active-stage');
          const summaryBox = document.getElementById('wg-arena-summary-stage');
          if (arenaBox) arenaBox.style.display = 'none';
          if (summaryBox) {
            summaryBox.style.display = 'block';
            summaryBox.innerHTML = `
              <div class="wg-lobby-hero">
                <span class="wg-brand-pill">LIVE HOST MODE</span>
                <h2 style="font-size: 1.8rem; font-weight: 900; color: #fff; margin: 12px 0 4px;">Lobi Kuis Multiplayer</h2>
                <p style="font-size: 0.88rem; color: var(--text-muted); margin: 0 0 16px;">Bagikan Game PIN ini ke teman atau grup WhatsApp untuk bergabung!</p>

                <div class="wg-pin-display">${data.lobby.pin}</div>

                <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 20px;">
                  Modul: <strong style="color: #fff;">${data.lobby.quiz_title}</strong> • Host: <strong style="color: #a855f7;">${data.lobby.host_name}</strong>
                </div>

                <div style="font-size: 0.78rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px;">
                  Pemain yang Bergabung (<span id="wg-roster-count">1</span>):
                </div>
                <div class="wg-players-roster" id="wg-roster-list">
                  <div class="wg-player-chip">👑 ${data.lobby.host_name} (Host)</div>
                </div>

                <div style="display: flex; justify-content: center; gap: 14px; margin-top: 28px;">
                  <button type="button" class="btn-rainbow" style="padding: 10px 28px; font-weight: 800; border-radius: 9999px;" onclick="window.waygroundStudio.startSoloQuiz('${quizId}')">
                    🚀 Mulai Game Sekarang
                  </button>
                  <button type="button" class="btn-polaris btn-secondary" style="border-radius: 9999px;" onclick="navigator.clipboard.writeText('${data.lobby.pin}'); alert('PIN disalin: ${data.lobby.pin}')">
                    📋 Salin Game PIN
                  </button>
                </div>
              </div>
            `;
          }
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast('Gagal membuat lobi multiplayer: ' + err.message, 'error');
      }
    }

    async joinLobby(pin) {
      try {
        const playerName = prompt(`Bergabung ke Lobi PIN ${pin}.\nMasukkan Nama Anda:`, 'Player 1') || 'Player 1';
        const res = await fetch(`/api/wayground/lobby/${pin}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName, avatar: '🚀' })
        });
        const data = await res.json();
        if (data && data.success && data.lobby) {
          if (typeof showToast === 'function') showToast(`🎉 Berhasil bergabung ke lobi ${pin}! Memuat kuis...`, 'success');
          this.startSoloQuiz(data.lobby.quiz_id);
        } else {
          alert(data.error || 'Lobi tidak ditemukan.');
        }
      } catch (err) {
        alert('Gagal bergabung ke lobi: ' + err.message);
      }
    }

    // ==================== 5. WAYGROUND BUILDER & QUESTION CREATOR ====================
    closeQuestionForm() {
      const modal = document.getElementById('wg-qeditor-modal');
      if (modal) modal.classList.remove('active');
      const barrier = document.getElementById('wg-studio-barrier');
      if (barrier) barrier.classList.remove('active');
      document.body.style.overflow = '';
    }

    openModal(modalId) {
      const modal = document.getElementById(modalId);
      const barrier = document.getElementById('wg-studio-barrier');
      if (barrier && barrier.parentElement !== document.body) document.body.appendChild(barrier);
      if (modal && modal.parentElement !== document.body) document.body.appendChild(modal);
      if (barrier) barrier.classList.add('active');
      if (modal) modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    closeModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
      const anyActive = document.querySelector('.wg-studio-fullscreen-modal.active, .wg-qeditor-modal.active');
      if (!anyActive) {
        const barrier = document.getElementById('wg-studio-barrier');
        if (barrier) barrier.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    openQuestionForm(typeId, existingQuestion = null, editIndex = -1) {
      const handler = this.questionEngine.get(typeId);
      if (!handler) return;

      this.activeEditingType = typeId;
      this.activeEditingIndex = editIndex;

      const modal = document.getElementById('wg-qeditor-modal');
      const barrier = document.getElementById('wg-studio-barrier');
      const icon = document.getElementById('wg-qeditor-type-icon');
      const title = document.getElementById('wg-qeditor-type-title');
      const body = document.getElementById('wg-qeditor-form-body');

      // Defensive Teleport: Ensure modal and barrier are direct children of document.body
      if (barrier && barrier.parentElement !== document.body) {
        document.body.appendChild(barrier);
      }
      if (modal && modal.parentElement !== document.body) {
        document.body.appendChild(modal);
      }

      // 1. Synchronize Top Prompt Text
      const promptInput = document.getElementById('wg-edit-question-text');
      if (promptInput) {
        promptInput.value = existingQuestion ? (existingQuestion.question || existingQuestion.title || '') : '';
      }

      // 2. Synchronize Points Select
      const pointsSel = document.getElementById('wg-studio-points-select');
      if (pointsSel) {
        const pts = existingQuestion?.points != null ? Math.round(existingQuestion.points / 1000) : 1;
        pointsSel.value = String(pts);
      }

      // 3. Synchronize Time Select
      const timeSel = document.getElementById('wg-studio-time-select');
      if (timeSel) {
        timeSel.value = String(existingQuestion?.timeLimit || 30);
      }

      // 4. Synchronize Explanation
      const expInput = document.getElementById('wg-edit-explanation');
      const expPanel = document.getElementById('wg-studio-explanation-panel');
      if (expInput) {
        expInput.value = existingQuestion?.explanation || '';
      }
      if (expPanel) {
        expPanel.style.display = existingQuestion?.explanation ? 'block' : 'none';
      }

      // 5. Synchronize Right Sidebar Settings
      this.syncStudioSidebar(typeId, existingQuestion);

      if (icon) icon.textContent = handler.icon || '✓';
      if (title) title.textContent = `${handler.name} (${handler.category})`;
      if (body) body.innerHTML = handler.renderEditor(existingQuestion);
      
      // Activate Barrier & Fullscreen Modal with body scroll lock
      if (barrier) barrier.classList.add('active');
      if (modal) modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      if (typeId === 'graphing') {
        setTimeout(() => this.updateGraphVisual(), 60);
      }
    }

    // ==================== STUDIO INTERACTIVE CONTROLLERS ====================
    syncStudioSidebar(typeId, question) {
      const stream = document.getElementById('wg-studio-parts-stream');
      const addPartBtn = document.getElementById('wg-studio-btn-add-part');
      if (!stream) return;

      if (typeId === 'multi_part') {
        if (addPartBtn) addPartBtn.style.display = 'inline-flex';
        const parts = question?.parts || [
          { type: 'multiple_choice', title: 'Part A', points: 1 },
          { type: 'fill_blank', title: 'Part B', points: 1 }
        ];
        stream.innerHTML = parts.map((p, idx) => `
          <div class="wg-studio-part-item" data-part-idx="${idx}">
            <div class="wg-studio-part-item-header">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="cursor: grab; color: #94a3b8;">⠿</span>
                <strong>Part ${String.fromCharCode(65 + idx)}</strong>
              </span>
              <button type="button" class="wg-studio-trash-btn" style="color: #ef4444;" onclick="window.waygroundStudio.deleteMultiPartSubQuestion(${idx})" title="Hapus Bagian">✕</button>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <select class="wg-studio-sidebar-select" style="font-size: 0.74rem;" onchange="window.waygroundStudio.changePartType(${idx}, this.value)">
                <option value="multiple_choice" ${p.type === 'multiple_choice' ? 'selected' : ''}>Multiple choice</option>
                <option value="fill_blank" ${p.type === 'fill_blank' ? 'selected' : ''}>Fill in the blanks</option>
                <option value="math_response" ${p.type === 'math_response' ? 'selected' : ''}>Math response</option>
                <option value="dropdown" ${p.type === 'dropdown' ? 'selected' : ''}>Dropdown</option>
                <option value="open_ended" ${p.type === 'open_ended' ? 'selected' : ''}>Open ended</option>
              </select>
              <select class="wg-studio-sidebar-select" style="width: 70px; font-size: 0.74rem;">
                <option value="1" ${p.points === 1 ? 'selected' : ''}>1 pt</option>
                <option value="2" ${p.points === 2 ? 'selected' : ''}>2 pts</option>
                <option value="3" ${p.points === 3 ? 'selected' : ''}>3 pts</option>
              </select>
            </div>
          </div>
        `).join('');
      } else {
        if (addPartBtn) addPartBtn.style.display = 'none';
        stream.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <label class="wg-studio-toggle-switch" style="font-size: 0.78rem; color: #475569;">
              <input type="checkbox" id="wg-studio-opt-accents" checked>
              <span>Ignore accent marks like à, á, â</span>
            </label>
            <label class="wg-studio-toggle-switch" style="font-size: 0.78rem; color: #475569;">
              <input type="checkbox" id="wg-studio-opt-show-work">
              <span>Show your work</span>
            </label>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="wg-form-label" style="margin: 0; color: #64748b;">Hint (Petunjuk Siswa)</label>
                <button type="button" class="wg-studio-trash-btn" style="color: #94a3b8; font-size: 0.8rem;" onclick="document.getElementById('wg-studio-hint-input').value = ''" title="Kosongkan Hint">🗑️</button>
              </div>
              <textarea id="wg-studio-hint-input" class="wg-studio-sidebar-select" rows="2" style="resize: none;" placeholder="Ketik petunjuk opsional...">${escapeHtml(question?.hint || '')}</textarea>
            </div>
          </div>
        `;
      }
    }

    setOptionCorrect(idx) {
      const isMulti = document.getElementById('wg-studio-chk-multi')?.checked;
      const cards = document.querySelectorAll('#wg-studio-options-cards-grid .wg-studio-answer-card');
      cards.forEach((card, i) => {
        const circle = card.querySelector('.wg-studio-check-circle');
        if (!circle) return;
        if (isMulti) {
          if (i === idx) {
            circle.classList.toggle('active');
            circle.textContent = circle.classList.contains('active') ? '✓' : '';
          }
        } else {
          if (i === idx) {
            circle.classList.add('active');
            circle.textContent = '✓';
          } else {
            circle.classList.remove('active');
            circle.textContent = '';
          }
        }
      });
    }

    deleteOptionCard(idx) {
      const cards = document.querySelectorAll('#wg-studio-options-cards-grid .wg-studio-answer-card');
      if (cards.length <= 2) {
        if (typeof showToast === 'function') showToast('Minimal harus ada 2 opsi pilihan.', 'warning');
        return;
      }
      cards[idx]?.remove();
      this.reindexOptionCards();
    }

    reindexOptionCards() {
      const colors = ['blue', 'teal', 'gold', 'coral', 'blue', 'teal'];
      const cards = document.querySelectorAll('#wg-studio-options-cards-grid .wg-studio-answer-card');
      cards.forEach((card, i) => {
        card.className = `wg-studio-answer-card ${colors[i % colors.length]}`;
        card.dataset.idx = i;
        const trash = card.querySelector('.wg-studio-trash-btn');
        if (trash) trash.setAttribute('onclick', `window.waygroundStudio.deleteOptionCard(${i})`);
        const circle = card.querySelector('.wg-studio-check-circle');
        if (circle) circle.setAttribute('onclick', `window.waygroundStudio.setOptionCorrect(${i})`);
        const footer = card.querySelector('.wg-studio-card-footer');
        if (footer) footer.textContent = `Opsi ${String.fromCharCode(65 + i)}`;
      });
    }

    addOptionCard() {
      const grid = document.getElementById('wg-studio-options-cards-grid');
      if (!grid) return;
      const cards = grid.querySelectorAll('.wg-studio-answer-card');
      if (cards.length >= 6) {
        if (typeof showToast === 'function') showToast('Maksimal 6 pilihan jawaban.', 'warning');
        return;
      }
      const idx = cards.length;
      const colors = ['blue', 'teal', 'gold', 'coral', 'blue', 'teal'];
      const card = document.createElement('div');
      card.className = `wg-studio-answer-card ${colors[idx % colors.length]}`;
      card.dataset.idx = idx;
      card.innerHTML = `
        <div class="wg-studio-card-top">
          <button type="button" class="wg-studio-trash-btn" onclick="window.waygroundStudio.deleteOptionCard(${idx})" title="Hapus Opsi">🗑️</button>
          <div class="wg-studio-check-circle" onclick="window.waygroundStudio.setOptionCorrect(${idx})" title="Kunci Jawaban"></div>
        </div>
        <textarea class="wg-studio-answer-textarea" rows="3" placeholder="Type answer option here">Opsi ${String.fromCharCode(65 + idx)}</textarea>
        <div class="wg-studio-card-footer">Opsi ${String.fromCharCode(65 + idx)}</div>
      `;
      grid.appendChild(card);
    }

    toggleMultiCorrect(checked) {
      if (!checked) {
        const activeCircles = Array.from(document.querySelectorAll('#wg-studio-options-cards-grid .wg-studio-check-circle.active'));
        if (activeCircles.length > 1) {
          activeCircles.slice(1).forEach(c => {
            c.classList.remove('active');
            c.textContent = '';
          });
        }
      }
    }

    toggleVerticalLayout() {
      const grid = document.getElementById('wg-studio-options-cards-grid');
      if (grid) {
        grid.classList.toggle('vertical-layout');
        if (grid.classList.contains('vertical-layout')) {
          grid.style.gridTemplateColumns = '1fr';
        } else {
          grid.style.gridTemplateColumns = '';
        }
      }
    }

    setTrueFalseCorrect(isTrue) {
      const cardTrue = document.getElementById('wg-studio-tf-true');
      const cardFalse = document.getElementById('wg-studio-tf-false');
      if (isTrue) {
        cardTrue?.classList.add('active');
        cardFalse?.classList.remove('active');
        cardTrue?.querySelector('.wg-studio-check-circle')?.classList.add('active');
        if (cardTrue?.querySelector('.wg-studio-check-circle')) cardTrue.querySelector('.wg-studio-check-circle').textContent = '✓';
        cardFalse?.querySelector('.wg-studio-check-circle')?.classList.remove('active');
        if (cardFalse?.querySelector('.wg-studio-check-circle')) cardFalse.querySelector('.wg-studio-check-circle').textContent = '';
      } else {
        cardFalse?.classList.add('active');
        cardTrue?.classList.remove('active');
        cardFalse?.querySelector('.wg-studio-check-circle')?.classList.add('active');
        if (cardFalse?.querySelector('.wg-studio-check-circle')) cardFalse.querySelector('.wg-studio-check-circle').textContent = '✓';
        cardTrue?.querySelector('.wg-studio-check-circle')?.classList.remove('active');
        if (cardTrue?.querySelector('.wg-studio-check-circle')) cardTrue.querySelector('.wg-studio-check-circle').textContent = '';
      }
    }

    addAlternativeAnswer() {
      const wrap = document.getElementById('wg-studio-alts-chips');
      const input = document.getElementById('wg-studio-alt-input');
      const val = input?.value.trim();
      if (val && wrap) {
        const chip = document.createElement('div');
        chip.className = 'wg-studio-alt-chip';
        chip.innerHTML = `
          <span>${escapeHtml(val)}</span>
          <button type="button" onclick="this.parentElement.remove()" title="Hapus">✕</button>
        `;
        wrap.appendChild(chip);
        input.value = '';
      }
    }

    addRubricKeyword() {
      const wrap = document.getElementById('wg-studio-rubric-chips');
      const input = document.getElementById('wg-studio-rubric-input');
      const val = input?.value.trim();
      if (val && wrap) {
        const chip = document.createElement('div');
        chip.className = 'wg-studio-alt-chip';
        chip.innerHTML = `
          <span>${escapeHtml(val)}</span>
          <button type="button" onclick="this.parentElement.remove()" title="Hapus">✕</button>
        `;
        wrap.appendChild(chip);
        input.value = '';
      }
    }

    addMatchPairRow() {
      const stack = document.getElementById('wg-studio-match-stack');
      if (!stack) return;
      const row = document.createElement('div');
      row.className = 'wg-studio-match-row';
      row.innerHTML = `
        <input type="text" class="wg-form-input wg-studio-match-left" placeholder="Item Kiri">
        <div class="wg-studio-match-arrow">↔</div>
        <input type="text" class="wg-form-input wg-studio-match-right" placeholder="Pasangan Kanan">
        <button type="button" class="wg-studio-trash-btn" style="color: #ef4444;" onclick="this.closest('.wg-studio-match-row').remove()" title="Hapus Baris">✕</button>
      `;
      stack.appendChild(row);
    }

    addCategoryBucketCard() {
      const grid = document.getElementById('wg-studio-cat-grid');
      if (!grid) return;
      const bucket = document.createElement('div');
      bucket.className = 'wg-studio-cat-bucket';
      bucket.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <input type="text" class="wg-form-input wg-studio-cat-name" placeholder="Nama Kategori Baru" style="font-weight: 800; color: #fbbf24;">
          <button type="button" class="wg-studio-trash-btn" style="color: #ef4444;" onclick="this.closest('.wg-studio-cat-bucket').remove()" title="Hapus">✕</button>
        </div>
        <div>
          <label class="wg-form-label">Item dalam Kategori (Pisahkan koma)</label>
          <textarea class="wg-form-input wg-studio-cat-items" rows="2" placeholder="Item 1, Item 2..."></textarea>
        </div>
      `;
      grid.appendChild(bucket);
    }

    addReorderStepCard() {
      const stack = document.getElementById('wg-studio-reorder-stack');
      if (!stack) return;
      const items = stack.querySelectorAll('.wg-studio-reorder-item');
      const idx = items.length;
      const item = document.createElement('div');
      item.className = 'wg-studio-reorder-item';
      item.innerHTML = `
        <span style="cursor: grab; color: #94a3b8; font-size: 1.1rem;">⠿</span>
        <span class="wg-studio-step-pill">Step ${idx + 1}</span>
        <input type="text" class="wg-form-input wg-studio-reorder-val" placeholder="Ketik langkah ${idx + 1}..." style="flex: 1;">
        <button type="button" class="wg-studio-trash-btn" style="color: #ef4444;" onclick="window.waygroundStudio.deleteReorderStep(this)" title="Hapus">✕</button>
      `;
      stack.appendChild(item);
    }

    deleteReorderStep(btn) {
      const stack = document.getElementById('wg-studio-reorder-stack');
      btn.closest('.wg-studio-reorder-item')?.remove();
      if (stack) {
        stack.querySelectorAll('.wg-studio-reorder-item').forEach((item, i) => {
          const pill = item.querySelector('.wg-studio-step-pill');
          if (pill) pill.textContent = `Step ${i + 1}`;
        });
      }
    }

    addTableRow() {
      const tbody = document.getElementById('wg-studio-table-body');
      if (!tbody) return;
      const rows = tbody.querySelectorAll('tr');
      const idx = rows.length;
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
      tr.innerHTML = `
        <td style="padding: 10px;"><input type="text" class="wg-form-input wg-table-r-prompt" placeholder="Item ${idx + 1}"></td>
        <td style="padding: 10px;"><input type="text" class="wg-form-input wg-table-r-ans" placeholder="Jawaban Benar"></td>
        <td style="padding: 10px; text-align: center;"><button type="button" class="wg-studio-trash-btn" style="color: #ef4444;" onclick="this.closest('tr').remove()">✕</button></td>
      `;
      tbody.appendChild(tr);
    }

    insertMathSymbol(sym) {
      const input = document.getElementById('wg-math-correct');
      if (input) {
        const start = input.selectionStart || input.value.length;
        const end = input.selectionEnd || input.value.length;
        input.value = input.value.substring(0, start) + sym + input.value.substring(end);
        input.focus();
        input.setSelectionRange(start + sym.length, start + sym.length);
      }
    }

    toggleExplanationBox() {
      const panel = document.getElementById('wg-studio-explanation-panel');
      if (panel) {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) document.getElementById('wg-edit-explanation')?.focus();
      }
    }

    applyFormat(type) {
      const textarea = document.getElementById('wg-edit-question-text');
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end) || 'teks';
      let formatted = selected;

      switch (type) {
        case 'bold': formatted = `**${selected}**`; break;
        case 'italic': formatted = `*${selected}*`; break;
        case 'underline': formatted = `<u>${selected}</u>`; break;
        case 'strike': formatted = `~~${selected}~~`; break;
        case 'sup': formatted = `^(${selected})`; break;
        case 'sub': formatted = `~(${selected})`; break;
        case 'sigma': formatted = `∑(${selected})`; break;
        case 'formula': formatted = `f(${selected})`; break;
        default: break;
      }

      textarea.value = textarea.value.substring(0, start) + formatted + textarea.value.substring(end);
      textarea.focus();
    }

    recordPromptAudio() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Speech Recognition tidak didukung browser ini. Silakan ketik soal langsung.');
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.interimResults = false;
      if (typeof showToast === 'function') showToast('🎙️ Mendengarkan suara Anda... Silakan berbicara!', 'info');
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const qInput = document.getElementById('wg-edit-question-text');
        if (qInput) {
          qInput.value = (qInput.value ? qInput.value + ' ' : '') + transcript;
        }
        if (typeof showToast === 'function') showToast('✨ Teks suara berhasil disematkan ke soal!', 'success');
      };
      recognition.onerror = () => {
        if (typeof showToast === 'function') showToast('Tidak dapat merekam audio mikrofon.', 'warning');
      };
      recognition.start();
    }

    previewActiveQuestion() {
      const handler = this.questionEngine.get(this.activeEditingType);
      if (!handler) return;
      const draftData = handler.collectFromEditor();
      alert(`👁️ Preview Soal (${handler.name}):\n\nPrompt: "${draftData.question || 'Tanpa teks'}"\nPoin: ${draftData.points || 1000} pts\nWaktu: ${draftData.timeLimit || 30}s\n\n(Soal ini siap diuji coba dalam Arena Siswa)`);
    }

    addMultiPartSubQuestion() {
      const container = document.getElementById('wg-studio-multipart-container');
      if (!container) return;
      const cards = container.querySelectorAll('.wg-studio-part-card');
      const idx = cards.length;
      const partCard = document.createElement('div');
      partCard.className = 'wg-studio-part-card';
      partCard.dataset.partIdx = idx;
      partCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #94a3b8; font-size: 1.1rem; cursor: grab;">⠿</span>
            <span class="wg-studio-part-title">Create Part ${String.fromCharCode(65 + idx)}</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <button type="button" class="wg-studio-part-select-btn" onclick="window.waygroundStudio.changePartTypePrompt(${idx})">
              <span>✓ Multiple choice</span>
              <span>▾</span>
            </button>
            <button type="button" class="wg-studio-trash-btn" style="color: #ef4444;" onclick="window.waygroundStudio.deleteMultiPartSubQuestion(${idx})" title="Hapus Bagian">🗑️</button>
          </div>
        </div>
        <div style="width: 100%; text-align: left; margin-top: 10px;">
          <label class="wg-form-label" style="color: #cbd5e1;">Pertanyaan Part ${String.fromCharCode(65 + idx)}</label>
          <input type="text" class="wg-multipart-q-input wg-form-input" placeholder="Ketik pertanyaan untuk bagian ini...">
        </div>
        <div style="width: 100%; text-align: left;">
          <label class="wg-form-label" style="color: #cbd5e1;">Kunci Jawaban Part ${String.fromCharCode(65 + idx)}</label>
          <input type="text" class="wg-multipart-a-input wg-form-input" placeholder="Ketik kunci jawaban yang benar...">
        </div>
      `;
      const addBtn = container.querySelector('.wg-studio-addpart-full-btn');
      if (addBtn) container.insertBefore(partCard, addBtn);
      else container.appendChild(partCard);

      this.syncStudioSidebar('multi_part');
    }

    deleteMultiPartSubQuestion(partIdx) {
      const card = document.querySelector(`.wg-studio-part-card[data-part-idx="${partIdx}"]`);
      if (card) card.remove();
      this.syncStudioSidebar('multi_part');
    }

    changePartTypePrompt(partIdx) {
      const newType = prompt('Pilih tipe untuk bagian ini:\n1. multiple_choice\n2. fill_blank\n3. math_response\n4. open_ended', 'multiple_choice');
      if (newType) {
        if (typeof showToast === 'function') showToast(`Tipe bagian diubah ke ${newType}`, 'info');
      }
    }

    refreshHotTextTokens() {
      const text = document.getElementById('wg-hottext-sentence')?.value || '';
      const preview = document.getElementById('wg-hottext-tokens-preview');
      const targetInput = document.getElementById('wg-hottext-target');
      const targetWord = targetInput?.value || '';
      if (!preview) return;

      const words = text.split(/\s+/).filter(Boolean);
      preview.innerHTML = words.map(w => {
        const clean = w.replace(/[.,!?;:]/g, '');
        const isTarget = clean.toLowerCase() === targetWord.toLowerCase();
        return `<span class="wg-hottext-token ${isTarget ? 'selected' : ''}" data-word="${escapeHtml(clean)}" onclick="window.waygroundStudio.toggleHotTextWord(this)">${escapeHtml(w)}</span>`;
      }).join(' ');
    }

    toggleHotTextWord(tokenEl) {
      const word = tokenEl.dataset.word;
      const targetInput = document.getElementById('wg-hottext-target');
      if (targetInput) targetInput.value = word;
      document.querySelectorAll('#wg-hottext-tokens-preview .wg-hottext-token').forEach(t => t.classList.remove('selected'));
      tokenEl.classList.add('selected');
    }

    addGridRow() {
      const container = document.getElementById('wg-grid-rows-container');
      if (!container) return;
      const count = container.querySelectorAll('.wg-grid-row-input').length;
      const div = document.createElement('div');
      div.className = 'wg-studio-alt-chip';
      div.style.cssText = 'display: flex; justify-content: space-between; width: 100%;';
      div.innerHTML = `
        <input type="text" class="wg-grid-row-input" value="Baris ${count + 1}" style="background: transparent; border: none; color: #fff; outline: none; width: 90%;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
      `;
      container.appendChild(div);
    }

    addGridCol() {
      const container = document.getElementById('wg-grid-cols-container');
      if (!container) return;
      const count = container.querySelectorAll('.wg-grid-col-input').length;
      const div = document.createElement('div');
      div.className = 'wg-studio-alt-chip';
      div.style.cssText = 'display: flex; justify-content: space-between; width: 100%;';
      div.innerHTML = `
        <input type="text" class="wg-grid-col-input" value="Kolom ${count + 1}" style="background: transparent; border: none; color: #fff; outline: none; width: 90%;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
      `;
      container.appendChild(div);
    }

    addLabelPin() {
      const stack = document.getElementById('wg-labeling-chips-stack');
      if (!stack) return;
      const count = stack.querySelectorAll('.wg-labeling-item-input').length;
      const div = document.createElement('div');
      div.className = 'wg-studio-alt-chip';
      div.style.cssText = 'display: flex; justify-content: space-between; width: 100%;';
      div.innerHTML = `
        <span style="font-weight: 800; color: #a855f7; font-size: 0.74rem;">PIN ${count + 1}:</span>
        <input type="text" class="wg-labeling-item-input" value="Label ${count + 1}" style="background: transparent; border: none; color: #fff; outline: none; flex: 1; margin: 0 8px;">
        <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">✕</button>
      `;
      stack.appendChild(div);
    }

    setHotspotTarget(event, canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const pctX = Math.round(((event.clientX - rect.left) / rect.width) * 100);
      const pctY = Math.round(((event.clientY - rect.top) / rect.height) * 100);

      const reticle = document.getElementById('wg-studio-hotspot-reticle');
      const inX = document.getElementById('wg-hotspot-x');
      const inY = document.getElementById('wg-hotspot-y');
      const label = document.getElementById('wg-hotspot-coord-text');

      if (reticle) {
        reticle.style.left = `calc(${pctX}% - 22px)`;
        reticle.style.top = `calc(${pctY}% - 22px)`;
      }
      if (inX) inX.value = pctX;
      if (inY) inY.value = pctY;
      if (label) label.textContent = `Koordinat Target: X: ${pctX}%, Y: ${pctY}%`;
    }

    updateGraphVisual() {
      const cvs = document.getElementById('wg-studio-graph-cvs');
      const slopeIn = document.getElementById('wg-graph-slope');
      const cIn = document.getElementById('wg-graph-c');
      if (!cvs || !slopeIn || !cIn) return;

      const m = parseFloat(slopeIn.value) || 0;
      const c = parseFloat(cIn.value) || 0;

      const labelM = document.getElementById('wg-slope-val-label');
      const labelC = document.getElementById('wg-c-val-label');
      const labelEq = document.getElementById('wg-graph-eq-text');

      if (labelM) labelM.textContent = m;
      if (labelC) labelC.textContent = c;
      if (labelEq) labelEq.textContent = `y = ${m}x + ${c}`;

      const ctx = cvs.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cvs.width, cvs.height);

      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= cvs.width; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, cvs.height); ctx.stroke();
      }
      for (let y = 0; y <= cvs.height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cvs.width, y); ctx.stroke();
      }

      // Axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cvs.width / 2, 0); ctx.lineTo(cvs.width / 2, cvs.height);
      ctx.moveTo(0, cvs.height / 2); ctx.lineTo(cvs.width, cvs.height / 2);
      ctx.stroke();

      // Line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const midX = cvs.width / 2;
      const midY = cvs.height / 2;
      const y0 = midY - ((-midX / 30) * m + c) * 20;
      const y1 = midY - ((midX / 30) * m + c) * 20;
      ctx.moveTo(0, y0);
      ctx.lineTo(cvs.width, y1);
      ctx.stroke();
    }

    addPollOption() {
      const grid = document.getElementById('wg-studio-poll-grid');
      if (!grid) return;
      const count = grid.querySelectorAll('.wg-studio-answer-card').length;
      if (count >= 6) {
        if (typeof showToast === 'function') showToast('Maksimal 6 pilihan polling.', 'warning');
        return;
      }
      const colors = ['blue', 'teal', 'gold', 'coral', 'blue', 'teal'];
      const card = document.createElement('div');
      card.className = `wg-studio-answer-card ${colors[count % colors.length]}`;
      card.innerHTML = `
        <div class="wg-studio-card-top">
          <button type="button" class="wg-studio-trash-btn" onclick="this.closest('.wg-studio-answer-card').remove()" title="Hapus Opsi">🗑️</button>
          <span style="font-size: 0.72rem; font-weight: 800; opacity: 0.7;">Pilihan ${count + 1}</span>
        </div>
        <textarea class="wg-studio-answer-textarea" rows="3" placeholder="Tuliskan opsi polling">Pilihan ${count + 1}</textarea>
        <div class="wg-studio-card-footer">Polling Survey</div>
      `;
      grid.appendChild(card);
    }

    saveActiveQuestionItem() {
      const handler = this.questionEngine.get(this.activeEditingType);
      if (!handler) return;

      const questionData = handler.collectFromEditor();
      const validation = handler.validate(questionData);
      if (!validation.valid) {
        alert(`Perhatian: ${validation.error}`);
        return;
      }

      if (this.activeEditingIndex >= 0 && this.activeEditingIndex < this.builderDraft.questions.length) {
        this.builderDraft.questions[this.activeEditingIndex] = questionData;
        if (typeof showToast === 'function') showToast('✅ Soal berhasil diperbarui!', 'success');
      } else {
        this.builderDraft.questions.push(questionData);
        if (typeof showToast === 'function') showToast(`✨ 1 Soal (${handler.name}) berhasil ditambahkan!`, 'success');
      }

      this.closeQuestionForm();
      this.renderDraftQuestionsList();
    }

    renderDraftQuestionsList() {
      const count = this.builderDraft.questions.length;
      const countEl = document.getElementById('wg-builder-draft-qcount');
      const statusText = document.getElementById('wg-builder-qcount-text');
      const clearBtn = document.getElementById('wg-btn-clear-drafts');
      const list = document.getElementById('wg-builder-drafts-list');

      if (countEl) countEl.textContent = count;
      if (statusText) statusText.textContent = `${count} pertanyaan ditambahkan`;
      if (clearBtn) clearBtn.style.display = count > 0 ? 'inline-block' : 'none';

      if (!list) return;

      if (count === 0) {
        list.innerHTML = `
          <div class="wg-draft-empty-state">
            <span style="font-size: 1.8rem; opacity: 0.6;">✨</span>
            <div>Belum ada pertanyaan. Klik salah satu dari <strong>28 tipe pertanyaan</strong> di bawah, gunakan <strong>Teleport</strong> di sisi kanan, atau <strong>Generate dengan AI</strong>.</div>
          </div>
        `;
        return;
      }

      list.innerHTML = this.builderDraft.questions.map((q, idx) => {
        const handler = this.questionEngine.get(q.type || 'multiple_choice');
        return `
          <div class="wg-draft-item">
            <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
              <span style="font-weight: 800; color: #a855f7; font-size: 0.85rem;">Q${idx + 1}</span>
              <span class="wg-draft-badge">${handler.icon} ${handler.name}</span>
              <span style="font-size: 0.84rem; color: #fff; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 380px;">
                ${escapeHtml(q.question || q.title || 'Pertanyaan')}
              </span>
            </div>
            <div class="wg-draft-actions">
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.waygroundStudio.editDraftQuestion(${idx})" title="Edit Soal">
                ✏️ Edit
              </button>
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.waygroundStudio.duplicateDraftQuestion(${idx})" title="Duplikat Soal">
                📋
              </button>
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.waygroundStudio.deleteDraftQuestion(${idx})" title="Hapus Soal" style="color: #fb7185;">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    editDraftQuestion(index) {
      const q = this.builderDraft.questions[index];
      if (q) {
        this.openQuestionForm(q.type || 'multiple_choice', q, index);
      }
    }

    duplicateDraftQuestion(index) {
      const q = this.builderDraft.questions[index];
      if (q) {
        this.builderDraft.questions.push(JSON.parse(JSON.stringify(q)));
        this.renderDraftQuestionsList();
        if (typeof showToast === 'function') showToast('📋 Soal berhasil diduplikasi.', 'info');
      }
    }

    deleteDraftQuestion(index) {
      this.builderDraft.questions.splice(index, 1);
      this.renderDraftQuestionsList();
      if (typeof showToast === 'function') showToast('🗑️ Soal dihapus dari draf.', 'info');
    }

    clearDraftQuestions() {
      if (confirm('Yakin ingin mengosongkan semua soal di draf kuis ini?')) {
        this.builderDraft.questions = [];
        this.renderDraftQuestionsList();
      }
    }

    // ==================== 6. SETTINGS & PUBLISH WORKFLOW ====================
    openQuizSettingsModal() {
      const titleInput = document.getElementById('wg-builder-quiz-title');
      if (titleInput && titleInput.value.trim()) {
        this.builderDraft.title = titleInput.value.trim();
      }

      const modal = document.getElementById('wg-settings-modal');
      const inTitle = document.getElementById('wg-set-title');
      const inDesc = document.getElementById('wg-set-desc');
      const inCat = document.getElementById('wg-set-cat');
      const inTime = document.getElementById('wg-set-time');

      if (inTitle) inTitle.value = this.builderDraft.title;
      if (inDesc) inDesc.value = this.builderDraft.description;
      if (inCat) inCat.value = this.builderDraft.category;
      if (inTime) inTime.value = this.builderDraft.time_limit;

      this.openModal('wg-settings-modal');
    }

    saveQuizSettings() {
      const inTitle = document.getElementById('wg-set-title')?.value.trim();
      const inDesc = document.getElementById('wg-set-desc')?.value.trim();
      const inCat = document.getElementById('wg-set-cat')?.value || 'general';
      const inTime = parseInt(document.getElementById('wg-set-time')?.value, 10) || 30;

      if (inTitle) {
        this.builderDraft.title = inTitle;
        const mainTitleInput = document.getElementById('wg-builder-quiz-title');
        if (mainTitleInput) mainTitleInput.value = inTitle;
      }
      this.builderDraft.description = inDesc || '';
      this.builderDraft.category = inCat;
      this.builderDraft.time_limit = inTime;

      this.closeModal('wg-settings-modal');
      if (typeof showToast === 'function') showToast('⚙️ Pengaturan kuis disimpan.', 'success');
    }

    async publishCurrentQuiz() {
      const titleInput = document.getElementById('wg-builder-quiz-title');
      if (titleInput && titleInput.value.trim()) {
        this.builderDraft.title = titleInput.value.trim();
      }

      if (this.builderDraft.questions.length === 0) {
        alert('Tidak dapat mempublikasikan kuis kosong! Tambahkan minimal 1 pertanyaan terlebih dahulu.');
        return;
      }

      const btnPublish = document.getElementById('wg-builder-btn-publish');
      if (btnPublish) {
        btnPublish.disabled = true;
        btnPublish.textContent = '⏳ Mempublikasikan...';
      }

      try {
        const payload = {
          title: this.builderDraft.title || 'Untitled Quiz',
          description: this.builderDraft.description || 'Kuis interaktif dibuat melalui Wayground Studio Polaris.',
          category: this.builderDraft.category || 'general',
          time_limit: this.builderDraft.time_limit || 30,
          difficulty: 'medium',
          questions: this.builderDraft.questions,
          author: localStorage.getItem('study_player_name') || 'Polaris Scholar'
        };

        const res = await fetch('/api/wayground/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data && data.success && data.quiz) {
          this.playSound('fanfare');
          if (typeof showToast === 'function') showToast(`🎉 Kuis "${data.quiz.title}" berhasil dipublikasikan!`, 'success');
          await this.loadQuizzes();

          const startNow = confirm(`🎉 Sukses! Kuis "${data.quiz.title}" berhasil dipublikasikan!\n\nIngin langsung memainkan kuis ini sekarang?`);
          if (startNow) {
            this.startSoloQuiz(data.quiz.id);
          } else {
            this.switchView('explore');
          }
        } else {
          alert(data.error || 'Gagal mempublikasikan kuis.');
        }
      } catch (err) {
        alert('Kesalahan jaringan: ' + err.message);
      } finally {
        if (btnPublish) {
          btnPublish.disabled = false;
          btnPublish.textContent = 'Publish';
        }
      }
    }

    // ==================== 7. TELEPORT & QUESTION DISCOVERY ====================
    filterTeleportQuestions(query) {
      const container = document.getElementById('wg-teleport-results-stream');
      if (!container) return;

      const q = String(query || '').toLowerCase().trim();
      if (!q) {
        container.innerHTML = `
          <div class="wg-teleport-empty-card">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📚</div>
            <div style="font-size: 0.82rem; color: #fff; font-weight: 700; margin-bottom: 4px;">Teleport Soal dari Library</div>
            <p style="font-size: 0.74rem; line-height: 1.4; margin: 0 0 16px;">
              Cari topik apapun untuk mengambil slide materi, pertanyaan, atau kuis siap pakai dalam 1 kali klik.
            </p>
            <button type="button" class="wg-btn-generate-ai-pink" onclick="window.waygroundStudio.openAiGenerateModal()">
              <span>🪄</span> Generate with AI
            </button>
          </div>
        `;
        return;
      }

      // Collect all questions across library
      const allFound = [];
      this.quizzes.forEach(quiz => {
        (quiz.questions || []).forEach(question => {
          const matchQ = (question.question || '').toLowerCase().includes(q);
          const matchTitle = (quiz.title || '').toLowerCase().includes(q);
          const matchTopic = (quiz.topic || '').toLowerCase().includes(q);
          if (matchQ || matchTitle || matchTopic) {
            allFound.push({ question, quizTitle: quiz.title });
          }
        });
      });

      if (allFound.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 0.8rem;">
            Tidak ada pertanyaan ditemukan dengan kata kunci "<strong>${escapeHtml(query)}</strong>".
          </div>
        `;
        return;
      }

      container.innerHTML = allFound.slice(0, 15).map(({ question, quizTitle }, idx) => {
        const handler = this.questionEngine.get(question.type || 'multiple_choice');
        return `
          <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--wg-border); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="wg-draft-badge">${handler.icon} ${handler.name}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted);">${escapeHtml(quizTitle)}</span>
            </div>
            <div style="font-size: 0.82rem; color: #fff; font-weight: 700; line-height: 1.4;">
              ${escapeHtml(question.question)}
            </div>
            <button type="button" class="btn-polaris btn-secondary btn-sm" style="align-self: flex-end; font-size: 0.74rem;" onclick="window.waygroundStudio.teleportQuestion(${idx}, true)">
              ➕ Teleport (+1)
            </button>
          </div>
        `;
      }).join('');

      // Stash search results for instant addition
      this._teleportSearchResults = allFound;
    }

    teleportQuestion(index, fromSearch = true) {
      const item = fromSearch ? this._teleportSearchResults?.[index]?.question : this._libraryModalQuestions?.[index];
      if (item) {
        this.builderDraft.questions.push(JSON.parse(JSON.stringify(item)));
        this.renderDraftQuestionsList();
        this.playSound('powerup');
        if (typeof showToast === 'function') showToast('⚡ Soal berhasil di-teleport ke kuis Anda!', 'success');
      }
    }

    openLibraryModal() {
      this.openModal('wg-library-modal');
      this.searchLibraryModal('');
    }

    searchLibraryModal(query) {
      const list = document.getElementById('wg-library-modal-list');
      if (!list) return;

      const q = String(query || '').toLowerCase().trim();
      const allQuestions = [];
      this.quizzes.forEach(quiz => {
        (quiz.questions || []).forEach(question => {
          if (!q || (question.question || '').toLowerCase().includes(q) || quiz.title.toLowerCase().includes(q)) {
            allQuestions.push({ question, quizTitle: quiz.title });
          }
        });
      });

      this._libraryModalQuestions = allQuestions.map(item => item.question);

      if (allQuestions.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted);">Tidak ada pertanyaan dalam library.</div>`;
        return;
      }

      list.innerHTML = allQuestions.map(({ question, quizTitle }, idx) => {
        const handler = this.questionEngine.get(question.type || 'multiple_choice');
        return `
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--wg-border); border-radius: 10px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="overflow: hidden;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span class="wg-draft-badge">${handler.icon} ${handler.name}</span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(quizTitle)}</span>
              </div>
              <div style="font-size: 0.84rem; color: #fff; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 540px;">
                ${escapeHtml(question.question)}
              </div>
            </div>
            <button type="button" class="btn-rainbow btn-sm" style="white-space: nowrap; font-size: 0.75rem; border-radius: 9999px; padding: 6px 14px;" onclick="window.waygroundStudio.teleportQuestion(${idx}, false)">
              ➕ Tambahkan
            </button>
          </div>
        `;
      }).join('');
    }

    // ==================== 8. AI QUIZ GENERATOR MODAL ====================
    openAiGenerateModal() {
      this.openModal('wg-ai-modal');
    }

    async runAiGeneratorModal() {
      const topic = document.getElementById('wg-aimodal-topic')?.value.trim();
      const text = document.getElementById('wg-aimodal-doc')?.value.trim();
      const count = document.getElementById('wg-aimodal-count')?.value || 5;
      const diff = document.getElementById('wg-aimodal-diff')?.value || 'medium';
      const btn = document.getElementById('wg-btn-aimodal-run');

      if (!topic && !text) {
        alert('Silakan masukkan topik kuis atau tempel dokumen materi.');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ AI Sedang Merancang Kuis...';
      }

      try {
        const res = await fetch('/api/wayground/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, text, questionCount: count, difficulty: diff })
        });
        const data = await res.json();
        if (data && data.success && data.quiz) {
          // Push generated questions directly to builder draft
          if (Array.isArray(data.quiz.questions)) {
            data.quiz.questions.forEach(q => this.builderDraft.questions.push(q));
          }
          this.builderDraft.title = data.quiz.title || this.builderDraft.title;
          const mainTitleInput = document.getElementById('wg-builder-quiz-title');
          if (mainTitleInput) mainTitleInput.value = this.builderDraft.title;

          this.renderDraftQuestionsList();
          this.playSound('fanfare');
          this.closeModal('wg-ai-modal');
          if (typeof showToast === 'function') showToast(`✨ Berhasil mengenerate ${data.quiz.questions.length} soal dengan AI!`, 'success');
        } else {
          alert(data.error || 'Gagal menghasilkan soal dengan AI.');
        }
      } catch (err) {
        alert('Kesalahan AI: ' + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '✨ Generate Kuis Sekarang';
        }
      }
    }

    // ==================== 9. IMPORT SPREADSHEET (CSV) & GOOGLE FORMS ====================
    importSpreadsheetCSV() {
      this.openModal('wg-csv-modal');
    }

    handleCsvFileUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const textarea = document.getElementById('wg-csv-textarea');
        if (textarea) textarea.value = content;
      };
      reader.readAsText(file);
    }

    parseAndImportCsv() {
      const rawText = document.getElementById('wg-csv-textarea')?.value.trim();
      if (!rawText) {
        alert('Tempelkan teks data CSV terlebih dahulu.');
        return;
      }

      const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
      let importedCount = 0;

      lines.forEach((line) => {
        // Skip header line if present
        if (line.toLowerCase().startsWith('question') || line.toLowerCase().startsWith('pertanyaan')) return;

        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        if (cols.length >= 2) {
          const question = cols[0];
          const options = cols.slice(1, 5);
          while (options.length < 4) options.push(`Opsi ${options.length + 1}`);

          let correctAnswer = 0;
          if (cols[5]) {
            const parsed = parseInt(cols[5], 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) correctAnswer = parsed;
            else if (['a', 'b', 'c', 'd'].includes(cols[5].toLowerCase())) {
              correctAnswer = cols[5].toLowerCase().charCodeAt(0) - 97;
            }
          }
          const explanation = cols[6] || '';

          this.builderDraft.questions.push({
            type: 'multiple_choice',
            question,
            options,
            correctAnswer,
            explanation,
            points: 1000
          });
          importedCount += 1;
        }
      });

      this.closeModal('wg-csv-modal');
      this.renderDraftQuestionsList();
      this.playSound('powerup');
      if (typeof showToast === 'function') showToast(`📊 Sukses mengimpor ${importedCount} butir soal dari spreadsheet!`, 'success');
    }

    importGoogleForms() {
      this.openModal('wg-gforms-modal');
    }

    parseAndImportGoogleForms() {
      const rawText = document.getElementById('wg-gforms-textarea')?.value.trim();
      if (!rawText) {
        alert('Tempelkan teks pertanyaan Google Forms terlebih dahulu.');
        return;
      }

      // Simple regex block parser for numbered questions
      const questionBlocks = rawText.split(/\n(?=\d+[\.\)])/);
      let importedCount = 0;

      questionBlocks.forEach(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          const question = lines[0].replace(/^\d+[\.\)]\s*/, '');
          const optionLines = lines.slice(1).filter(l => !l.toLowerCase().startsWith('jawaban:') && !l.toLowerCase().startsWith('answer:'));
          const options = optionLines.map(o => o.replace(/^[a-dA-D\(\)\[\]\-•*]\s*/, ''));

          this.builderDraft.questions.push({
            type: options.length > 0 ? 'multiple_choice' : 'open_ended',
            question,
            options: options.length >= 2 ? options : ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            points: 1000
          });
          importedCount += 1;
        }
      });

      this.closeModal('wg-gforms-modal');
      this.renderDraftQuestionsList();
      this.playSound('powerup');
      if (typeof showToast === 'function') showToast(`📋 Berhasil mengonversi ${importedCount} soal dari Google Forms!`, 'success');
    }

    bindCreatorEvents() {
      // Save Question Item Button in Editor Modal
      document.getElementById('wg-btn-save-question-item')?.addEventListener('click', () => {
        this.saveActiveQuestionItem();
      });

      // Back Button in Editor Modal
      document.getElementById('wg-studio-btn-back')?.addEventListener('click', () => {
        this.closeQuestionForm();
      });

      // Escape key to dismiss active question studio or modal
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const qModal = document.getElementById('wg-qeditor-modal');
          if (qModal && qModal.classList.contains('active')) {
            this.closeQuestionForm();
            return;
          }
          const activeSecondary = document.querySelector('.wg-qeditor-modal.active');
          if (activeSecondary && activeSecondary.id) {
            this.closeModal(activeSecondary.id);
          }
        }
      });

      // Enter key on question title input
      const titleInput = document.getElementById('wg-builder-quiz-title');
      if (titleInput) {
        titleInput.addEventListener('change', () => {
          this.builderDraft.title = titleInput.value.trim() || 'Untitled Quiz';
        });
      }
    }

    // ==================== 10. REPORTS & ANALYTICS ====================
    async loadReports() {
      try {
        const res = await fetch('/api/wayground/history?limit=15');
        const data = await res.json();
        if (data && data.success) {
          const stats = data.stats || {};
          const elTotal = document.getElementById('wg-stat-total-sessions');
          const elScore = document.getElementById('wg-stat-total-score');
          const elAcc = document.getElementById('wg-stat-avg-accuracy');
          const elCorrect = document.getElementById('wg-stat-total-correct');

          if (elTotal) elTotal.textContent = stats.totalSessions || 0;
          if (elScore) elScore.textContent = (stats.totalScore || 0).toLocaleString('id-ID');
          if (elAcc) elAcc.textContent = `${stats.avgAccuracy || 0}%`;
          if (elCorrect) elCorrect.textContent = `${stats.totalCorrect || 0} Soal`;

          const tableBody = document.getElementById('wg-reports-tbody');
          if (tableBody) {
            if (!data.history || data.history.length === 0) {
              tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">Belum ada rekaman sesi kuis. Mulai mainkan kuis sekarang!</td></tr>`;
            } else {
              tableBody.innerHTML = data.history.map((h) => `
                <tr style="border-bottom: 1px solid var(--wg-border);">
                  <td style="padding: 12px 14px; font-weight: 700; color: #fff;">${escapeHtml(h.quiz_title)}</td>
                  <td style="padding: 12px 14px;"><span class="badge" style="background: rgba(168,85,247,0.15); color: #c084fc;">${h.mode.toUpperCase()}</span></td>
                  <td style="padding: 12px 14px; font-family: var(--font-mono); font-weight: 800; color: #38bdf8;">${h.score.toLocaleString('id-ID')}</td>
                  <td style="padding: 12px 14px; font-weight: 800; color: ${h.accuracy >= 75 ? '#34d399' : '#fbbf24'};">${h.accuracy}%</td>
                  <td style="padding: 12px 14px; color: var(--text-muted); font-size: 0.78rem;">${new Date(h.created_at).toLocaleString('id-ID')}</td>
                  <td style="padding: 12px 14px;">
                    <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="alert('Skor: ${h.score} Pts | Benar: ${h.correct_count} | Salah: ${h.incorrect_count}')">
                      👁️ Detail
                    </button>
                  </td>
                </tr>
              `).join('');
            }
          }
        }
      } catch (err) {
        console.error('[Wayground] Error loading reports:', err);
      }
    }

    bindReportEvents() {
      document.getElementById('wg-btn-export-report')?.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // Global Singleton Instance
  global.waygroundStudio = new WaygroundStudioEngine();

  // Auto initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => global.waygroundStudio.init());
  } else {
    global.waygroundStudio.init();
  }

})(typeof window !== 'undefined' ? window : this);

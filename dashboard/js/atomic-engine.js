// dashboard/js/atomic-engine.js — Atomic Personal Productivity Suite & Vault Engine (PRD F-HAB, F-TDO, F-SAV, F-EXE, F-MOO, F-JRN, D-03, D-14)
(function () {
  'use strict';

  class AtomicEngine {
    constructor() {
      this.currentSection = 'overview';
      this.habits = [];
      this.todos = [];
      this.savingsData = null;
      this.wellnessData = { exercises: [], moods: [] };
      this.journalEntries = [];
      this.journalUnlocked = false;
      this.journalPin = '1234'; // Default PIN for demo unlock
      this.unlockedEntries = {};
      this.chartHoverIndex = -1;
      this.todoFilter = 'all';

      this.init();
    }

    async init() {
      // Bind navigation pills
      document.querySelectorAll('.atomic-nav-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget.getAttribute('data-atomic-target');
          if (target) this.switchSection(target);
        });
      });

      // Bind drawer subtabs
      document.querySelectorAll('.atomic-subtab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const sec = e.currentTarget.getAttribute('data-atomic-section');
          if (sec) this.switchSection(sec);
        });
      });

      // Window resize re-draws canvas
      window.addEventListener('resize', () => {
        if (this.currentSection === 'savings' || this.currentSection === 'overview') {
          this.drawSavingsChart();
          this.drawMiniSavingsChart();
        }
      });

      // Bind canvas mousemove for candlestick tooltip
      const fullCanvas = document.getElementById('atomic-savings-full-canvas');
      if (fullCanvas) {
        fullCanvas.addEventListener('mousemove', (e) => this.handleChartHover(e));
        fullCanvas.addEventListener('mouseleave', () => this.handleChartLeave());
      }

      await this.refreshAll();
    }

    async refreshAll() {
      await Promise.allSettled([
        this.loadHabits(),
        this.loadTodos(),
        this.loadSavings(),
        this.loadWellness(),
        this.loadJournal(),
      ]);
      this.updateOverviewMetrics();
    }

    switchSection(sectionId) {
      this.currentSection = sectionId;

      // Update pills
      document.querySelectorAll('.atomic-nav-pill').forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-atomic-target') === sectionId);
      });

      // Update drawer subtabs
      document.querySelectorAll('.atomic-subtab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-atomic-section') === sectionId);
      });

      // Toggle sections
      document.querySelectorAll('.atomic-section-content').forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('active');
      });

      const activeEl = document.getElementById(`atomic-sec-${sectionId}`);
      if (activeEl) {
        activeEl.style.display = 'block';
        activeEl.classList.add('active');
      }

      if (sectionId === 'savings') {
        setTimeout(() => this.drawSavingsChart(), 50);
      } else if (sectionId === 'overview') {
        setTimeout(() => this.drawMiniSavingsChart(), 50);
      }
    }

    // ==================== 1. HABITS ====================

    async loadHabits() {
      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/habits') : fetch('/api/atomic/habits'));
        const data = await res.json();
        if (data.success) {
          this.habits = data.habits || [];
          this.renderHabits();
          this.renderOverviewHabits();
        }
      } catch (err) {
        console.warn('[Atomic] Gagal memuat habits:', err.message);
      }
    }

    renderHabits() {
      const container = document.getElementById('atomic-habits-full-grid');
      if (!container) return;

      if (this.habits.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">🌱</div>
            <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">Belum ada habit yang dicatat</div>
            <p style="font-size: 0.8rem; margin: 4px 0 16px;">Mulai bangun rutinitas positif Anda hari ini.</p>
            <button class="btn-polaris btn-primary btn-sm" onclick="window.AtomicApp.showNewHabitModal()">+ Tambah Habit Baru</button>
          </div>
        `;
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      container.innerHTML = this.habits.map(h => {
        let history = [];
        try { history = JSON.parse(h.history_json || '[]'); } catch (_) {}
        const isCompletedToday = history.includes(today);

        return `
          <div class="polaris-card" style="padding: 18px; border-radius: var(--radius-lg); background: rgba(255,255,255,0.02); border: 1.5px solid ${isCompletedToday ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}; transition: all 0.25s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 0.7rem; font-weight: 750;">
                ${this.escape(h.category || 'Umum')}
              </span>
              <button type="button" class="btn-icon" onclick="window.AtomicApp.deleteHabit('${h.id}')" title="Hapus habit" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.85rem;">🗑️</button>
            </div>
            
            <h4 style="margin: 0 0 8px 0; font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">
              ${this.escape(h.title)}
            </h4>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle);">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="font-size: 1.1rem;">🔥</span>
                <div>
                  <div style="font-size: 0.88rem; font-weight: 850; color: #f59e0b; font-family: var(--font-mono);">${h.streak} Hari</div>
                  <div style="font-size: 0.65rem; color: var(--text-muted);">Terbaik: ${h.best_streak} hari</div>
                </div>
              </div>

              <button type="button" class="btn-polaris ${isCompletedToday ? 'btn-success' : 'btn-secondary'}" onclick="window.AtomicApp.toggleHabit('${h.id}')" style="font-size: 0.75rem; padding: 6px 12px; border-radius: 9999px; display: flex; align-items: center; gap: 4px; font-weight: 700;">
                <span>${isCompletedToday ? '✅ Selesai' : '⭕ Centang'}</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    renderOverviewHabits() {
      const container = document.getElementById('atomic-overview-habits-list');
      if (!container) return;

      const today = new Date().toISOString().split('T')[0];
      const topHabits = this.habits.slice(0, 4);

      if (topHabits.length === 0) {
        container.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); padding: 12px 0;">Belum ada habit terdaftar.</div>`;
        return;
      }

      container.innerHTML = topHabits.map(h => {
        let history = [];
        try { history = JSON.parse(h.history_json || '[]'); } catch (_) {}
        const isCompletedToday = history.includes(today);

        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1rem;">${isCompletedToday ? '✨' : '🎯'}</span>
              <div>
                <div style="font-size: 0.85rem; font-weight: 750; color: var(--text-primary); text-decoration: ${isCompletedToday ? 'line-through' : 'none'}; opacity: ${isCompletedToday ? 0.7 : 1};">${this.escape(h.title)}</div>
                <div style="font-size: 0.68rem; color: #f59e0b; font-family: var(--font-mono);">Streak: ${h.streak} hari</div>
              </div>
            </div>
            <button type="button" class="btn-polaris ${isCompletedToday ? 'btn-success' : 'btn-secondary'} btn-sm" onclick="window.AtomicApp.toggleHabit('${h.id}')" style="font-size: 0.72rem; padding: 4px 10px; border-radius: 9999px;">
              ${isCompletedToday ? '✓ Selesai' : 'Centang'}
            </button>
          </div>
        `;
      }).join('');
    }

    async toggleHabit(id) {
      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch(`/api/atomic/habits/${id}/toggle`, { method: 'POST' }) : fetch(`/api/atomic/habits/${id}/toggle`, { method: 'POST' }));
        const data = await res.json();
        if (data.success) {
          if (window.confetti && data.completedToday) {
            window.confetti({ particleCount: 30, spread: 60, origin: { y: 0.8 } });
          }
          await this.loadHabits();
          this.updateOverviewMetrics();
        }
      } catch (err) {
        console.error('[Atomic] Error toggle habit:', err);
      }
    }

    async deleteHabit(id) {
      if (!confirm('Hapus kebiasaan ini?')) return;
      try {
        await (window.PolarisAuth ? PolarisAuth.authFetch(`/api/atomic/habits/${id}`, { method: 'DELETE' }) : fetch(`/api/atomic/habits/${id}`, { method: 'DELETE' }));
        await this.loadHabits();
        this.updateOverviewMetrics();
      } catch (err) {
        console.error('[Atomic] Error delete habit:', err);
      }
    }

    showNewHabitModal() {
      const modalHtml = `
        <div id="atomic-new-habit-modal" class="atomic-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
          <div class="polaris-card" style="width: 100%; max-width: 440px; padding: 24px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-luxury);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 850; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <span>🎯</span> Tambah Habit Baru
              </h3>
              <button type="button" class="btn-icon" onclick="document.getElementById('atomic-new-habit-modal').remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem;">✕</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Judul Habit</label>
                <input type="text" id="habit-modal-title" class="form-input" placeholder="Mis: Olahraga 30 Menit, Baca Buku..." style="width: 100%;">
              </div>
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Kategori</label>
                <select id="habit-modal-category" class="form-input" style="width: 100%;">
                  <option value="Fokus">Fokus & Produktivitas</option>
                  <option value="Kesehatan">Kesehatan & Fisik</option>
                  <option value="Tech">Coding & Tech</option>
                  <option value="Edukasi">Edukasi & Membaca</option>
                  <option value="Spiritual">Mindfulness & Meditasi</option>
                </select>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px;">
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="document.getElementById('atomic-new-habit-modal').remove()">Batal</button>
              <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.AtomicApp.createHabitFromModal()">Simpan Habit</button>
            </div>
          </div>
        </div>
      `;
      const existing = document.getElementById('atomic-new-habit-modal');
      if (existing) existing.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      setTimeout(() => document.getElementById('habit-modal-title')?.focus(), 50);
    }

    async createHabitFromModal() {
      const title = document.getElementById('habit-modal-title')?.value;
      const category = document.getElementById('habit-modal-category')?.value;
      if (!title || !title.trim()) return alert('Judul habit tidak boleh kosong');

      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), category, frequency: 'daily' })
        }) : fetch('/api/atomic/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), category, frequency: 'daily' })
        }));
        const data = await res.json();
        if (data.success) {
          document.getElementById('atomic-new-habit-modal')?.remove();
          await this.loadHabits();
          this.updateOverviewMetrics();
        }
      } catch (err) {
        console.error('[Atomic] Error create habit:', err);
      }
    }

    // ==================== 2. TODOS ====================

    async loadTodos() {
      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/todos') : fetch('/api/atomic/todos'));
        const data = await res.json();
        if (data.success) {
          this.todos = data.todos || [];
          this.renderTodos();
        }
      } catch (err) {
        console.warn('[Atomic] Gagal memuat todos:', err.message);
      }
    }

    filterTodos(status) {
      this.todoFilter = status;
      this.renderTodos();
    }

    renderTodos() {
      const container = document.getElementById('atomic-todos-list');
      if (!container) return;

      let filtered = this.todos;
      if (this.todoFilter === 'pending') {
        filtered = this.todos.filter(t => t.status !== 'completed');
      } else if (this.todoFilter === 'completed') {
        filtered = this.todos.filter(t => t.status === 'completed');
      }

      if (filtered.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📋</div>
            <div style="font-weight: 700; color: var(--text-primary);">Tidak ada tugas dalam kategori ini</div>
            <p style="font-size: 0.8rem; margin: 4px 0 14px;">Semua target selesai atau belum ada tugas terdaftar.</p>
            <button class="btn-polaris btn-primary btn-sm" onclick="window.AtomicApp.showNewTaskModal()">+ Buat Tugas Baru</button>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(t => {
        const isCompleted = t.status === 'completed';
        const priorityColors = {
          urgent: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', label: 'P0 Urgent' },
          high: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', label: 'P1 High' },
          medium: { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', label: 'P2 Medium' },
          low: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', label: 'P3 Low' },
        };
        const pInfo = priorityColors[t.priority] || priorityColors.medium;

        return `
          <div class="polaris-card" style="padding: 14px 18px; border-radius: var(--radius-md); background: rgba(255,255,255,0.02); border: 1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}; display: flex; justify-content: space-between; align-items: center; gap: 14px; transition: all 0.2s ease;">
            <div style="display: flex; align-items: flex-start; gap: 14px; flex: 1; min-width: 0;">
              <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="window.AtomicApp.toggleTodo('${t.id}', this.checked)" style="margin-top: 4px; width: 18px; height: 18px; accent-color: #a855f7; cursor: pointer;">
              
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-size: 0.95rem; font-weight: 750; color: var(--text-primary); text-decoration: ${isCompleted ? 'line-through' : 'none'}; opacity: ${isCompleted ? 0.6 : 1};">
                    ${this.escape(t.title)}
                  </span>
                  <span class="badge" style="background: ${pInfo.bg}; color: ${pInfo.text}; font-size: 0.68rem; font-weight: 800; padding: 2px 8px;">
                    ${pInfo.label}
                  </span>
                </div>
                ${t.description ? `<p style="margin: 4px 0 0; font-size: 0.78rem; color: var(--text-muted); opacity: ${isCompleted ? 0.5 : 0.85}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escape(t.description)}</p>` : ''}
                ${t.due_date ? `<span style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px; display: inline-block;">⏰ Deadline: ${this.escape(t.due_date)}</span>` : ''}
              </div>
            </div>

            <button type="button" class="btn-icon" onclick="window.AtomicApp.deleteTodo('${t.id}')" title="Hapus tugas" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem;">🗑️</button>
          </div>
        `;
      }).join('');
    }

    async toggleTodo(id, isChecked) {
      const newStatus = isChecked ? 'completed' : 'pending';
      try {
        await (window.PolarisAuth ? PolarisAuth.authFetch(`/api/atomic/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }) : fetch(`/api/atomic/todos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }));
        await this.loadTodos();
        this.updateOverviewMetrics();
      } catch (err) {
        console.error('[Atomic] Error toggle todo:', err);
      }
    }

    async deleteTodo(id) {
      if (!confirm('Hapus tugas ini?')) return;
      try {
        await (window.PolarisAuth ? PolarisAuth.authFetch(`/api/atomic/todos/${id}`, { method: 'DELETE' }) : fetch(`/api/atomic/todos/${id}`, { method: 'DELETE' }));
        await this.loadTodos();
        this.updateOverviewMetrics();
      } catch (err) {
        console.error('[Atomic] Error delete todo:', err);
      }
    }

    showNewTaskModal() {
      const modalHtml = `
        <div id="atomic-new-task-modal" class="atomic-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
          <div class="polaris-card" style="width: 100%; max-width: 480px; padding: 24px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-luxury);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 850; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <span>📝</span> Buat Tugas Baru
              </h3>
              <button type="button" class="btn-icon" onclick="document.getElementById('atomic-new-task-modal').remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem;">✕</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Judul Tugas</label>
                <input type="text" id="task-modal-title" class="form-input" placeholder="Mis: Review PR, Setup webhook..." style="width: 100%;">
              </div>
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Deskripsi / Catatan Tambahan</label>
                <textarea id="task-modal-desc" class="form-input" rows="3" placeholder="Rincian langkah pengerjaan..." style="width: 100%; resize: vertical;"></textarea>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Prioritas</label>
                  <select id="task-modal-priority" class="form-input" style="width: 100%;">
                    <option value="urgent">P0 - Sangat Mendesak</option>
                    <option value="high">P1 - Prioritas Tinggi</option>
                    <option value="medium" selected>P2 - Normal / Standar</option>
                    <option value="low">P3 - Santai / Opsional</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Deadline</label>
                  <input type="text" id="task-modal-due" class="form-input" placeholder="Hari Ini / Besok / Tgl" style="width: 100%;">
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px;">
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="document.getElementById('atomic-new-task-modal').remove()">Batal</button>
              <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.AtomicApp.createTaskFromModal()">Tambahkan Tugas</button>
            </div>
          </div>
        </div>
      `;
      const existing = document.getElementById('atomic-new-task-modal');
      if (existing) existing.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      setTimeout(() => document.getElementById('task-modal-title')?.focus(), 50);
    }

    async createTaskFromModal() {
      const title = document.getElementById('task-modal-title')?.value;
      const description = document.getElementById('task-modal-desc')?.value;
      const priority = document.getElementById('task-modal-priority')?.value;
      const due_date = document.getElementById('task-modal-due')?.value;

      if (!title || !title.trim()) return alert('Judul tugas tidak boleh kosong');

      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), description, priority, due_date })
        }) : fetch('/api/atomic/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), description, priority, due_date })
        }));
        const data = await res.json();
        if (data.success) {
          document.getElementById('atomic-new-task-modal')?.remove();
          await this.loadTodos();
          this.updateOverviewMetrics();
        }
      } catch (err) {
        console.error('[Atomic] Error create task:', err);
      }
    }

    // ==================== 3. TABUNGAN & REALTIME STOCK-STYLE CANDLESTICK CHART (D-03) ====================

    async loadSavings() {
      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/savings') : fetch('/api/atomic/savings'));
        const data = await res.json();
        if (data.success) {
          this.savingsData = data;
          this.renderSavingsLedger();
          this.drawSavingsChart();
          this.drawMiniSavingsChart();
        }
      } catch (err) {
        console.warn('[Atomic] Gagal memuat data tabungan:', err.message);
      }
    }

    renderSavingsLedger() {
      const tbody = document.getElementById('atomic-savings-table-body');
      if (!tbody || !this.savingsData) return;

      const txs = this.savingsData.transactions || [];
      if (txs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">Belum ada catatan transaksi keuangan.</td></tr>`;
        return;
      }

      tbody.innerHTML = txs.map(t => {
        const isIncome = t.type === 'income';
        const dateStr = new Date(t.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const amountStr = (isIncome ? '+ ' : '- ') + this.formatIDR(t.amount);
        const balStr = this.formatIDR(t.balanceAfter);

        return `
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="color: var(--text-muted); font-size: 0.78rem;">${dateStr}</td>
            <td>
              <span class="badge" style="background: ${isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isIncome ? '#10b981' : '#ef4444'}; font-size: 0.7rem; font-weight: 800;">
                ${isIncome ? '📈 Pemasukan' : '📉 Pengeluaran'}
              </span>
            </td>
            <td style="font-weight: 600; color: var(--text-secondary);">${this.escape(t.category || '-')}</td>
            <td style="color: var(--text-primary); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escape(t.note || '-')}</td>
            <td style="font-weight: 850; font-family: var(--font-mono); color: ${isIncome ? '#10b981' : '#ef4444'};">${amountStr}</td>
            <td style="font-weight: 800; font-family: var(--font-mono); color: var(--text-primary);">${balStr}</td>
          </tr>
        `;
      }).join('');
    }

    drawSavingsChart() {
      const canvas = document.getElementById('atomic-savings-full-canvas');
      if (!canvas || !this.savingsData || !this.savingsData.timeline) return;

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const timeline = this.savingsData.timeline;

      // Clear dark obsidian background
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, width, height);

      if (timeline.length < 2) {
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Data transaksi belum mencukupi untuk membentuk chart.', width / 2, height / 2);
        return;
      }

      // Compute Candlestick aggregates per transaction point
      const candles = [];
      let runningOpen = timeline[0].amount * 0.8;

      for (let i = 0; i < timeline.length; i++) {
        const item = timeline[i];
        const isIncome = item.type === 'income';
        const close = item.balanceAfter;
        const open = i === 0 ? runningOpen : timeline[i - 1].balanceAfter;
        const high = Math.max(open, close) + item.amount * 0.15;
        const low = Math.max(0, Math.min(open, close) - item.amount * 0.1);

        candles.push({
          open,
          close,
          high,
          low,
          isIncome,
          date: new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          raw: item,
        });
      }

      // Find min & max
      let minVal = Infinity;
      let maxVal = -Infinity;
      candles.forEach(c => {
        if (c.low < minVal) minVal = c.low;
        if (c.high > maxVal) maxVal = c.high;
      });
      minVal = Math.max(0, minVal * 0.9);
      maxVal = maxVal * 1.1;
      const valRange = maxVal - minVal || 1;

      // Chart layout padding
      const padLeft = 20;
      const padRight = 80;
      const padTop = 25;
      const padBottom = 30;
      const plotWidth = width - padLeft - padRight;
      const plotHeight = height - padTop - padBottom;

      // Draw Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSteps = 4;
      for (let g = 0; g <= gridSteps; g++) {
        const y = padTop + (plotHeight / gridSteps) * g;
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(width - padRight, y);
        ctx.stroke();

        // Right axis labels
        const priceAtY = maxVal - (valRange / gridSteps) * g;
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(this.formatCompactIDR(priceAtY), width - padRight + 8, y + 3);
      }

      // Draw Candles & Line Trend
      const stepX = plotWidth / (candles.length + 1);
      const candleWidth = Math.min(24, Math.max(8, stepX * 0.55));

      const points = [];

      candles.forEach((c, i) => {
        const x = padLeft + stepX * (i + 1);
        const yOpen = padTop + plotHeight * (1 - (c.open - minVal) / valRange);
        const yClose = padTop + plotHeight * (1 - (c.close - minVal) / valRange);
        const yHigh = padTop + plotHeight * (1 - (c.high - minVal) / valRange);
        const yLow = padTop + plotHeight * (1 - (c.low - minVal) / valRange);

        points.push({ x, y: yClose });

        const isGreen = c.close >= c.open;
        const color = isGreen ? '#10b981' : '#ef4444';

        // High-Low Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Candle Body
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));

        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

        // Date label at bottom
        ctx.fillStyle = '#64748b';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.date, x, height - 10);
      });

      // Neon Trend Line connecting close points
      if (points.length > 1) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let p = 1; p < points.length; p++) {
          ctx.lineTo(points[p].x, points[p].y);
        }
        ctx.stroke();

        // Neon Glow point at last price
        const lastP = points[points.length - 1];
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(lastP.x, lastP.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      this._chartCandles = candles;
      this._chartPoints = points;
      this._chartBounds = { padLeft, padRight, padTop, padBottom, width, height };
    }

    drawMiniSavingsChart() {
      const canvas = document.getElementById('atomic-mini-chart-canvas');
      if (!canvas || !this.savingsData || !this.savingsData.timeline) return;

      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;
      const timeline = this.savingsData.timeline;

      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      if (timeline.length < 2) return;

      const balances = timeline.map(t => t.balanceAfter);
      const minB = Math.min(...balances) * 0.9;
      const maxB = Math.max(...balances) * 1.1;
      const range = maxB - minB || 1;

      const stepX = width / (balances.length - 1);

      // Area gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

      ctx.beginPath();
      ctx.moveTo(0, height);
      balances.forEach((b, i) => {
        const x = i * stepX;
        const y = height - (height - 20) * ((b - minB) / range) - 10;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Top green stroke
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      balances.forEach((b, i) => {
        const x = i * stepX;
        const y = height - (height - 20) * ((b - minB) / range) - 10;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    handleChartHover(e) {
      const canvas = document.getElementById('atomic-savings-full-canvas');
      const tooltip = document.getElementById('atomic-chart-tooltip');
      if (!canvas || !tooltip || !this._chartPoints || !this._chartCandles) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      let closestIdx = -1;
      let minDistance = Infinity;

      this._chartPoints.forEach((pt, i) => {
        const dist = Math.abs(pt.x - mouseX);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      });

      if (closestIdx !== -1 && minDistance < 40) {
        const c = this._chartCandles[closestIdx];
        const pt = this._chartPoints[closestIdx];

        tooltip.style.display = 'block';
        tooltip.style.left = `${pt.x + 10}px`;
        tooltip.style.top = `${pt.y - 40}px`;

        const isInc = c.isIncome;
        tooltip.innerHTML = `
          <div style="font-weight: 800; font-size: 0.8rem; color: ${isInc ? '#10b981' : '#ef4444'}; margin-bottom: 2px;">
            ${isInc ? '▲ PEMASUKAN' : '▼ PENGELUARAN'}
          </div>
          <div>• Tanggal: <strong>${c.date}</strong></div>
          <div>• Nominal: <strong>${this.formatIDR(c.raw.amount)}</strong></div>
          <div>• Saldo: <strong>${this.formatIDR(c.raw.balanceAfter)}</strong></div>
          <div>• Kategori: ${this.escape(c.raw.category || '-')}</div>
        `;
      } else {
        tooltip.style.display = 'none';
      }
    }

    handleChartLeave() {
      const tooltip = document.getElementById('atomic-chart-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }

    showNewTransactionModal(presetType = 'income') {
      const modalHtml = `
        <div id="atomic-new-tx-modal" class="atomic-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
          <div class="polaris-card" style="width: 100%; max-width: 440px; padding: 24px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-luxury);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 850; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <span>💰</span> Catat Aliran Kas (Tabungan)
              </h3>
              <button type="button" class="btn-icon" onclick="document.getElementById('atomic-new-tx-modal').remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem;">✕</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Tipe Transaksi</label>
                <select id="tx-modal-type" class="form-input" style="width: 100%;">
                  <option value="income" ${presetType === 'income' ? 'selected' : ''}>📈 Pemasukan (Cash In)</option>
                  <option value="expense" ${presetType === 'expense' ? 'selected' : ''}>📉 Pengeluaran (Cash Out)</option>
                </select>
              </div>

              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Nominal (IDR)</label>
                <input type="number" id="tx-modal-amount" class="form-input" placeholder="Mis: 500000" min="1000" step="1000" style="width: 100%;">
              </div>

              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Kategori</label>
                <input type="text" id="tx-modal-cat" class="form-input" placeholder="Gaji, Penjualan Sirium, Hosting, Konsumsi..." style="width: 100%;">
              </div>

              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Catatan / Keterangan</label>
                <input type="text" id="tx-modal-note" class="form-input" placeholder="Rincian pembayaran..." style="width: 100%;">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px;">
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="document.getElementById('atomic-new-tx-modal').remove()">Batal</button>
              <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.AtomicApp.createTransactionFromModal()">Simpan Transaksi</button>
            </div>
          </div>
        </div>
      `;
      const existing = document.getElementById('atomic-new-tx-modal');
      if (existing) existing.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      setTimeout(() => document.getElementById('tx-modal-amount')?.focus(), 50);
    }

    async createTransactionFromModal() {
      const type = document.getElementById('tx-modal-type')?.value;
      const amount = document.getElementById('tx-modal-amount')?.value;
      const category = document.getElementById('tx-modal-cat')?.value;
      const note = document.getElementById('tx-modal-note')?.value;

      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return alert('Masukkan nominal yang valid');
      }

      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/savings/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount: parseFloat(amount), category, note })
        }) : fetch('/api/atomic/savings/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, amount: parseFloat(amount), category, note })
        }));
        const data = await res.json();
        if (data.success) {
          document.getElementById('atomic-new-tx-modal')?.remove();
          await this.loadSavings();
          this.updateOverviewMetrics();
        }
      } catch (err) {
        console.error('[Atomic] Error create transaction:', err);
      }
    }

    // ==================== 4. WELLNESS (EXERCISE & MOOD) ====================

    async loadWellness() {
      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/wellness') : fetch('/api/atomic/wellness'));
        const data = await res.json();
        if (data.success) {
          this.wellnessData = data;
          this.renderExerciseList();
          this.renderMoodList();
        }
      } catch (err) {
        console.warn('[Atomic] Gagal memuat data wellness:', err.message);
      }
    }

    renderExerciseList() {
      const container = document.getElementById('atomic-exercise-list');
      if (!container) return;

      const exercises = this.wellnessData.exercises || [];
      if (exercises.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.8rem;">Belum ada catatan aktivitas fisik.</div>`;
        return;
      }

      container.innerHTML = exercises.map(ex => {
        const dateStr = new Date(ex.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.2rem;">🏃</span>
              <div>
                <div style="font-size: 0.88rem; font-weight: 750; color: var(--text-primary);">${this.escape(ex.activity_type)}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${dateStr} • ${ex.notes ? this.escape(ex.notes) : 'Aktivitas teratur'}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.85rem; font-weight: 800; color: var(--accent-cyan); font-family: var(--font-mono);">${ex.duration_minutes} Menit</div>
              <div style="font-size: 0.68rem; color: #f59e0b;">🔥 ${ex.calories || 0} kkal</div>
            </div>
          </div>
        `;
      }).join('');
    }

    renderMoodList() {
      const container = document.getElementById('atomic-mood-list');
      if (!container) return;

      const moods = this.wellnessData.moods || [];
      if (moods.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.8rem;">Belum ada catatan mood harian.</div>`;
        return;
      }

      const moodEmojis = { 1: '😫', 2: '🙁', 3: '😐', 4: '😊', 5: '🤩' };

      container.innerHTML = moods.map(m => {
        const emoji = moodEmojis[m.score] || '😊';
        const dateStr = new Date(m.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem;">${emoji}</span>
              <div>
                <div style="font-size: 0.88rem; font-weight: 750; color: var(--text-primary);">${this.escape(m.label || 'Kondisi Baik')}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${dateStr} • ${m.note ? this.escape(m.note) : 'Kondisi stabil'}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 0.7rem; font-weight: 800;">
                Energi: ${m.energy_level || 5}/10
              </span>
            </div>
          </div>
        `;
      }).join('');
    }

    showNewExerciseModal() {
      const type = prompt('Jenis olahraga / latihan (mis: Jogging, Push Up, Gym):', 'Lari Pagi');
      if (!type) return;
      const dur = prompt('Durasi latihan (menit):', '30');
      if (!dur) return;

      (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_type: type, duration_minutes: parseInt(dur) || 30, calories: 200, notes: 'Latihan mandiri' })
      }) : fetch('/api/atomic/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_type: type, duration_minutes: parseInt(dur) || 30, calories: 200, notes: 'Latihan mandiri' })
      })).then(() => this.loadWellness());
    }

    showNewMoodModal() {
      const score = prompt('Skor Mood Hari Ini (1: Lelah/Sedih s/d 5: Sangat Berenergi):', '5');
      if (!score) return;
      const note = prompt('Catatan refleksi singkat:', 'Fokus tinggi dan produktif');

      (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: parseInt(score) || 4, label: parseInt(score) >= 4 ? 'Positif & Semangat' : 'Normal', energy_level: 8, note })
      }) : fetch('/api/atomic/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: parseInt(score) || 4, label: parseInt(score) >= 4 ? 'Positif & Semangat' : 'Normal', energy_level: 8, note })
      })).then(() => this.loadWellness());
    }

    // ==================== 5. ENCRYPTED PRIVATE JOURNAL (PRD D-14) ====================

    async loadJournal() {
      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/journal') : fetch('/api/atomic/journal'));
        const data = await res.json();
        if (data.success) {
          this.journalEntries = data.entries || [];
          this.renderJournal();
        }
      } catch (err) {
        console.warn('[Atomic] Gagal memuat journal:', err.message);
      }
    }

    renderJournal() {
      const container = document.getElementById('atomic-journal-list');
      if (!container) return;

      if (this.journalEntries.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.85rem;">Belum ada entri catatan rahasia.</div>`;
        return;
      }

      container.innerHTML = this.journalEntries.map(j => {
        const isUnlocked = Boolean(this.unlockedEntries[j.id]);
        const dateStr = new Date(j.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        return `
          <div class="polaris-card" style="padding: 20px; border-radius: var(--radius-lg); background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span class="badge" style="background: rgba(234, 179, 8, 0.15); color: #facc15; font-size: 0.7rem; font-weight: 800;">
                  ${isUnlocked ? '🔓 TERBUKA' : '🔒 TERENKRIPSI (D-14)'}
                </span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">${dateStr}</span>
              </div>

              <h4 style="margin: 0 0 10px 0; font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">
                ${this.escape(j.title)}
              </h4>

              <div style="margin-bottom: 16px;">
                ${isUnlocked ? `
                  <div style="font-size: 0.82rem; line-height: 1.6; color: var(--text-secondary); background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid var(--border-subtle); white-space: pre-wrap;">
                    ${this.escape(this.unlockedEntries[j.id])}
                  </div>
                ` : `
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); background: rgba(0,0,0,0.4); padding: 12px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.1); letter-spacing: 2px;">
                    ••••••••••••••••••••••••••••••••••••••••• [PAYLOAD LOCKED]
                  </div>
                `}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; pt: 12px; border-top: 1px solid var(--border-subtle);">
              ${isUnlocked ? `
                <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.AtomicApp.lockJournalEntry('${j.id}')" style="font-size: 0.75rem;">🔒 Kunci Lagi</button>
              ` : `
                <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.AtomicApp.unlockJournalModal('${j.id}')" style="font-size: 0.75rem;">🔑 Buka PIN</button>
              `}
              <button type="button" class="btn-icon" onclick="window.AtomicApp.deleteJournalEntry('${j.id}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.85rem;" title="Hapus entri">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }

    unlockJournalModal(entryId) {
      const pin = prompt('Masukkan PIN Keamanan Vault (Default demo: 1234):', '1234');
      if (!pin) return;

      (window.PolarisAuth ? PolarisAuth.authFetch(`/api/atomic/journal/${entryId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      }) : fetch(`/api/atomic/journal/${entryId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })).then(r => r.json()).then(data => {
        if (data.success) {
          this.unlockedEntries[entryId] = data.content || '[Catatan kosong]';
          this.renderJournal();
        } else {
          alert('PIN salah atau tidak dapat didekripsi.');
        }
      });
    }

    lockJournalEntry(entryId) {
      delete this.unlockedEntries[entryId];
      this.renderJournal();
    }

    async deleteJournalEntry(entryId) {
      if (!confirm('Hapus permanen catatan rahasia ini?')) return;
      try {
        await (window.PolarisAuth ? PolarisAuth.authFetch(`/api/atomic/journal/${entryId}`, { method: 'DELETE' }) : fetch(`/api/atomic/journal/${entryId}`, { method: 'DELETE' }));
        delete this.unlockedEntries[entryId];
        await this.loadJournal();
      } catch (err) {
        console.error('[Atomic] Error delete journal:', err);
      }
    }

    showNewJournalModal() {
      const title = prompt('Judul Catatan Jurnal Rahasia:', 'Refleksi Harian');
      if (!title) return;
      const content = prompt('Isi catatan pribadi (akan dienkripsi):', 'Hari ini menyelesaikan pembaruan sistem dengan sukses...');
      if (!content) return;

      (window.PolarisAuth ? PolarisAuth.authFetch('/api/atomic/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags: 'Refleksi' })
      }) : fetch('/api/atomic/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags: 'Refleksi' })
      })).then(() => this.loadJournal());
    }

    // ==================== 6. OVERVIEW METRICS ====================

    updateOverviewMetrics() {
      // Habit streak
      const streakEl = document.getElementById('atomic-stat-streak');
      if (streakEl) {
        let maxStreak = 0;
        this.habits.forEach(h => {
          if (h.streak > maxStreak) maxStreak = h.streak;
        });
        streakEl.textContent = `${maxStreak} Hari`;
      }

      // Tasks
      const tasksEl = document.getElementById('atomic-stat-tasks');
      if (tasksEl) {
        const completed = this.todos.filter(t => t.status === 'completed').length;
        tasksEl.textContent = `${completed} / ${this.todos.length}`;
      }

      // Balance
      const balanceEl = document.getElementById('atomic-stat-balance');
      if (balanceEl && this.savingsData && this.savingsData.summary) {
        balanceEl.textContent = this.formatIDR(this.savingsData.summary.netBalance);
      }
    }

    // ==================== UTILITIES ====================

    formatIDR(num) {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
    }

    formatCompactIDR(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
      return num.toFixed(0);
    }

    escape(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  // Initialize and attach to window
  window.AtomicApp = new AtomicEngine();
})();

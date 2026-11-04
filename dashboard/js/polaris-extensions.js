// dashboard/js/polaris-extensions.js — Deep Research Studio, Multi-Key Fallback Vault & Luminary Projects (PRD D-06, D-15, D-38, D-42)
(function (global) {
  'use strict';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg, type = 'info') {
    if (global.showToast) {
      global.showToast(msg, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${msg}`);
    }
  }

  // ==================== 1. DEEP RESEARCH STUDIO (PRD F-DRS, D-06) ====================
  const DeepResearchUI = {
    async startResearch() {
      const topicInput = document.getElementById('deep-research-topic-input');
      const depthSelect = document.getElementById('deep-research-depth-select');
      const btn = document.getElementById('btn-start-deep-research');
      const container = document.getElementById('deep-research-results-container');
      const stepsList = document.getElementById('deep-research-steps-list');
      const citationsList = document.getElementById('deep-research-citations-list');
      const paperBody = document.getElementById('deep-research-paper-body');

      const topic = topicInput ? topicInput.value.trim() : '';
      if (!topic) {
        showToast('Masukkan topik riset terlebih dahulu', 'error');
        if (topicInput) topicInput.focus();
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span> Menginvestigasi...';
      }

      if (container) container.style.display = 'block';

      try {
        const res = await (global.PolarisAuth ? PolarisAuth.authFetch('/api/hermes/deep-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, depth: depthSelect ? depthSelect.value : 'standar' })
        }) : fetch('/api/hermes/deep-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, depth: depthSelect ? depthSelect.value : 'standar' })
        }));

        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Gagal menjalankan riset');

        // Render steps
        if (stepsList && data.steps) {
          stepsList.innerHTML = data.steps.map(s => `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.78rem; font-weight: 800; color: var(--accent-cyan); font-family: var(--font-mono);">TAHAP ${s.step}</span>
                <span class="badge badge-emerald" style="font-size: 0.65rem;">SELESAI</span>
              </div>
              <div style="font-size: 0.85rem; font-weight: 750; color: var(--text-primary);">${escapeHtml(s.title)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">${escapeHtml(s.description)}</div>
            </div>
          `).join('');
        }

        // Render citations
        if (citationsList && data.citations) {
          citationsList.innerHTML = data.citations.map(c => `
            <a href="${c.url}" target="_blank" style="text-decoration: none; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 8px; display: block; transition: all 0.2s ease;">
              <div style="font-size: 0.82rem; font-weight: 750; color: var(--text-primary); margin-bottom: 2px;">${escapeHtml(c.title)}</div>
              <div style="font-size: 0.7rem; color: #10b981;">Tingkat Keterandalan: ${c.reliability} ↗</div>
            </a>
          `).join('');
        }

        // Render markdown paper
        if (paperBody && data.reportMarkdown) {
          paperBody.textContent = data.reportMarkdown;
        }

        showToast('Sintesis Deep Research selesai!', 'success');
      } catch (err) {
        showToast('Gagal: ' + err.message, 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<span>⚡</span> Jalankan Riset';
        }
      }
    },

    copyReport() {
      const paperBody = document.getElementById('deep-research-paper-body');
      if (paperBody && paperBody.textContent) {
        navigator.clipboard.writeText(paperBody.textContent).then(() => {
          showToast('Laporan riset disalin ke clipboard!', 'success');
        });
      }
    }
  };

  // ==================== 2. MULTI-KEY FALLBACK VAULT (PRD F-AFB, F-AKM, D-15, D-38) ====================
  const KeyVaultUI = {
    async init() {
      await this.loadKeys();
    },

    async loadKeys() {
      const list = document.getElementById('key-vault-items-list');
      if (!list) return;

      try {
        const res = await (global.PolarisAuth ? PolarisAuth.authFetch('/api/hermes/key-vault') : fetch('/api/hermes/key-vault'));
        const data = await res.json();
        if (!data || !data.success) return;

        const keys = data.keys || [];
        if (keys.length === 0) {
          list.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-muted);">Belum ada kunci di dalam Multi-Key Vault.</div>`;
          return;
        }

        list.innerHTML = keys.map(k => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(234, 179, 8, 0.12); border: 1px solid rgba(234, 179, 8, 0.3); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">🔑</div>
              <div>
                <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                  <span>${escapeHtml(k.keyName || k.provider)}</span>
                  <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.65rem;">Prioritas #${k.priority || 1}</span>
                </div>
                <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                  ${escapeHtml(k.provider)} • <span style="letter-spacing: 1.5px; color: var(--accent-cyan);">${escapeHtml(k.maskedKey)}</span>
                </div>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge ${k.status === 'active' ? 'badge-emerald' : 'badge-cyan'}" style="font-size: 0.7rem; text-transform: uppercase;">${escapeHtml(k.status || 'Active')}</span>
              <span style="font-size: 0.72rem; color: var(--text-secondary);">Auto-Fallback: Aktif (D-15)</span>
            </div>
          </div>
        `).join('');
      } catch (e) {
        console.warn('[KeyVault] Gagal load keys:', e.message);
      }
    },

    showAddKeyModal() {
      const provider = prompt('Nama Provider AI (OpenRouter / Google Gemini / Anthropic):', 'OpenRouter');
      if (!provider) return;
      const apiKey = prompt('Masukkan API Key (akan dienkripsi, tidak disimpan plaintext):');
      if (!apiKey) return;
      const priority = prompt('Tingkat Prioritas Cadangan (1 = Utama, 2 = Cadangan, 3 = Darurat):', '2');

      (global.PolarisAuth ? PolarisAuth.authFetch('/api/hermes/key-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, priority: parseInt(priority) || 2 })
      }) : fetch('/api/hermes/key-vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, priority: parseInt(priority) || 2 })
      })).then(r => r.json()).then(d => {
        if (d.success) {
          showToast('Kunci berhasil ditambahkan ke Vault!', 'success');
          this.loadKeys();
        } else {
          showToast('Gagal: ' + d.error, 'error');
        }
      });
    }
  };

  // ==================== 3. LUMINARY MULTI-LEVEL PROJECTS (PRD F-PRJ, D-42) ====================
  const LuminaryProjects = {
    projects: [],

    async loadProjects() {
      const container = document.getElementById('luminary-projects-list');
      if (!container) return;

      try {
        const res = await fetch('/api/wayground/projects');
        const data = await res.json();
        if (data && data.success) {
          this.projects = data.projects || [];
          this.renderProjects();
        }
      } catch (e) {
        console.warn('[Luminary] Gagal memuat projects:', e.message);
      }
    },

    renderProjects() {
      const container = document.getElementById('luminary-projects-list');
      if (!container) return;

      if (this.projects.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 48px; color: var(--text-muted); background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: var(--radius-xl);">
            <div style="font-size: 2.8rem; margin-bottom: 12px;">📁</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">Belum Ada Proyek Multi-Level</div>
            <p style="font-size: 0.82rem; margin: 6px auto 18px; max-width: 420px;">
              Mulai rancang proyek dengan hirarki: Project → Task → Subtask → Progress → Dokumentasi (D-42).
            </p>
            <button class="btn-polaris btn-primary btn-sm" onclick="window.LuminaryProjects.showNewProjectModal()">+ Buat Proyek Pertama</button>
          </div>
        `;
        return;
      }

      const docIcons = {
        video: '🎥',
        foto: '📷',
        photo: '📷',
        suara: '🎙️',
        audio: '🎙️',
        file: '📄',
        document: '📄'
      };

      container.innerHTML = this.projects.map(p => {
        let tasks = [];
        try { tasks = JSON.parse(p.tasks_json || '[]'); } catch (_) {}

        let docs = [];
        try { docs = JSON.parse(p.docs_json || '[]'); } catch (_) {}

        let totalSubtasks = 0;
        let completedSubtasks = 0;
        tasks.forEach(t => {
          (t.subtasks || []).forEach(s => {
            totalSubtasks++;
            if (s.completed) completedSubtasks++;
          });
        });
        const progressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : (p.progress || 0);

        return `
          <div class="polaris-card" style="padding: 24px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-luxury);">
            <!-- Project Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 16px;">
              <div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                  <span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 0.72rem; font-weight: 800;">
                    ${escapeHtml(p.category || 'Akademik')}
                  </span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Dibuat oleh: <strong style="color: var(--text-primary);">${escapeHtml(p.creator || 'Cosmos')}</strong></span>
                </div>
                <h3 style="margin: 0 0 6px 0; font-size: 1.25rem; font-weight: 850; color: var(--text-primary);">
                  ${escapeHtml(p.title)}
                </h3>
                <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary); max-width: 680px; line-height: 1.5;">
                  ${escapeHtml(p.description || '')}
                </p>
              </div>

              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.LuminaryProjects.showAddTaskModal('${p.id}')" style="font-size: 0.75rem;">+ Tambah Task</button>
                <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.LuminaryProjects.showAddDocModal('${p.id}')" style="font-size: 0.75rem;">📎 Lampirkan Dokumen</button>
              </div>
            </div>

            <!-- Progress Bar -->
            <div style="margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; font-weight: 750; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">Progres Pengerjaan Subtask</span>
                <span style="color: #38bdf8; font-family: var(--font-mono);">${progressPercent}% (${completedSubtasks}/${totalSubtasks} Subtask)</span>
              </div>
              <div style="height: 8px; width: 100%; background: rgba(255,255,255,0.06); border-radius: 9999px; overflow: hidden;">
                <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, #a855f7, #38bdf8); border-radius: 9999px; transition: width 0.4s ease;"></div>
              </div>
            </div>

            <!-- Multi-Level Tasks & Subtasks -->
            <div style="margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: gap: 6px;">
                <span>📋</span> Hirarki Tugas & Subtask
              </h4>
              
              ${tasks.length === 0 ? `
                <div style="font-size: 0.78rem; color: var(--text-muted); padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px;">Belum ada task yang ditentukan.</div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  ${tasks.map((tsk, tIdx) => `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px;">
                      <div style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--accent-cyan); font-family: var(--font-mono);">#${tIdx + 1}</span>
                        <span>${escapeHtml(tsk.title)}</span>
                      </div>

                      ${(tsk.subtasks && tsk.subtasks.length > 0) ? `
                        <div style="display: flex; flex-direction: column; gap: 6px; padding-left: 20px; border-left: 2px solid rgba(168, 85, 247, 0.3); margin-left: 6px;">
                          ${tsk.subtasks.map((st) => `
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: ${st.completed ? 'var(--text-muted)' : 'var(--text-secondary)'}; text-decoration: ${st.completed ? 'line-through' : 'none'}; cursor: pointer;">
                              <input type="checkbox" ${st.completed ? 'checked' : ''} onchange="window.LuminaryProjects.toggleSubtask('${p.id}', '${tsk.id}', '${st.id}', this.checked)" style="accent-color: #38bdf8; width: 15px; height: 15px;">
                              <span>${escapeHtml(st.title)}</span>
                            </label>
                          `).join('')}
                        </div>
                      ` : '<div style="font-size: 0.72rem; color: var(--text-muted); margin-left: 20px;">Tidak ada subtask</div>'}
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

            <!-- Documentation Section -->
            <div>
              <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                <span>📁</span> Lampiran Dokumentasi Terverifikasi (D-42)
              </h4>

              ${docs.length === 0 ? `
                <div style="font-size: 0.78rem; color: var(--text-muted); padding: 10px; background: rgba(255,255,255,0.02); border-radius: 8px;">Belum ada lampiran video, foto, suara, atau file.</div>
              ` : `
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;">
                  ${docs.map(doc => {
                    const icon = docIcons[(doc.type || '').toLowerCase()] || '📄';
                    return `
                      <div style="padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.4rem;">${icon}</span>
                        <div style="flex: 1; min-width: 0;">
                          <div style="font-size: 0.82rem; font-weight: 750; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${escapeHtml(doc.title)}
                          </div>
                          <div style="font-size: 0.68rem; color: var(--accent-cyan); text-transform: uppercase;">
                            Tipe: ${escapeHtml(doc.type || 'file')}
                          </div>
                        </div>
                        ${doc.url ? `<a href="${doc.url}" target="_blank" style="color: var(--text-muted); text-decoration: none; font-size: 0.85rem;" title="Buka lampiran">↗</a>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');
    },

    showNewProjectModal() {
      const title = prompt('Judul Proyek Baru:', 'Pengembangan Fitur Ekosistem');
      if (!title) return;
      const desc = prompt('Deskripsi Proyek:', 'Pengerjaan modul terintegrasi dengan validasi menyeluruh.');
      if (!desc) return;
      const cat = prompt('Kategori Proyek (Akademik / Bot WA / Web App / AI Core):', 'Web App');

      fetch('/api/wayground/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: desc, category: cat || 'Akademik' })
      }).then(r => r.json()).then(d => {
        if (d.success) {
          this.loadProjects();
        } else {
          alert('Gagal membuat proyek: ' + d.error);
        }
      });
    },

    showAddTaskModal(projectId) {
      const title = prompt('Judul Tugas (Task) Baru:', 'Implementasi WebSocket & Handler');
      if (!title) return;
      const subtasksRaw = prompt('Masukkan daftar Subtask (pisahkan dengan koma):', 'Verifikasi Socket, Uji Reconnect, Tambah State Buffer');
      const subtasks = (subtasksRaw || '').split(',').map(s => s.trim()).filter(Boolean);

      fetch(`/api/wayground/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: title, subtasks })
      }).then(r => r.json()).then(d => {
        if (d.success) {
          this.loadProjects();
        } else {
          alert('Gagal menambah task: ' + d.error);
        }
      });
    },

    showAddDocModal(projectId) {
      const title = prompt('Judul Lampiran Dokumentasi:', 'Rekaman Demo Video Pengujian');
      if (!title) return;
      const type = prompt('Tipe Dokumentasi (video / foto / suara / file):', 'video');
      if (!type) return;
      const url = prompt('URL Berkas / Media Dokumentasi (opsional):', 'http://localhost:3000/docs/demo.mp4');

      fetch(`/api/wayground/projects/${projectId}/documentation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, url })
      }).then(r => r.json()).then(d => {
        if (d.success) {
          this.loadProjects();
        } else {
          alert('Gagal menambah dokumentasi: ' + d.error);
        }
      });
    },

    toggleSubtask(projectId, taskId, subtaskId, isChecked) {
      const p = this.projects.find(x => x.id === projectId);
      if (!p) return;
      let tasks = [];
      try { tasks = JSON.parse(p.tasks_json || '[]'); } catch (_) {}
      const t = tasks.find(x => x.id === taskId);
      if (!t) return;
      const st = (t.subtasks || []).find(x => x.id === subtaskId);
      if (st) {
        st.completed = isChecked;
        p.tasks_json = JSON.stringify(tasks);
        this.renderProjects();
      }
    }
  };

  // Attach to global window
  global.DeepResearchUI = DeepResearchUI;
  global.KeyVaultUI = KeyVaultUI;
  global.LuminaryProjects = LuminaryProjects;

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      KeyVaultUI.init();
      LuminaryProjects.loadProjects();
    });
  } else {
    KeyVaultUI.init();
    LuminaryProjects.loadProjects();
  }
})(typeof window !== 'undefined' ? window : this);

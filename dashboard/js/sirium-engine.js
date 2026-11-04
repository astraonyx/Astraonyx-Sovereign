// dashboard/js/sirium-engine.js — Sirium Digital Asset Marketplace Engine (PRD F-SKT, F-STR, F-SLS, F-SCO, F-SMD, D-45, D-46)
(function () {
  'use strict';

  class SiriumEngine {
    constructor() {
      this.currentSection = 'catalog';
      this.activeCategory = 'all';
      this.searchQuery = '';
      this.listings = [];
      this.categories = [];
      this.stores = [];

      this.init();
    }

    async init() {
      // Bind search input enter
      const searchInput = document.getElementById('sirium-search-input');
      if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            this.searchListings(searchInput.value);
          }
        });
      }

      // Bind drawer subtabs
      document.querySelectorAll('.sirium-subtab').forEach(tab => {
        tab.addEventListener('click', (e) => {
          const sec = e.currentTarget.getAttribute('data-sirium-section');
          if (sec) this.switchSection(sec);
        });
      });

      await this.refreshAll();
    }

    async refreshAll() {
      await Promise.allSettled([
        this.loadCatalog(),
        this.loadStores(),
      ]);
    }

    switchSection(sectionId) {
      this.currentSection = sectionId;

      // Update drawer subtabs
      document.querySelectorAll('.sirium-subtab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-sirium-section') === sectionId);
      });

      if (sectionId === 'catalog') {
        const catSec = document.getElementById('sirium-sec-catalog');
        const strSec = document.getElementById('sirium-sec-stores');
        if (catSec) catSec.style.display = 'block';
        if (strSec) strSec.style.display = 'none';
      } else if (sectionId === 'stores') {
        const catSec = document.getElementById('sirium-sec-catalog');
        const strSec = document.getElementById('sirium-sec-stores');
        if (catSec) catSec.style.display = 'none';
        if (strSec) strSec.style.display = 'block';
        this.loadStores();
      } else if (sectionId === 'sell') {
        this.showSellAssetModal();
      } else if (sectionId === 'contact') {
        if (this.listings.length > 0) {
          this.initiateContactSeller(this.listings[0].id);
        } else {
          this.switchSection('catalog');
        }
      }
    }

    // ==================== 1. KATALOG & LISTINGS (F-SKT, F-SLS) ====================

    async loadCatalog() {
      try {
        let url = `/api/sirium/catalog?category=${encodeURIComponent(this.activeCategory)}`;
        if (this.searchQuery) url += `&search=${encodeURIComponent(this.searchQuery)}`;

        const res = await (window.PolarisAuth ? PolarisAuth.authFetch(url) : fetch(url));
        const data = await res.json();
        if (data.success) {
          this.listings = data.listings || [];
          this.categories = data.categories || [];
          this.renderCategoryPills();
          this.renderListings();
        }
      } catch (err) {
        console.warn('[Sirium] Gagal memuat katalog:', err.message);
      }
    }

    renderCategoryPills() {
      const container = document.getElementById('sirium-category-pills');
      if (!container || this.categories.length === 0) return;

      container.innerHTML = this.categories.map(cat => `
        <button type="button" class="btn-polaris ${this.activeCategory === cat.id ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="window.SiriumApp.filterCategory('${cat.id}')" style="font-size: 0.75rem; border-radius: 9999px; padding: 4px 12px; display: inline-flex; align-items: center; gap: 4px;">
          <span>${cat.icon}</span>
          <span>${this.escape(cat.name)}</span>
        </button>
      `).join('');
    }

    filterCategory(catId) {
      this.activeCategory = catId;
      this.loadCatalog();
    }

    searchListings(query) {
      this.searchQuery = query || '';
      this.loadCatalog();
    }

    renderListings() {
      const grid = document.getElementById('sirium-listings-grid');
      if (!grid) return;

      if (this.listings.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
            <div style="font-size: 3rem; margin-bottom: 12px;">🔍</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">Aset Digital Tidak Ditemukan</div>
            <p style="font-size: 0.82rem; margin: 6px auto 18px; max-width: 400px;">Coba gunakan kata kunci lain atau pilih kategori "Semua Kategori".</p>
            <button class="btn-polaris btn-secondary btn-sm" onclick="window.SiriumApp.filterCategory('all')">Reset Filter</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = this.listings.map(item => {
        const priceIDR = this.formatIDR(item.price_idr);
        const coins = item.price_coins ? `💎 ${item.price_coins.toLocaleString()} Coins` : '';
        const previewImg = item.preview_image || '/assets/icons/sirium.png';

        let features = [];
        try { features = JSON.parse(item.features_json || '[]'); } catch (_) {}

        return `
          <div class="polaris-card sirium-card" style="padding: 22px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden;">
            <!-- Top Tag & Store Info -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <span class="badge" style="background: rgba(14, 165, 233, 0.12); color: #38bdf8; font-size: 0.72rem; font-weight: 800; border: 1px solid rgba(14, 165, 233, 0.3);">
                  ${this.escape(item.category)}
                </span>
                <div style="display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #f59e0b; font-weight: 800;">
                  <span>★</span>
                  <span>${item.rating ? item.rating.toFixed(1) : '5.0'}</span>
                  <span style="color: var(--text-muted); font-weight: normal; margin-left: 2px;">(${item.downloads_count || 0})</span>
                </div>
              </div>

              <!-- Product Header -->
              <div style="display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px;">
                <div style="width: 52px; height: 52px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 6px;">
                  <img src="${previewImg}" alt="${this.escape(item.title)}" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div style="flex: 1; min-width: 0;">
                  <h3 style="margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 850; color: var(--text-primary); line-height: 1.35;">
                    ${this.escape(item.title)}
                  </h3>
                  <div style="font-size: 0.74rem; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                    <span>Oleh: <strong>${this.escape(item.store_name || item.owner_username || 'Ataraxia Studio')}</strong></span>
                    ${item.store_badge ? `<span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.65rem; padding: 1px 6px;">✓ Verified</span>` : ''}
                  </div>
                </div>
              </div>

              <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin: 0 0 14px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${this.escape(item.description)}
              </p>

              <!-- Features pills -->
              ${features.length > 0 ? `
                <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
                  ${features.slice(0, 2).map(f => `
                    <span style="font-size: 0.68rem; padding: 2px 8px; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); color: var(--text-secondary);">
                      • ${this.escape(f)}
                    </span>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Footer: Price & Direct Contact Action (D-45, D-46) -->
            <div style="padding-top: 14px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
              <div>
                <div style="font-size: 1.15rem; font-weight: 900; color: #10b981; font-family: var(--font-mono); letter-spacing: -0.02em;">
                  ${priceIDR}
                </div>
                ${coins ? `<div style="font-size: 0.7rem; color: #c084fc; font-weight: 700;">${coins}</div>` : ''}
              </div>

              <div style="display: flex; gap: 8px;">
                ${item.live_demo_url ? `
                  <a href="${item.live_demo_url}" target="_blank" class="btn-polaris btn-secondary btn-sm" style="font-size: 0.75rem; text-decoration: none;" title="Buka Live Demo">
                    🌐 Demo
                  </a>
                ` : ''}
                <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.SiriumApp.initiateContactSeller('${item.id}')" style="font-size: 0.78rem; font-weight: 750; padding: 7px 14px; display: inline-flex; align-items: center; gap: 6px;">
                  <span>💬</span> Hubungi Penjual
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // ==================== 2. HUBUNGI PENJUAL MODAL (PRD D-45, D-46) ====================

    async initiateContactSeller(listingId) {
      const listing = this.listings.find(l => l.id === listingId);
      const title = listing ? listing.title : 'Aset Digital Sirium';

      const currentUser = window.PolarisAuth ? PolarisAuth.getCurrentUser() : null;
      const defaultBuyer = currentUser ? (currentUser.username || currentUser.name) : 'Pelanggan';

      const modalHtml = `
        <div id="sirium-contact-modal" class="atomic-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
          <div class="polaris-card" style="width: 100%; max-width: 520px; padding: 26px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-luxury);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.4rem;">🛍️</span>
                <div>
                  <h3 style="margin: 0; font-size: 1.15rem; font-weight: 850; color: var(--text-primary);">Hubungi Penjual (D-45, D-46)</h3>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">Pembelian diselesaikan langsung dengan toko melalui chat resmi</div>
                </div>
              </div>
              <button type="button" class="btn-icon" onclick="document.getElementById('sirium-contact-modal').remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem;">✕</button>
            </div>

            <!-- Product info banner -->
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 18px;">
              <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 750;">Produk Yang Dipilih</div>
              <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin: 2px 0 4px;">${this.escape(title)}</div>
              <div style="font-size: 0.78rem; color: #10b981; font-weight: 800; font-family: var(--font-mono);">${listing ? this.formatIDR(listing.price_idr) : ''}</div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Nama / Username Pembeli</label>
                <input type="text" id="contact-buyer-name" class="form-input" value="${this.escape(defaultBuyer)}" style="width: 100%;">
              </div>

              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Saluran Komunikasi Pilihan</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <label style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.02);">
                    <input type="radio" name="contact-channel" value="whatsapp" checked>
                    <span style="font-size: 0.82rem; font-weight: 750; color: #22c55e;">💬 WhatsApp</span>
                  </label>
                  <label style="display: flex; align-items: center; gap: 8px; padding: 10px 14px; border: 1px solid var(--border-subtle); border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.02);">
                    <input type="radio" name="contact-channel" value="telegram">
                    <span style="font-size: 0.82rem; font-weight: 750; color: #38bdf8;">✈️ Telegram</span>
                  </label>
                </div>
              </div>

              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Catatan Tambahan (Opsional)</label>
                <input type="text" id="contact-custom-note" class="form-input" placeholder="Mis: Butuh instalasi dibantu via AnyDesk..." style="width: 100%;">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="document.getElementById('sirium-contact-modal').remove()">Batal</button>
              <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.SiriumApp.submitContactRequest('${listingId}')" style="padding: 8px 18px; font-weight: 800;">
                🚀 Buka Chat Penjual
              </button>
            </div>
          </div>
        </div>
      `;
      const existing = document.getElementById('sirium-contact-modal');
      if (existing) existing.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async submitContactRequest(listingId) {
      const buyerName = document.getElementById('contact-buyer-name')?.value;
      const channel = document.querySelector('input[name="contact-channel"]:checked')?.value || 'whatsapp';
      const customNote = document.getElementById('contact-custom-note')?.value || '';

      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/sirium/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyer_username: buyerName || 'Pelanggan',
            listing_id: listingId,
            channel,
            custom_note: customNote
          })
        }) : fetch('/api/sirium/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            buyer_username: buyerName || 'Pelanggan',
            listing_id: listingId,
            channel,
            custom_note: customNote
          })
        }));

        const data = await res.json();
        if (data.success) {
          document.getElementById('sirium-contact-modal')?.remove();

          if (data.redirectUrl) {
            window.open(data.redirectUrl, '_blank');
          } else {
            alert(`Hubungi Toko "${data.sellerContact.storeName}" di WhatsApp: ${data.sellerContact.whatsapp}`);
          }
        } else {
          alert('Gagal menghubungi penjual: ' + data.error);
        }
      } catch (err) {
        console.error('[Sirium] Error submit contact:', err);
      }
    }

    // ==================== 3. TOKO & KREATOR (F-STR) ====================

    async loadStores() {
      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/sirium/stores') : fetch('/api/sirium/stores'));
        const data = await res.json();
        if (data.success) {
          this.stores = data.stores || [];
          this.renderStores();
        }
      } catch (err) {
        console.warn('[Sirium] Gagal memuat toko:', err.message);
      }
    }

    renderStores() {
      const grid = document.getElementById('sirium-stores-grid');
      if (!grid) return;

      if (this.stores.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Belum ada toko kreator terdaftar.</div>`;
        return;
      }

      grid.innerHTML = this.stores.map(s => `
        <div class="polaris-card" style="padding: 24px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 14px;">
              <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img src="${s.avatar_url || '/assets/icons/polarium-star.png'}" alt="${this.escape(s.store_name)}" style="width: 32px; height: 32px; object-fit: contain;">
              </div>
              <div>
                <h4 style="margin: 0 0 2px 0; font-size: 1.1rem; font-weight: 850; color: var(--text-primary);">
                  ${this.escape(s.store_name)}
                </h4>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 0.65rem;">
                    ✓ ${this.escape(s.badge || 'Verified')}
                  </span>
                  <span style="font-size: 0.72rem; color: var(--text-muted);">@${this.escape(s.owner_username)}</span>
                </div>
              </div>
            </div>

            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 16px 0;">
              ${this.escape(s.bio || s.tagline || 'Penyedia aset terkurasi')}
            </p>
          </div>

          <div style="padding-top: 14px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">
              Penjualan: <strong style="color: var(--text-primary); font-family: var(--font-mono);">${s.total_sales || 0}</strong>
            </div>
            <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="window.SiriumApp.switchSection('catalog')" style="font-size: 0.75rem;">
              Lihat Produk Toko →
            </button>
          </div>
        </div>
      `).join('');
    }

    // ==================== 4. JUAL ASET / PUBLISH PORTAL (F-SLS) ====================

    showSellAssetModal() {
      const modalHtml = `
        <div id="sirium-sell-modal" class="atomic-modal-backdrop" style="position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;">
          <div class="polaris-card" style="width: 100%; max-width: 540px; padding: 26px; border-radius: var(--radius-xl); background: var(--bg-surface); border: 1.5px solid var(--border-subtle); box-shadow: var(--shadow-luxury);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 850; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <span>🚀</span> Terbitkan Aset Digital Baru
              </h3>
              <button type="button" class="btn-icon" onclick="document.getElementById('sirium-sell-modal').remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem;">✕</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Judul Produk Digital</label>
                <input type="text" id="sell-modal-title" class="form-input" placeholder="Mis: Dashboard CRM Dark Mode, Bot WA E-Commerce..." style="width: 100%;">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Kategori</label>
                  <select id="sell-modal-category" class="form-input" style="width: 100%;">
                    <option value="Web Templates">Web Templates</option>
                    <option value="Full-Stack Apps">Full-Stack Apps</option>
                    <option value="Bot Modules">Bot Modules</option>
                    <option value="UI Component Kits">UI Component Kits</option>
                    <option value="Games & 3D">Games & 3D</option>
                    <option value="Audio & SFX">Audio & SFX</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Harga (IDR)</label>
                  <input type="number" id="sell-modal-price" class="form-input" placeholder="Mis: 150000" min="10000" step="5000" style="width: 100%;">
                </div>
              </div>

              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Deskripsi Lengkap</label>
                <textarea id="sell-modal-desc" class="form-input" rows="3" placeholder="Jelaskan fitur utama, spesifikasi, dan keunggulan aset Anda..." style="width: 100%; resize: vertical;"></textarea>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Tech Stack</label>
                  <input type="text" id="sell-modal-tech" class="form-input" placeholder="React, Node.js, Tailwind..." style="width: 100%;">
                </div>
                <div>
                  <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">Live Demo URL (Opsional)</label>
                  <input type="text" id="sell-modal-demo" class="form-input" placeholder="https://..." style="width: 100%;">
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px;">
              <button type="button" class="btn-polaris btn-secondary btn-sm" onclick="document.getElementById('sirium-sell-modal').remove()">Batal</button>
              <button type="button" class="btn-polaris btn-primary btn-sm" onclick="window.SiriumApp.createListingFromModal()" style="font-weight: 800;">Terbitkan di Sirium</button>
            </div>
          </div>
        </div>
      `;
      const existing = document.getElementById('sirium-sell-modal');
      if (existing) existing.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      setTimeout(() => document.getElementById('sell-modal-title')?.focus(), 50);
    }

    async createListingFromModal() {
      const title = document.getElementById('sell-modal-title')?.value;
      const category = document.getElementById('sell-modal-category')?.value;
      const price_idr = document.getElementById('sell-modal-price')?.value;
      const description = document.getElementById('sell-modal-desc')?.value;
      const tech_stack = document.getElementById('sell-modal-tech')?.value;
      const live_demo_url = document.getElementById('sell-modal-demo')?.value;

      if (!title || !title.trim()) return alert('Judul aset wajib diisi');
      if (!price_idr || isNaN(parseInt(price_idr))) return alert('Harga harus berupa nominal valid');

      try {
        const res = await (window.PolarisAuth ? PolarisAuth.authFetch('/api/sirium/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category,
            price_idr: parseInt(price_idr),
            price_coins: Math.round(parseInt(price_idr) / 500),
            description,
            tech_stack,
            live_demo_url
          })
        }) : fetch('/api/sirium/listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category,
            price_idr: parseInt(price_idr),
            price_coins: Math.round(parseInt(price_idr) / 500),
            description,
            tech_stack,
            live_demo_url
          })
        }));

        const data = await res.json();
        if (data.success) {
          document.getElementById('sirium-sell-modal')?.remove();
          await this.loadCatalog();
          this.switchSection('catalog');
        } else {
          alert('Gagal menerbitkan aset: ' + data.error);
        }
      } catch (err) {
        console.error('[Sirium] Error create listing:', err);
      }
    }

    // ==================== UTILITIES ====================

    formatIDR(num) {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
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
  window.SiriumApp = new SiriumEngine();
})();

# Astraonyx-Sovereign Design Specification (DESIGN.md)

> **Single Source of Truth** for the Astraonyx-Sovereign Ecosystem Design System, Token Architecture, Pillar Navigation, Motion Physics, and Anti-Slop Visual Standards.
> Built in strict accordance with `@apple-design`, `@apple-hig`, `@design-taste-frontend`, `@frontend-design`, `@design-md`, and `@scroll-craft`.

---

## 1. System Philosophy & Anti-Slop Manifesto

### 1.1 The Core Idea
An interface ceases to feel like computer software and begins to feel like a natural extension of thought when motion originates from current on-screen values, preserves momentum, responds instantly to touch or click, and can be interrupted or reversed at any millisecond. Astraonyx-Sovereign is an autonomous operating environment structured around **eight independent, specialized pillars**.

### 1.2 Anti-Slop Non-Negotiable Directives
1. **Zero Em-Dashes (`—`)**: Em-dashes in visible UI text are the signature tell of generic LLM generation. They are completely banned across headlines, subheads, eyebrows, pills, labels, buttons, alt text, and data chips. Replace with a period, colon, comma, or simple hyphen (`-`).
2. **No Generic AI Purple Gradients**: Banned is the ubiquitous centered purple/magenta blur or mesh glow. The canvas is deep obsidian void (`#0a0714`, `#0e091b`, `#14102b`), anchored by authentic material depth and singular, high-contrast, pillar-specific accent colors.
3. **No Fake Screenshot Divs**: No hand-built mockup task lists, fake terminal boxes, or fake window chrome rendered with empty `<div>` rectangles to simulate a product. All UI surfaces are authentic, functional interactive components.
4. **One Theme Lock**: The entire workspace is built on an obsidian dark glassmorphic system. No section may randomly invert to light beige or chalk paper mid-stream.
5. **No Button Text Wrapping at Desktop**: Primary and secondary CTA labels must fit comfortably on a single line at desktop resolutions (`min-width: 1024px`).
6. **WCAG AA Compliance**: High contrast ratios (minimum 4.5:1 for body copy and interactive labels, minimum 3:1 for large display elements) are maintained across all states.

---

## 2. The 8 Ecosystem Pillars

The ecosystem is divided into eight clearly demarcated, autonomous pillars. Each pillar features a dedicated navigation suite, signature accent token, distinct role, and primary view pane.

| Key | Pillar ID | Display Name | Subtitle / Function | Signature Accent | Pane ID |
|---|---|---|---|---|---|
| `1` | `astraonyx` | Astraonyx | Sovereign Command Matrix & Cluster Nodes | `#e2e8f0` (Platinum Obsidian) | `#pane-astraonyx` |
| `2` | `polaris` | Polaris | WhatsApp Bot Hub & Hermes AI Engine | `#00f0ff` (Electric Cyan) | `#pane-overview` |
| `3` | `polarium` | Polarium | Social Media Suite & Media Engine | `#dc2743` (Sunset Crimson) | `#pane-social` |
| `4` | `starlium` | Starlium | Galaxy Arcade & Stockfish Chess Arena | `#10b981` (Emerald Mint) | `#pane-games` |
| `5` | `luminary` | Luminary | Cosmic Academy & AI Studio | `#8b5cf6` (Royal Violet) | `#pane-study` |
| `6` | `nebula` | Nebula | Tools Hub, Mori Media Core & Spotify | `#f59e0b` (Solar Gold) | `#pane-tools` |
| `7` | `sirium` | Sirium | Digital Assets Marketplace & Creators | `#3b82f6` (Sapphire Blue) | `#pane-sirium` |
| `8` | `sanctum` | Sanctum | Cosmos Owner Panel & Live Terminal | `#e5b94f` (Imperial Gold) | `#pane-owner` |

---

## 3. Dedicated Pillar Navigation Specifications

### 3.1 Astraonyx (Pillar 1) — Sovereign Command Matrix
- **Role**: Master operational command center, cluster node mesh monitor, telemetry, and launchpad.
- **Dedicated Subnav Items**:
  1. `Command Matrix`: Global cluster health, uptime, active socket engines, and node overview.
  2. `Cluster Nodes`: WhatsApp Baileys multi-device nodes, pairing status, memory usage, and load balancing.
  3. `Telemetry`: Real-time WebSocket ping, latency sparklines, message processing rate, and error counters.
  4. `Launchpad`: Visual quick-switcher to all 8 pillars with live status beacons.
  5. `Event Log`: High-frequency sovereign audit trail and socket traffic events.

### 3.2 Polaris (Pillar 2) — Bot Hub & Hermes AI
- **Role**: WhatsApp multi-device bot management, conversational AI skills, group moderation, and automation.
- **Dedicated Subnav Items**:
  1. `Bot Hub`: Instance connection QR code, pairing code, server slot indicators (`#pane-overview`).
  2. `Hermes AI`: Autonomous agent interface, model routing, reasoning playground (`#pane-hermes`).
  3. `Grup & Moderasi`: Group management, antilink, welcome automations (`#pane-groups`).
  4. `Auto-Responder`: Trigger-response rules, interactive message menus (`#pane-autoresponder`).
  5. `Commands`: Full command catalog, execution statistics, permission levels (`#pane-commands`).
  6. `Story Studio`: WhatsApp status uploader, media composer (`#pane-story`).
  7. `Whitelist`: Access authorization, VIP numbers, blacklist protection (`#pane-whitelist`).
  8. `Deep Research`: AI research and document distillation.
  9. `Multi-Key Vault`: API key orchestration and quota balancer.

### 3.3 Polarium (Pillar 3) — Social Suite
- **Role**: Multi-platform social feeds, reels playback, direct messaging, and cloud drive storage.
- **Dedicated Subnav Items**:
  1. `Instagram Feed`: Media grid, post details, engagement analytics (`ig_feed`).
  2. `TikTok Reels`: Vertical video viewport with hardware accelerated scrub (`tiktok_reels`).
  3. `X Timeline`: Fast microblog stream, thread reader (`x_timeline`).
  4. `Direct Messages`: Realtime messaging channels, media inbox (`direct_messages`).
  5. `Drive Media`: Cloud storage viewer, thumbnail gallery (`gdrive_storage`).

### 3.4 Starlium (Pillar 4) — Galaxy Arcade
- **Role**: High-performance browser games with Stockfish engine and procedural puzzle solvers.
- **Dedicated Subnav Items**:
  1. `Catur Stockfish`: Full Stockfish 16 engine, evaluation bar, ELO calibration (`chess`).
  2. `Sudoku Master`: Procedural board generator, pencil marks, hint system (`sudoku`).
  3. `Minesweeper`: Classic retro puzzle with timer and flag mechanics (`minesweeper`).
  4. `Tic-Tac-Toe`: Minimax AI difficulty modes (`xox`).
  5. `SOS Arena`: 2-player grid tactics (`sos`).
  6. `Galaxy Snake`: Smooth canvas snake with orbital power-ups (`snake`).
  7. `Cosmic Memory`: Card flipping pair puzzle with timer (`memory`).
  8. `Dots & Boxes`: Territory capture grid game (`dots`).

### 3.5 Luminary (Pillar 5) — Cosmic Academy
- **Role**: Adaptive learning, interactive quizzes, 3D flashcards, and student workspace.
- **Dedicated Subnav Items**:
  1. `Katalog Kuis`: Study module catalog, category filters, difficulty tags (`explore`).
  2. `Arena Kuis`: Live timed quiz runner with instant answer analysis (`arena`).
  3. `Flashcards 3D`: Spatial CSS card flipping and spaced-repetition deck (`flashcards`).
  4. `AI Studio`: Quiz and curriculum generator using AI prompts (`creator`).
  5. `Laporan & Skor`: Learning analytics, mastery charts, score history (`reports`).
  6. `Project & Docs`: Academic research notes, documentation compiler (`projects`).

### 3.6 Nebula (Pillar 6) — Tools Hub & Media Studio
- **Role**: Multi-platform media extraction, format transformation, and utilities.
- **Dedicated Subnav Items**:
  1. `Mori Media Core`: High-speed video/audio downloader for 16+ platforms (`mori`).
  2. `OmniGet Studio`: Universal batch downloader with media previews (`omniget`).
  3. `APK Builder`: Web-to-APK compilation sandbox (`apkbuilder`).
  4. `Tarot 22 Arcana`: Daily card draw and algorithmic divination (`tarot`).
  5. `Lumina AI 4K`: Image upscaling and prompt-based art generation (`lumina`).
  6. `Spotify Studio`: Cloud audio streaming and playlist search (`spotify`).

### 3.7 Sirium (Pillar 7) — Digital Assets Marketplace
- **Role**: Marketplace for sovereign bot modules, web templates, and UI assets.
- **Dedicated Subnav Items**:
  1. `Katalog Aset`: Featured products, pricing chips, licensing terms (`catalog`).
  2. `Toko & Kreator`: Verified creator storefronts and portfolio pages (`stores`).
  3. `Buka Toko / Jual`: Merchant onboarding, product upload wizard (`sell`).
  4. `Keranjang`: Cart drawer, coupon validation, checkout flow (`cart`).
  5. `Hubungi Penjual`: Direct seller communication channel (`contact`).

### 3.8 Sanctum (Pillar 8) — Cosmos Owner Panel
- **Role**: Exclusive system administration, terminal, raw storage, and security controls.
- **Access Guard**: Strictly Cosmos role only (`PolarisAuth.getCurrentUser().role === 'cosmos'`).
- **Dedicated Subnav Items**:
  1. `Panel Owner`: Core server toggles, instance slots, system metrics (`owner`).
  2. `Live Terminal`: Interactive bash console with session history (`terminal`).
  3. `Storage & Tmp`: File system explorer, cache cleaner, temp storage manager (`storage`).
  4. `Statistik & Audit`: System load, socket throughput, API quotas (`analytics`).
  5. `Pengaturan Akun`: User authentication credentials, Cosmos token (`account`).

---

## 4. Design Tokens & Material Properties

### 4.1 Color Hierarchy
```css
/* Tier 1: Primitives */
--void: #0a0714;
--surface: #14102b;
--raised: #1d1740;
--text: #f2efff;
--text-2: #b9b2d9;
--text-3: #8f88b5;

/* Pillar Accents */
--pillar-astraonyx: #e2e8f0;
--pillar-polaris:   #00f0ff;
--pillar-polarium:  #dc2743;
--pillar-starlium:  #10b981;
--pillar-luminary:  #8b5cf6;
--pillar-nebula:    #f59e0b;
--pillar-sirium:    #3b82f6;
--pillar-sanctum:   #e5b94f;
```

### 4.2 Material Translucency (Apple Glass Architecture)
```css
/* Dual-rail & floating chrome glass */
.polaris-primary-rail,
.polaris-subnav-drawer,
.polaris-top-header {
  background: rgba(14, 9, 27, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
```

### 4.3 Motion Curves & Tactile Feedback
- **Default Spring**: `cubic-bezier(0.16, 1, 0.3, 1)`
- **Duration**: `220ms` for micro-interactions, `320ms` for drawer expansion, `360ms` for pane cross-fades.
- **Tactile Active Push**:
  ```css
  .rail-pillar-btn:active,
  .nav-tab:active {
    transform: scale(0.97);
    transition: transform 100ms ease-out;
  }
  ```
- **Accessibility Fallback**:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 5. Keyboard Navigation Matrix

| Key Combination | Action | Scope |
|---|---|---|
| `1` | Switch to Astraonyx (Command Matrix) | Global |
| `2` | Switch to Polaris (Bot Hub & Hermes) | Global |
| `3` | Switch to Polarium (Social Suite) | Global |
| `4` | Switch to Starlium (Galaxy Arcade) | Global |
| `5` | Switch to Luminary (Cosmic Academy) | Global |
| `6` | Switch to Nebula (Tools & Mori Core) | Global |
| `7` | Switch to Sirium (Digital Assets) | Global |
| `8` | Switch to Sanctum (Cosmos Owner Panel) | Global (Guarded) |
| `⌘K` / `Ctrl+K` | Open Omnisearch Spotlight | Global |
| `⌘J` / `Ctrl+J` | Open Ecosystem Orbit Launcher | Global |
| `Alt+B` | Toggle Subnav Drawer Collapse | Global |

---

## 6. Verification & Quality Floor
Every UI update must pass the following verification gates before release:
1. Syntax validity verification (`node --check`).
2. Zero CLS (Cumulative Layout Shift = 0) through fixed structural layout geometry.
3. Complete DOM synchronization between the primary macro rail, the subnav drawer, and the tab pane.
4. Total elimination of em-dash (`—`) characters in visible templates and scripts.
5. Strict access gate verification on Sanctum for non-Cosmos roles.

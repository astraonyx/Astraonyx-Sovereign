# Design Systems, Tokens & Brand Archetypes

## 1. Three-Tier Token Architecture
Always structure design systems into three distinct layers:
1. **Tier 1: Global Primitive Tokens** (Raw values)
   - Colors: `slate-950`, `violet-600`, `zinc-900`, `emerald-500`
   - Spacing: `spacing-1` (4px), `spacing-2` (8px), `spacing-4` (16px), `spacing-8` (32px)
2. **Tier 2: Semantic Tokens** (Role-based aliases)
   - Canvas: `var(--bg-canvas)`
   - Surfaces: `var(--surface-default)`, `var(--surface-raised)`, `var(--surface-overlay)`
   - Foreground: `var(--text-primary)`, `var(--text-muted)`, `var(--text-faint)`
   - Accents: `var(--accent-default)`, `var(--accent-hover)`, `var(--accent-subtle)`
   - Borders: `var(--border-hairline)`, `var(--border-strong)`
3. **Tier 3: Component Tokens** (Scoped overrides)
   - `--btn-primary-bg`, `--card-elevation-shadow`, `--nav-blur-backdrop`

## 2. Production Brand Archetypes
Borrow proven visual profiles when crafting UI:

### Linear Aesthetic (Dense, Dark Craft)
- **Canvas**: `#010102` (deep obsidian)
- **Surfaces**: `#0f1011`, `#141516`, hairline border `#23252a`
- **Text**: Primary `#f7f8f8`, muted `#8a8f98`
- **Accent**: Lavender-blue `#5e6ad2` used strictly for focal CTAs and focus rings
- **Feel**: Ultra-dense, product UI previews framed in charcoal panels, negative tracking

### Vercel / Geist Aesthetic (Monochrome Precision)
- **Canvas**: `#000000` (pure black)
- **Surfaces**: `#0a0a0a`, `#111111`, border `#222222`
- **Text**: `#ededed`, muted `#888888`
- **Accent**: Pure white `#ffffff` or electric blue `#0070f3`
- **Feel**: Geometric sans, hairline borders, spotlight follower, minimal chrome

### Stripe Aesthetic (Fluid FinTech Warmth)
- **Canvas**: `#f6f9fc` (light) or `#0a2540` (dark)
- **Surfaces**: `#ffffff` / `#1a1f36`, soft shadow `0 15px 35px rgba(50,50,93,0.1)`
- **Accents**: Indigo `#635bff`, Cyan `#00d4ff`
- **Feel**: High typographic polish, angled gradients, crisp iconography

### Supabase Aesthetic (Technical Emerald)
- **Canvas**: `#121212`, card `#1c1c1c`
- **Accents**: `#3ecf8e` (Supabase emerald)
- **Feel**: Developer ergonomics, dark-mode first, code-oriented blocks, badge indicators

## 3. Google Stitch & DESIGN.md Integration
When generating or updating `DESIGN.md`:
- Always output valid markdown with frontmatter (`name`, `description`, `colors`, `typography`, `components`).
- Include explicit hex codes, font weights, line heights, and border radius rules.
- Maintain consistency between `DESIGN.md` and the actual implementation in code.

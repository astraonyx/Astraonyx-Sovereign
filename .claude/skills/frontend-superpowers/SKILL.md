---
name: frontend-superpowers
description: The ultimate unified frontend engineering and design intelligence skill. Merges UI/UX design intelligence (79 styles, 192 palettes, accessibility, keyboard shortcuts), taste-skill anti-slop visual engineering (obsidian canvas, aura underglows, editorial typography), Impeccable craft floor (Persuade/Operate/Read/Experience modes, bounded verification passes), Design Motion Principles (Emil Kowalski, Jakub Krehel, Jhey Tompkins perspectives, Frequency Gate), 74+ production DESIGN.md systems (Linear, Vercel, Stripe, Apple, Supabase), Web Interface Guidelines audits, and Playwright CLI end-to-end browser automation. Use this skill whenever the user asks to build, redesign, style, audit, animate, or test web components, landing pages, dashboards, or applications, or mentions /allin, taste, design systems, UI/UX, impeccable craft, motion design, or browser testing.
---

# Frontend Superpowers

A unified frontend engineering engine combining agency-grade visual design, Impeccable craft, purposeful motion design principles, robust multi-tier design systems, anti-slop aesthetic standards, and automated Playwright browser testing.

## Reference Architecture
When deeper context or specific code tokens are required, consult the corresponding reference:
- **Visual Design & Aesthetics**: Read [Taste Engine Reference](references/taste-engine.md)
- **Tokens & Brand Specifications**: Read [Design Systems & Archetypes](references/design-systems.md)
- **Craft Floor, UX & Vercel Audits**: Read [UI/UX & Impeccable Guidelines](references/ui-ux-guidelines.md)
- **Motion Principles & Physics**: Read [Motion & Design Motion Principles](references/motion-interactions.md)
- **End-to-End Testing**: Read [Playwright Testing & Automation](references/playwright-testing.md)

---

## The 5-Phase Execution Workflow

### Phase 1: Mode & Archetype Selection
1. **Determine the Impeccable Mode**:
   - **Persuade**: Landing pages, marketing, pricing — bold imagery, high-contrast CTAs.
   - **Operate**: Dashboards, editors, admin — high scanability, dense ergonomics, zero CLS.
   - **Read**: Docs, articles, blogs — typography calibrated for long-form comfort.
   - **Experience**: Portfolios, showcases — artifact leads, interface chrome recedes.
2. **Determine the Brand Archetype**:
   - **Dark Craft / Obsidian** (e.g. Linear, Supabase): Deep `#010102` surfaces, lavender/emerald accents, hairline borders.
   - **Monochrome Precision** (e.g. Vercel / Geist): Pure `#000000`, crisp `#ffffff` contrast, spotlight followers.
   - **Fluid Editorial / Warm** (e.g. Stripe, Apple): Elevated cards, subtle blur backdrops, warm shadows.
   - **Swiss Industrial / Terminal**: Monospace headers, rigid grids, stark contrast, utilitarian badges.

### Phase 2: Design Token & Layout Engineering
1. **Enforce 3-Tier Token Hierarchy**: Primitives (`slate-950`) → Semantics (`--surface-canvas`) → Components (`--card-border`).
2. **Anti-Slop Typography**:
   - Set Display XL headers (line-height 1.05 - 1.1, negative letter-spacing `-0.03em`).
   - Pair display type with distinct body fonts (e.g., Geist / Inter + JetBrains Mono).
   - Never accent a single word in bold/color without intentional brand rationale.
3. **Surface & Depth**:
   - Replace generic drop shadows with diffused aura underglows:
     `radial-gradient(circle at 50% 0%, rgba(var(--accent-rgb), 0.15) 0%, transparent 70%)`.
   - Use hairline borders (`1px border-white/10`) to separate surfaces cleanly.

### Phase 3: Ergonomics & Accessible Micro-States
1. **Complete 6-State Component Matrix**: Default, Hover, Focus-Visible, Loading, Success, and Disabled states on every interactive primitive.
2. **Keyboard Ergonomics**: Provide Command Palette (`⌘K`), logical tab indexes, and tactile active depression (`active:scale-[0.98]`).
3. **Craft Floor & Web Interface Guidelines**:
   - Touch targets $\ge 44 \times 44\text{px}$.
   - Text contrast ratio $\ge 4.5:1$ (WCAG AA).
   - Zero Cumulative Layout Shift (CLS = 0) with reserved layout slots.

### Phase 4: Purposeful Motion Design (Design Motion Principles)
1. **Select the Designer Lens**:
   - **Emil Kowalski** (Productivity UI): Fast restraint, strictly $\le 180\text{ms} - 240\text{ms}$. Ask: *"Should this animate at all?"*
   - **Jakub Krehel** (Consumer Polish): Natural smoothness, $200\text{ms} - 400\text{ms}$.
   - **Jhey Tompkins** (Creative Delighters): Playful experimentation and creative micro-interactions.
2. **Apply the Frequency Gate**:
   - **Frequent (100s/day)**: Instant (0ms - 100ms) or NO animation.
   - **Keyboard-Initiated (`⌘K`)**: Never animate entrance.
   - **Occasional / Rare**: Smooth spring curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
3. **Mandatory Reduced Motion**: Always respect `@media (prefers-reduced-motion: reduce)`.

### Phase 5: Delivery, Bounded Verification & Playwright Testing
1. **Full Output Enforcement**: Never truncate code with placeholders (`// ... rest of code`). Deliver 100% complete, runnable files.
2. **Bounded Verification Pass**:
   - Inspect once across both desktop (1440x900) and mobile (390x844).
   - Fix all layout, contrast, and alignment issues in one batched pass.
3. **Browser Automation Testing (Playwright CLI)**:
   - Launch session: `playwright-cli open http://localhost:<port>`
   - Validate navigation and key actions with `playwright-cli click` and `playwright-cli fill`.
   - Capture visual screenshot: `playwright-cli screenshot --filename <path>`.
   - Terminate session: `playwright-cli close`.

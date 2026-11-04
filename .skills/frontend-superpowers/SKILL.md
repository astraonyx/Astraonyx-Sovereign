---
name: frontend-superpowers
description: The ultimate unified frontend engineering and design intelligence skill. Merges UI/UX design intelligence (79 styles, 192 palettes, accessibility, keyboard shortcuts), taste-skill anti-slop visual engineering (obsidian canvas, aura underglows, editorial typography), 74+ production DESIGN.md systems (Linear, Vercel, Stripe, Apple, Supabase), Web Interface Guidelines audits, and Playwright CLI end-to-end browser automation. Use this skill whenever the user asks to build, redesign, style, audit, animate, or test web components, landing pages, dashboards, or applications, or mentions /allin, taste, design systems, UI/UX, or browser testing.
---

# Frontend Superpowers

A comprehensive frontend engineering engine combining agency-grade visual design, robust multi-tier design systems, anti-slop aesthetic standards, and automated Playwright browser testing.

## Reference Architecture
When deeper context or specific code tokens are required, load the corresponding reference:
- **Visual Design & Aesthetics**: Read [Taste Engine Reference](references/taste-engine.md)
- **Tokens & Brand Specifications**: Read [Design Systems & Archetypes](references/design-systems.md)
- **UX, Accessibility & Vercel Audits**: Read [UI/UX & Web Interface Guidelines](references/ui-ux-guidelines.md)
- **Spring Physics & Animations**: Read [Motion & GSAP Engineering](references/motion-interactions.md)
- **End-to-End Testing**: Read [Playwright Testing & Automation](references/playwright-testing.md)

---

## The 5-Phase Execution Workflow

### Phase 1: Archetype & Intent Selection
Determine the target aesthetic world:
1. **Dark Craft / Obsidian** (e.g. Linear, Supabase): Deep `#010102` surfaces, lavender/emerald accents, hairline borders, dense layouts.
2. **Monochrome Precision** (e.g. Vercel / Geist): Pure `#000000`, crisp `#ffffff` contrast, spotlight followers, geometric typography.
3. **Fluid Editorial / Warm** (e.g. Stripe, Apple): Elevated cards, subtle blur backdrops, warm shadows, high typographic polish.
4. **Swiss Industrial / Terminal**: Monospace headers, rigid grids, stark contrast, utilitarian badges.

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
3. **Web Interface Guidelines Audit**:
   - Touch targets $\ge 44 \times 44\text{px}$.
   - Text contrast ratio $\ge 4.5:1$ (WCAG AA).
   - Zero Cumulative Layout Shift (CLS = 0) with reserved layout slots.

### Phase 4: Motion & Physics
1. **Natural Spring Easing**: Use `cubic-bezier(0.16, 1, 0.3, 1)` for snappy clicks and `cubic-bezier(0.32, 0.72, 0, 1)` for sheet/drawer slides.
2. **Hardware Acceleration**: Only animate `transform` and `opacity`. Keep transitions between 180ms and 300ms.
3. **Scroll & Ambient Effects**: Apply spotlight cursor tracking and border sheens where appropriate.

### Phase 5: Code Delivery & Playwright Verification
1. **Full Output Enforcement**: Never truncate code with placeholders (`// ... rest of code`). Deliver 100% complete, runnable files.
2. **Automated Syntax Check**: Run `node --check` or framework build checks to guarantee zero regressions.
3. **Browser Automation Testing (Playwright CLI)**:
   - Launch session: `playwright-cli open http://localhost:<port>`
   - Validate navigation and key actions with `playwright-cli click` and `playwright-cli fill`.
   - Capture visual screenshot: `playwright-cli screenshot --filename <path>`.
   - Terminate session: `playwright-cli close`.

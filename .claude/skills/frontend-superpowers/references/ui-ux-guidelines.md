# UI/UX Engineering, Impeccable Craft & Web Interface Guidelines

## 1. Impeccable Design Modes
The mode defines what visitor success looks like on the target surface:
- **Persuade (Landing pages, marketing, pricing)**: Earn attention and action. Ship bold imagery, strong typographic hierarchy, high-contrast CTAs.
- **Operate (Dashboards, apps, editors, admin)**: Maximize scanability, dense ergonomics, zero layout shifts, predictable workflows.
- **Read (Docs, articles, changelogs)**: Typography calibrated for long-form comprehension (line-length < 80 chars, line-height 1.6).
- **Experience (Portfolios, showcases, games)**: The artifact leads from the first viewport; interface chrome recedes.

## 2. Refinement vs. Redesign Directives
- **Refinement**: Preserves incumbent brand identity, content, copy, and existing contracts. Polishes spacing, contrast, motion, and accessibility without altering established architecture.
- **Redesign**: Replaces the visual world entirely when outdated or generic. Replaces tokens, layout paradigms, and aesthetic hierarchy based on a new locked archetype.

## 3. Web Interface Guidelines & Craft Floor
- **Interactive Feedback**:
  - Every button has hover lift, focus-visible ring, active depression (`active:scale-[0.98]`).
  - Command palette shortcut (`⌘K` / `Ctrl+K`) for power navigation.
  - Escape key dismisses modals, drawers, and open menus.
- **Accessibility & Contrast**:
  - Touch targets minimum 44x44px.
  - WCAG AA contrast (minimum 4.5:1 for normal text, 3:1 for large text).
  - Semantic HTML (`<button>`, `<nav>`, `<main>`, `<dialog>`), never clickable un-tabbable `<div>`s.
- **Zero Cumulative Layout Shift (CLS = 0)**:
  - Reserve space for async images, avatars, skeletons, and dynamic metrics.
  - No content jumps on hydration or data fetch.

## 4. Bounded Verification Protocol
Prevent infinite polish loops by enforcing bounded verification passes:
1. **Build Fully**: Implement the entire surface or component cleanly without cutting corners.
2. **Batch Inspection**: Inspect once across both desktop (1440x900) and mobile (390x844) viewports.
3. **Batch Fix**: Address all identified layout, contrast, and alignment defects in a single focused pass.
4. **Final Confirmation**: Confirm fixes with one final review, then ship. Do not run open-ended micro-polish loops.

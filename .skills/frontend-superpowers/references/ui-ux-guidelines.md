# UI/UX Engineering & Web Interface Guidelines

## 1. Web Interface Guidelines (Vercel Standards)
Follow these core UX & ergonomic standards across all UI deliverables:
- **Interactive Feedback**:
  - Every button and interactive element must feature active depression (`active:scale-[0.98]`), distinct hover state, and clear focus-visible outline.
  - Form inputs must show immediate validation feedback without layout shifts (CLS = 0).
- **Navigation & Shortcuts**:
  - Command palette shortcut (`⌘K` / `Ctrl+K`) for power workflows.
  - Tab navigation must follow logical DOM order with high-contrast `:focus-visible` ring (`ring-2 ring-accent ring-offset-2`).
  - Escape key dismisses modals, drawers, and open menus.
- **Copy & Writing**:
  - Concise button labels (prefer verbs: "Create instance", "Export JSON", "Connect").
  - Clear error messages that explain both what failed and how to fix it.
- **Audit Checklist**:
  - Check touch targets: Minimum 44x44px for touch / mobile screens.
  - Check contrast ratio: WCAG AA compliant (minimum 4.5:1 for normal text, 3:1 for large text).
  - Verify semantic HTML: `<button>`, `<nav>`, `<main>`, `<dialog>`, `<section>`, not clickable `<div>`s.

## 2. Micro-States Matrix
Every component must account for the full 6-state matrix:
1. **Default / Idle**: Resting tokens.
2. **Hover**: Slight background lift (`bg-white/[0.04]`), light border glow.
3. **Focus / Active**: Ring indicator, tactile depression `scale(0.98)`.
4. **Loading / Pending**: Spinner or skeleton shimmer without resizing the container.
5. **Success / Completed**: Checkmark beacon, green status pulse.
6. **Error / Disabled**: Destructive border or `opacity-50 cursor-not-allowed`.

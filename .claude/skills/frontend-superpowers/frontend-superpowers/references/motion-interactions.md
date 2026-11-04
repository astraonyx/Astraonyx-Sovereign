# Motion, Spring Physics & Design Motion Principles

## 1. The Three Designer Perspectives
Adopt the right motion lens based on the project type:
- **Emil Kowalski** (Productivity UI, Linear, Raycast):
  - *"Should this animate at all?"*
  - Extreme restraint, speed, functional necessity.
  - Duration: Strictly under 300ms (180ms ideal).
- **Jakub Krehel** (Production Consumer Apps):
  - *"Is this subtle and polished enough for production?"*
  - Subtle production polish, seamless micro-interactions.
  - Duration: 200ms – 500ms for natural smoothness.
- **Jhey Tompkins** (Creative, Portfolios, Showcase):
  - *"What could this become?"*
  - Playful CSS innovation, delightful surprise, experimental micro-states.

### Context-to-Perspective Mapping
| Surface / Product Type | Primary Lens | Secondary Lens | Timing Guideline |
| :--- | :--- | :--- | :--- |
| Productivity Tool / Dashboard | Emil | Jakub | <= 180ms – 240ms |
| SaaS App / Settings / Admin | Emil | Jakub | <= 200ms – 300ms |
| Consumer / Mobile App | Jakub | Emil | 200ms – 400ms |
| Landing Page / Marketing | Jakub | Jhey | 250ms – 500ms |
| Portfolio / Creative Showcase | Jhey | Jakub | Context-driven |

## 2. The Frequency Gate
Before animating an interaction, evaluate how often the user triggers it:
- **Frequent (100s/day, e.g. typing, row selection, dropdown navigation)**: NO animation or instant transition (0ms – 100ms max).
- **Keyboard-Initiated (e.g. `⌘K`, shortcut navigation)**: NEVER animate entrance transitions; render immediately.
- **Occasional (Daily, e.g. modal open, sheet expand)**: Fast, subtle spring transition.
- **Rare (Monthly / Milestone, e.g. completion celebration, onboarding)**: Expressive, delightful celebration motion welcome.

> **Golden Rule**: *"The best animation is that which goes unnoticed."*

## 3. Spring Physics & Standard Easings
Avoid linear or CSS `ease-in-out` for UI elements:
- **Snappy / Tactile (Buttons, Menus)**: `cubic-bezier(0.16, 1, 0.3, 1)` (duration: 180ms – 240ms)
- **Fluid / Floating (Modals, Drawers)**: `cubic-bezier(0.32, 0.72, 0, 1)` (duration: 300ms – 450ms)
- **Tactile Depression**: `active:scale-[0.98]` on click/tap.

## 4. GSAP ScrollTrigger Patterns
- **Pinning & Stacking**: Pin sticky sections while card stacks peel away with scrubbed opacity and scale.
- **Spotlight Cursor Follower**: Ambient gradient glow tracing cursor position inside cards.
- **GPU Acceleration**: Animate ONLY `transform` and `opacity`. Never animate `top`, `left`, `width`, `height`, or `margin`.

## 5. Mandatory Accessibility (`prefers-reduced-motion`)
Accessibility is not optional. Every animation must support reduced motion:
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
In Framer Motion:
```jsx
import { useReducedMotion } from "framer-motion";
const shouldReduceMotion = useReducedMotion();
const animationProps = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
```

# Motion, Spring Physics & GSAP Engineering

## 1. Spring Physics Directives
- **Natural Easing**: Avoid linear or default CSS `ease-in-out` for UI elements.
- Use standard spring cubic-bezier curves:
  - Snappy / Tactile (Buttons, Dropdowns): `cubic-bezier(0.16, 1, 0.3, 1)` (duration: 200ms - 300ms)
  - Fluid / Floating (Modals, Drawers): `cubic-bezier(0.32, 0.72, 0, 1)` (duration: 350ms - 500ms)
  - Heavy Mechanical: `cubic-bezier(0.2, 0, 0, 1)`

## 2. GSAP ScrollTrigger Patterns
When building high-end landing pages or dashboards with GSAP:
- **Pinning & Stacking**: Pin sticky sections while card stacks peel away with scrubbed opacity and scale.
  ```javascript
  gsap.to(".feature-card", {
    scrollTrigger: {
      trigger: ".feature-section",
      start: "top top",
      end: "+=1500",
      scrub: 1,
      pin: true,
    },
    scale: 0.95,
    opacity: 0.2,
    stagger: 0.25
  });
  ```
- **Spotlight Cursor Follower**: Calculate mouse coordinate `(x, y)` and render an ambient glow following cursor movement within cards.
- **Sheen Sweep**: Animate a gradient sweep across borders on hover:
  ```css
  @keyframes sheen {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  ```
- **Performance First**: Only animate `transform` and `opacity`. Never animate `top`, `left`, `width`, `height`, or `margin` to prevent reflows and guarantee 60fps.

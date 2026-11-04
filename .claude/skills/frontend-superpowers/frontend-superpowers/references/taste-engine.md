# Taste Engine: Anti-Slop & High-End Visual Engineering

## 1. Core Anti-Slop Principles
- **No Generic AI Patterns**: Banned: generic purple/blue gradients on rounded white cards, centered floating illustrations with zero context, 3-column card features with generic icons in circular colored badges, oversized pastel pills without semantic purpose.
- **Intentional Atmosphere**: Define an explicit aesthetic world (e.g., Deep Obsidian Studio, Swiss Industrial Brutalism, Clean Warm Monochrome, Cyber-Technical Minimalist).
- **Surface Elevation Hierarchy**: 
  - Canvas: Darkest ground (e.g., `#050508` or `#010102`)
  - Surface 1: Base panel container (`#0c0d12`, subtle 1px border `rgba(255, 255, 255, 0.08)`)
  - Surface 2: Elevated card or nested element (`#13151f`, border `rgba(255, 255, 255, 0.12)`)
  - Surface 3: Floating popover / dropdown (`#1a1d2c`)

## 2. Editorial Typography
- **Hierarchy Scale**:
  - Display XL: 64px - 96px, negative tracking (`-0.03em` to `-0.05em`), line-height 1.05 - 1.1
  - Headline: 32px - 48px, tracking `-0.02em`, line-height 1.15
  - Subhead / Lead: 18px - 22px, tracking normal to `-0.01em`, line-height 1.5
  - Body: 14px - 16px, line-height 1.6, high readability
  - Caption / Meta: 11px - 13px, tracking `+0.04em`, uppercase with intentional letter-spacing
- **Type Pairings**:
  - Tech / Minimal: Inter / Geist / SF Pro + JetBrains Mono
  - Editorial Luxury: Newsreader / Playfair / Editorial New + Inter / Geist
  - Industrial Terminal: Space Grotesk / PP Neue Montreal + Space Mono / Fira Code

## 3. High-End Visual Treatments
- **Aura Underglows**: Do NOT use flat drop-shadows. Use multi-stop diffused radial gradients positioned behind cards:
  ```css
  background: radial-gradient(circle at 50% 0%, rgba(94, 106, 210, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
  ```
- **Hairline Borders**: 1px borders with subtle opacity transitions (`border-white/10` or linear gradient borders that catch light at the top edge).
- **Noise & Texture**: Ultra-subtle SVG grain overlay (1.5% - 2.5% opacity) to eliminate digital sterility.
- **Rhythmic Spacing**: Strict 4px/8px modular scale. Generous section padding (80px - 140px on desktop) to give content room to breathe.

---
name: awesome-design-md
description: Curated collection of 74+ production DESIGN.md specifications from iconic developer-focused websites and top brands (e.g. Apple, Vercel, Linear, Stripe, Supabase, Claude, Tesla, Raycast, Figma, etc.). Use this skill whenever the user or agent needs to apply, borrow, or reference a specific brand's design system, design language, color tokens, typography, or UI aesthetic, or when creating/updating a DESIGN.md for an application.
---

# Awesome DESIGN.md Reference Library

A curated repository of 74+ real-world `DESIGN.md` design system specifications extracted and reverse-engineered from world-class websites and tech companies.

All design files are located in:
`references/design-md/<brand-name>/DESIGN.md`

## Available Brands & Design Systems (74 Total)

- **AI & Developer Platforms**: `claude`, `cursor`, `elevenlabs`, `framer`, `linear.app`, `lovable`, `minimax`, `mintlify`, `mistral.ai`, `ollama`, `opencode.ai`, `posthog`, `raycast`, `replicate`, `resend`, `runwayml`, `sanity`, `sentry`, `supabase`, `together.ai`, `vercel`, `voltagent`, `warp`, `x.ai`
- **Tech Giants & Hardware**: `apple`, `dell-1996`, `hp`, `ibm`, `meta`, `nintendo-2001`, `nvidia`, `playstation`
- **SaaS & Productivity**: `airtable`, `cal`, `clay`, `clickhouse`, `cohere`, `composio`, `figma`, `hashicorp`, `intercom`, `miro`, `mongodb`, `notion`, `slack`, `superhuman`, `webflow`, `zapier`
- **Fintech & Crypto**: `binance`, `coinbase`, `kraken`, `mastercard`, `revolut`, `stripe`, `wise`
- **Automotive & Aerospace**: `bmw`, `bmw-m`, `bugatti`, `ferrari`, `lamborghini`, `renault`, `spacex`, `tesla`
- **Consumer & Lifestyle**: `airbnb`, `nike`, `pinterest`, `shopify`, `spotify`, `starbucks`, `theverge`, `uber`, `vodafone`, `wired`

## How to Use This Skill

1. **Locate the Target Brand**:
   Check the folder `references/design-md/<brand-name>/` to view the comprehensive `DESIGN.md` specification.
   Example:
   - For Linear aesthetic: read `references/design-md/linear.app/DESIGN.md`
   - For Vercel aesthetic: read `references/design-md/vercel/DESIGN.md`
   - For Stripe aesthetic: read `references/design-md/stripe/DESIGN.md`
   - For Apple aesthetic: read `references/design-md/apple/DESIGN.md`
   - For Supabase aesthetic: read `references/design-md/supabase/DESIGN.md`

2. **Extract Design Tokens**:
   Each `DESIGN.md` contains structured tokens:
   - **Colors**: Canvas, surface, borders, accents, text hierarchy (ink, ink-muted, etc.).
   - **Typography**: Display, headline, body scales, line heights, letter spacing.
   - **Component Styles**: Buttons, cards, inputs, badges, navigation bars, dropdowns.
   - **Visual Effects**: Shadows, glows, blurs, borders, hover states.

3. **Apply to Code**:
   Translate tokens directly into CSS variables, Tailwind configuration, or inline styling. Never invent arbitrary colors when a brand reference is specified.

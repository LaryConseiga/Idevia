# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Idevia
**Generated:** 2026-10-27 00:09:38
**Category:** SaaS (General)
**Design Dials:** Variance 5/10 (Balanced / Modern) | Motion 3/10 (Subtle) | Density 5/10 (Standard)

---

## Global Rules

### Color Palette — « Terre & croissance » (override manuel du 27/10/2026)

Palette générée (violet/rose « IA ») rejetée : trop générique. Direction retenue : vert profond (confiance,
croissance) + terracotta/ocre (action, chaleur), fond crème. Contrastes vérifiés AA.

| Role | Light | Dark | CSS Variable |
|------|-------|------|--------------|
| Primary (vert) | `#0B5D46` | `#34C08F` | `--primary` |
| On Primary | `#FFFFFF` | `#06231A` | `--primary-foreground` |
| Accent / CTA (terracotta) | `#C2410C` | `#F08A5D` | `--accent` |
| On Accent | `#FFFFFF` | `#2A0E03` | `--accent-foreground` |
| Highlight (ocre) | `#B7791F` | `#E6B450` | `--highlight` |
| Background (crème) | `#FFFBF5` | `#12110F` | `--background` |
| Card | `#FFFFFF` | `#1C1A17` | `--card` |
| Foreground (encre) | `#1C1917` | `#F5F1EA` | `--foreground` |
| Muted | `#F5EFE6` | `#26231F` | `--muted` |
| Muted Foreground | `#57534E` | `#A8A29E` | `--muted-foreground` |
| Border | `#E7DFD3` | `#34302B` | `--border` |
| Destructive | `#B91C1C` | `#F87171` | `--destructive` |
| Success | `#15803D` | `#4ADE80` | `--success` |
| Ring | `#0B5D46` | `#34C08F` | `--ring` |

Règle : un seul CTA terracotta par écran ; le vert porte la marque et la navigation.

### Typography

- **Heading Font:** Bricolage Grotesque (variable, 600–800) — chaleureux, distinctif
- **Body Font:** Inter (variable, 400–600)
- Chargées via `next/font/google` (auto-hébergées, pas d'appel à Google côté client, `display: swap`)
- Échelle : 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 ; corps 16px min, interligne 1.6

### Spacing Variables

*Density: 5/10 — Standard*

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: var(--accent);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--primary);
  border: 2px solid var(--primary);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: var(--card);
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 20%, transparent);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Enterprise SaaS (Mobile)

**Keywords:** enterprise, saas, b2b, professional, indigo, violet, gradient, polished, trustworthy, clean, approachable, spring, haptic

**Best For:** B2B backend management, productivity tools, government and finance mobile apps, SaaS companion apps, enterprise dashboards

**Key Effects:** Indigo→Violet gradient primary CTAs + active tab highlights, colored card shadows rgba(79,70,229,0.08), pill buttons or 12pt radius, full-width CTA at screen bottom, spring press scale 0.97, floating label inputs with animated focus border, skeletal loading pulses (Indigo/Slate tint), Bottom Sheets with drag dismiss, swipe-to-action list cards, scroll-linked title collapse

### Page Pattern

**Pattern Name:** AI Personalization Landing

- **Conversion Strategy:** 20%+ conversion with personalization. Requires analytics integration. Fallback for new users.
- **CTA Placement:** Context-aware placement based on user segment
- **Section Order:** 1. Dynamic hero (personalized), 2. Relevant features, 3. Tailored testimonials, 4. Smart CTA

---

## Motion

**Scroll Reveal** (Subtle) — Trigger: scroll (viewport enter) | Duration: 300-400ms | Easing: `power1.out`

```js
gsap.from(el, { opacity: 0, y: 12, duration: 0.35, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' } });
```

**Framework notes:** Requires the ScrollTrigger plugin registered once via gsap.registerPlugin(ScrollTrigger)

- ✅ Keep the y offset small (8-16px) so it reads as a fade, not a slide
- ❌ Don't reveal below-the-fold content needed for SEO/crawlers as invisible-by-default without a no-JS fallback
- ⚡ toggleActions 'play none none reverse' avoids re-triggering on every scroll direction change

---

## Anti-Patterns (Do NOT Use)

- ❌ Excessive animation
- ❌ Dark mode by default

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile

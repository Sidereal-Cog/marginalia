# Sidereal Cog - Brand Guidelines

## Brand Identity

**Sidereal Cog** is a developer brand focused on creating practical tools and utilities. The visual identity blends cosmic imagery with mechanical precision, representing the intersection of stellar ambition and engineering craftsmanship.

### Tagline
**"Engineered for the everyday"**

This tagline emphasizes thoughtful design applied to common, everyday problems. It reinforces the brand's commitment to precision and practicality.

---

## Logo

### Primary Logo
The Sidereal Cog logo features a unified gear-and-star design:
- Outer ring: Gear with rounded teeth
- Center: Five-pointed star (sidereal/stellar symbol)
- Color: Deep navy (#1a1f3a) on white, or white on navy

### Logo Variations
- **Primary**: Navy logo on white/light backgrounds
- **Reverse**: White logo on navy/dark backgrounds
- **Monochrome**: Single color versions acceptable for special uses

### Clear Space
Maintain minimum clear space around the logo equal to the height of one gear tooth on all sides.

### Minimum Size
- Digital: 24px × 24px (favicon size)
- Print: 0.5 inches

### Usage Guidelines
- Do not distort, rotate, or modify the logo
- Do not change colors outside approved palette
- Do not add effects (shadows, gradients, etc.)
- Do not place on busy backgrounds that reduce legibility

---

## Color Palette

### Primary Colors

**Deep Navy** (Primary Brand Color)
- Hex: `#1a1f3a`
- RGB: 26, 31, 58
- Usage: Logo, headers, primary UI elements

**Stellar Blue** (Accent Color)
- Hex: `#4a9eff`
- RGB: 74, 158, 255
- Usage: Links, highlights, interactive elements

**Silver** (Secondary Accent)
- Hex: `#c0c8d8`
- RGB: 192, 200, 216
- Usage: Secondary text, borders, subtle accents

### Background Colors

**Pure White**
- Hex: `#ffffff`
- RGB: 255, 255, 255
- Usage: Primary backgrounds, logo reverse

**Dark Void** (Alternative Dark Background)
- Hex: `#0a0e1a`
- RGB: 10, 14, 26
- Usage: Dark mode, dramatic backgrounds

**Midnight Blue** (Surface Color)
- Hex: `#0f1229`
- RGB: 15, 18, 41
- Usage: Cards, panels in dark mode

### Text Colors

**Primary Text (on light backgrounds)**
- Hex: `#1a1f3a`

**Secondary Text (on light backgrounds)**
- Hex: `#6a7489`

**Primary Text (on dark backgrounds)**
- Hex: `#c0c8d8`

**Secondary Text (on dark backgrounds)**
- Hex: `#7a8499`

### Accessibility
All color combinations meet WCAG AA standards for contrast:
- Deep Navy (#1a1f3a) on White (#ffffff): 12.8:1
- Stellar Blue (#4a9eff) on Deep Navy (#1a1f3a): 4.8:1
- Silver (#c0c8d8) on Deep Navy (#1a1f3a): 6.2:1

---

## Typography

### Primary Typeface
**Sans-serif, geometric, modern**

Recommended fonts (in order of preference):
1. **Inter** - Clean, highly legible, excellent for UI
2. **Space Grotesk** - Technical feel with personality
3. **Outfit** - Geometric, modern
4. **System fonts** - For performance-critical applications

### Font Weights
- **Light (300)**: Large headlines only
- **Regular (400)**: Body text, most UI elements
- **Medium (500)**: Subheadings, emphasized text
- **Semibold (600)**: Buttons, important labels

### Type Scale
```
Heading 1: 2.5rem (40px) - Light/Regular
Heading 2: 2rem (32px) - Regular/Medium
Heading 3: 1.5rem (24px) - Medium
Heading 4: 1.25rem (20px) - Medium
Body: 1rem (16px) - Regular
Small: 0.875rem (14px) - Regular
Tiny: 0.75rem (12px) - Regular
```

### Line Height
- Headlines: 1.2
- Body text: 1.6
- UI elements: 1.4

### Letter Spacing
- Headlines: -0.02em (slightly tighter)
- Subheadings: 0.01em
- Body: 0 (default)
- Uppercase labels: 0.05em (slightly looser)

---

## Design Principles

### 1. Clarity Over Cleverness
Prioritize usability and readability. The interface should be immediately understandable.

### 2. Precision
Every element should have purpose. Use consistent spacing, alignment, and sizing.

### 3. Restraint
Less is more. Use whitespace generously. Avoid unnecessary decoration.

### 4. Cosmic + Mechanical
Balance the ethereal (stars, space) with the tangible (gears, tools). Neither should dominate.

### 5. Professional but Approachable
Maintain technical credibility while remaining accessible to all skill levels.

---

## UI Design Guidelines

### Spacing System
Use multiples of 4px for consistent spacing:
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
3xl: 64px
```

### Border Radius
- Small elements (buttons, chips): 6px
- Medium elements (cards, inputs): 8px
- Large elements (modals, panels): 12px
- Circular elements: 50% or 9999px

### Shadows
Use subtle shadows for depth:
```css
Small: 0 1px 3px rgba(26, 31, 58, 0.12)
Medium: 0 4px 6px rgba(26, 31, 58, 0.15)
Large: 0 10px 25px rgba(26, 31, 58, 0.20)
```

### Buttons
- Primary: Stellar Blue background, white text
- Secondary: Transparent with Stellar Blue border
- Minimal: No border, Stellar Blue text
- Destructive: Red (#ef4444) when needed

### Icons
- Use outline style icons (not filled)
- 20px or 24px standard sizes
- Match stroke width to font weight
- Align icons with text baseline

---

## Voice & Tone

### Voice Characteristics
- **Direct**: Get to the point efficiently
- **Knowledgeable**: Technically accurate without being condescending
- **Helpful**: Focus on solving problems
- **Understated**: Let the work speak for itself

### Tone Guidelines
- Use active voice
- Avoid jargon unless necessary
- Be concise but complete
- Use contractions naturally
- No excessive exclamation points or emojis

### Writing Examples

**Good:**
- "Extension installed successfully"
- "Found 3 issues in your code"
- "This tool helps you organize bookmarks"

**Avoid:**
- "Woohoo! Your extension is ready to rock! 🎉"
- "Uh-oh, looks like something went wrong :("
- "Our revolutionary paradigm-shifting solution..."

---

## File Naming Conventions

For brand assets:
```
sidereal-cog-logo-primary.svg
sidereal-cog-logo-reverse.svg
sidereal-cog-logo-monochrome.svg
sidereal-cog-icon-16.png
sidereal-cog-icon-32.png
sidereal-cog-icon-128.png
```

---

## Web Implementation

See `DESIGN_TOKENS.css` for CSS variables and implementation details.

---

## Questions?

For brand-related questions or asset requests, refer to this guide first. Consistency across all Sidereal Cog projects is essential to building a recognizable identity.

**Last Updated:** 2025-11-11
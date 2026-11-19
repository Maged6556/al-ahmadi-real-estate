# Theme summary

## Tokens

Light theme: primary navy `#142542`, deep navy `#0b1526`, soft blue `#edf3f9`, gold `#c89650`, pale gold `#f7f1e6`, ink `#0f172a`, muted `#5e6f85`, line `#e2e8f0`, paper `#f8fafc`, error rose `#b91c1c`.

Dark theme: primary blue `#60a5fa`, deep navy `#070d17`, soft navy `#17253d`, gold `#dfb15b`, pale gold `#2a2318`, ink `#f8fafc`, muted `#94a3b8`, line `#1e293b`, paper `#080d1a`, error rose `#f87171`.

Typography is Arial / Noto Sans Arabic. The visual language is navy-and-gold, spacious, with rounded cards, subtle borders, and large soft shadows. Responsive breakpoint patterns are primarily `700px` and `900px` media queries.

## Source

```css
/* apps/web/src/app/globals.css */
:root {
  color-scheme: light;
  --green: #142542;
  --green-dark: #0b1526;
  --green-soft: #edf3f9;
  --gold: #c89650;
  --gold-light: #f7f1e6;
  --gold-dark: #a87935;
  --paper: #f8fafc;
  --white: #ffffff;
  --surface-raised: #f1f5f9;
  --ink: #0f172a;
  --muted: #5e6f85;
  --line: #e2e8f0;
  --rose: #b91c1c;
  --shadow: 0 18px 50px rgb(11 21 38 / 9%);
  font-family: Arial, "Noto Sans Arabic", sans-serif;
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --green: #60a5fa;
  --green-dark: #070d17;
  --green-soft: #17253d;
  --gold: #dfb15b;
  --gold-light: #2a2318;
  --gold-dark: #caa055;
  --paper: #080d1a;
  --white: #0f172a;
  --surface-raised: #182338;
  --ink: #f8fafc;
  --muted: #94a3b8;
  --line: #1e293b;
  --rose: #f87171;
  --shadow: 0 18px 50px rgb(0 0 0 / 55%);
}
```

Tailwind is configured in `apps/web/tailwind.config.ts` with content scanning only; the active design system is the global CSS token system.

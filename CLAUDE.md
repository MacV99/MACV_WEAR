# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # dev server en localhost:4321
pnpm build      # build estático a dist/
pnpm preview    # previsualizar build
```

## Arquitectura

Plantilla base de MacV para sitios web de clientes. Solo Astro, sin frameworks adicionales. Al clonar para un nuevo proyecto, los únicos archivos que se tocan para adaptar al cliente son `project.css` (colores/marca) y los textos en los componentes.

```
src/
├── styles/
│   ├── global.css      ← resets, utilidades flex, botones, formularios — NO tocar entre proyectos
│   └── project.css     ← variables :root del proyecto (colores, sombras, overlays) — personalizar aquí
├── layouts/
│   └── Layout1.astro   ← único layout; importa ambos CSS, Bootstrap Icons CDN, header + footer
├── sections/
│   ├── hero.astro
│   └── footer.astro
├── components/
│   ├── header.astro    ← sticky, glassmorphism, logo desde /img/logo-png-mini.avif
│   ├── navbar.astro    ← hamburger mobile, inline desktop, Escape cierra
│   └── mision-vision.astro
└── pages/
    ├── index.astro
    └── 404.astro
```

`global.css` solo se importa en `Layout1.astro` — nunca en componentes individuales.

## Sistema de colores (skills: css-order, astro-css-architecture)

Para adaptar al cliente, cambiar en `project.css`:

```css
--clr-primary: #032132;   /* color base — genera primary-mid y primary-light via color-mix */
--clr-accent:  #61c3ff;   /* color de vida — botón principal, íconos decorativos */
--rgb-primary: 3, 33, 50; /* canales RGB del primary — actualizar junto con --clr-primary */
--rgb-accent:  97, 195, 255; /* canales RGB del accent */
```

Las variables semánticas derivadas (`--border-soft`, `--border-hover`, `--bg-subtle`, `--hero-overlay`, `--shadow-*`, `--header-bg-*`, etc.) se recalculan solas via `rgba(var(--rgb-primary), opacidad)`. Los neutros (`--clr-dark`, `--clr-gray`, `--clr-white`) rara vez se tocan.

## Reglas CSS obligatorias

**Orden en cada selector:** base → `@media (hover: hover)` → `@media (min-width)`

```css
.elemento { /* base */ }

@media (hover: hover) {
  .elemento:hover { /* nunca :hover directo fuera de este media query */ }
}

@media (min-width: 750px) {
  .elemento { /* responsive al final, mobile-first */ }
}
```

**Dónde van los estilos:**
- `global.css` → resets y utilidades reutilizables en todos los proyectos
- `project.css` → variables `:root` específicas del proyecto
- `<style>` en el `.astro` → estilos del componente (Astro los scopea automáticamente)

Nunca `style=""` inline en etiquetas HTML. Nunca colores hardcodeados — siempre variables CSS. Breakpoint principal: `min-width: 750px`.

## Assets

Logos en `public/img/` en formato `.avif`:
- `logo-png-mini.avif` → header (transparente, mini)
- `logo-png.avif` → footer (transparente, tamaño completo)
- `logo-mini.avif` / `logo.avif` → versiones con fondo

Bootstrap Icons vía CDN en Layout1 — usar variantes `-fill` para íconos decorativos/informativos.

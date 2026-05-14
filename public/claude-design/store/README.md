# MACV WEAR Storefront — UI kit

A high-fidelity, interpretive recreation of what a MACV WEAR ecommerce storefront could look like, built directly from the brand's logo and category. **No real codebase or Figma was supplied** — these screens are a starting point, not a translation of an existing site.

## Run
Open `index.html`. Babel transpiles inline. Everything is one document plus loose JSX components.

## Surfaces

| Page | Component |
|---|---|
| Home | `HomePage.jsx` — Hero, Features, Esenciales grid, Editorial banner, Drop 03 grid |
| Shop | `Cart.jsx` (ShopPage) — full product grid |
| PDP | `PDP.jsx` — gallery, color swatches, size pills, qty stepper, specs |
| Account | `Cart.jsx` (AccountPage) — sidebar nav + order list |
| Cart drawer | `Cart.jsx` (CartDrawer) — slide-in from right, totals, empty state |

## Click-through

1. **Home** — Hero CTA jumps to PDP for `pima-negro`. "Ver colección" jumps to Shop.
2. **PDP** — Pick a color + size + qty, click `Añadir al carrito` → cart drawer opens with the item.
3. **Cart** — Adjust quantities, remove items, see shipping logic (free over $80.000).
4. **Account** — Click the user icon in the nav. Mock order history, statuses (Procesando / Enviado / Entregado).

## Components

- `Atoms.jsx` — `Logo`, `Icon`, `Button`. Lucide-style stroke icons inlined.
- `Chrome.jsx` — `TopBar` (ticker + nav), `Footer`.
- `ProductCard.jsx` — Product grid card with placeholder gradient image, color dots, badge.
- `HomePage.jsx` — Hero, Features strip, Editorial banner.
- `PDP.jsx` — Full product detail page.
- `Cart.jsx` — Drawer + Shop + Account.

## Caveats

- **No real product photos.** All product images are diagonal-stripe placeholder fills. The system is built to drop in a real `<img>` once photos exist.
- **No checkout.** "Pagar" is a dead button. Building a real checkout was out of scope for a UI kit.
- **Currency formatted as `$X.XXX` (Colombian peso convention).** If the store ships in another locale, swap `toLocaleString('es-CO')`.
- **Sizing pills use `radius: 999px`.** This is the *one* exception to the square-corner rule — see the root README's Visual Foundations.

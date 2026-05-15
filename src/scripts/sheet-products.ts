const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2Wmwnf0rWb4w9ULj5tU59U4T6Rxy_7XWFo6vYugOdMenJpce-87PzW3UVn8I7F6lqi-5KVtNHniZq/pub?output=csv&gid=2056806095';

let _cache: SheetProduct[] | null = null;
let _inflight: Promise<SheetProduct[]> | null = null;

interface SheetProduct {
  producto: string;
  marca: string;
  talla: string;
  color: string;
  precio: string;
  stock: string;
  imagen: string;
}

export interface GroupedProduct {
  slug: string;
  producto: string;
  marca: string;
  precio: string;
  imagen: string;
  colors: Array<{ name: string; hex: string; imagen: string }>;
  sizes: string[];
  skus: SheetProduct[];
}

const COLOR_HEX: Record<string, string> = {
  negro:  '#2A2620',
  hueso:  '#D9CFB9',
  oliva:  '#5A5A2E',
  gris:   '#9B9590',
  rojo:   '#B0291F',
  sangre: '#B0291F',
  azul:   '#1B3A6B',
  blanco: '#EBE3D2',
  beige:  '#B8AC92',
};

export function getHex(color: string): string {
  return COLOR_HEX[color.toLowerCase()] ?? '#6B655C';
}

function toSlug(str: string): string {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function groupProducts(skus: SheetProduct[]): GroupedProduct[] {
  const map = new Map<string, GroupedProduct>();

  for (const sku of skus) {
    const slug = `${toSlug(sku.marca)}-${toSlug(sku.producto)}`;
    if (!map.has(slug)) {
      map.set(slug, {
        slug,
        producto: sku.producto,
        marca: sku.marca,
        precio: sku.precio,
        imagen: sku.imagen,
        colors: [],
        sizes: [],
        skus: [],
      });
    }
    const gp = map.get(slug)!;
    gp.skus.push(sku);

    if (!gp.colors.find(c => c.name === sku.color)) {
      gp.colors.push({ name: sku.color, hex: getHex(sku.color), imagen: sku.imagen });
    }
    if (!gp.sizes.includes(sku.talla)) {
      gp.sizes.push(sku.talla);
    }
    if (!gp.imagen && sku.imagen) gp.imagen = sku.imagen;
  }

  return [...map.values()];
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      result.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text: string): SheetProduct[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1)
    .map(line => {
      const vals = parseLine(line);
      return headers.reduce((obj: Record<string, string>, h, i) => {
        obj[h] = (vals[i] ?? '').trim();
        return obj;
      }, {}) as unknown as SheetProduct;
    })
    .filter(p => p.producto);
}

function fmtCOP(val: string): string {
  const n = parseInt(String(val).replace(/[^\d]/g, ''), 10);
  return isNaN(n) ? val : '$ ' + n.toLocaleString('es-CO');
}

function unique(products: SheetProduct[], key: keyof SheetProduct): string[] {
  return [...new Set(products.map(p => p[key]).filter(Boolean))].sort();
}

// ─── state ────────────────────────────────────────────────────────────────────

const state = {
  products: [] as SheetProduct[],
  grouped: [] as GroupedProduct[],
  filters: { brand: '', size: '', color: '', onlyStock: false, search: '' },
};

// ─── grouped card ─────────────────────────────────────────────────────────────

function buildGroupedCard(gp: GroupedProduct, i: number): HTMLElement {
  const hasStock = gp.skus.some(s => parseInt(s.stock, 10) > 0);
  const mainColor = gp.colors[0];

  const el = document.createElement('a');
  el.className = `sheet-card${hasStock ? '' : ' oos'}`;
  el.style.animationDelay = `${(i % 12) * 0.05}s`;

  const colorDots = gp.colors.map((c, idx) =>
    `<span class="sc-colordot${idx === 0 ? ' active' : ''}" style="background:${c.hex}" title="${c.name}"></span>`
  ).join('');

  el.innerHTML = `
    <div class="sc-visual" style="background:linear-gradient(150deg,${mainColor.hex}44 0%,${mainColor.hex}18 100%);">
      <img class="sc-img" src="${mainColor.imagen || ''}" alt="${gp.producto}" loading="lazy"
           ${!mainColor.imagen ? 'style="display:none"' : ''}
           onerror="this.style.display='none'">
      <span class="sc-initial"${mainColor.imagen ? ' style="display:none"' : ''}>${(gp.marca || gp.producto || 'M')[0].toUpperCase()}</span>
      <span class="badge blood sc-badge" style="display:none">Agotado</span>
    </div>
    <div class="sc-info">
      <div class="sc-top">
        <span class="sc-name">${gp.marca}</span>
        <span class="sc-price">${fmtCOP(gp.precio)}</span>
      </div>
      <div class="sc-bottom">
        <span class="sc-sub">${gp.producto}</span>
        <div class="sc-colordots">${colorDots}</div>
      </div>
      <div class="sc-sizes"></div>
    </div>
  `;

  const visualEl  = el.querySelector('.sc-visual') as HTMLElement;
  const imgEl     = el.querySelector('.sc-img') as HTMLImageElement;
  const initialEl = el.querySelector('.sc-initial') as HTMLElement;
  const badgeEl   = el.querySelector('.sc-badge') as HTMLElement;
  const sizesEl   = el.querySelector('.sc-sizes') as HTMLElement;
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  function renderSizes(colorName: string) {
    const skusForColor = gp.skus
      .filter(s => s.color === colorName)
      .sort((a, b) => sizeOrder.indexOf(a.talla) - sizeOrder.indexOf(b.talla));

    sizesEl.innerHTML = '';
    skusForColor.forEach(sku => {
      const inStock = parseInt(sku.stock, 10) > 0;
      const isActive = inStock && state.filters.size &&
        sku.talla.toLowerCase() === state.filters.size.toLowerCase();
      const span = document.createElement('span');
      span.className = `sc-size${!inStock ? ' oos' : ''}${isActive ? ' active' : ''}`;
      span.textContent = sku.talla;
      if (inStock) {
        span.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          location.href = `/producto?p=${gp.slug}&color=${encodeURIComponent(colorName)}&size=${encodeURIComponent(sku.talla)}`;
        });
      }
      sizesEl.appendChild(span);
    });
  }

  function updateColor(idx: number) {
    const c = gp.colors[idx];
    visualEl.style.background = `linear-gradient(150deg,${c.hex}44 0%,${c.hex}18 100%)`;
    if (c.imagen) {
      imgEl.src = c.imagen;
      imgEl.style.display = '';
      initialEl.style.display = 'none';
    } else {
      imgEl.style.display = 'none';
      initialEl.style.display = '';
    }
    el.querySelectorAll('.sc-colordot').forEach((dot, j) => dot.classList.toggle('active', j === idx));
    el.href = `/producto?p=${gp.slug}&color=${encodeURIComponent(c.name)}`;

    const colorHasStock = gp.skus.some(s => s.color === c.name && parseInt(s.stock, 10) > 0);
    badgeEl.style.display = colorHasStock ? 'none' : '';
    el.classList.toggle('oos', !colorHasStock);

    renderSizes(c.name);
  }

  el.querySelectorAll('.sc-colordot').forEach((dot, idx) => {
    dot.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); updateColor(idx); });
  });

  const initIdx = state.filters.color
    ? Math.max(0, gp.colors.findIndex(c => c.name.toLowerCase() === state.filters.color.toLowerCase()))
    : 0;
  updateColor(initIdx);
  return el;
}

// ─── filter chips ─────────────────────────────────────────────────────────────

function buildFilterGroup(id: string, key: 'brand' | 'size' | 'color', values: string[]) {
  const container = document.getElementById(id);
  if (!container) return;
  container.innerHTML = '';
  values.forEach(v => {
    const b = document.createElement('button');
    b.className = 'filter-chip';
    b.dataset.fkey = key;
    b.dataset.fval = v;
    b.textContent = v;
    container.appendChild(b);
  });
}

// ─── render ───────────────────────────────────────────────────────────────────

function render() {
  const grid = document.getElementById('tienda-grid')!;
  const { brand, size, color, onlyStock, search } = state.filters;

  const filtered = state.grouped.filter(gp => {
    if (brand && gp.marca?.toLowerCase() !== brand.toLowerCase()) return false;
    if (size && !gp.sizes.some(s => s.toLowerCase() === size.toLowerCase())) return false;
    if (color && !gp.colors.some(c => c.name.toLowerCase() === color.toLowerCase())) return false;
    if (onlyStock && !gp.skus.some(s => parseInt(s.stock, 10) > 0)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!gp.producto?.toLowerCase().includes(q) && !gp.marca?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="sheet-empty"><p>Sin resultados.</p><button class="btn sm ghost" id="sheet-clear-empty">Ver todos</button></div>`;
    document.getElementById('sheet-clear-empty')?.addEventListener('click', clearFilters);
  } else {
    filtered.forEach((gp, i) => grid.appendChild(buildGroupedCard(gp, i)));
  }

  const countEl = document.getElementById('tienda-count');
  if (countEl) {
    countEl.textContent = filtered.length === state.grouped.length
      ? `${filtered.length} referencias`
      : `${filtered.length} de ${state.grouped.length} referencias`;
  }
}

function syncClear() {
  const { brand, size, color, onlyStock, search } = state.filters;
  const btn = document.getElementById('tienda-clear') as HTMLButtonElement | null;
  if (btn) btn.hidden = !brand && !size && !color && !onlyStock && !search;
}

function clearFilters() {
  state.filters = { brand: '', size: '', color: '', onlyStock: false, search: '' };
  document.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(b => b.classList.remove('active'));
  (document.getElementById('filter-stock') as HTMLButtonElement)?.classList.remove('active');
  (document.getElementById('tienda-search') as HTMLInputElement).value = '';
  syncClear();
  render();
}

// ─── shared fetch with cache ──────────────────────────────────────────────────

export function fetchSheetProducts(): Promise<SheetProduct[]> {
  return fetchProducts();
}

function fetchProducts(): Promise<SheetProduct[]> {
  if (_cache) return Promise.resolve(_cache);
  _inflight ??= fetch(SHEET_URL)
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
    .then(text => { _cache = parseCSV(text); return _cache!; })
    .finally(() => { _inflight = null; });
  return _inflight;
}

// ─── home / drop grids ────────────────────────────────────────────────────────

const SK = `<div class="sk-card"><div class="sk-visual"></div><div class="sk-body"><div class="sk-line" style="width:55%"></div><div class="sk-line" style="width:75%"></div></div></div>`;

async function initGrid(gridId: string, limit: number, select: (ps: SheetProduct[]) => SheetProduct[]) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = Array(limit).fill(SK).join('');
  try {
    const skus = select(await fetchProducts());
    const grouped = groupProducts(skus);
    grid.innerHTML = '';
    grouped.slice(0, limit).forEach((gp, i) => grid.appendChild(buildGroupedCard(gp, i)));
  } catch (err) {
    console.error(`initGrid(${gridId}):`, err);
    grid.innerHTML = '';
  }
}

export const initHomeCards = (gridId: string, limit = 4) =>
  initGrid(gridId, limit, ps => ps.filter(p => parseInt(p.stock, 10) > 0).slice(0, limit * 4));

export const initDropCards = (gridId: string, limit = 2) =>
  initGrid(gridId, limit, ps => ps.slice(-limit * 4));

// ─── init tienda ──────────────────────────────────────────────────────────────

export async function initSheetProducts() {
  const grid = document.getElementById('tienda-grid')!;

  grid.innerHTML = Array(8).fill(`
    <div class="sk-card">
      <div class="sk-visual"></div>
      <div class="sk-body">
        <div class="sk-line" style="width:55%"></div>
        <div class="sk-line" style="width:75%"></div>
        <div class="sk-line" style="width:40%"></div>
      </div>
    </div>
  `).join('');

  try {
    state.products = await fetchProducts();

    if (state.products.length === 0) {
      grid.innerHTML = `<p class="sheet-empty-msg">No hay productos disponibles.</p>`;
      return;
    }

    state.grouped = groupProducts(state.products);

    buildFilterGroup('filter-brand', 'brand', unique(state.products, 'marca'));
    buildFilterGroup('filter-size',  'size',  unique(state.products, 'talla'));
    buildFilterGroup('filter-color', 'color', unique(state.products, 'color'));

    render();

    // filter chips delegation
    document.getElementById('tienda-filters')?.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.filter-chip');
      if (!btn) return;
      const key = btn.dataset.fkey as 'brand' | 'size' | 'color';
      const val = btn.dataset.fval!;
      const wasActive = btn.classList.contains('active');
      document.querySelectorAll<HTMLButtonElement>(`.filter-chip[data-fkey="${key}"]`).forEach(b => b.classList.remove('active'));
      state.filters[key] = wasActive ? '' : val;
      if (!wasActive) btn.classList.add('active');
      syncClear();
      render();
    });

    // stock toggle
    document.getElementById('filter-stock')?.addEventListener('click', function () {
      state.filters.onlyStock = !state.filters.onlyStock;
      (this as HTMLButtonElement).classList.toggle('active', state.filters.onlyStock);
      syncClear();
      render();
    });

    // search
    let searchTimer: ReturnType<typeof setTimeout>;
    document.getElementById('tienda-search')?.addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.filters.search = (e.target as HTMLInputElement).value.trim();
        syncClear();
        render();
      }, 280);
    });

    // clear button
    document.getElementById('tienda-clear')?.addEventListener('click', clearFilters);

  } catch (err) {
    console.error('Error cargando catálogo:', err);
    grid.innerHTML = `
      <div class="sheet-empty">
        <p>No se pudo cargar el catálogo.</p>
        <button class="btn sm" onclick="location.reload()">Reintentar</button>
      </div>
    `;
  }
}

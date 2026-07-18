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

// Mapa color → hex. Las claves compuestas (ej. 'azul navi') van más específicas;
// getHex primero intenta match exacto y luego por palabra, así "Azul Navi" o
// "Gris Jaspe" caen en su tono real y no en el genérico.
const COLOR_HEX: Record<string, string> = {
  negro:          '#1E1B18',
  blanco:         '#EBE3D2',
  hueso:          '#D9CFB9',
  crema:          '#EDE4CF',
  beige:          '#B8AC92',
  gris:           '#9B9590',
  'gris jaspe':   '#B3ADA6',
  plateado:       '#C2C2C2',
  azul:           '#1B3A6B',
  'azul navi':    '#1F2A44',
  'azul rey':     '#1E3A8A',
  'azul cielo':   '#7FB2E5',
  celeste:        '#7FB2E5',
  turquesa:       '#2CA5A5',
  rojo:           '#B0291F',
  sangre:         '#B0291F',
  vinotinto:      '#5E1B23',
  vino:           '#5E1B23',
  rosa:           '#E8A0BF',
  rosado:         '#E8A0BF',
  fucsia:         '#C2185B',
  morado:         '#6B3FA0',
  lila:           '#B57EDC',
  verde:          '#3B6B45',
  'verde militar':'#4B5320',
  militar:        '#4B5320',
  oliva:          '#5A5A2E',
  amarillo:       '#E7C24B',
  dorado:         '#C9A227',
  naranja:        '#D2691E',
  cafe:           '#6B4A2B',
  marron:         '#6B4A2B',
};

// Normaliza: minúsculas, sin acentos, sin espacios extra.
function normColor(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function getHex(color: string): string {
  const c = normColor(color);
  if (COLOR_HEX[c]) return COLOR_HEX[c];
  // Match por palabra: busca una clave conocida dentro del nombre compuesto
  // (ej. "azul navi" → azul). Prioriza las claves más largas (más específicas).
  const keys = Object.keys(COLOR_HEX).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (c.includes(k)) return COLOR_HEX[k];
  }
  return '#6B655C';
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

export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// "Talla única" no se elige: se muestra como etiqueta. Acepta variantes (UNICA, U, unitalla…).
export function isUnica(talla: string): boolean {
  const t = String(talla ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
  return t === 'u' || t === 'unica' || t === 'unitalla' || t === 'talla unica';
}
export const TALLA_UNICA_LABEL = 'Talla única';

export function fmtCOP(val: string): string {
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

// ─── auto-rotate color timers ───────────────────────────────────────────────

let cardTimers: ReturnType<typeof setInterval>[] = [];

function clearCardTimers() {
  cardTimers.forEach(clearInterval);
  cardTimers = [];
}

// ─── grouped card ─────────────────────────────────────────────────────────────

function buildGroupedCard(gp: GroupedProduct, i: number): HTMLElement {
  const mainColor = gp.colors[0];

  const el = document.createElement('a');
  el.className = 'sheet-card';
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

  function renderSizes(colorName: string) {
    const skusForColor = gp.skus
      .filter(s => s.color === colorName)
      .sort((a, b) => SIZE_ORDER.indexOf(a.talla) - SIZE_ORDER.indexOf(b.talla));

    sizesEl.innerHTML = '';
    skusForColor.forEach(sku => {
      const inStock = parseInt(sku.stock, 10) > 0;
      const isActive = inStock && state.filters.size &&
        sku.talla.toLowerCase() === state.filters.size.toLowerCase();
      const unica = isUnica(sku.talla);
      const span = document.createElement('span');
      span.className = `sc-size${unica ? ' unica' : ''}${!inStock ? ' oos' : ''}${isActive ? ' active' : ''}`;
      span.textContent = unica ? TALLA_UNICA_LABEL : sku.talla;
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

  let prevIdx = 0;

  function updateColor(idx: number) {
    const c = gp.colors[idx];
    visualEl.style.background = `linear-gradient(150deg,${c.hex}44 0%,${c.hex}18 100%)`;
    if (c.imagen) {
      if (imgEl.src !== c.imagen) {
        // color nuevo a la derecha del actual → entra desde la derecha, y viceversa
        const dirClass = idx >= prevIdx ? 'from-right' : 'from-left';
        const playIn = () => {
          imgEl.removeEventListener('load', playIn);
          imgEl.classList.remove('from-right', 'from-left');
          void imgEl.offsetWidth; // reflow → reinicia la animación
          imgEl.classList.add(dirClass);
        };
        imgEl.addEventListener('load', playIn);
        imgEl.src = c.imagen;
      }
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
    prevIdx = idx;
  }

  el.querySelectorAll('.sc-colordot').forEach((dot, idx) => {
    dot.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); updateColor(idx); });
  });

  const initIdx = state.filters.color
    ? Math.max(0, gp.colors.findIndex(c => c.name.toLowerCase() === state.filters.color.toLowerCase()))
    : 0;
  prevIdx = initIdx;
  updateColor(initIdx);

  // auto-rotar entre colores con stock → mostrar que hay más variantes
  const stockIdxs = gp.colors
    .map((_, idx) => idx)
    .filter(idx => gp.skus.some(s => s.color === gp.colors[idx].name && parseInt(s.stock, 10) > 0));

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (stockIdxs.length > 1 && !reduceMotion) {
    let cur = initIdx;
    let paused = false;
    let stopped = false;

    el.addEventListener('mouseenter', () => { paused = true; });
    el.addEventListener('mouseleave', () => { paused = false; });
    // si el usuario elige un color manualmente, dejar de rotar
    el.querySelectorAll('.sc-colordot').forEach(dot =>
      dot.addEventListener('click', () => { stopped = true; })
    );

    const timer = setInterval(() => {
      if (paused || stopped || !el.isConnected) return;
      const pos = stockIdxs.indexOf(cur);
      cur = stockIdxs[(pos + 1) % stockIdxs.length];
      updateColor(cur);
    }, 5200 + (i % 5) * 700); // escalonar para que no parpadeen todas a la vez

    cardTimers.push(timer);
  }

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

  clearCardTimers();
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

// ─── localStorage cache (stale-while-revalidate) ───────────────────────────────
// Persistimos el catálogo ya parseado para pintar al instante en la próxima visita
// mientras refrescamos del servidor en segundo plano.

const LS_KEY = 'macv_tienda_products';

function readLS(): SheetProduct[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? (arr as SheetProduct[]) : null;
  } catch { return null; }
}

function writeLS(products: SheetProduct[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(products)); } catch { /* cuota llena / modo privado */ }
}

// Devuelve lo que haya cacheado ahora mismo (memoria o localStorage), sin red.
function getCached(): SheetProduct[] | null {
  return _cache ?? readLS();
}

// Trae del servidor, actualiza memoria + localStorage. Coalescente entre llamadas.
function networkFetch(): Promise<SheetProduct[]> {
  _inflight ??= fetch(SHEET_URL)
    .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
    .then(text => { _cache = parseCSV(text); writeLS(_cache); return _cache!; })
    .finally(() => { _inflight = null; });
  return _inflight;
}

// ─── shared fetch with cache ──────────────────────────────────────────────────
// Para grids de una sola pintada (home/drop): devuelve la caché al instante si la
// hay y refresca en segundo plano; si no, espera a la red.

export function fetchProducts(): Promise<SheetProduct[]> {
  if (_cache) return Promise.resolve(_cache);
  const ls = readLS();
  const net = networkFetch();
  return ls && ls.length ? Promise.resolve(ls) : net;
}

// ─── indicador de sincronización (pill flotante) ───────────────────────────────

let _pillTimer: ReturnType<typeof setTimeout>;

function syncPill(state: 'loading' | 'done' | 'offline'): void {
  const el = document.getElementById('sync-pill');
  if (!el) return;
  clearTimeout(_pillTimer);
  el.className = 'sync-pill show' + (state === 'loading' ? '' : ` ${state}`);
  el.innerHTML =
    state === 'loading' ? '<span class="spinner"></span>Sincronizando…'
    : state === 'done'  ? 'Actualizado ✓'
    :                     'Sin conexión · datos guardados';
  if (state !== 'loading') {
    _pillTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }
}

// ─── home / drop grids ────────────────────────────────────────────────────────

// Skeleton de card con N líneas de anchos dados, mientras carga el catálogo.
const skCard = (widths: string[]) =>
  `<div class="sk-card"><div class="sk-visual"></div><div class="sk-body">${
    widths.map(w => `<div class="sk-line" style="width:${w}"></div>`).join('')
  }</div></div>`;

const SK = skCard(['55%', '75%']);

async function initGrid(gridId: string, limit: number, select: (ps: SheetProduct[]) => SheetProduct[]) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.innerHTML = Array(limit).fill(SK).join('');
  try {
    const skus = select(await fetchProducts());
    const grouped = groupProducts(skus);
    clearCardTimers();
    grid.innerHTML = '';
    grouped.slice(0, limit).forEach((gp, i) => grid.appendChild(buildGroupedCard(gp, i)));
  } catch (err) {
    console.error(`initGrid(${gridId}):`, err);
    grid.innerHTML = '';
  }
}

export const initHomeCards = (gridId: string, limit = 4) =>
  initGrid(gridId, limit, ps => ps.filter(p => parseInt(p.stock, 10) > 0));

export const initDropCards = (gridId: string, limit = 2) =>
  initGrid(gridId, limit, ps => ps.slice(-limit * 4));

// ─── init tienda ──────────────────────────────────────────────────────────────

// Marca los chips activos según el estado de filtros (se pierde al reconstruirlos).
function markActiveChips() {
  document.querySelectorAll<HTMLButtonElement>('.filter-chip[data-fkey]').forEach(b => {
    const key = b.dataset.fkey as 'brand' | 'size' | 'color';
    const val = b.dataset.fval ?? '';
    b.classList.toggle('active', !!state.filters[key] && state.filters[key].toLowerCase() === val.toLowerCase());
  });
  document.getElementById('filter-stock')?.classList.toggle('active', state.filters.onlyStock);
}

export async function initSheetProducts() {
  const grid = document.getElementById('tienda-grid')!;

  // Vuelca los productos en el estado, reconstruye filtros (conservando la
  // selección activa) y pinta. Se usa tanto para la caché como para lo fresco.
  const applyData = (products: SheetProduct[]) => {
    state.products = products;
    state.grouped = groupProducts(products);
    buildFilterGroup('filter-brand', 'brand', unique(products, 'marca'));
    buildFilterGroup('filter-size',  'size',  unique(products, 'talla'));
    buildFilterGroup('filter-color', 'color', unique(products, 'color'));
    markActiveChips();
    render();
  };

  // Conecta los listeners (delegación sobre elementos estáticos → sobrevive a los
  // re-render; se llama una sola vez tras la primera pintada).
  const wireEvents = () => {
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

    document.getElementById('filter-stock')?.addEventListener('click', function () {
      state.filters.onlyStock = !state.filters.onlyStock;
      (this as HTMLButtonElement).classList.toggle('active', state.filters.onlyStock);
      syncClear();
      render();
    });

    let searchTimer: ReturnType<typeof setTimeout>;
    document.getElementById('tienda-search')?.addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.filters.search = (e.target as HTMLInputElement).value.trim();
        syncClear();
        render();
      }, 280);
    });

    document.getElementById('tienda-clear')?.addEventListener('click', clearFilters);
  };

  // 1) Pinta al instante desde la caché (si la hay); si no, muestra skeletons.
  const cached = getCached();
  if (cached && cached.length) {
    applyData(cached);
  } else {
    grid.innerHTML = Array(8).fill(skCard(['55%', '75%', '40%'])).join('');
  }
  wireEvents();

  // 2) Sincroniza con la base en segundo plano, mostrando el pill.
  syncPill('loading');
  try {
    const fresh = await networkFetch();

    if (fresh.length === 0 && !(cached && cached.length)) {
      grid.innerHTML = `<p class="sheet-empty-msg">No hay productos disponibles.</p>`;
      syncPill('done');
      return;
    }

    // Solo re-render si algo cambió → evita parpadeo cuando ya estaba al día.
    if (!cached || JSON.stringify(cached) !== JSON.stringify(fresh)) {
      applyData(fresh);
    }
    syncPill('done');
  } catch (err) {
    console.error('Error sincronizando catálogo:', err);
    if (cached && cached.length) {
      // Tenemos datos guardados → seguimos mostrándolos, avisamos sin conexión.
      syncPill('offline');
    } else {
      grid.innerHTML = `
        <div class="sheet-empty">
          <p>No se pudo cargar el catálogo.</p>
          <button class="btn sm" onclick="location.reload()">Reintentar</button>
        </div>
      `;
      // Error sin caché: ya mostramos el grid de error → ocultamos el pill.
      document.getElementById('sync-pill')?.classList.remove('show');
    }
  }
}

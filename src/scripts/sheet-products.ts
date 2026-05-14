const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2Wmwnf0rWb4w9ULj5tU59U4T6Rxy_7XWFo6vYugOdMenJpce-87PzW3UVn8I7F6lqi-5KVtNHniZq/pub?output=csv&gid=2056806095';

interface SheetProduct {
  producto: string;
  marca: string;
  talla: string;
  color: string;
  precio: string;
  stock: string;
  imagen: string;
}

const COLOR_HEX: Record<string, string> = {
  negro:  '#2A2620',
  hueso:  '#D9CFB9',
  oliva:  '#5A5A2E',
  gris:   '#3A3631',
  rojo:   '#B0291F',
  sangre: '#B0291F',
  azul:   '#1B3A6B',
  blanco: '#EBE3D2',
  beige:  '#B8AC92',
};

function getHex(color: string): string {
  return COLOR_HEX[color.toLowerCase()] ?? '#6B655C';
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
  filters: { brand: '', size: '', color: '', onlyStock: false, search: '' },
};

// ─── card ─────────────────────────────────────────────────────────────────────

function buildCard(p: SheetProduct, i: number): HTMLElement {
  const inStock = parseInt(p.stock, 10) > 0;
  const hex = getHex(p.color);
  const el = document.createElement('article');
  el.className = `sheet-card${inStock ? '' : ' oos'}`;
  el.style.animationDelay = `${(i % 12) * 0.05}s`;

  el.innerHTML = `
    <div class="sc-visual" style="background:linear-gradient(150deg,${hex}44 0%,${hex}18 100%);">
      ${p.imagen
        ? `<img class="sc-img" src="${p.imagen}" alt="${p.producto}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''
      }
      <span class="sc-initial"${p.imagen ? ' style="display:none"' : ''}>${(p.marca || p.producto || 'M')[0].toUpperCase()}</span>
      <span class="badge ${inStock ? 'olive' : 'blood'} sc-badge">${inStock ? `Stock: ${p.stock}` : 'Agotado'}</span>
    </div>
    <div class="sc-info">
      <div class="sc-top">
        <span class="sc-name">${p.producto}</span>
        <span class="sc-price">${fmtCOP(p.precio)}</span>
      </div>
      <span class="sc-sub">
        <span class="sc-dot" style="background:${hex}"></span>
        ${p.marca} · ${p.color} · T.${p.talla}
      </span>
      <button
        class="btn sm full sc-add"
        ${!inStock ? 'disabled' : ''}
        data-nombre="${p.producto}"
        data-talla="${p.talla}"
        data-color="${p.color}"
        data-precio="${p.precio}"
        data-hex="${hex}"
      ><i class="bi ${inStock ? 'bi-bag-plus' : 'bi-bag-x'}"></i>${inStock ? 'Agregar' : 'Sin stock'}</button>
    </div>
  `;
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

  const filtered = state.products.filter(p => {
    if (brand && p.marca?.toLowerCase() !== brand.toLowerCase()) return false;
    if (size && p.talla?.toLowerCase() !== size.toLowerCase()) return false;
    if (color && p.color?.toLowerCase() !== color.toLowerCase()) return false;
    if (onlyStock && parseInt(p.stock, 10) <= 0) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.producto?.toLowerCase().includes(q) && !p.marca?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="sheet-empty"><p>Sin resultados.</p><button class="btn sm ghost" id="sheet-clear-empty">Ver todos</button></div>`;
    document.getElementById('sheet-clear-empty')?.addEventListener('click', clearFilters);
  } else {
    filtered.forEach((p, i) => grid.appendChild(buildCard(p, i)));
  }

  const countEl = document.getElementById('tienda-count');
  if (countEl) {
    countEl.textContent = filtered.length === state.products.length
      ? `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`
      : `${filtered.length} de ${state.products.length} producto${filtered.length !== 1 ? 's' : ''}`;
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

// ─── init ─────────────────────────────────────────────────────────────────────

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
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.products = parseCSV(await res.text());

    if (state.products.length === 0) {
      grid.innerHTML = `<p class="sheet-empty-msg">No hay productos disponibles.</p>`;
      return;
    }

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

    // add to cart
    grid.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.sc-add');
      if (!btn || btn.disabled) return;
      const { nombre, talla, color, precio, hex } = btn.dataset;
      if (!nombre) return;
      window.MacVCart.add({
        slug: `${nombre}-${talla}-${color}`.toLowerCase().replace(/\s+/g, '-'),
        name: nombre,
        color: color!,
        colorName: color!,
        colorHex: hex!,
        size: talla!,
        price: parseInt(String(precio).replace(/[^\d]/g, ''), 10),
        qty: 1,
      });
      window.MacVCart.open();
    });

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

export interface CartItem {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  color: string;
  colorName: string;
  colorHex: string;
  colorGradient: string;
  image?: string;
  size: string;
  price: number;
  qty: number;
  maxStock: number;
}

const STORAGE_KEY = 'macv-cart';
const BULK_MIN_QTY = 2;
const BULK_PRICE   = 25000;
const UNIT_PRICE   = 30000;

function load(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items } }));
}

function makeId(item: Omit<CartItem, 'id' | 'qty'>): string {
  return `${item.slug}__${item.brand ?? ''}__${item.color}__${item.size}`;
}

export const MacVCart = {
  getItems(): CartItem[] {
    return load();
  },

  getCount(): number {
    return load().reduce((n, i) => n + i.qty, 0);
  },

  getSubtotal(): number {
    const items = load();
    const totalQty = items.reduce((n, i) => n + i.qty, 0);
    const unitPrice = totalQty >= BULK_MIN_QTY ? BULK_PRICE : UNIT_PRICE;
    return totalQty * unitPrice;
  },

  getShipping(): number {
    return 0;
  },

  getTotal(): number {
    return this.getSubtotal() + this.getShipping();
  },

  add(item: Omit<CartItem, 'id'>): void {
    const items = load();
    const id = makeId(item);
    const existing = items.find(i => i.id === id);
    if (existing) {
      existing.qty = Math.min(existing.qty + item.qty, existing.maxStock);
    } else {
      items.push({ ...item, id, qty: Math.min(item.qty, item.maxStock) });
    }
    save(items);
  },

  remove(id: string): void {
    save(load().filter(i => i.id !== id));
  },

  updateQty(id: string, qty: number): void {
    if (qty < 1) { this.remove(id); return; }
    const items = load();
    const item = items.find(i => i.id === id);
    if (item) { item.qty = Math.min(qty, item.maxStock); save(items); }
  },

  clear(): void {
    save([]);
  },

  open(): void {
    window.dispatchEvent(new CustomEvent('cart:open'));
  },

  close(): void {
    window.dispatchEvent(new CustomEvent('cart:close'));
  },
};

declare global {
  interface Window { MacVCart: typeof MacVCart; }
}

window.MacVCart = MacVCart;

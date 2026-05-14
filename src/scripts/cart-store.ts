export interface CartItem {
  id: string;
  slug: string;
  name: string;
  color: string;
  colorName: string;
  colorHex: string;
  size: string;
  price: number;
  qty: number;
}

const STORAGE_KEY = 'macv-cart';
const SHIPPING_THRESHOLD = 80000;
const SHIPPING_COST = 9900;

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
  return `${item.slug}__${item.color}__${item.size}`;
}

export const MacVCart = {
  getItems(): CartItem[] {
    return load();
  },

  getCount(): number {
    return load().reduce((n, i) => n + i.qty, 0);
  },

  getSubtotal(): number {
    return load().reduce((s, i) => s + i.price * i.qty, 0);
  },

  getShipping(): number {
    return this.getSubtotal() >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  },

  getTotal(): number {
    return this.getSubtotal() + this.getShipping();
  },

  add(item: Omit<CartItem, 'id'>): void {
    const items = load();
    const id = makeId(item);
    const existing = items.find(i => i.id === id);
    if (existing) {
      existing.qty += item.qty;
    } else {
      items.push({ ...item, id });
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
    if (item) { item.qty = qty; save(items); }
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

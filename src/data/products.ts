export interface ProductColor {
  id: string;
  name: string;
  hex: string;
  gradientCss: string;
}

export interface Product {
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  badge?: 'new' | 'sale' | 'limited' | null;
  badgeLabel?: string;
  colors: ProductColor[];
  sizes: string[];
  outOfStock: string[];
  drop?: string | null;
  featured: boolean;
  description: string;
  material: string;
}

const COLORS = {
  negro: { id: 'negro', name: 'Negro', hex: '#0A0908', gradientCss: 'linear-gradient(135deg, #2A2620 25%, #1F1D1A 25%, #1F1D1A 50%, #2A2620 50%, #2A2620 75%, #1F1D1A 75%); background-size: 28px 28px' },
  hueso: { id: 'hueso', name: 'Hueso', hex: '#EBE3D2', gradientCss: 'linear-gradient(135deg, #EBE3D2 25%, #D9CFB9 25%, #D9CFB9 50%, #EBE3D2 50%, #EBE3D2 75%, #D9CFB9 75%); background-size: 28px 28px' },
  oliva: { id: 'oliva', name: 'Oliva', hex: '#5A5A2E', gradientCss: 'linear-gradient(135deg, #5A5A2E 25%, #3F3F1F 25%, #3F3F1F 50%, #5A5A2E 50%, #5A5A2E 75%, #3F3F1F 75%); background-size: 28px 28px' },
  rojo:  { id: 'rojo',  name: 'Sangre', hex: '#B0291F', gradientCss: 'linear-gradient(135deg, #B0291F 25%, #8C1E16 25%, #8C1E16 50%, #B0291F 50%, #B0291F 75%, #8C1E16 75%); background-size: 28px 28px' },
  gris:  { id: 'gris',  name: 'Gris', hex: '#6B655C', gradientCss: 'linear-gradient(135deg, #6B655C 25%, #3A3631 25%, #3A3631 50%, #6B655C 50%, #6B655C 75%, #3A3631 75%); background-size: 28px 28px' },
};

export const products: Product[] = [
  {
    slug: 'boxer-pima-negro',
    name: 'Bóxer Pima',
    subtitle: '100% microfibra',
    price: 45900,
    badge: null,
    colors: [COLORS.negro, COLORS.hueso, COLORS.oliva],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: [],
    drop: null,
    featured: true,
    description: 'Bóxer de corte ajustado en microfibra. Suave, transpirable y sin costuras incómodas. El que no te falla.',
    material: '95% microfibra, 5% elastano',
  },
  {
    slug: 'boxer-pima-hueso',
    name: 'Bóxer Pima',
    subtitle: '100% microfibra',
    price: 45900,
    badge: 'new',
    badgeLabel: 'Nuevo',
    colors: [COLORS.hueso, COLORS.negro, COLORS.oliva],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: [],
    drop: null,
    featured: true,
    description: 'Bóxer de corte ajustado en microfibra. Tono hueso neutro, ideal para el día a día.',
    material: '95% microfibra, 5% elastano',
  },
  {
    slug: 'boxer-largo-negro',
    name: 'Bóxer Largo',
    subtitle: 'Corte mid-thigh',
    price: 52900,
    badge: null,
    colors: [COLORS.negro, COLORS.gris],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: ['S'],
    drop: null,
    featured: true,
    description: 'Bóxer largo de corte mid-thigh. Más cobertura, mismo comfort. Perfecto para días activos.',
    material: '92% microfibra, 8% elastano',
  },
  {
    slug: 'boxer-largo-gris',
    name: 'Bóxer Largo',
    subtitle: 'Corte mid-thigh',
    price: 52900,
    badge: null,
    colors: [COLORS.gris, COLORS.negro],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: [],
    drop: null,
    featured: false,
    description: 'Bóxer largo en gris carbón. Versátil y cómodo para toda la jornada.',
    material: '92% microfibra, 8% elastano',
  },
  {
    slug: 'boxer-pima-oliva',
    name: 'Bóxer Pima',
    subtitle: 'Edición Drop 03',
    price: 45900,
    badge: 'limited',
    badgeLabel: 'Limitado',
    colors: [COLORS.oliva, COLORS.negro],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: ['XL'],
    drop: 'Drop 03',
    featured: true,
    description: 'Bóxer pima en tono oliva. Parte del Drop 03, edición de temporada en cantidad limitada.',
    material: '95% microfibra, 5% elastano',
  },
  {
    slug: 'boxer-pima-rojo',
    name: 'Bóxer Pima',
    subtitle: 'Edición Drop 03',
    price: 45900,
    badge: 'limited',
    badgeLabel: 'Últimos días',
    colors: [COLORS.rojo, COLORS.negro],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: ['S', 'XL'],
    drop: 'Drop 03',
    featured: false,
    description: 'Bóxer pima en rojo sangre. Audaz, de edición limitada. Parte del Drop 03.',
    material: '95% microfibra, 5% elastano',
  },
  {
    slug: 'pack-3-basicos',
    name: 'Pack 3 Básicos',
    subtitle: 'Negro, Hueso, Gris',
    price: 119900,
    badge: 'sale',
    badgeLabel: 'Ahorra $18K',
    colors: [COLORS.negro, COLORS.hueso, COLORS.gris],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: [],
    drop: null,
    featured: false,
    description: 'Los tres colores esenciales en un solo pack. La forma más inteligente de renovar tu cajón.',
    material: '95% microfibra, 5% elastano',
  },
  {
    slug: 'camiseta-pima-negra',
    name: 'Camiseta Pima',
    subtitle: 'Corte slim',
    price: 68900,
    badge: 'new',
    badgeLabel: 'Nuevo',
    colors: [COLORS.negro, COLORS.hueso, COLORS.gris],
    sizes: ['S', 'M', 'L', 'XL'],
    outOfStock: [],
    drop: null,
    featured: false,
    description: 'Camiseta de cuello redondo en microfibra. Corte slim que no aprieta ni se sale.',
    material: '100% microfibra',
  },
];

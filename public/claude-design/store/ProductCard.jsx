// Product card + grid
const ProductCard = ({ product }) => {
  const variantToClass = {
    'k': '', 'b': 'bone', 'o': 'olive', 'r': 'blood'
  };
  const cls = ['product-card'];
  if (variantToClass[product.color]) cls.push(variantToClass[product.color]);
  return (
    <div className={cls.join(' ')} onClick={() => window.MW.go('product', product.id)}>
      <div className="ph">
        {product.badge && <div className={'badge ' + (product.badge === 'SALE' ? 'blood' : '')}>{product.badge}</div>}
        <div className="colors">
          {product.colors.map((c, i) => (
            <span key={i} className="dot" style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="meta">
        <div className="name">{product.name}</div>
        <div className="price">${product.price.toLocaleString('es-CO')}</div>
      </div>
    </div>
  );
};

const ProductGrid = ({ products }) => (
  <div className="product-grid">
    {products.map(p => <ProductCard key={p.id} product={p} />)}
  </div>
);

Object.assign(window, { ProductCard, ProductGrid });

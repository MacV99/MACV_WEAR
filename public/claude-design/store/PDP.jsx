// PDP — product detail page
const PDP = ({ productId }) => {
  const product = window.MW.products.find(p => p.id === productId) || window.MW.products[0];
  const [color, setColor] = React.useState(product.color);
  const [size, setSize] = React.useState('M');
  const [qty, setQty] = React.useState(1);
  const [thumb, setThumb] = React.useState(0);

  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const offSizes = product.outOfStock || [];

  const swatchKeys = ['k', 'b', 'o', 'r'];
  const swatchLabel = { k: 'Negro', b: 'Crema', o: 'Olivo', r: 'Rojo' };
  const colorClassMap = { k: '', b: 'bone', o: 'olive', r: 'blood' };

  const mainImgClass = ['main-img'];
  if (colorClassMap[color]) {
    // re-use product card backgrounds via inline style
  }

  const phStyle = {
    k: { background: 'linear-gradient(135deg, #2A2620 25%, #1F1D1A 25%, #1F1D1A 50%, #2A2620 50%, #2A2620 75%, #1F1D1A 75%)', backgroundSize: '36px 36px' },
    b: { background: 'linear-gradient(135deg, #EBE3D2 25%, #D9CFB9 25%, #D9CFB9 50%, #EBE3D2 50%, #EBE3D2 75%, #D9CFB9 75%)', backgroundSize: '36px 36px' },
    o: { background: 'linear-gradient(135deg, #5A5A2E 25%, #3F3F1F 25%, #3F3F1F 50%, #5A5A2E 50%, #5A5A2E 75%, #3F3F1F 75%)', backgroundSize: '36px 36px' },
    r: { background: 'linear-gradient(135deg, #B0291F 25%, #8C1E16 25%, #8C1E16 50%, #B0291F 50%, #B0291F 75%, #8C1E16 75%)', backgroundSize: '36px 36px' },
  }[color] || {};

  return (
    <section className="pdp">
      <div className="container">
        <div className="grid">
          <div className="gallery">
            <div className="thumbs">
              {[0,1,2,3].map(i => (
                <div key={i} className={'t' + (thumb === i ? ' on' : '')} onClick={() => setThumb(i)} style={phStyle} />
              ))}
            </div>
            <div className="main-img" style={phStyle}>
              {product.badge && <div className="badge">{product.badge}</div>}
            </div>
          </div>
          <div className="info">
            <div className="eyebrow">{product.collection || 'Esenciales'}</div>
            <h1>{product.name}</h1>
            <div className="price">${product.price.toLocaleString('es-CO')}</div>
            <p>{product.desc || 'Algodón pima 100%, costuras planas, elástico jacquard tejido en el mismo telar. Hecho para aguantar el día sin que te acuerdes de él.'}</p>

            <div className="opt-row">
              <div className="lbl"><span>Color</span><span style={{ color: 'var(--carbon-900)', fontWeight: 700 }}>{swatchLabel[color]}</span></div>
              <div className="swatches">
                {swatchKeys.map(k => (
                  <span key={k} className={'sw ' + k + (color === k ? ' on' : '')} onClick={() => setColor(k)} />
                ))}
              </div>
            </div>

            <div className="opt-row">
              <div className="lbl"><span>Talla</span><a style={{ color: 'var(--fg-muted)', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Guía de tallas</a></div>
              <div className="sizes">
                {sizes.map(s => (
                  <span
                    key={s}
                    className={'size' + (size === s ? ' on' : '') + (offSizes.includes(s) ? ' off' : '')}
                    onClick={() => !offSizes.includes(s) && setSize(s)}
                  >{s}</span>
                ))}
              </div>
            </div>

            <div className="add-row">
              <div className="qty">
                <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <input value={qty} readOnly />
                <button onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <Button full onClick={() => window.MW.addToCart({ ...product, color, size, qty })}>
                Añadir al carrito · ${(product.price * qty).toLocaleString('es-CO')}
              </Button>
            </div>

            <div className="specs">
              <div className="spec"><div className="k">Material</div><div className="v">Algodón pima 95% · Elastano 5%</div></div>
              <div className="spec"><div className="k">Costuras</div><div className="v">Planas, no irritan</div></div>
              <div className="spec"><div className="k">Elástico</div><div className="v">Jacquard tejido, 38mm</div></div>
              <div className="spec"><div className="k">Origen</div><div className="v">Hecho en Colombia</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

Object.assign(window, { PDP });

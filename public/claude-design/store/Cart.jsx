// Cart drawer + Account page
const CartDrawer = () => {
  const cart = window.MW.useCart();
  const open = window.MW.useCartOpen();

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = subtotal > 80000 || subtotal === 0 ? 0 : 9900;
  const total = subtotal + shipping;
  const fmt = n => '$' + n.toLocaleString('es-CO');

  return (
    <>
      <div className={'scrim' + (open ? ' on' : '')} onClick={() => window.MW.toggleCart(false)} />
      <aside className={'drawer' + (open ? ' on' : '')}>
        <div className="head">
          <h3>Tu bolsa · {cart.length}</h3>
          <button className="close" onClick={() => window.MW.toggleCart(false)}>×</button>
        </div>
        <div className="body">
          {cart.length === 0 ? (
            <div className="empty">
              <img src="../../assets/logo-mark.png" className="stamp-mark" alt="" />
              <p>Aún no llevas nada. Cámbialo.</p>
              <Button onClick={() => { window.MW.toggleCart(false); window.MW.go('shop'); }}>Ver colección</Button>
            </div>
          ) : cart.map((item, i) => {
            const phCls = { k: '', b: 'b', o: 'o', r: '' }[item.color] || '';
            return (
              <div className="item" key={i}>
                <div className={'ph ' + phCls} />
                <div>
                  <div className="name">{item.name}</div>
                  <div className="opts">{ {k:'Negro',b:'Crema',o:'Olivo',r:'Rojo'}[item.color] } · Talla {item.size}</div>
                  <div className="qty-mini">
                    <button onClick={() => window.MW.updateQty(i, item.qty - 1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => window.MW.updateQty(i, item.qty + 1)}>+</button>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="price">{fmt(item.price * item.qty)}</div>
                  <button className="remove" onClick={() => window.MW.removeFromCart(i)}>Quitar</button>
                </div>
              </div>
            );
          })}
        </div>
        {cart.length > 0 && (
          <div className="foot">
            <div className="totals">
              <div className="row"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="row"><span>Envío</span><span>{shipping === 0 ? 'Gratis' : fmt(shipping)}</span></div>
              <div className="row total"><span>Total</span><span>{fmt(total)}</span></div>
            </div>
            <Button full size="lg">Pagar · {fmt(total)}</Button>
          </div>
        )}
      </aside>
    </>
  );
};

const ShopPage = () => (
  <section className="section">
    <div className="container">
      <div className="section-head">
        <div>
          <div className="eyebrow">Catálogo · {window.MW.products.length} productos</div>
          <h2>Tienda</h2>
        </div>
        <a className="more">Filtrar · Ordenar →</a>
      </div>
      <ProductGrid products={window.MW.products} />
    </div>
  </section>
);

const AccountPage = () => {
  const orders = [
    { num: 'MW-04812', date: '04 Nov 2025', items: 'Bóxer Pima Negro × 2', sub: 'Talla M · Drop 03', status: 'shipped', total: 49800 },
    { num: 'MW-04610', date: '17 Oct 2025', items: 'Pack Esenciales × 1', sub: '3 unidades · Surtido', status: 'delivered', total: 69900 },
    { num: 'MW-04201', date: '02 Sep 2025', items: 'Trunk Lino Olivo × 1', sub: 'Talla L', status: 'delivered', total: 28900 },
    { num: 'MW-04050', date: '12 Ago 2025', items: 'Bóxer Pima Crema × 1', sub: 'Talla M · Edición limitada', status: 'processing', total: 26900 },
  ];
  const fmt = n => '$' + n.toLocaleString('es-CO');
  return (
    <section className="account">
      <div className="container">
        <div className="grid">
          <aside className="side">
            <div className="who">
              <div className="lbl">Hola</div>
              <div className="name">Andrés</div>
            </div>
            <ul>
              <li><a className="on">Pedidos</a></li>
              <li><a>Dirección</a></li>
              <li><a>Tallas guardadas</a></li>
              <li><a>Métodos de pago</a></li>
              <li><a>Cuenta</a></li>
              <li><a>Salir</a></li>
            </ul>
          </aside>
          <div>
            <h1>Tus pedidos</h1>
            <p className="lede">Todos los pedidos hechos con tu cuenta. ¿Algo no llegó? Escríbenos por WhatsApp y lo resolvemos.</p>
            <div className="order-list">
              {orders.map(o => (
                <div className="order" key={o.num}>
                  <div className="num">{o.num}<br/><span style={{ color: 'var(--fg-muted)' }}>{o.date}</span></div>
                  <div className="items">{o.items}<div className="sub">{o.sub}</div></div>
                  <div><span className={'status ' + o.status}>{o.status === 'shipped' ? 'Enviado' : o.status === 'delivered' ? 'Entregado' : 'Procesando'}</span></div>
                  <div className="total">{fmt(o.total)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

Object.assign(window, { CartDrawer, ShopPage, AccountPage });

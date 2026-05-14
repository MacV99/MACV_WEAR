// Top bar + nav + footer
const TopBar = () => {
  const cartCount = window.MW?.useCart()?.length || 0;
  return (
    <header className="topbar">
      <div className="ticker">Envío gratis sobre $80.000 · 30 días para cambios</div>
      <div className="container">
        <nav className="nav">
          <Logo size={36} />
          <ul>
            <li><a onClick={() => window.MW.go('shop')}>Shop</a></li>
            <li><a onClick={() => window.MW.go('shop')}>Bóxers</a></li>
            <li><a onClick={() => window.MW.go('shop')}>Trunks</a></li>
            <li><a onClick={() => window.MW.go('shop')}>Packs</a></li>
            <li><a onClick={() => window.MW.go('shop')}>Drops</a></li>
          </ul>
          <div className="actions">
            <button className="icon-btn" aria-label="Buscar"><Icon name="search" /></button>
            <button className="icon-btn" aria-label="Cuenta" onClick={() => window.MW.go('account')}><Icon name="user" /></button>
            <button className="icon-btn" aria-label="Carrito" onClick={() => window.MW.toggleCart()}>
              <Icon name="bag" />
              {cartCount > 0 && <span className="count">{cartCount}</span>}
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

const Footer = () => (
  <footer>
    <div className="container">
      <div className="grid">
        <div>
          <Logo size={48} />
          <p style={{ color: 'var(--bone-300)', maxWidth: 320, marginTop: 16, fontSize: 14, lineHeight: 1.55 }}>
            Ropa interior premium hecha para aguantar el día. Algodón pima 100%, costuras planas, fit honesto.
          </p>
        </div>
        <div>
          <h5>Producto</h5>
          <ul>
            <li><a>Bóxers</a></li>
            <li><a>Trunks</a></li>
            <li><a>Packs</a></li>
            <li><a>Drops</a></li>
            <li><a>Gift cards</a></li>
          </ul>
        </div>
        <div>
          <h5>Soporte</h5>
          <ul>
            <li><a>Guía de tallas</a></li>
            <li><a>Cambios y devoluciones</a></li>
            <li><a>Envíos</a></li>
            <li><a>Contacto</a></li>
          </ul>
        </div>
        <div>
          <h5>La marca</h5>
          <ul>
            <li><a>Quiénes somos</a></li>
            <li><a>Materiales</a></li>
            <li><a>Instagram</a></li>
            <li><a>WhatsApp</a></li>
          </ul>
        </div>
      </div>
      <div className="meta">
        <div>© 2025 MACV WEAR · Hecho a mano.</div>
        <div>Términos · Privacidad · Cookies</div>
      </div>
    </div>
  </footer>
);

Object.assign(window, { TopBar, Footer });

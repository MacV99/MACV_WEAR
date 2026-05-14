// Home page composition
const Hero = () => (
  <section className="hero">
    <img src="../../assets/logo-mark.png" alt="" className="hero-mark" />
    <div className="container">
      <div>
        <div className="eyebrow" style={{ color: 'var(--bone-300)', marginBottom: 18 }}>Drop 03 · Edición limitada</div>
        <h1>Bóxers<br/>que no te<br/>fallan.</h1>
        <p className="sub">Algodón pima 100%, costuras planas, elástico jacquard. Fit honesto que aguanta el día.</p>
        <div className="cta-row">
          <Button size="lg" onClick={() => window.MW.go('product', 'pima-negro')}>Comprar drop 03</Button>
          <Button variant="ghost" size="lg" onClick={() => window.MW.go('shop')} style={{ color: 'var(--bone-50)', borderColor: 'var(--bone-50)' }}>Ver colección</Button>
        </div>
      </div>
      <div className="stamp">
        <div className="tag">Nuevo</div>
        <img src="../../assets/logo-mark.png" alt="MACV mark" />
      </div>
    </div>
  </section>
);

const Features = () => (
  <section className="section" style={{ padding: '40px 0', borderBottom: '1.5px solid var(--carbon-900)' }}>
    <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28 }}>
      {[
        { icon: 'truck', t: 'Envío gratis', s: 'Sobre $80.000' },
        { icon: 'rotate', t: '30 días', s: 'Cambios y devoluciones' },
        { icon: 'shield', t: 'Pima 100%', s: 'Sin mezclas baratas' },
        { icon: 'bag', t: 'Pack & ahorra', s: '3 por $69.900' },
      ].map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Icon name={f.icon} size={28} />
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.t}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{f.s}</div>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const Editorial = () => (
  <section className="editorial">
    <div className="img" />
    <div className="copy">
      <div className="eyebrow">El material</div>
      <h2>Pima.<br/>Sin atajos.</h2>
      <p>Cultivado en valles costeros del Perú. Fibra larga, suave, durable. Lo tejemos en círculo continuo para que las costuras no te molesten — porque la costura que se siente es una costura mal hecha.</p>
      <Button variant="ghost" style={{ color: 'var(--bone-50)', borderColor: 'var(--bone-50)' }}>Conoce el material</Button>
    </div>
  </section>
);

const HomePage = () => (
  <>
    <Hero />
    <Features />
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">Lo más vendido</div>
            <h2>Esenciales</h2>
          </div>
          <a className="more" onClick={() => window.MW.go('shop')}>Ver todo →</a>
        </div>
        <ProductGrid products={window.MW.products.slice(0, 4)} />
      </div>
    </section>
    <Editorial />
    <section className="section alt">
      <div className="container">
        <div className="section-head">
          <div>
            <div className="eyebrow">Drop 03 · Cápsula</div>
            <h2>Edición limitada</h2>
          </div>
          <a className="more" onClick={() => window.MW.go('shop')}>Ver drop →</a>
        </div>
        <ProductGrid products={window.MW.products.slice(4, 8)} />
      </div>
    </section>
  </>
);

Object.assign(window, { Hero, Features, Editorial, HomePage });

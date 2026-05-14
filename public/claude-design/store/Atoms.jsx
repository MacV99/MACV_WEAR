// MACV WEAR — shared atoms (Logo, Icon, Button)
// Loaded as text/babel; everything attached to window for cross-script use.

const Logo = ({ size = 32, inverted = true, withWord = false }) => (
  <a className="logo" onClick={() => window.MW?.go('home')}>
    <img
      src="../../assets/logo-mark.png"
      alt="MACV WEAR"
      style={{
        height: size, width: size,
        filter: inverted ? 'invert(1)' : 'none',
        objectFit: 'contain'
      }}
    />
    {withWord && <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.7, textTransform: 'uppercase' }}>MACV WEAR</span>}
  </a>
);

// Lucide-style stroke icons, hand-inlined (offline-friendly, brand stroke 1.75)
const Icon = ({ name, size = 22 }) => {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor", strokeWidth: 1.75,
    strokeLinecap: "square", strokeLinejoin: "miter"
  };
  switch (name) {
    case 'bag':
      return (<svg {...props}><path d="M6 2l1.5 4h9L18 2"/><path d="M3 6h18l-2 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 6z"/></svg>);
    case 'search':
      return (<svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>);
    case 'user':
      return (<svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
    case 'arrow':
      return (<svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>);
    case 'truck':
      return (<svg {...props}><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>);
    case 'shield':
      return (<svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/></svg>);
    case 'rotate':
      return (<svg {...props}><path d="M3 12a9 9 0 0 1 15.5-6.3M21 4v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3M3 20v-5h5"/></svg>);
    case 'menu':
      return (<svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>);
    default:
      return null;
  }
};

const Button = ({ variant = 'primary', size = 'md', full, children, ...rest }) => {
  const cls = ['btn'];
  if (variant === 'ghost') cls.push('ghost');
  if (variant === 'blood') cls.push('blood');
  if (size === 'lg') cls.push('lg');
  if (size === 'sm') cls.push('sm');
  if (full) cls.push('full');
  return <button className={cls.join(' ')} {...rest}>{children}</button>;
};

Object.assign(window, { Logo, Icon, Button });

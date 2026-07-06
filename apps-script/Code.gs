/**
 * MacV Wear — Backend de inventario y ventas (Google Apps Script)
 * ----------------------------------------------------------------
 * Pega TODO este archivo en: Extensiones › Apps Script de tu hoja.
 * Luego: Implementar › Nueva implementación › App web
 *        Ejecutar como: Yo
 *        Acceso: Cualquiera
 * Copia la URL .../exec y pégala en src/scripts/admin-config.ts
 *
 * Modelo de stock:  stock = stock_base + agregados - vendidos
 *   - Vender        → vendidos  += cantidad   (y registra en hoja Ventas)
 *   - Agregar stock → agregados += cantidad   (pedido nuevo)
 *   - stock_base    → cantidad inicial al crear el producto
 * El campo `stock` se recalcula solo en cada operación.
 */

var SPREADSHEET_ID = '1FCzAhPE0z6gM6_THDa3delslTcjo6qHSb_e6X736poE';
var PRODUCTS_GID   = 2056806095;            // pestaña de productos
var VENTAS_SHEET   = 'Ventas';              // se crea sola si no existe
var ADMIN_PASSWORD = 'macv2024';            // CÁMBIALA — clave del dashboard

// Columnas que deben existir en la hoja de productos (se crean si faltan).
var REQUIRED_COLS = [
  'producto', 'marca', 'color', 'talla', 'precio', 'precio_real', 'stock', 'imagen',
  'stock_base', 'vendidos', 'agregados', 'costo', 'categoria'
];

var VENTA_COLS = [
  'id', 'fecha', 'producto', 'marca', 'color', 'talla',
  'cantidad', 'precio_unit', 'total', 'costo_unit', 'ganancia', 'metodo_pago', 'cliente', 'estado'
];

// ─── Entradas HTTP ──────────────────────────────────────────────────────────

function doGet(e) {
  try {
    var data = readAll();
    return jsonp(e, { ok: true, productos: data.productos, ventas: data.ventas });
  } catch (err) {
    return jsonp(e, { ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.password !== ADMIN_PASSWORD) {
      return json({ ok: false, error: 'Clave incorrecta' });
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var result = route(body);
      return json(result);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function route(body) {
  switch (body.action) {
    case 'ping':           return { ok: true };
    case 'sale':           return registerSale(body);
    case 'add_stock':      return addStock(body);
    case 'add_product':    return addProduct(body);
    case 'update_product': return updateProduct(body);
    case 'delete_product': return deleteProduct(body);
    case 'update_venta':   return updateVenta(body);
    case 'set_estado':     return setEstado(body);
    case 'delete_venta':   return deleteVenta(body);
    default: return { ok: false, error: 'Acción desconocida: ' + body.action };
  }
}

// ─── Acceso a la hoja ────────────────────────────────────────────────────────

function ss() { return SpreadsheetApp.openById(SPREADSHEET_ID); }

function productsSheet() {
  var sheets = ss().getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === PRODUCTS_GID) return sheets[i];
  }
  return sheets[0];
}

function ventasSheet() {
  var s = ss().getSheetByName(VENTAS_SHEET);
  if (!s) {
    s = ss().insertSheet(VENTAS_SHEET);
    s.appendRow(VENTA_COLS);
    return s;
  }
  // Migración: si la hoja ya existía sin 'estado', la agregamos al final.
  var lastCol = s.getLastColumn();
  var headers = s.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  if (headers.indexOf('estado') === -1) {
    s.getRange(1, lastCol + 1).setValue('estado');
  }
  return s;
}

// Devuelve { sheet, headers, colIndex{name:idx}, rows[][] } y asegura columnas.
function loadProducts() {
  var sheet = productsSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });

  // Asegurar columnas requeridas (las que falten se agregan al final).
  var added = false;
  REQUIRED_COLS.forEach(function (col) {
    if (headers.indexOf(col) === -1) {
      headers.push(col);
      sheet.getRange(1, headers.length).setValue(col);
      added = true;
    }
  });
  if (added) {
    values = sheet.getDataRange().getValues();
    headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  }

  var colIndex = {};
  headers.forEach(function (h, i) { colIndex[h] = i; });

  return { sheet: sheet, headers: headers, col: colIndex, values: values };
}

// ─── Lectura ─────────────────────────────────────────────────────────────────

function readAll() {
  var p = loadProducts();
  var productos = [];
  for (var r = 1; r < p.values.length; r++) {
    var row = p.values[r];
    if (!row[p.col['producto']]) continue;
    productos.push({
      row:        r + 1,
      producto:   String(row[p.col['producto']] || ''),
      marca:      String(row[p.col['marca']] || ''),
      color:      String(row[p.col['color']] || ''),
      talla:      String(row[p.col['talla']] || ''),
      precio:     toNum(row[p.col['precio']]),
      precio_real: toNum(row[p.col['precio_real']]),
      stock:      toNum(row[p.col['stock']]),
      imagen:     String(row[p.col['imagen']] || ''),
      stock_base: toNum(row[p.col['stock_base']]),
      vendidos:   toNum(row[p.col['vendidos']]),
      agregados:  toNum(row[p.col['agregados']]),
      costo:      toNum(row[p.col['costo']]),
      categoria:  String(row[p.col['categoria']] || '')
    });
  }

  var vs = ventasSheet();
  var vv = vs.getDataRange().getValues();
  var ventas = [];
  for (var i = 1; i < vv.length; i++) {
    if (!vv[i][0]) continue;
    ventas.push({
      id:          String(vv[i][0]),
      fecha:       formatDate(vv[i][1]),
      producto:    String(vv[i][2] || ''),
      marca:       String(vv[i][3] || ''),
      color:       String(vv[i][4] || ''),
      talla:       String(vv[i][5] || ''),
      cantidad:    toNum(vv[i][6]),
      precio_unit: toNum(vv[i][7]),
      total:       toNum(vv[i][8]),
      costo_unit:  toNum(vv[i][9]),
      ganancia:    toNum(vv[i][10]),
      metodo_pago: String(vv[i][11] || ''),
      cliente:     String(vv[i][12] || ''),
      // Vacío (ventas históricas) se trata como 'pagado'.
      estado:      String(vv[i][13] || '').toLowerCase() === 'pendiente' ? 'pendiente' : 'pagado'
    });
  }

  return { productos: productos, ventas: ventas };
}

// ─── Mutaciones ────────────────────────────────────────────────────────────────

// Encuentra fila por clave compuesta producto+marca+color+talla. Devuelve idx en values o -1.
function findRow(p, key) {
  for (var r = 1; r < p.values.length; r++) {
    var row = p.values[r];
    if (eq(row[p.col['producto']], key.producto) &&
        eq(row[p.col['marca']], key.marca) &&
        eq(row[p.col['color']], key.color) &&
        eq(row[p.col['talla']], key.talla)) {
      return r;
    }
  }
  return -1;
}

function recompute(p, r) {
  var base = toNum(p.values[r][p.col['stock_base']]);
  var add  = toNum(p.values[r][p.col['agregados']]);
  var sold = toNum(p.values[r][p.col['vendidos']]);
  var stock = base + add - sold;
  p.sheet.getRange(r + 1, p.col['stock'] + 1).setValue(stock);
  return stock;
}

function setCell(p, r, colName, value) {
  p.values[r][p.col[colName]] = value;
  p.sheet.getRange(r + 1, p.col[colName] + 1).setValue(value);
}

function registerSale(body) {
  var items = body.items || [];
  if (!items.length) return { ok: false, error: 'Sin items' };
  var p = loadProducts();
  var vs = ventasSheet();
  var metodo = body.metodo_pago || '';
  var cliente = body.cliente || '';
  var estado = String(body.estado || 'pagado').toLowerCase() === 'pendiente' ? 'pendiente' : 'pagado';
  var registradas = [];

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var cant = Math.max(1, toNum(it.cantidad));
    var r = findRow(p, it);
    if (r === -1) return { ok: false, error: 'No existe: ' + it.marca + ' ' + it.color + ' ' + it.talla };

    var disponible = toNum(p.values[r][p.col['stock']]);
    if (cant > disponible) {
      return { ok: false, error: 'Stock insuficiente de ' + it.marca + ' ' + it.color + ' ' + it.talla + ' (quedan ' + disponible + ')' };
    }

    var nuevoVendidos = toNum(p.values[r][p.col['vendidos']]) + cant;
    setCell(p, r, 'vendidos', nuevoVendidos);
    recompute(p, r);

    // Precio real de venta: el que manda el panel ($25.000); si no viene, el de la hoja.
    var precio = it.precio !== undefined && it.precio !== '' ? toNum(it.precio) : toNum(p.values[r][p.col['precio']]);
    var costo  = toNum(p.values[r][p.col['costo']]);
    var total  = precio * cant;
    var gan    = (precio - costo) * cant;
    var id     = 'V' + Date.now() + '-' + i;

    vs.appendRow([
      id, new Date(),
      p.values[r][p.col['producto']], p.values[r][p.col['marca']],
      p.values[r][p.col['color']], p.values[r][p.col['talla']],
      cant, precio, total, costo, gan, metodo, cliente, estado
    ]);
    registradas.push(id);
  }

  return { ok: true, ventas: registradas, data: readAll() };
}

function addStock(body) {
  var p = loadProducts();
  var r = findRow(p, body);
  if (r === -1) return { ok: false, error: 'Producto no encontrado' };
  var cant = toNum(body.cantidad);
  setCell(p, r, 'agregados', toNum(p.values[r][p.col['agregados']]) + cant);
  var stock = recompute(p, r);
  return { ok: true, stock: stock, data: readAll() };
}

function addProduct(body) {
  var p = loadProducts();
  if (findRow(p, body) !== -1) {
    return { ok: false, error: 'Ya existe esa combinación marca/color/talla' };
  }
  var stockInicial = toNum(body.stock_inicial);
  var rowArr = new Array(p.headers.length).fill('');
  rowArr[p.col['producto']]   = body.producto || '';
  rowArr[p.col['marca']]      = body.marca || '';
  rowArr[p.col['color']]      = body.color || '';
  rowArr[p.col['talla']]      = body.talla || '';
  rowArr[p.col['precio']]     = toNum(body.precio);
  rowArr[p.col['precio_real']] = toNum(body.precio_real);
  rowArr[p.col['costo']]      = toNum(body.costo);
  rowArr[p.col['imagen']]     = body.imagen || '';
  rowArr[p.col['categoria']]  = body.categoria || '';
  rowArr[p.col['stock_base']] = stockInicial;
  rowArr[p.col['vendidos']]   = 0;
  rowArr[p.col['agregados']]  = 0;
  rowArr[p.col['stock']]      = stockInicial;
  p.sheet.appendRow(rowArr);
  return { ok: true, data: readAll() };
}

function updateProduct(body) {
  var p = loadProducts();
  var r = findRow(p, body.key || body);
  if (r === -1) return { ok: false, error: 'Producto no encontrado' };
  var f = body.fields || {};
  if (f.precio      !== undefined) setCell(p, r, 'precio', toNum(f.precio));
  if (f.precio_real !== undefined) setCell(p, r, 'precio_real', toNum(f.precio_real));
  if (f.costo       !== undefined) setCell(p, r, 'costo', toNum(f.costo));
  if (f.imagen    !== undefined) setCell(p, r, 'imagen', f.imagen);
  if (f.categoria !== undefined) setCell(p, r, 'categoria', f.categoria);
  if (f.color     !== undefined) setCell(p, r, 'color', f.color);
  if (f.talla     !== undefined) setCell(p, r, 'talla', f.talla);
  if (f.marca     !== undefined) setCell(p, r, 'marca', f.marca);
  if (f.producto  !== undefined) setCell(p, r, 'producto', f.producto);
  // Override directo de stock_base (corrección manual de inventario).
  if (f.stock_base !== undefined) { setCell(p, r, 'stock_base', toNum(f.stock_base)); recompute(p, r); }
  return { ok: true, data: readAll() };
}

function deleteProduct(body) {
  var p = loadProducts();
  var r = findRow(p, body);
  if (r === -1) return { ok: false, error: 'Producto no encontrado' };
  p.sheet.deleteRow(r + 1);
  return { ok: true, data: readAll() };
}

// ─── Editar / eliminar ventas ──────────────────────────────────────────────────
// Al editar la cantidad o eliminar, se ajusta `vendidos` del producto (devuelve stock).
// Columnas Ventas: 0 id,1 fecha,2 producto,3 marca,4 color,5 talla,6 cantidad,
//                  7 precio_unit,8 total,9 costo_unit,10 ganancia,11 metodo_pago,12 cliente

function findVentaRow(vs, id) {
  var v = vs.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (String(v[i][0]) === String(id)) return { row: i + 1, data: v[i] };
  }
  return null;
}

function ajustarVendidos(producto, marca, color, talla, delta) {
  var p = loadProducts();
  var r = findRow(p, { producto: producto, marca: marca, color: color, talla: talla });
  if (r === -1) return;
  var nuevo = Math.max(0, toNum(p.values[r][p.col['vendidos']]) + delta);
  setCell(p, r, 'vendidos', nuevo);
  recompute(p, r);
}

// Marca una venta como pagada / pendiente (no toca stock ni totales).
function setEstado(body) {
  var vs = ventasSheet();
  var found = findVentaRow(vs, body.id);
  if (!found) return { ok: false, error: 'Venta no encontrada' };
  var estado = String(body.estado || '').toLowerCase() === 'pendiente' ? 'pendiente' : 'pagado';
  var col = VENTA_COLS.indexOf('estado') + 1;   // 1-based
  vs.getRange(found.row, col).setValue(estado);
  return { ok: true, data: readAll() };
}

function deleteVenta(body) {
  var vs = ventasSheet();
  var found = findVentaRow(vs, body.id);
  if (!found) return { ok: false, error: 'Venta no encontrada' };
  var d = found.data;
  // Devolver el stock vendido.
  ajustarVendidos(d[2], d[3], d[4], d[5], -toNum(d[6]));
  vs.deleteRow(found.row);
  return { ok: true, data: readAll() };
}

function updateVenta(body) {
  var vs = ventasSheet();
  var found = findVentaRow(vs, body.id);
  if (!found) return { ok: false, error: 'Venta no encontrada' };
  var d = found.data;
  var f = body.fields || {};

  var oldCant = toNum(d[6]);
  var newCant = f.cantidad !== undefined ? Math.max(1, toNum(f.cantidad)) : oldCant;
  var precio  = f.precio_unit !== undefined ? toNum(f.precio_unit) : toNum(d[7]);
  var costo   = toNum(d[9]);

  // Ajustar inventario si cambió la cantidad.
  if (newCant !== oldCant) ajustarVendidos(d[2], d[3], d[4], d[5], newCant - oldCant);

  var total = precio * newCant;
  var gan   = (precio - costo) * newCant;
  var cliente = f.cliente !== undefined ? f.cliente : d[12];
  var metodo  = f.metodo_pago !== undefined ? f.metodo_pago : d[11];

  var rng = vs.getRange(found.row, 1, 1, VENTA_COLS.length).getValues()[0];
  rng[6] = newCant; rng[7] = precio; rng[8] = total; rng[10] = gan;
  rng[11] = metodo; rng[12] = cliente;
  vs.getRange(found.row, 1, 1, VENTA_COLS.length).setValues([rng]);

  return { ok: true, data: readAll() };
}

// ─── Aplicar costo y recalcular ganancias (correr desde el editor) ─────────────
// Pone el costo por unidad en TODOS los productos y recalcula la ganancia de
// todas las ventas ya registradas: ganancia = (precio_unit - costo) * cantidad.
// Ej: vendes a $30.000 con costo $5.000 → ganancia real $25.000/unidad.
// Cambia COSTO_UNIDAD si lo necesitas y pulsa ▶ Ejecutar.

function aplicarCosto() {
  var COSTO_UNIDAD = 5000;   // ← costo por unidad

  // 1. Escribir costo en cada producto.
  var p = loadProducts();
  for (var r = 1; r < p.values.length; r++) {
    if (!p.values[r][p.col['producto']]) continue;
    setCell(p, r, 'costo', COSTO_UNIDAD);
  }

  // 2. Recalcular la ganancia de cada venta ya registrada.
  var vs = ventasSheet();
  var v = vs.getDataRange().getValues();
  for (var i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    var cant   = toNum(v[i][6]);
    var precio = toNum(v[i][7]);
    var gan    = (precio - COSTO_UNIDAD) * cant;
    vs.getRange(i + 1, 10).setValue(COSTO_UNIDAD); // costo_unit (col 10)
    vs.getRange(i + 1, 11).setValue(gan);          // ganancia   (col 11)
  }

  Logger.log('Costo $' + COSTO_UNIDAD + ' aplicado a productos y ' + (v.length - 1) + ' ventas recalculadas.');
}

// ─── Importación histórica (correr UNA vez desde el editor) ────────────────────
// Menú: selecciona "importHistorico" arriba y pulsa ▶ Ejecutar.
// Crea el SKU genérico "Boxer · Unico · XL/XXL" a $25.000 y registra los
// 20 pedidos del CSV como ventas con su cliente. No toca el catálogo de marcas.

function importHistorico() {
  var PRECIO = 25000;
  var pedidos = [
    { cliente: 'ARIEL', talla: 'XL', cantidad: 2 },
    { cliente: 'MIGUEL CAMACHO', talla: 'XL', cantidad: 8 },
    { cliente: 'PITO', talla: 'XL', cantidad: 3 },
    { cliente: 'LUCHO', talla: 'XL', cantidad: 1 },
    { cliente: 'NICOLAS', talla: 'XL', cantidad: 3 },
    { cliente: 'CLAVO', talla: 'XL', cantidad: 1 },
    { cliente: 'DAVID BAJONERO', talla: 'XL', cantidad: 2 },
    { cliente: 'MAURICIO LARGO', talla: 'XL', cantidad: 2 },
    { cliente: 'EMANUEL', talla: 'XL', cantidad: 6 },
    { cliente: 'FRAN', talla: 'XL', cantidad: 3 },
    { cliente: 'JUAN MONTAÑA', talla: 'XL', cantidad: 2 },
    { cliente: 'NOLBERTO', talla: 'XXL', cantidad: 1 },
    { cliente: 'MARIA', talla: 'XXL', cantidad: 2 },
    { cliente: 'ARIAS', talla: 'XXL', cantidad: 4 },
    { cliente: 'LUCHO MOROCHA', talla: 'XXL', cantidad: 2 },
    { cliente: 'JAVIER VARGAS', talla: 'XXL', cantidad: 2 },
    { cliente: 'LUCHO', talla: 'XXL', cantidad: 4 },
    { cliente: 'CLAVO', talla: 'XXL', cantidad: 1 },
    { cliente: 'ANDRES ARIAS', talla: 'XXL', cantidad: 1 },
    { cliente: 'CONDE', talla: 'XXL', cantidad: 4 },
    { cliente: 'RODRI SANTACRUZ', talla: 'XXL', cantidad: 3 }
  ];

  var p = loadProducts();

  // Guard anti-doble-ejecución.
  if (findRow(p, { producto: 'Boxer', marca: 'Unico', color: 'Unico', talla: 'XL' }) !== -1) {
    throw new Error('Ya se importó antes (existe el SKU genérico). Aborto para no duplicar.');
  }

  // Totales por talla → stock_base para que el stock quede en 0 tras importar.
  var totalXL = 0, totalXXL = 0;
  pedidos.forEach(function (q) { if (q.talla === 'XL') totalXL += q.cantidad; else totalXXL += q.cantidad; });

  crearGenerico('XL', totalXL, PRECIO);
  crearGenerico('XXL', totalXXL, PRECIO);

  // Recargar tras crear filas.
  p = loadProducts();
  var vs = ventasSheet();

  pedidos.forEach(function (q, i) {
    var r = findRow(p, { producto: 'Boxer', marca: 'Unico', color: 'Unico', talla: q.talla });
    setCell(p, r, 'vendidos', toNum(p.values[r][p.col['vendidos']]) + q.cantidad);
    recompute(p, r);
    var total = PRECIO * q.cantidad;
    vs.appendRow([
      'H' + Date.now() + '-' + i, new Date(),
      'Boxer', 'Unico', 'Unico', q.talla,
      q.cantidad, PRECIO, total, 0, total, '', q.cliente
    ]);
  });

  Logger.log('Importados ' + pedidos.length + ' pedidos. XL=' + totalXL + ' XXL=' + totalXXL);
}

function crearGenerico(talla, stockBase, precio) {
  var p = loadProducts();
  var rowArr = new Array(p.headers.length).fill('');
  rowArr[p.col['producto']]   = 'Boxer';
  rowArr[p.col['marca']]      = 'Unico';
  rowArr[p.col['color']]      = 'Unico';
  rowArr[p.col['talla']]      = talla;
  rowArr[p.col['precio']]     = precio;
  rowArr[p.col['costo']]      = 0;
  rowArr[p.col['categoria']]  = 'Genérico';
  rowArr[p.col['stock_base']] = stockBase;
  rowArr[p.col['vendidos']]   = 0;
  rowArr[p.col['agregados']]  = 0;
  rowArr[p.col['stock']]      = stockBase;
  p.sheet.appendRow(rowArr);
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function toNum(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  var n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function eq(a, b) {
  return String(a).trim().toLowerCase() === String(b == null ? '' : b).trim().toLowerCase();
}

function formatDate(d) {
  if (!(d instanceof Date)) return String(d || '');
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp(e, obj) {
  var cb = e && e.parameter && e.parameter.callback;
  var payload = JSON.stringify(obj);
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + payload + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

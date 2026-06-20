# Panel MacV — Inventario y Ventas

Dashboard privado en `/admin` conectado a Google Sheets vía Apps Script.

## Conectar (2 pasos, una sola vez)

### 1. Desplegar el script

1. Abre tu hoja → menú **Extensiones › Apps Script**.
2. Borra todo lo que haya y pega **todo** `Code.gs` de esta carpeta.
3. (Opcional) Cambia `ADMIN_PASSWORD = 'macv2024'` por tu clave real.
4. Clic **Implementar › Nueva implementación**.
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquiera**
5. Autoriza los permisos cuando lo pida.
6. Copia la **URL de la app web** (termina en `/exec`).

### 2. Pegar la URL

En `src/scripts/admin-config.ts` reemplaza el placeholder por tu URL `/exec`.

Listo. Entra a `/admin`, escribe la clave y a vender.

## Cómo funciona el stock

`stock = stock_base + agregados − vendidos` (se recalcula solo)

- **Vender** → suma a `vendidos` + registra en hoja `Ventas`
- **Agregar stock** (pedido) → suma a `agregados`
- **Nuevo producto** → crea fila con `stock_base` = stock inicial

El script crea solo las columnas `costo`, `categoria` y la hoja `Ventas` si no existen.

## Cambiar la clave

Edita `ADMIN_PASSWORD` en `Code.gs` y vuelve a implementar
(**Implementar › Gestionar implementaciones › editar › Nueva versión**).

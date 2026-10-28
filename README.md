# Tienda en Línea Modular — Frontend

Interfaz de la **Tienda en Línea Modular** (Proyecto de Aula, Desarrollo de Aplicaciones Web), cuya marca de cara al público es **Taller Nogal**: catálogo público con buscador, categorías, ficha de producto, carrito de compras y panel de administrador. Es un proyecto independiente del backend y solo habla con él por peticiones a la API REST: [Tienda-Backend](https://github.com/Santiii28/Tienda-Backend).

## Tecnologías

| Pieza | Herramienta |
|---|---|
| Lenguaje | HTML5 y JavaScript (módulos ES), sin framework |
| Estilos | SCSS (sass) con parciales `@use` |
| Gestor de dependencias y automatizador | npm + Vite |
| Despliegue previsto | Vercel |

## Ejecutar en local

Requisitos: Node.js y el backend corriendo en `http://127.0.0.1:8000`.

```powershell
npm install
npm run dev
```

La tienda queda en `http://localhost:5173/` y el panel en `http://localhost:5173/admin.html`.

En desarrollo, Vite reenvía todo lo que empieza por `/api` al backend (configurado en `vite.config.js`). Así el navegador ve un solo origen y las cookies de sesión y de CSRF funcionan sin configurar CORS. Usa siempre `localhost`, no `127.0.0.1`: las cookies son distintas para cada nombre.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila SCSS y JavaScript a la carpeta `dist/` |
| `npm run preview` | Sirve `dist/` para revisar la compilación |
| `npm run auditar` | Busca en el código usos riesgosos de XSS (`innerHTML`, `eval`, scripts en línea…) |

## Cómo funciona

- **Catálogo** (`src/main.js`): barra superior fija con buscador, portada, categorías en tarjetas («Compra por categoría»), tarjetas desplegables («Ver detalle») y botones «Comprar ahora» y «Agregar al carrito». El buscador filtra en el navegador sobre los productos de la categoría activa (sin importar mayúsculas ni tildes; mira nombre, descripción y categoría). Los productos sin foto muestran un recuadro con su inicial. Sobre el catálogo hay una barra para ordenar (nombre, precio de menor a mayor o de mayor a menor), poner un precio mínimo y máximo y mostrar solo lo que tiene existencias; todo se calcula en el navegador y se combina con el buscador. La foto de un producto puede ser una dirección web o una ruta de la tienda (`/productos/mesa.jpg`, dentro de `public/productos/`); si no carga, se muestra la inicial. Si un producto trae `precio_anterior` (mayor que el precio), la tarjeta y la ficha muestran el precio de antes tachado y una insignia con el porcentaje de descuento; el carrito siempre cobra el precio actual. En el panel de administración se llena en el campo opcional «Precio anterior (COP)». El pie de página tiene una columna «Ayuda» (Cómo comprar, Envíos, Pagos y Preguntas frecuentes) que abre ventanas con textos fijos (`src/info.js`), que solo dicen lo que la tienda hace de verdad.
- **Diseño** (`src/styles/`): sigue la maqueta hecha en Lovable (barra fija con buscador, portada en tarjeta con foto y el sello encima, categorías en tarjetas, tarjetas de producto, carrito lateral y ventanas redondeadas), escrito a mano en SCSS. La tipografía es Plus Jakarta Sans, instalada con npm (`@fontsource/plus-jakarta-sans`) y servida por el propio sitio, así que la política de seguridad de contenido sigue sin permitir fuentes externas. La paleta y los radios están en `_tokens.scss`. Los íconos y el sello son SVG en `public/`; la foto de la portada es `public/hero.jpg` (JPG de 1400 px, unos 120 KB), con texto alternativo en `index.html`.
- **Ficha del producto** (`src/detalle.js`): al tocar el nombre o la imagen de una tarjeta se abre una ventana con imagen grande, precio, descripción, existencias y los botones de compra. Se cierra con Escape, con la X o tocando fuera.
- **Carrito** (`src/carrito.js`): panel lateral. El carrito vive en la base de datos y se identifica con un token (UUID) guardado en `localStorage`; al recargar se recupera. Cada cambio de cantidad vuelve a pedir el carrito a la API, por lo que el total siempre viene recalculado por el servidor. No deja superar las existencias.
- **Pago simulado** (`src/pago.js`): «Ir a pagar» (desde el carrito) o «Comprar ahora» abren una ventana con el resumen (subtotal, envío y total a pagar, calculados por el servidor) y un formulario de contacto y entrega. Al confirmar se muestra el aviso de compra exitosa. No hay pasarela ni datos de tarjeta, y no sale de la página.
- **Cuenta** (`src/cuenta.js`): «Iniciar sesión» en el menú abre una ventana para entrar o crear una cuenta de cliente. Con sesión abierta el menú muestra «Hola, nombre» y «Cerrar sesión», y el pago ya trae nombre y correo. Comprar no exige cuenta. El enlace «Administración» solo aparece para administradores.
- **Panel de administrador** (`src/admin.js`): inicio de sesión y CRUD de productos y categorías, sin recargar la página. Se construye aparte de la tienda pública (`admin.html`).
- **API** (`src/api.js`): único lugar que hace `fetch`. Envía la cabecera `X-CSRFToken` (leída de la cookie `csrftoken`) en toda petición que modifica datos y convierte los errores HTTP en mensajes en español.

## Seguridad

- **XSS:** los datos de la API nunca se insertan como HTML. El DOM se arma con `createElement` y `textContent` (función `crear` en `src/utils.js`), las URL de imagen se aceptan solo si son `http` o `https`, y `npm run auditar` comprueba que no haya `innerHTML` ni equivalentes. Como segunda barrera, `vercel.json` define una política de seguridad de contenido (CSP) que solo permite scripts y estilos del propio sitio: un script en línea o un `onerror` inyectado no se ejecuta.
- **CSRF:** toda escritura lleva `X-CSRFToken`; sin él el backend responde 403.
- **HTTPS:** lo provee Vercel. El backend además redirige y marca las cookies como `Secure` en producción.
- **Cabeceras** (en `vercel.json`): `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.

## Despliegue en Vercel

El frontend llama siempre a rutas relativas `/api/...`. En producción, `vercel.json` reenvía esas rutas al backend (reglas de reescritura), de modo que el navegador sigue viendo un solo dominio y las cookies funcionan igual que en desarrollo.

1. Despliega primero el backend en Render y copia su dirección (`https://<servicio>.onrender.com`).
2. En `vercel.json`, reemplaza `REEMPLAZAR-POR-TU-SERVICIO.onrender.com` por esa dirección y súbelo a GitHub.
3. En Vercel: **Add New → Project**, elige este repositorio. Vercel detecta Vite; el comando de build es `npm run build` y la carpeta de salida `dist`.
4. Copia el dominio que te asigna Vercel (`https://<proyecto>.vercel.app`) y pégalo en la variable `FRONTEND_ORIGINS` del backend en Render (sin barra final). Sin ese paso el login y las escrituras del panel responden 403.

## Estructura

```
index.html, admin.html     Las dos páginas
src/
  main.js                  Catálogo, buscador, orden, filtros y categorías
  detalle.js               Ficha del producto
  info.js                  Ventanas de ayuda del pie de página
  carrito.js               Carrito
  cuenta.js                Menú de sesión, inicio de sesión y registro de clientes
  pago.js                  Pago simulado (formulario de contacto y entrega, aviso de compra exitosa)
  admin.js                 Panel de administrador
  api.js                   Cliente de la API
  utils.js                 Utilidades (crear elementos, precios, URL segura, avisos)
  styles/                  SCSS: _tokens, _base, _carrito, main, admin
scripts/auditar-xss.mjs    Auditoría de XSS
vercel.json                Reescritura de /api y cabeceras de seguridad
vite.config.js             Proxy de desarrollo y páginas de compilación
```

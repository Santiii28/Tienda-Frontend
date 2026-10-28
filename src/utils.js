import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/plus-jakarta-sans/latin-800.css";
export function formatearPrecio(valor) {
  return Number(valor).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

// Porcentaje de descuento (entero) si el producto tiene un precio anterior mayor
// que el actual; si no, null.
export function porcentajeDescuento(producto) {
  const anterior = Number(producto.precio_anterior);
  const actual = Number(producto.precio);
  if (!producto.precio_anterior || !(anterior > actual)) {
    return null;
  }
  return Math.max(1, Math.round(((anterior - actual) / anterior) * 100));
}

// Bloque de precio: el actual y, si hay oferta, el anterior tachado. `clase` es el
// bloque CSS que lo contiene ("producto" o "detalle").
export function crearPrecio(producto, clase) {
  const descuento = porcentajeDescuento(producto);
  return crear(
    "div",
    { clase: `${clase}__precios` },
    crear("p", { clase: `${clase}__precio`, texto: formatearPrecio(producto.precio) }),
    descuento
      ? crear(
          "p",
          { clase: "precio-anterior" },
          crear("span", { clase: "solo-lectores", texto: "Precio anterior: " }),
          crear("s", { texto: formatearPrecio(producto.precio_anterior) }),
        )
      : null,
  );
}

// Devuelve la URL solo si usa http o https, o si es una ruta de este mismo sitio
// ("/productos/mesa.jpg"); si no (javascript:, data:, "//otro.sitio", texto
// suelto...) devuelve null. Defensa adicional para enlaces que vienen de la API.
export function urlSegura(texto) {
  if (typeof texto === "string" && /^\/(?![/\\])[\w\-./%]*$/.test(texto)) {
    return texto;
  }
  try {
    const url = new URL(texto);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

// Crea un elemento del DOM. El texto se asigna con textContent, nunca con
// innerHTML, para que ningún dato de la API pueda inyectar HTML (XSS).
export function crear(etiqueta, propiedades = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);

  for (const [nombre, valor] of Object.entries(propiedades)) {
    if (valor === undefined || valor === null || valor === false) {
      continue;
    }
    if (nombre === "clase") {
      elemento.className = valor;
    } else if (nombre === "texto") {
      elemento.textContent = valor;
    } else if (nombre.startsWith("on")) {
      elemento.addEventListener(nombre.slice(2).toLowerCase(), valor);
    } else if (nombre === "dataset") {
      Object.assign(elemento.dataset, valor);
    } else {
      elemento.setAttribute(nombre, valor === true ? "" : valor);
    }
  }

  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) {
      continue;
    }
    elemento.append(hijo);
  }
  return elemento;
}

let temporizadorAviso;

// Mensaje breve en la parte inferior de la pantalla.
export function avisar(mensaje, tipo = "info") {
  const caja = document.querySelector("#aviso");
  if (!caja) {
    return;
  }
  clearTimeout(temporizadorAviso);
  caja.textContent = mensaje;
  caja.className = `aviso aviso--visible aviso--${tipo}`;
  temporizadorAviso = setTimeout(() => {
    caja.className = "aviso";
  }, 3800);
}

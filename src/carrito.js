import { ErrorApi, carritos } from "./api.js";
import { avisar, crear, formatearPrecio } from "./utils.js";

const CLAVE_TOKEN = "tienda_carrito_token";

const panel = document.querySelector("#panel-carrito");
const cortina = document.querySelector("#cortina");
const cuerpo = document.querySelector("#carrito-cuerpo");
const totalCarrito = document.querySelector("#carrito-total");
const cuenta = document.querySelector("#cuenta-carrito");
const botonAbrir = document.querySelector("#abrir-carrito");
const botonCerrar = document.querySelector("#cerrar-carrito");

let carrito = null; // último estado que devolvió la API
let ocupado = false;

// ---------- Token guardado en el navegador ----------
function leerToken() {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

function guardarToken(token) {
  try {
    if (token) {
      localStorage.setItem(CLAVE_TOKEN, token);
    } else {
      localStorage.removeItem(CLAVE_TOKEN);
    }
  } catch {
    // Sin almacenamiento disponible el carrito dura solo mientras la pestaña esté abierta.
  }
}

// Devuelve el token del carrito, creando uno nuevo si todavía no hay.
async function asegurarCarrito() {
  if (carrito) {
    return carrito.token;
  }
  carrito = await carritos.crear();
  guardarToken(carrito.token);
  return carrito.token;
}

// ---------- Pintado ----------
function crearFila(item) {
  const alMaximo = item.cantidad >= item.existencias;

  return crear(
    "li",
    { clase: "linea" },
    crear(
      "div",
      { clase: "linea__datos" },
      crear("p", { clase: "linea__nombre", texto: item.producto_nombre }),
      crear("p", {
        clase: "linea__precio",
        texto: `${formatearPrecio(item.precio_unitario)} c/u`,
      }),
    ),
    crear(
      "div",
      { clase: "cantidad" },
      crear("button", {
        type: "button",
        clase: "cantidad__boton",
        texto: "−",
        "aria-label": `Quitar una unidad de ${item.producto_nombre}`,
        disabled: item.cantidad <= 1,
        onClick: () => cambiarCantidad(item, item.cantidad - 1),
      }),
      crear("span", {
        clase: "cantidad__valor",
        texto: String(item.cantidad),
        "aria-label": `${item.cantidad} unidades`,
      }),
      crear("button", {
        type: "button",
        clase: "cantidad__boton",
        texto: "+",
        "aria-label": `Agregar una unidad de ${item.producto_nombre}`,
        disabled: alMaximo,
        title: alMaximo ? "No hay más existencias" : undefined,
        onClick: () => cambiarCantidad(item, item.cantidad + 1),
      }),
    ),
    crear("p", { clase: "linea__subtotal", texto: formatearPrecio(item.subtotal) }),
    crear("button", {
      type: "button",
      clase: "enlace-boton",
      texto: "Quitar",
      "aria-label": `Quitar ${item.producto_nombre} del carrito`,
      onClick: () => quitar(item),
    }),
  );
}

function pintar() {
  const items = carrito ? carrito.items : [];
  const unidades = items.reduce((suma, item) => suma + item.cantidad, 0);

  cuenta.textContent = String(unidades);
  botonAbrir.setAttribute("aria-label", `Carrito, ${unidades} productos`);
  totalCarrito.textContent = formatearPrecio(carrito ? carrito.total : 0);

  cuerpo.replaceChildren();
  if (items.length === 0) {
    cuerpo.append(
      crear("p", {
        clase: "carrito__vacio",
        texto: "Tu carrito está vacío. Agrega productos desde el catálogo.",
      }),
    );
    return;
  }
  cuerpo.append(crear("ul", { clase: "lineas" }, items.map(crearFila)));
}

// ---------- Acciones ----------
async function ejecutar(accion) {
  if (ocupado) {
    return;
  }
  ocupado = true;
  panel.setAttribute("aria-busy", "true");
  try {
    carrito = await accion();
    pintar();
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 404) {
      // El carrito ya no existe en el servidor: se empieza de nuevo.
      carrito = null;
      guardarToken(null);
      pintar();
      avisar("Tu carrito había expirado. Intenta de nuevo.", "error");
    } else {
      avisar(error.message, "error");
    }
  } finally {
    ocupado = false;
    panel.removeAttribute("aria-busy");
  }
}

export function agregarAlCarrito(producto) {
  return ejecutar(async () => {
    const token = await asegurarCarrito();
    const actualizado = await carritos.agregar(token, producto.id, 1);
    avisar(`Agregado: ${producto.nombre}`, "ok");
    return actualizado;
  });
}

function cambiarCantidad(item, cantidad) {
  return ejecutar(() => carritos.cambiarCantidad(carrito.token, item.id, cantidad));
}

function quitar(item) {
  return ejecutar(() => carritos.quitar(carrito.token, item.id));
}

// ---------- Abrir y cerrar el panel ----------
function abrir() {
  panel.hidden = false;
  cortina.hidden = false;
  document.body.classList.add("sin-scroll");
  botonCerrar.focus();
}

function cerrar() {
  panel.hidden = true;
  cortina.hidden = true;
  document.body.classList.remove("sin-scroll");
  botonAbrir.focus();
}

export async function iniciarCarrito() {
  botonAbrir.addEventListener("click", abrir);
  botonCerrar.addEventListener("click", cerrar);
  cortina.addEventListener("click", cerrar);
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !panel.hidden) {
      cerrar();
    }
  });

  const token = leerToken();
  if (token) {
    try {
      carrito = await carritos.ver(token);
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 404) {
        guardarToken(null);
      }
    }
  }
  pintar();
}

import { ErrorApi, carritos } from "./api.js";
import { abrirPago } from "./pago.js";
import { avisar, crear, formatearPrecio } from "./utils.js";

const CLAVE_TOKEN = "tienda_carrito_token";

const panel = document.querySelector("#panel-carrito");
const cortina = document.querySelector("#cortina");
const cuerpo = document.querySelector("#carrito-cuerpo");
const subtotalCarrito = document.querySelector("#carrito-subtotal");
const envioCarrito = document.querySelector("#carrito-envio");
const totalCarrito = document.querySelector("#carrito-total");
const botonPagar = document.querySelector("#ir-a-pagar");
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
  // El servidor calcula todos los montos; aquí solo se muestran.
  subtotalCarrito.textContent = formatearPrecio(carrito ? carrito.total : 0);
  envioCarrito.textContent = formatearPrecio(carrito ? carrito.envio : 0);
  totalCarrito.textContent = formatearPrecio(carrito ? carrito.total_a_pagar : 0);
  botonPagar.disabled = items.length === 0;

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
    return true;
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
    return false;
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

// «Comprar ahora»: deja el producto en el carrito y abre directo el pago.
export async function comprarAhora(producto) {
  const yaEstaba = carrito && carrito.items.some((item) => item.producto === producto.id);
  if (!yaEstaba) {
    const listo = await ejecutar(async () => {
      const token = await asegurarCarrito();
      return carritos.agregar(token, producto.id, 1);
    });
    if (!listo) {
      return;
    }
  }
  irAPagar();
}

function irAPagar() {
  if (!carrito || carrito.items.length === 0) {
    return;
  }
  const token = carrito.token;
  // El fondo oscuro y el bloqueo de scroll siguen activos mientras se paga.
  panel.hidden = true;
  cortina.hidden = false;
  document.body.classList.add("sin-scroll");

  abrirPago({
    carrito,
    alVolver: abrir,
    alCerrar: cerrar,
    alComprar: async (datos) => {
      const resumen = await carritos.comprar(token, datos);
      try {
        carrito = await carritos.ver(token);
      } catch {
        carrito = null;
      }
      pintar();
      return resumen;
    },
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
  botonPagar.addEventListener("click", irAPagar);
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

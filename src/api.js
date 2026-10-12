// Si la API vive en otro dominio (producción), se define VITE_API_URL.
// En desarrollo se usa "/api" y el proxy de Vite lo reenvía a Django.
const API_URL = import.meta.env.VITE_API_URL || "/api";

export class ErrorApi extends Error {
  constructor(estado, datos) {
    super(mensajeDeError(estado, datos));
    this.estado = estado;
    this.datos = datos;
  }
}

function mensajeDeError(estado, datos) {
  if (estado === 0) {
    return "No se pudo conectar con el servidor. Revisa que el backend esté encendido.";
  }
  if (datos && typeof datos.detail === "string") {
    return datos.detail;
  }
  if (datos && typeof datos === "object") {
    const partes = Object.values(datos).flat().filter((x) => typeof x === "string");
    if (partes.length > 0) {
      return partes.join(" ");
    }
  }
  return `La API respondió ${estado}`;
}

function leerCookie(nombre) {
  const par = document.cookie
    .split("; ")
    .find((fila) => fila.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.split("=").slice(1).join("=")) : "";
}

const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS"];

async function pedir(ruta, { metodo = "GET", cuerpo } = {}) {
  const opciones = {
    method: metodo,
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  };

  if (cuerpo !== undefined) {
    opciones.headers["Content-Type"] = "application/json";
    opciones.body = JSON.stringify(cuerpo);
  }

  // Django exige el token CSRF en toda petición que modifica datos.
  if (!METODOS_SEGUROS.includes(metodo)) {
    opciones.headers["X-CSRFToken"] = leerCookie("csrftoken");
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  } catch {
    throw new ErrorApi(0, null);
  }

  // fetch no lanza error con 404 o 500: hay que revisar respuesta.ok.
  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, datos);
  }
  return datos;
}

// ---------- Catálogo (público) ----------
export function obtenerCategorias() {
  return pedir("/categorias/");
}

export function obtenerProductos(categoriaId) {
  const filtro = categoriaId ? `?categoria=${categoriaId}` : "";
  return pedir(`/productos/${filtro}`);
}

// ---------- Administración ----------
export const categorias = {
  listar: () => pedir("/categorias/"),
  crear: (datos) => pedir("/categorias/", { metodo: "POST", cuerpo: datos }),
  actualizar: (id, datos) =>
    pedir(`/categorias/${id}/`, { metodo: "PATCH", cuerpo: datos }),
  eliminar: (id) => pedir(`/categorias/${id}/`, { metodo: "DELETE" }),
};

export const productos = {
  listar: () => pedir("/productos/"),
  crear: (datos) => pedir("/productos/", { metodo: "POST", cuerpo: datos }),
  actualizar: (id, datos) =>
    pedir(`/productos/${id}/`, { metodo: "PATCH", cuerpo: datos }),
  eliminar: (id) => pedir(`/productos/${id}/`, { metodo: "DELETE" }),
};

// ---------- Sesión del administrador ----------
export function quienSoy() {
  return pedir("/auth/yo/");
}

export async function iniciarSesion(username, password) {
  // Primero se pide la cookie csrftoken; el login también la exige.
  await pedir("/auth/csrf/");
  return pedir("/auth/login/", {
    metodo: "POST",
    cuerpo: { username, password },
  });
}

export function cerrarSesion() {
  return pedir("/auth/logout/", { metodo: "POST" });
}

// ---------- Carrito (visitante anónimo, identificado por su token) ----------
export const carritos = {
  crear: () => pedir("/carritos/", { metodo: "POST" }),
  ver: (token) => pedir(`/carritos/${token}/`),
  agregar: (token, productoId, cantidad = 1) =>
    pedir(`/carritos/${token}/items/`, {
      metodo: "POST",
      cuerpo: { producto: productoId, cantidad },
    }),
  cambiarCantidad: (token, itemId, cantidad) =>
    pedir(`/carritos/${token}/items/${itemId}/`, {
      metodo: "PATCH",
      cuerpo: { cantidad },
    }),
  quitar: (token, itemId) =>
    pedir(`/carritos/${token}/items/${itemId}/`, { metodo: "DELETE" }),
};

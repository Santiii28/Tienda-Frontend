import { ErrorApi } from "./api.js";
import { usuarioActual } from "./cuenta.js";
import { avisar, crear, formatearPrecio } from "./utils.js";

const panel = document.querySelector("#panel-pago");
const cuerpo = document.querySelector("#pago-cuerpo");
const botonCerrar = document.querySelector("#cerrar-pago");

const CAMPOS = [
  { nombre: "nombre", etiqueta: "Nombre completo", tipo: "text", autocomplete: "name", max: 100 },
  { nombre: "correo", etiqueta: "Correo electrónico", tipo: "email", autocomplete: "email", max: 150 },
  {
    nombre: "telefono",
    etiqueta: "Teléfono",
    tipo: "tel",
    autocomplete: "tel",
    max: 20,
    ayuda: "Solo números, de 7 a 20 caracteres.",
  },
  { nombre: "direccion", etiqueta: "Dirección de entrega", tipo: "text", autocomplete: "street-address", max: 200 },
  { nombre: "ciudad", etiqueta: "Ciudad", tipo: "text", autocomplete: "address-level2", max: 100 },
];

// La API vuelve a validar todo; esto solo evita un viaje al servidor por un descuido.
const REGLAS = {
  correo: (valor) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor) || "Escribe un correo válido.",
  telefono: (valor) =>
    /^[0-9+() -]{7,20}$/.test(valor) || "Escribe un teléfono válido (solo números, de 7 a 20 caracteres).",
};

let acciones = null; // { alVolver, alCerrar, alComprar } de la compra en curso

export function pagoAbierto() {
  return !panel.hidden;
}

function cerrar() {
  panel.hidden = true;
  cuerpo.replaceChildren();
  const alCerrar = acciones && acciones.alCerrar;
  acciones = null;
  if (alCerrar) {
    alCerrar();
  }
}

function volverAlCarrito() {
  panel.hidden = true;
  cuerpo.replaceChildren();
  const alVolver = acciones && acciones.alVolver;
  acciones = null;
  if (alVolver) {
    alVolver();
  }
}

function filaDesglose(etiqueta, valor, total = false) {
  return crear(
    "div",
    { clase: total ? "desglose__fila desglose__fila--total" : "desglose__fila" },
    crear("dt", { texto: etiqueta }),
    crear("dd", { texto: valor }),
  );
}

function crearCampo(definicion) {
  const id = `pago-${definicion.nombre}`;
  return crear(
    "div",
    { clase: "campo" },
    crear("label", { clase: "campo__etiqueta", for: id, texto: definicion.etiqueta }),
    crear("input", {
      clase: "campo__control",
      id,
      name: definicion.nombre,
      type: definicion.tipo,
      autocomplete: definicion.autocomplete,
      maxlength: String(definicion.max),
      required: true,
      "aria-describedby": `${id}-error`,
    }),
    definicion.ayuda ? crear("p", { clase: "campo__ayuda", texto: definicion.ayuda }) : null,
    crear("p", { clase: "campo__error", id: `${id}-error` }),
  );
}

function marcarError(formulario, nombre, mensaje) {
  const control = formulario.elements[nombre];
  const caja = formulario.querySelector(`#pago-${nombre}-error`);
  if (!control || !caja) {
    return false;
  }
  control.setAttribute("aria-invalid", "true");
  caja.textContent = mensaje;
  return true;
}

function limpiarErrores(formulario) {
  formulario.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  formulario.querySelectorAll(".campo__error").forEach((el) => {
    el.textContent = "";
  });
}

// Devuelve los datos si son válidos; si no, marca los campos y devuelve null.
function leerFormulario(formulario) {
  limpiarErrores(formulario);
  const datos = {};
  let primerError = null;

  for (const campo of CAMPOS) {
    const valor = formulario.elements[campo.nombre].value.trim();
    datos[campo.nombre] = valor;
    let problema = valor === "" ? "Este campo es obligatorio." : null;
    if (!problema && REGLAS[campo.nombre]) {
      const resultado = REGLAS[campo.nombre](valor);
      problema = resultado === true ? null : resultado;
    }
    if (problema) {
      marcarError(formulario, campo.nombre, problema);
      primerError = primerError || formulario.elements[campo.nombre];
    }
  }
  if (primerError) {
    primerError.focus();
    return null;
  }
  return datos;
}

function pintarFormulario(carrito) {
  const mensaje = crear("p", { clase: "mensaje mensaje--error", role: "alert", id: "pago-mensaje" });
  const enviar = crear("button", {
    type: "submit",
    clase: "boton boton--primario boton--completo",
    texto: "Comprar",
  });

  const formulario = crear(
    "form",
    { clase: "pago__formulario", novalidate: true, "aria-label": "Datos de contacto y entrega" },
    crear("h3", { clase: "pago__subtitulo", texto: "Contacto y entrega" }),
    ...CAMPOS.map(crearCampo),
    mensaje,
    enviar,
    crear("button", {
      type: "button",
      clase: "boton boton--completo",
      texto: "Volver al carrito",
      onClick: volverAlCarrito,
    }),
  );

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mensaje.textContent = "";
    const datos = leerFormulario(formulario);
    if (!datos) {
      return;
    }
    enviar.disabled = true;
    enviar.textContent = "Procesando…";
    try {
      const resumen = await acciones.alComprar(datos);
      pintarExito(resumen);
      avisar("¡Compra exitosa!", "ok");
    } catch (error) {
      enviar.disabled = false;
      enviar.textContent = "Comprar";
      if (error instanceof ErrorApi && error.estado === 400 && error.datos && !error.datos.detail) {
        let primero = null;
        for (const [nombre, textos] of Object.entries(error.datos)) {
          const texto = [].concat(textos).join(" ");
          if (marcarError(formulario, nombre, texto)) {
            primero = primero || formulario.elements[nombre];
          } else {
            mensaje.textContent = texto;
          }
        }
        if (primero) {
          primero.focus();
        }
      } else {
        mensaje.textContent = error.message;
      }
    }
  });

  const lineas = crear(
    "ul",
    { clase: "pago__lineas" },
    carrito.items.map((item) =>
      crear(
        "li",
        { clase: "pago__linea" },
        crear("span", { texto: `${item.cantidad} × ${item.producto_nombre}` }),
        crear("span", { texto: formatearPrecio(item.subtotal) }),
      ),
    ),
  );

  cuerpo.replaceChildren(
    crear("h3", { clase: "pago__subtitulo", texto: "Resumen" }),
    lineas,
    crear(
      "dl",
      { clase: "desglose" },
      filaDesglose("Subtotal", formatearPrecio(carrito.total)),
      filaDesglose("Envío", formatearPrecio(carrito.envio)),
      filaDesglose("Total a pagar", formatearPrecio(carrito.total_a_pagar), true),
    ),
    formulario,
  );
  // Con la sesión abierta, el pago ya trae el nombre y el correo de la cuenta.
  const usuario = usuarioActual();
  if (usuario) {
    formulario.elements.nombre.value = usuario.nombre || "";
    formulario.elements.correo.value = usuario.correo || "";
  }
  (usuario ? formulario.elements.telefono : formulario.elements.nombre).focus();
}

function pintarExito(resumen) {
  cuerpo.replaceChildren(
    crear(
      "div",
      { clase: "pago__exito", role: "status" },
      crear("h3", { clase: "pago__exito-titulo", texto: "¡Compra exitosa!" }),
      crear("p", {
        texto: `Gracias, ${resumen.nombre}. Dirección de entrega: ${resumen.direccion}, ${resumen.ciudad}.`,
      }),
      crear(
        "ul",
        { clase: "pago__lineas" },
        resumen.items.map((item) =>
          crear(
            "li",
            { clase: "pago__linea" },
            crear("span", { texto: `${item.cantidad} × ${item.producto_nombre}` }),
            crear("span", { texto: formatearPrecio(item.subtotal) }),
          ),
        ),
      ),
      crear(
        "dl",
        { clase: "desglose" },
        filaDesglose("Subtotal", formatearPrecio(resumen.total)),
        filaDesglose("Envío", formatearPrecio(resumen.envio)),
        filaDesglose("Total pagado", formatearPrecio(resumen.total_a_pagar), true),
      ),
      crear("p", {
        clase: "pago__nota",
        texto: "Compra simulada: no se realizó ningún cobro.",
      }),
      crear("button", {
        type: "button",
        clase: "boton boton--primario boton--completo",
        id: "seguir-comprando",
        texto: "Seguir comprando",
        onClick: cerrar,
      }),
    ),
  );
  cuerpo.querySelector("#seguir-comprando").focus();
}

// carrito: último estado del carrito. alComprar(datos) llama a la API y devuelve el resumen.
export function abrirPago({ carrito, alVolver, alCerrar, alComprar }) {
  acciones = { alVolver, alCerrar, alComprar };
  panel.hidden = false;
  pintarFormulario(carrito);
}

botonCerrar.addEventListener("click", cerrar);
panel.addEventListener("click", (evento) => {
  if (evento.target === panel) {
    cerrar();
  }
});
document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && pagoAbierto()) {
    cerrar();
  }
});

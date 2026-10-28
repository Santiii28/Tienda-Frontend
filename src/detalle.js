import { agregarAlCarrito, comprarAhora } from "./carrito.js";
import { crear, crearPrecio, porcentajeDescuento, urlSegura } from "./utils.js";

const panel = document.querySelector("#panel-detalle");
const cuerpo = document.querySelector("#detalle-cuerpo");
const cortina = document.querySelector("#cortina");
const botonCerrar = document.querySelector("#cerrar-detalle");

let quienAbrio = null; // elemento que tenía el foco, para devolvérselo al cerrar

function recuadro(nombre) {
  const inicial = nombre.match(/[\p{L}\p{N}]/u);
  return crear("div", {
    clase: "detalle__imagen detalle__imagen--vacia",
    "aria-hidden": "true",
    texto: inicial ? inicial[0].toUpperCase() : "•",
  });
}

function cerrar() {
  panel.hidden = true;
  cortina.hidden = true;
  cuerpo.replaceChildren();
  document.body.classList.remove("sin-scroll");
  if (quienAbrio && document.contains(quienAbrio)) {
    quienAbrio.focus();
  }
  quienAbrio = null;
}

// Ficha del producto: imagen grande, descripción, existencias y botones de compra.
export function abrirDetalle(producto) {
  const agotado = producto.existencias === 0;
  const imagen = urlSegura(producto.imagen);
  quienAbrio = document.activeElement;

  cuerpo.replaceChildren(
    imagen
      ? crear("img", {
          clase: "detalle__imagen",
          src: imagen,
          alt: producto.nombre,
          onError: (evento) => evento.target.replaceWith(recuadro(producto.nombre)),
        })
      : recuadro(producto.nombre),
    crear("p", { clase: "producto__categoria", texto: producto.categoria_nombre }),
    crear(
      "div",
      { clase: "detalle__fila" },
      crear("h3", { clase: "detalle__nombre", texto: producto.nombre }),
      crearPrecio(producto, "detalle"),
    ),
    crear("p", {
      clase: "producto__descripcion",
      texto: producto.descripcion || "Este producto no tiene descripción.",
    }),
    crear("p", {
      clase: agotado ? "detalle__stock detalle__stock--agotado" : "detalle__stock",
      texto: agotado ? "Agotado" : `${producto.existencias} disponibles`,
    }),
    !agotado && porcentajeDescuento(producto)
      ? crear("p", {
          clase: "detalle__oferta",
          texto: `En oferta: ${porcentajeDescuento(producto)}% menos que el precio anterior.`,
        })
      : null,
    agotado
      ? null
      : crear(
          "div",
          { clase: "producto__acciones" },
          crear("button", {
            type: "button",
            clase: "boton boton--primario boton--completo",
            texto: "Comprar ahora",
            onClick: () => {
              cerrar();
              comprarAhora(producto);
            },
          }),
          crear("button", {
            type: "button",
            clase: "boton boton--completo",
            texto: "Agregar al carrito",
            onClick: () => {
              cerrar();
              agregarAlCarrito(producto);
            },
          }),
        ),
  );

  panel.hidden = false;
  cortina.hidden = false;
  document.body.classList.add("sin-scroll");
  botonCerrar.focus();
}

export function iniciarDetalle() {
  botonCerrar.addEventListener("click", cerrar);
  panel.addEventListener("click", (evento) => {
    if (evento.target === panel) {
      cerrar();
    }
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !panel.hidden) {
      cerrar();
    }
  });
}

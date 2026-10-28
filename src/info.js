import { crear } from "./utils.js";

// Páginas de ayuda del pie de página. Solo dicen lo que la tienda hace de verdad:
// no se prometen plazos, devoluciones ni medios de pago que no existen.
const TEMAS = {
  "como-comprar": {
    titulo: "Cómo comprar",
    pasos: [
      "Busca un producto con el buscador o elige una categoría. Puedes ordenar los resultados y filtrarlos por precio.",
      "Abre la ficha del producto para ver su descripción y cuántas unidades hay, o agrégalo directo al carrito.",
      "Abre el carrito, revisa las cantidades y pulsa «Ir a pagar».",
      "Escribe tu nombre, correo, teléfono y la dirección de entrega.",
      "Confirma la compra. Verás un resumen con lo que pediste.",
    ],
  },
  envios: {
    titulo: "Envíos",
    parrafos: [
      "El envío tiene una tarifa fija que se suma al total de cada compra.",
      "Ves el valor del envío en el carrito y en el resumen, antes de confirmar.",
      "La dirección de entrega se pide al final de la compra.",
    ],
  },
  pagos: {
    titulo: "Pagos",
    parrafos: [
      "El pago de esta tienda es una simulación: no se hace ningún cobro y no se piden datos de tarjeta.",
      "Al confirmar, ves un resumen de la compra y el carrito queda vacío.",
    ],
  },
  preguntas: {
    titulo: "Preguntas frecuentes",
    preguntas: [
      ["¿Necesito una cuenta para comprar?", "No. Puedes comprar sin crear una cuenta."],
      ["¿Se me cobra algo?", "No. El pago es una simulación y no se hace ningún cobro."],
      [
        "¿Qué significa «Agotado»?",
        "Que no quedan unidades de ese producto. No se puede agregar al carrito hasta que haya existencias.",
      ],
      [
        "¿Puedo pedir más unidades de las que hay?",
        "No. El carrito no deja pasar de las existencias disponibles.",
      ],
      [
        "¿Cómo encuentro un producto?",
        "Con el buscador de la parte de arriba, las categorías, el orden y el filtro de precio.",
      ],
    ],
  },
};

const panel = document.querySelector("#panel-info");
const cuerpo = document.querySelector("#info-cuerpo");
const titulo = document.querySelector("#titulo-info");
const cortina = document.querySelector("#cortina");
const botonCerrar = document.querySelector("#cerrar-info");

let quienAbrio = null;

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

function abrir(clave) {
  const tema = TEMAS[clave];
  if (!tema) {
    return;
  }
  quienAbrio = document.activeElement;
  titulo.textContent = tema.titulo;

  if (tema.pasos) {
    cuerpo.replaceChildren(
      crear("ol", { clase: "info__pasos" }, ...tema.pasos.map((paso) => crear("li", { texto: paso }))),
    );
  } else if (tema.preguntas) {
    cuerpo.replaceChildren(
      ...tema.preguntas.map(([pregunta, respuesta]) =>
        crear(
          "div",
          { clase: "info__pregunta" },
          crear("h3", { clase: "info__titulo-pregunta", texto: pregunta }),
          crear("p", { clase: "info__texto", texto: respuesta }),
        ),
      ),
    );
  } else {
    cuerpo.replaceChildren(
      ...tema.parrafos.map((texto) => crear("p", { clase: "info__texto", texto })),
    );
  }

  panel.hidden = false;
  cortina.hidden = false;
  document.body.classList.add("sin-scroll");
  botonCerrar.focus();
}

export function iniciarInfo() {
  document.querySelectorAll("[data-info]").forEach((enlace) => {
    enlace.addEventListener("click", () => abrir(enlace.dataset.info));
  });
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

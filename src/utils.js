export function formatearPrecio(valor) {
  return Number(valor).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
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

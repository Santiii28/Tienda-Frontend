import "./styles/main.scss";
import { obtenerCategorias, obtenerProductos } from "./api.js";
import { agregarAlCarrito, comprarAhora, iniciarCarrito } from "./carrito.js";
import { iniciarCuenta } from "./cuenta.js";
import { abrirDetalle, iniciarDetalle } from "./detalle.js";
import { iniciarInfo } from "./info.js";
import { crear, crearPrecio, formatearPrecio, porcentajeDescuento, urlSegura } from "./utils.js";

const contenedorFiltros = document.querySelector("#filtro-categorias");
const listaProductos = document.querySelector("#lista-productos");
const estado = document.querySelector("#estado");
const conteo = document.querySelector("#catalogo-conteo");

const campoOrden = document.querySelector("#orden");
const campoPrecioMin = document.querySelector("#precio-min");
const campoPrecioMax = document.querySelector("#precio-max");
const campoSoloStock = document.querySelector("#solo-stock");
const botonLimpiar = document.querySelector("#limpiar-filtros");

const buscador = document.querySelector("#buscador");
const campoBusqueda = document.querySelector("#buscar");

let categoriaActiva = "";
let productosCargados = []; // los de la categoría activa; la búsqueda filtra sobre ellos

// Para buscar sin importar mayúsculas ni tildes ("silla" encuentra "Silla ergonómica").
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

// Recuadro para los productos sin foto: la primera letra o número del nombre.
function crearRecuadroSinImagen(nombre) {
  const inicial = nombre.match(/[\p{L}\p{N}]/u);
  return crear("div", {
    clase: "producto__imagen producto__imagen--vacia",
    "aria-hidden": "true",
    texto: inicial ? inicial[0].toUpperCase() : "•",
  });
}

function crearTarjeta(producto) {
  const agotado = producto.existencias === 0;
  const imagen = urlSegura(producto.imagen);

  return crear(
    "li",
    { clase: "producto" },
    crear(
      "div",
      {
        clase: "producto__marco",
        onClick: () => abrirDetalle(producto),
      },
      imagen
        ? crear("img", {
            clase: "producto__imagen",
            src: imagen,
            alt: producto.nombre,
            loading: "lazy",
            // Si la imagen no carga, se muestra el recuadro con la inicial.
            onError: (evento) =>
              evento.target.replaceWith(crearRecuadroSinImagen(producto.nombre)),
          })
        : crearRecuadroSinImagen(producto.nombre),
      agotado ? crear("span", { clase: "producto__insignia", texto: "Agotado" }) : null,
      !agotado && porcentajeDescuento(producto)
        ? crear("span", {
            clase: "producto__insignia producto__insignia--oferta",
            texto: `-${porcentajeDescuento(producto)}%`,
          })
        : null,
    ),
    crear(
      "div",
      { clase: "producto__contenido" },
      crear(
        "div",
        { clase: "producto__fila" },
        crear(
          "div",
          {},
          crear("p", { clase: "producto__categoria", texto: producto.categoria_nombre }),
          crear(
            "h3",
            { clase: "producto__nombre" },
            crear("button", {
              type: "button",
              clase: "producto__enlace",
              texto: producto.nombre,
              "aria-label": `Abrir la ficha de ${producto.nombre}`,
              onClick: () => abrirDetalle(producto),
            }),
          ),
        ),
        crearPrecio(producto, "producto"),
      ),
      // Tarjeta desplegable: la descripción y las existencias se ven al abrirla.
      crear(
        "details",
        { clase: "producto__detalle" },
        crear("summary", {
          clase: "producto__detalle-titulo",
          texto: "Ver detalle",
          "aria-label": `Ver detalle de ${producto.nombre}`,
        }),
        crear("p", {
          clase: "producto__descripcion",
          texto: producto.descripcion || "Este producto no tiene descripción.",
        }),
        crear("p", {
          clase: agotado
            ? "producto__existencias producto__existencias--agotado"
            : "producto__existencias",
          texto: agotado ? "Agotado" : `${producto.existencias} disponibles`,
        }),
      ),
      agotado
        ? null
        : crear(
            "div",
            { clase: "producto__acciones" },
            crear("button", {
              type: "button",
              clase: "boton boton--primario boton--completo",
              texto: "Comprar ahora",
              "aria-label": `Comprar ahora ${producto.nombre}`,
              onClick: () => comprarAhora(producto),
            }),
            crear("button", {
              type: "button",
              clase: "boton boton--completo",
              texto: "Agregar al carrito",
              "aria-label": `Agregar ${producto.nombre} al carrito`,
              onClick: () => agregarAlCarrito(producto),
            }),
          ),
    ),
  );
}

// Lee un precio escrito por el usuario; vacío o inválido = sin límite (null).
function leerPrecio(campo) {
  const valor = campo.value.trim();
  if (valor === "") {
    return null;
  }
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function hayFiltrosActivos() {
  return (
    leerPrecio(campoPrecioMin) !== null ||
    leerPrecio(campoPrecioMax) !== null ||
    campoSoloStock.checked ||
    campoOrden.value !== "nombre"
  );
}

// Aplica búsqueda, rango de precio, existencias y orden sobre los productos cargados.
function filtrarYOrdenar() {
  const consulta = normalizar(campoBusqueda.value.trim());
  const minimo = leerPrecio(campoPrecioMin);
  const maximo = leerPrecio(campoPrecioMax);

  const resultado = productosCargados.filter((producto) => {
    const precio = Number(producto.precio);
    if (consulta) {
      const texto = normalizar(`${producto.nombre} ${producto.descripcion} ${producto.categoria_nombre}`);
      if (!texto.includes(consulta)) {
        return false;
      }
    }
    if (minimo !== null && precio < minimo) {
      return false;
    }
    if (maximo !== null && precio > maximo) {
      return false;
    }
    return !campoSoloStock.checked || producto.existencias > 0;
  });

  const comparar = {
    nombre: (a, b) => a.nombre.localeCompare(b.nombre, "es"),
    "precio-asc": (a, b) => Number(a.precio) - Number(b.precio) || a.nombre.localeCompare(b.nombre, "es"),
    "precio-desc": (a, b) => Number(b.precio) - Number(a.precio) || a.nombre.localeCompare(b.nombre, "es"),
  }[campoOrden.value];
  return resultado.sort(comparar);
}

function pintarProductos() {
  const consulta = normalizar(campoBusqueda.value.trim());
  const minimo = leerPrecio(campoPrecioMin);
  const maximo = leerPrecio(campoPrecioMax);
  const productos = filtrarYOrdenar();
  botonLimpiar.hidden = !hayFiltrosActivos();
  listaProductos.replaceChildren();
  conteo.textContent = `${productos.length} ${productos.length === 1 ? "producto" : "productos"}`;

  if (productos.length === 0) {
    if (minimo !== null && maximo !== null && minimo > maximo) {
      estado.textContent = "El precio mínimo es mayor que el máximo. Corrige el rango.";
    } else if (consulta || hayFiltrosActivos()) {
      estado.textContent = "No encontramos productos con esa búsqueda y esos filtros.";
    } else {
      estado.textContent = "No hay productos en esta categoría.";
    }
    return;
  }

  estado.textContent = "";
  productos.forEach((producto) => {
    listaProductos.append(crearTarjeta(producto));
  });
}

function crearBoton(id, nombre) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "filtro";
  boton.dataset.id = id;
  const inicial = nombre.match(/[\p{L}\p{N}]/u);
  boton.append(
    crear("span", {
      clase: "filtro__icono",
      "aria-hidden": "true",
      texto: inicial ? inicial[0].toUpperCase() : "•",
    }),
    crear("span", { clase: "filtro__nombre", texto: nombre }),
  );
  boton.setAttribute("aria-pressed", String(id === categoriaActiva));

  if (id === categoriaActiva) {
    boton.classList.add("filtro--activo");
  }

  boton.addEventListener("click", () => seleccionarCategoria(id));
  return boton;
}

function marcarBotonActivo() {
  contenedorFiltros.querySelectorAll(".filtro").forEach((boton) => {
    const activo = boton.dataset.id === categoriaActiva;
    boton.classList.toggle("filtro--activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });
}

function seleccionarCategoria(id) {
  categoriaActiva = id;
  marcarBotonActivo();
  cargarProductos(id).catch(mostrarError);
}

async function cargarCategorias() {
  const categorias = await obtenerCategorias();

  contenedorFiltros.append(crearBoton("", "Todas"));
  categorias.forEach((categoria) => {
    contenedorFiltros.append(crearBoton(String(categoria.id), categoria.nombre));
  });
}

async function cargarProductos(categoriaId) {
  estado.textContent = "Cargando productos...";
  productosCargados = await obtenerProductos(categoriaId);
  pintarProductos();
}

function mostrarError(error) {
  listaProductos.replaceChildren();
  estado.textContent = `No se pudo conectar con la API: ${error.message}`;
}

function iniciarFiltros() {
  [campoOrden, campoPrecioMin, campoPrecioMax].forEach((campo) =>
    campo.addEventListener("input", pintarProductos),
  );
  campoSoloStock.addEventListener("change", pintarProductos);
  botonLimpiar.addEventListener("click", () => {
    campoOrden.value = "nombre";
    campoPrecioMin.value = "";
    campoPrecioMax.value = "";
    campoSoloStock.checked = false;
    pintarProductos();
  });
}

function iniciarBuscador() {
  // Filtra al escribir; Enter lleva al catálogo en vez de recargar la página.
  campoBusqueda.addEventListener("input", pintarProductos);
  buscador.addEventListener("submit", (evento) => {
    evento.preventDefault();
    pintarProductos();
    document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
  });
}

async function iniciar() {
  iniciarCarrito();
  iniciarCuenta();
  iniciarDetalle();
  iniciarBuscador();
  iniciarFiltros();
  iniciarInfo();
  try {
    await cargarCategorias();
    await cargarProductos("");
  } catch (error) {
    mostrarError(error);
  }
}

iniciar();

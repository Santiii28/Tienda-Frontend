import "./styles/main.scss";
import { obtenerCategorias, obtenerProductos } from "./api.js";
import { agregarAlCarrito, iniciarCarrito } from "./carrito.js";
import { crear, formatearPrecio } from "./utils.js";

const contenedorFiltros = document.querySelector("#filtro-categorias");
const listaProductos = document.querySelector("#lista-productos");
const estado = document.querySelector("#estado");

let categoriaActiva = "";

function crearTarjeta(producto) {
  const agotado = producto.existencias === 0;

  return crear(
    "li",
    { clase: "producto" },
    producto.imagen
      ? crear("img", {
          clase: "producto__imagen",
          src: producto.imagen,
          alt: producto.nombre,
          loading: "lazy",
          onError: (evento) => evento.target.remove(),
        })
      : null,
    crear(
      "div",
      { clase: "producto__contenido" },
      crear("p", { clase: "producto__categoria", texto: producto.categoria_nombre }),
      crear("h3", { clase: "producto__nombre", texto: producto.nombre }),
      producto.descripcion
        ? crear("p", { clase: "producto__descripcion", texto: producto.descripcion })
        : null,
      crear("p", { clase: "producto__precio", texto: formatearPrecio(producto.precio) }),
      crear("p", {
        clase: agotado
          ? "producto__existencias producto__existencias--agotado"
          : "producto__existencias",
        texto: agotado ? "Agotado" : `${producto.existencias} disponibles`,
      }),
      agotado
        ? null
        : crear("button", {
            type: "button",
            clase: "boton boton--primario boton--completo",
            texto: "Agregar al carrito",
            "aria-label": `Agregar ${producto.nombre} al carrito`,
            onClick: () => agregarAlCarrito(producto),
          }),
    ),
  );
}

function pintarProductos(productos) {
  listaProductos.replaceChildren();

  if (productos.length === 0) {
    estado.textContent = "No hay productos en esta categoría.";
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
  boton.textContent = nombre;
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
  const productos = await obtenerProductos(categoriaId);
  pintarProductos(productos);
}

function mostrarError(error) {
  listaProductos.replaceChildren();
  estado.textContent = `No se pudo conectar con la API: ${error.message}`;
}

async function iniciar() {
  iniciarCarrito();
  try {
    await cargarCategorias();
    await cargarProductos("");
  } catch (error) {
    mostrarError(error);
  }
}

iniciar();

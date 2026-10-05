import "./styles/main.scss";
import { obtenerCategorias, obtenerProductos } from "./api.js";

const contenedorFiltros = document.querySelector("#filtro-categorias");
const listaProductos = document.querySelector("#lista-productos");
const estado = document.querySelector("#estado");

let categoriaActiva = "";

function formatearPrecio(valor) {
  return Number(valor).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function crearTarjeta(producto) {
  const item = document.createElement("li");
  item.className = "producto";

  const categoria = document.createElement("p");
  categoria.className = "producto__categoria";
  categoria.textContent = producto.categoria_nombre;

  const nombre = document.createElement("h3");
  nombre.className = "producto__nombre";
  nombre.textContent = producto.nombre;

  const precio = document.createElement("p");
  precio.className = "producto__precio";
  precio.textContent = formatearPrecio(producto.precio);

  const existencias = document.createElement("p");
  existencias.className = "producto__existencias";
  existencias.textContent =
    producto.existencias > 0
      ? `${producto.existencias} disponibles`
      : "Agotado";

  if (producto.existencias === 0) {
    existencias.classList.add("producto__existencias--agotado");
  }

  item.append(categoria, nombre, precio, existencias);
  return item;
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
  try {
    await cargarCategorias();
    await cargarProductos("");
  } catch (error) {
    mostrarError(error);
  }
}

iniciar();
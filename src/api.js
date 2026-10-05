const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

async function pedir(ruta) {
  const respuesta = await fetch(`${API_URL}${ruta}`);

  if (!respuesta.ok) {
    throw new Error(`La API respondió ${respuesta.status}`);
  }

  return respuesta.json();
}

export function obtenerCategorias() {
  return pedir("/categorias/");
}

export function obtenerProductos(categoriaId) {
  const filtro = categoriaId ? `?categoria=${categoriaId}` : "";
  return pedir(`/productos/${filtro}`);
}
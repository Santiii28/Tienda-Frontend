import "./styles/admin.scss";
import {
  ErrorApi,
  categorias,
  cerrarSesion,
  iniciarSesion,
  productos,
  quienSoy,
} from "./api.js";
import { crear, formatearPrecio } from "./utils.js";

const raiz = document.querySelector("#app");

// ---------- Mensajes de error ----------
// La API responde errores de validación como { campo: ["mensaje"] }.
function erroresPorCampo(error) {
  if (error instanceof ErrorApi && error.estado === 400 && error.datos) {
    return error.datos;
  }
  return {};
}

// Si la sesión terminó (401/403 que no es un error de validación), se vuelve al login.
function sesionTerminada(error) {
  if (error instanceof ErrorApi && (error.estado === 401 || error.estado === 403)) {
    pantallaLogin("Tu sesión terminó. Vuelve a entrar.");
    return true;
  }
  return false;
}

function mensajeGeneral(error) {
  if (error instanceof ErrorApi && error.estado === 400) {
    return error.datos && error.datos.detail ? error.datos.detail : "";
  }
  return error.message;
}

// ---------- Sección CRUD genérica ----------
// Una misma función arma la pantalla de productos y la de categorías.
// `config` describe los campos, las columnas y las llamadas a la API.
function crearSeccion(config) {
  const seccion = crear("section", { clase: "seccion", "aria-label": config.plural });
  const mensaje = crear("p", { clase: "mensaje", role: "status" });
  const zonaFormulario = crear("div", { clase: "zona-formulario" });
  const zonaTabla = crear("div", { clase: "zona-tabla" });
  seccion.append(
    crear(
      "div",
      { clase: "seccion__barra" },
      crear("h2", { clase: "seccion__titulo", texto: config.plural }),
      crear("button", {
        type: "button",
        clase: "boton boton--primario",
        texto: `Nuevo ${config.singular}`,
        onClick: () => abrirFormulario(null),
      }),
    ),
    mensaje,
    zonaFormulario,
    zonaTabla,
  );

  let filas = [];
  let confirmandoId = null;

  function mostrarMensaje(texto, tipo = "ok") {
    mensaje.textContent = texto;
    mensaje.className = texto ? `mensaje mensaje--${tipo}` : "mensaje";
    mensaje.setAttribute("role", tipo === "error" ? "alert" : "status");
  }

  async function cargar() {
    try {
      filas = await config.api.listar();
      if (config.antesDePintar) {
        await config.antesDePintar();
      }
      pintarTabla();
    } catch (error) {
      mostrarMensaje(error.message, "error");
    }
  }

  // ----- Tabla -----
  function pintarTabla() {
    zonaTabla.replaceChildren();

    if (filas.length === 0) {
      zonaTabla.append(
        crear("p", {
          clase: "vacio",
          texto: `Todavía no hay ${config.plural.toLowerCase()}. Usa «Nuevo ${config.singular}» para crear el primero.`,
        }),
      );
      return;
    }

    const encabezado = crear(
      "tr",
      {},
      config.columnas.map((columna) =>
        crear("th", { scope: "col", texto: columna.titulo }),
      ),
      crear("th", { scope: "col", clase: "col-acciones", texto: "Acciones" }),
    );

    const cuerpo = filas.map((fila) =>
      crear(
        "tr",
        {},
        config.columnas.map((columna) =>
          crear("td", { "data-etiqueta": columna.titulo, texto: columna.valor(fila) }),
        ),
        crear("td", { clase: "col-acciones" }, crearAcciones(fila)),
      ),
    );

    zonaTabla.append(
      crear(
        "div",
        { clase: "tabla-contenedor" },
        crear(
          "table",
          { clase: "tabla" },
          crear("caption", { clase: "solo-lector", texto: config.plural }),
          crear("thead", {}, encabezado),
          crear("tbody", {}, cuerpo),
        ),
      ),
    );
  }

  function crearAcciones(fila) {
    const nombre = config.nombreDe(fila);

    if (confirmandoId === fila.id) {
      return crear(
        "div",
        { clase: "acciones" },
        crear("span", { clase: "acciones__pregunta", texto: "¿Eliminar?" }),
        crear("button", {
          type: "button",
          clase: "boton boton--peligro boton--chico",
          texto: "Sí, eliminar",
          onClick: () => eliminar(fila),
        }),
        crear("button", {
          type: "button",
          clase: "boton boton--chico",
          texto: "Cancelar",
          onClick: () => {
            confirmandoId = null;
            pintarTabla();
          },
        }),
      );
    }

    return crear(
      "div",
      { clase: "acciones" },
      crear("button", {
        type: "button",
        clase: "boton boton--chico",
        texto: "Editar",
        "aria-label": `Editar ${nombre}`,
        onClick: () => abrirFormulario(fila),
      }),
      crear("button", {
        type: "button",
        clase: "boton boton--peligro-suave boton--chico",
        texto: "Eliminar",
        "aria-label": `Eliminar ${nombre}`,
        onClick: () => {
          confirmandoId = fila.id;
          mostrarMensaje("");
          pintarTabla();
        },
      }),
    );
  }

  async function eliminar(fila) {
    try {
      await config.api.eliminar(fila.id);
      confirmandoId = null;
      mostrarMensaje(`${config.singularCapitalizado} «${config.nombreDe(fila)}» eliminado.`);
      await cargar();
    } catch (error) {
      if (sesionTerminada(error)) {
        return;
      }
      confirmandoId = null;
      mostrarMensaje(error.message, "error");
      pintarTabla();
    }
  }

  // ----- Formulario -----
  async function abrirFormulario(fila) {
    mostrarMensaje("");
    if (config.antesDeFormulario) {
      try {
        await config.antesDeFormulario();
      } catch (error) {
        mostrarMensaje(error.message, "error");
        return;
      }
    }
    zonaFormulario.replaceChildren(crearFormulario(fila));
    const primero = zonaFormulario.querySelector("input, select, textarea");
    if (primero) {
      primero.focus();
    }
  }

  function cerrarFormulario() {
    zonaFormulario.replaceChildren();
  }

  function crearCampo(definicion, fila) {
    const id = `campo-${config.clave}-${definicion.nombre}`;
    const valorInicial = fila ? fila[definicion.nombre] : "";
    const ayuda = definicion.ayuda
      ? crear("p", { clase: "campo__ayuda", id: `${id}-ayuda`, texto: definicion.ayuda })
      : null;
    const error = crear("p", {
      clase: "campo__error",
      id: `${id}-error`,
      dataset: { errorDe: definicion.nombre },
    });
    const comunes = {
      id,
      name: definicion.nombre,
      clase: "campo__control",
      required: definicion.obligatorio,
      "aria-describedby": [ayuda ? `${id}-ayuda` : "", `${id}-error`]
        .filter(Boolean)
        .join(" "),
    };

    let control;
    if (definicion.tipo === "textarea") {
      control = crear("textarea", { ...comunes, rows: 3 });
      control.value = valorInicial ?? "";
    } else if (definicion.tipo === "select") {
      control = crear("select", comunes);
      control.append(crear("option", { value: "", texto: "Selecciona una opción" }));
      definicion.opciones().forEach((opcion) => {
        control.append(crear("option", { value: String(opcion.valor), texto: opcion.texto }));
      });
      control.value = valorInicial ? String(valorInicial) : "";
    } else {
      control = crear("input", {
        ...comunes,
        type: definicion.tipo,
        min: definicion.min,
        step: definicion.step,
        maxlength: definicion.maximo,
        placeholder: definicion.ejemplo,
      });
      control.value = valorInicial ?? "";
    }

    return crear(
      "div",
      { clase: "campo" },
      crear("label", {
        clase: "campo__etiqueta",
        for: id,
        texto: definicion.obligatorio ? `${definicion.etiqueta} *` : definicion.etiqueta,
      }),
      control,
      ayuda,
      error,
    );
  }

  function crearFormulario(fila) {
    const editando = fila !== null;
    const errorGeneral = crear("p", { clase: "mensaje mensaje--error", role: "alert" });
    const boton = crear("button", {
      type: "submit",
      clase: "boton boton--primario",
      texto: editando ? "Guardar cambios" : `Crear ${config.singular}`,
    });

    const formulario = crear(
      "form",
      { clase: "formulario", novalidate: true },
      crear("h3", {
        clase: "formulario__titulo",
        texto: editando
          ? `Editar ${config.singular}`
          : `Nuevo ${config.singular}`,
      }),
      crear(
        "p",
        { clase: "formulario__nota", texto: "Los campos con * son obligatorios." },
      ),
      crear(
        "div",
        { clase: "formulario__campos" },
        config.campos.map((definicion) => crearCampo(definicion, fila)),
      ),
      errorGeneral,
      crear(
        "div",
        { clase: "formulario__acciones" },
        boton,
        crear("button", {
          type: "button",
          clase: "boton",
          texto: "Cancelar",
          onClick: cerrarFormulario,
        }),
      ),
    );

    function limpiarErrores() {
      errorGeneral.textContent = "";
      formulario.querySelectorAll(".campo__error").forEach((p) => {
        p.textContent = "";
      });
      formulario.querySelectorAll("[aria-invalid]").forEach((c) => {
        c.removeAttribute("aria-invalid");
      });
    }

    function marcarError(nombre, texto) {
      const aviso = formulario.querySelector(`[data-error-de="${nombre}"]`);
      const control = formulario.elements[nombre];
      if (aviso) {
        aviso.textContent = texto;
        if (control) {
          control.setAttribute("aria-invalid", "true");
        }
        return true;
      }
      return false;
    }

    // Al corregir un campo, su aviso de error desaparece.
    formulario.addEventListener("input", (evento) => {
      const control = evento.target;
      const aviso = formulario.querySelector(`[data-error-de="${control.name}"]`);
      if (aviso) {
        aviso.textContent = "";
      }
      control.removeAttribute("aria-invalid");
    });

    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      limpiarErrores();

      // Validación mínima en el navegador; la API valida de nuevo todo.
      const datos = {};
      let primerError = null;
      for (const definicion of config.campos) {
        const control = formulario.elements[definicion.nombre];
        const texto = control.value.trim();
        if (definicion.obligatorio && texto === "") {
          marcarError(definicion.nombre, "Este campo es obligatorio.");
          primerError = primerError || control;
          continue;
        }
        datos[definicion.nombre] = definicion.convertir ? definicion.convertir(texto) : texto;
      }
      if (primerError) {
        primerError.focus();
        return;
      }

      boton.disabled = true;
      boton.textContent = "Guardando...";
      try {
        if (editando) {
          await config.api.actualizar(fila.id, datos);
        } else {
          await config.api.crear(datos);
        }
        cerrarFormulario();
        mostrarMensaje(
          editando
            ? `${config.singularCapitalizado} actualizado.`
            : `${config.singularCapitalizado} creado.`,
        );
        await cargar();
      } catch (error) {
        if (sesionTerminada(error)) {
          return;
        }
        const porCampo = erroresPorCampo(error);
        let alguno = false;
        for (const [campo, textos] of Object.entries(porCampo)) {
          const lista = Array.isArray(textos) ? textos.join(" ") : String(textos);
          if (marcarError(campo, lista)) {
            alguno = true;
          } else {
            errorGeneral.textContent = lista;
          }
        }
        if (!alguno && !errorGeneral.textContent) {
          errorGeneral.textContent = mensajeGeneral(error) || "No se pudo guardar.";
        }
        const conError = formulario.querySelector("[aria-invalid]");
        if (conError) {
          conError.focus();
        }
        boton.disabled = false;
        boton.textContent = editando ? "Guardar cambios" : `Crear ${config.singular}`;
      }
    });

    return formulario;
  }

  return { elemento: seccion, cargar };
}

// ---------- Definición de las dos secciones ----------
let listaCategorias = [];

const seccionCategorias = crearSeccion({
  clave: "categoria",
  singular: "categoría",
  singularCapitalizado: "Categoría",
  plural: "Categorías",
  api: categorias,
  nombreDe: (fila) => fila.nombre,
  columnas: [
    { titulo: "Nombre", valor: (fila) => fila.nombre },
    { titulo: "Descripción", valor: (fila) => fila.descripcion || "—" },
  ],
  campos: [
    {
      nombre: "nombre",
      etiqueta: "Nombre",
      tipo: "text",
      obligatorio: true,
      maximo: 100,
      ejemplo: "Ej.: Comedor",
    },
    {
      nombre: "descripcion",
      etiqueta: "Descripción",
      tipo: "textarea",
      ayuda: "Opcional. Una frase que explique qué incluye la categoría.",
    },
  ],
});

const seccionProductos = crearSeccion({
  clave: "producto",
  singular: "producto",
  singularCapitalizado: "Producto",
  plural: "Productos",
  api: productos,
  nombreDe: (fila) => fila.nombre,
  columnas: [
    { titulo: "Nombre", valor: (fila) => fila.nombre },
    { titulo: "Categoría", valor: (fila) => fila.categoria_nombre },
    { titulo: "Precio", valor: (fila) => formatearPrecio(fila.precio) },
    {
      titulo: "Existencias",
      valor: (fila) => (fila.existencias === 0 ? "Agotado" : String(fila.existencias)),
    },
  ],
  // Las opciones del campo «Categoría» salen de las categorías que existen.
  antesDeFormulario: async () => {
    listaCategorias = await categorias.listar();
  },
  campos: [
    {
      nombre: "nombre",
      etiqueta: "Nombre",
      tipo: "text",
      obligatorio: true,
      maximo: 150,
      ejemplo: "Ej.: Mesa de comedor de roble",
    },
    {
      nombre: "categoria",
      etiqueta: "Categoría",
      tipo: "select",
      obligatorio: true,
      ayuda: "Si no ves la categoría que necesitas, créala primero en la pestaña Categorías.",
      opciones: () =>
        listaCategorias.map((categoria) => ({
          valor: categoria.id,
          texto: categoria.nombre,
        })),
      convertir: (texto) => Number(texto),
    },
    {
      nombre: "precio",
      etiqueta: "Precio (COP)",
      tipo: "number",
      obligatorio: true,
      min: "0",
      step: "any",
      ejemplo: "Ej.: 250000",
      ayuda: "Solo números, sin puntos ni símbolos.",
    },
    {
      nombre: "existencias",
      etiqueta: "Unidades disponibles",
      tipo: "number",
      obligatorio: true,
      min: "0",
      step: "1",
      ejemplo: "Ej.: 10",
      convertir: (texto) => Number(texto),
    },
    {
      nombre: "descripcion",
      etiqueta: "Descripción",
      tipo: "textarea",
      ayuda: "Opcional. Aparece en la tarjeta del producto.",
    },
    {
      nombre: "imagen",
      etiqueta: "Enlace de la imagen",
      tipo: "url",
      ejemplo: "https://...",
      ayuda: "Opcional. Pega la dirección web de una foto del producto.",
    },
  ],
});

// ---------- Pantallas ----------
const PESTANAS = [
  { id: "productos", titulo: "Productos", seccion: seccionProductos },
  { id: "categorias", titulo: "Categorías", seccion: seccionCategorias },
];

function pantallaLogin(mensajeInicial = "") {
  document.title = "Administración · Tienda en Línea Modular";
  const error = crear("p", { clase: "mensaje mensaje--error", role: "alert", texto: mensajeInicial });
  const boton = crear("button", {
    type: "submit",
    clase: "boton boton--primario boton--completo",
    texto: "Entrar",
  });

  const formulario = crear(
    "form",
    { clase: "login__formulario", novalidate: true },
    crear(
      "div",
      { clase: "campo" },
      crear("label", { clase: "campo__etiqueta", for: "usuario", texto: "Usuario" }),
      crear("input", {
        id: "usuario",
        name: "usuario",
        type: "text",
        clase: "campo__control",
        autocomplete: "username",
        required: true,
      }),
    ),
    crear(
      "div",
      { clase: "campo" },
      crear("label", { clase: "campo__etiqueta", for: "clave", texto: "Contraseña" }),
      crear("input", {
        id: "clave",
        name: "clave",
        type: "password",
        clase: "campo__control",
        autocomplete: "current-password",
        required: true,
      }),
    ),
    error,
    boton,
  );

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    error.textContent = "";
    const usuario = formulario.elements.usuario.value.trim();
    const clave = formulario.elements.clave.value;
    if (!usuario || !clave) {
      error.textContent = "Escribe tu usuario y tu contraseña.";
      return;
    }

    boton.disabled = true;
    boton.textContent = "Entrando...";
    try {
      const sesion = await iniciarSesion(usuario, clave);
      pantallaPanel(sesion.username);
    } catch (fallo) {
      error.textContent = fallo.message;
      boton.disabled = false;
      boton.textContent = "Entrar";
      formulario.elements.clave.value = "";
      formulario.elements.clave.focus();
    }
  });

  raiz.replaceChildren(
    crear(
      "main",
      { clase: "login" },
      crear(
        "div",
        { clase: "login__tarjeta" },
        crear("p", { clase: "eyebrow", texto: "Administración" }),
        crear("h1", { clase: "login__titulo", texto: "Entrar al panel" }),
        crear("p", {
          clase: "login__texto",
          texto: "Solo para quien administra la tienda.",
        }),
        formulario,
        crear("a", { clase: "enlace-discreto", href: "/", texto: "← Volver a la tienda" }),
      ),
    ),
  );
  formulario.elements.usuario.focus();
}

function pantallaPanel(nombreUsuario) {
  document.title = "Panel · Tienda en Línea Modular";
  let activa = PESTANAS[0].id;

  const contenido = crear("div", { clase: "panel__contenido" });
  const lista = crear("div", { clase: "pestanas", role: "tablist", "aria-label": "Secciones" });

  function pintarPestanas() {
    lista.replaceChildren(
      ...PESTANAS.map((pestana) =>
        crear("button", {
          type: "button",
          role: "tab",
          clase: pestana.id === activa ? "pestana pestana--activa" : "pestana",
          "aria-selected": String(pestana.id === activa),
          texto: pestana.titulo,
          onClick: () => seleccionar(pestana.id),
        }),
      ),
    );
  }

  function seleccionar(id) {
    activa = id;
    pintarPestanas();
    const pestana = PESTANAS.find((p) => p.id === id);
    contenido.replaceChildren(pestana.seccion.elemento);
    pestana.seccion.cargar();
  }

  const botonSalir = crear("button", {
    type: "button",
    clase: "boton boton--chico",
    texto: "Cerrar sesión",
    onClick: async () => {
      botonSalir.disabled = true;
      try {
        await cerrarSesion();
      } catch {
        // Si la sesión ya había terminado, igual se vuelve al login.
      }
      pantallaLogin();
    },
  });

  raiz.replaceChildren(
    crear(
      "header",
      { clase: "barra" },
      crear(
        "div",
        { clase: "barra__interior" },
        crear(
          "div",
          {},
          crear("p", { clase: "eyebrow", texto: "Administración" }),
          crear("h1", { clase: "barra__titulo", texto: "Tienda en Línea Modular" }),
        ),
        crear(
          "div",
          { clase: "barra__sesion" },
          crear("a", { clase: "enlace-discreto", href: "/", texto: "Ver la tienda" }),
          crear("span", { clase: "barra__usuario", texto: nombreUsuario }),
          botonSalir,
        ),
      ),
    ),
    crear("main", { clase: "panel" }, lista, contenido),
  );
  seleccionar(activa);
}

async function iniciar() {
  try {
    const sesion = await quienSoy();
    if (sesion.autenticado) {
      pantallaPanel(sesion.username);
    } else {
      pantallaLogin();
    }
  } catch (error) {
    pantallaLogin(error.message);
  }
}

iniciar();

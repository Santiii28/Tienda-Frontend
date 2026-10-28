import { ErrorApi, cerrarSesion, iniciarSesion, quienSoy, registrarse } from "./api.js";
import { avisar, crear } from "./utils.js";

const panel = document.querySelector("#panel-cuenta");
const cuerpo = document.querySelector("#cuenta-cuerpo");
const titulo = document.querySelector("#titulo-cuenta");
const cortina = document.querySelector("#cortina");
const botonCerrar = document.querySelector("#cerrar-cuenta");
const botonAbrir = document.querySelector("#abrir-cuenta");
const botonSalir = document.querySelector("#cerrar-sesion");
const enlaceAdmin = document.querySelector("#enlace-admin");
const saludo = document.querySelector("#saludo");

let usuario = null; // { nombre, correo, es_admin, ... } o null si no hay sesión

// Quien tiene la sesión abierta (o null). Lo usa el pago para rellenar los datos.
export function usuarioActual() {
  return usuario;
}

// ---------- Menú ----------
function pintarMenu() {
  const dentro = usuario !== null;
  botonAbrir.hidden = dentro;
  botonSalir.hidden = !dentro;
  saludo.hidden = !dentro;
  saludo.textContent = dentro ? `Hola, ${usuario.nombre}` : "";
  enlaceAdmin.hidden = !(dentro && usuario.es_admin);
}

// ---------- Ventana ----------
function abrir(modo = "entrar") {
  pintar(modo);
  panel.hidden = false;
  cortina.hidden = false;
  document.body.classList.add("sin-scroll");
  const primero = cuerpo.querySelector("input");
  if (primero) {
    primero.focus();
  }
}

function cerrar() {
  panel.hidden = true;
  cuerpo.replaceChildren();
  cortina.hidden = true;
  document.body.classList.remove("sin-scroll");
  botonAbrir.focus();
}

// ---------- Formularios ----------
const CAMPOS = {
  entrar: [
    { nombre: "usuario", etiqueta: "Correo o usuario", tipo: "text", autocomplete: "username", max: 150 },
    { nombre: "clave", etiqueta: "Contraseña", tipo: "password", autocomplete: "current-password", max: 128 },
  ],
  crear: [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", autocomplete: "name", max: 100 },
    { nombre: "correo", etiqueta: "Correo electrónico", tipo: "email", autocomplete: "email", max: 150 },
    {
      nombre: "clave",
      etiqueta: "Contraseña",
      tipo: "password",
      autocomplete: "new-password",
      max: 128,
      ayuda: "Mínimo 8 caracteres. Evita claves comunes o solo con números.",
    },
    { nombre: "repetir", etiqueta: "Repite la contraseña", tipo: "password", autocomplete: "new-password", max: 128 },
  ],
};

function crearCampo(modo, definicion) {
  const id = `cuenta-${modo}-${definicion.nombre}`;
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

function marcarError(formulario, modo, nombre, mensaje) {
  const control = formulario.elements[nombre];
  const caja = formulario.querySelector(`#cuenta-${modo}-${nombre}-error`);
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

// La API vuelve a validar todo; esto solo evita un viaje al servidor por un descuido.
function validar(modo, formulario) {
  limpiarErrores(formulario);
  const valores = {};
  let primero = null;
  const fallar = (nombre, mensaje) => {
    marcarError(formulario, modo, nombre, mensaje);
    primero = primero || formulario.elements[nombre];
  };

  for (const campo of CAMPOS[modo]) {
    const crudo = formulario.elements[campo.nombre].value;
    // Las contraseñas no se recortan: los espacios pueden ser parte de la clave.
    valores[campo.nombre] = campo.tipo === "password" ? crudo : crudo.trim();
    if (valores[campo.nombre] === "") {
      fallar(campo.nombre, "Este campo es obligatorio.");
    }
  }
  if (modo === "crear") {
    if (valores.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.correo)) {
      fallar("correo", "Escribe un correo válido.");
    }
    if (valores.clave && valores.clave.length < 8) {
      fallar("clave", "La contraseña debe tener al menos 8 caracteres.");
    }
    if (valores.clave && valores.repetir && valores.clave !== valores.repetir) {
      fallar("repetir", "Las contraseñas no coinciden.");
    }
  }
  if (primero) {
    primero.focus();
    return null;
  }
  return valores;
}

function pintar(modo) {
  const esEntrar = modo === "entrar";
  titulo.textContent = esEntrar ? "Iniciar sesión" : "Crear cuenta";

  const mensaje = crear("p", { clase: "mensaje mensaje--error", role: "alert" });
  const enviar = crear("button", {
    type: "submit",
    clase: "boton boton--primario boton--completo",
    texto: esEntrar ? "Entrar" : "Crear cuenta",
  });

  const formulario = crear(
    "form",
    { clase: "pago__formulario", novalidate: true, "aria-label": esEntrar ? "Iniciar sesión" : "Crear cuenta" },
    ...CAMPOS[modo].map((campo) => crearCampo(modo, campo)),
    mensaje,
    enviar,
  );

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mensaje.textContent = "";
    const valores = validar(modo, formulario);
    if (!valores) {
      return;
    }
    enviar.disabled = true;
    enviar.textContent = esEntrar ? "Entrando…" : "Creando…";
    try {
      const sesion = esEntrar
        ? await iniciarSesion(valores.usuario, valores.clave)
        : await registrarse(valores.nombre, valores.correo, valores.clave);
      usuario = sesion;
      pintarMenu();
      cerrar();
      avisar(esEntrar ? `Hola, ${sesion.nombre}` : `Cuenta creada. Bienvenido, ${sesion.nombre}`, "ok");
    } catch (error) {
      enviar.disabled = false;
      enviar.textContent = esEntrar ? "Entrar" : "Crear cuenta";
      mostrarErrores(error, modo, formulario, mensaje);
    }
  });

  const otro = esEntrar ? "crear" : "entrar";
  cuerpo.replaceChildren(
    formulario,
    crear(
      "p",
      { clase: "cuenta__cambio" },
      esEntrar ? "¿Todavía no tienes cuenta? " : "¿Ya tienes cuenta? ",
      crear("button", {
        type: "button",
        clase: "enlace-boton",
        id: "cambiar-modo",
        texto: esEntrar ? "Crear una cuenta" : "Iniciar sesión",
        onClick: () => {
          pintar(otro);
          cuerpo.querySelector("input").focus();
        },
      }),
    ),
    crear("p", { clase: "pago__nota", texto: "No necesitas una cuenta para comprar." }),
  );
}

function mostrarErrores(error, modo, formulario, mensaje) {
  // Los errores de validación llegan como { campo: ["mensaje"] }.
  if (error instanceof ErrorApi && error.estado === 400 && error.datos && !error.datos.detail) {
    let primero = null;
    for (const [campo, textos] of Object.entries(error.datos)) {
      const nombre = campo === "password" ? "clave" : campo;
      const texto = [].concat(textos).join(" ");
      if (marcarError(formulario, modo, nombre, texto)) {
        primero = primero || formulario.elements[nombre];
      } else {
        mensaje.textContent = texto;
      }
    }
    if (primero) {
      primero.focus();
    }
    return;
  }
  mensaje.textContent = error.message;
  if (error instanceof ErrorApi && error.estado === 401) {
    const clave = formulario.elements.clave;
    clave.value = "";
    clave.focus();
  }
}

// ---------- Cerrar sesión ----------
async function salir() {
  try {
    await cerrarSesion();
  } catch (error) {
    // Si la sesión ya había terminado en el servidor, igual se limpia la pantalla.
    if (!(error instanceof ErrorApi) || error.estado === 0) {
      avisar(error.message, "error");
      return;
    }
  }
  usuario = null;
  pintarMenu();
  avisar("Sesión cerrada", "ok");
}

export async function iniciarCuenta() {
  botonAbrir.addEventListener("click", () => abrir("entrar"));
  botonSalir.addEventListener("click", salir);
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

  try {
    const sesion = await quienSoy();
    usuario = sesion.autenticado ? sesion : null;
  } catch {
    usuario = null;
  }
  pintarMenu();
}

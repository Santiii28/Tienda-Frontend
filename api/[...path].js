// Intermediario entre la tienda (Vercel) y la API (Render).
// Recibe todo lo que llega a /api/* y lo reenvía al backend, para que el navegador
// siga hablando con un solo dominio (las cookies y el CSRF funcionan igual que en
// desarrollo con el proxy de Vite). Reemplaza al "rewrite" de vercel.json.
const BACKEND = (process.env.BACKEND_URL || "https://tienda-backend-am7z.onrender.com").replace(/\/+$/, "");

// Cabeceras que no se copian de un lado al otro (las recalcula cada extremo).
const NO_COPIAR_PETICION = new Set(["host", "connection", "content-length", "accept-encoding", "x-forwarded-host"]);
const NO_COPIAR_RESPUESTA = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "set-cookie"]);

async function leerCuerpo(req) {
  const partes = [];
  for await (const parte of req) {
    partes.push(parte);
  }
  return Buffer.concat(partes);
}

export default async function handler(req, res) {
  try {
    const cabeceras = {};
    for (const [nombre, valor] of Object.entries(req.headers)) {
      if (NO_COPIAR_PETICION.has(nombre) || nombre.startsWith("x-vercel")) {
        continue;
      }
      cabeceras[nombre] = Array.isArray(valor) ? valor.join(", ") : valor;
    }
    cabeceras["accept-encoding"] = "identity";

    const opciones = { method: req.method, headers: cabeceras, redirect: "manual" };
    if (req.method !== "GET" && req.method !== "HEAD") {
      opciones.body = await leerCuerpo(req);
    }

    const respuesta = await fetch(BACKEND + req.url, opciones);

    res.statusCode = respuesta.status;
    respuesta.headers.forEach((valor, nombre) => {
      if (!NO_COPIAR_RESPUESTA.has(nombre)) {
        res.setHeader(nombre, valor);
      }
    });
    const cookies = respuesta.headers.getSetCookie();
    if (cookies.length > 0) {
      res.setHeader("set-cookie", cookies);
    }
    res.end(Buffer.from(await respuesta.arrayBuffer()));
  } catch (error) {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ detail: "No se pudo conectar con el servidor de la tienda." }));
  }
}

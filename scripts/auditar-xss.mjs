// Auditoría de XSS: busca en el código fuente las funciones que interpretan
// texto como HTML o código. Si encuentra alguna, falla (código de salida 1).
//   npm run auditar
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));

const PELIGROSOS = [
  { patron: /\.innerHTML\b/, motivo: "innerHTML interpreta texto como HTML" },
  { patron: /\.outerHTML\b/, motivo: "outerHTML interpreta texto como HTML" },
  { patron: /insertAdjacentHTML\s*\(/, motivo: "insertAdjacentHTML interpreta texto como HTML" },
  { patron: /document\.write(ln)?\s*\(/, motivo: "document.write inyecta HTML" },
  { patron: /\beval\s*\(/, motivo: "eval ejecuta texto como código" },
  { patron: /new\s+Function\s*\(/, motivo: "new Function ejecuta texto como código" },
  { patron: /setTimeout\s*\(\s*["'`]/, motivo: "setTimeout con texto ejecuta código" },
  { patron: /\bdangerouslySetInnerHTML\b/, motivo: "inserta HTML sin escapar" },
  { patron: /createContextualFragment\s*\(/, motivo: "convierte texto en nodos HTML" },
  { patron: /\.srcdoc\b/, motivo: "srcdoc inyecta un documento HTML" },
];

function archivos(carpeta) {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const objetivos = [
  ...archivos(join(RAIZ, "src")).filter((f) => f.endsWith(".js")),
  join(RAIZ, "index.html"),
  join(RAIZ, "admin.html"),
];

let hallazgos = 0;
for (const archivo of objetivos) {
  readFileSync(archivo, "utf8")
    .split(/\r?\n/)
    .forEach((linea, i) => {
      const sinComentario = linea.replace(/\/\/.*$/, "");
      for (const { patron, motivo } of PELIGROSOS) {
        if (patron.test(sinComentario)) {
          hallazgos++;
          console.error(`${relative(RAIZ, archivo)}:${i + 1}  ${motivo}\n    ${linea.trim()}`);
        }
      }
      if (/<script\b(?![^>]*\bsrc=)/i.test(linea) && archivo.endsWith(".html")) {
        hallazgos++;
        console.error(`${relative(RAIZ, archivo)}:${i + 1}  script en línea (la CSP lo bloquearía)`);
      }
      if (/\son[a-z]+\s*=\s*["']/i.test(linea) && archivo.endsWith(".html")) {
        hallazgos++;
        console.error(`${relative(RAIZ, archivo)}:${i + 1}  manejador de evento en línea (la CSP lo bloquearía)`);
      }
    });
}

if (hallazgos > 0) {
  console.error(`\nSe encontraron ${hallazgos} uso(s) riesgoso(s).`);
  process.exit(1);
}
console.log(`Auditoría XSS: ${objetivos.length} archivos revisados, sin usos riesgosos.`);

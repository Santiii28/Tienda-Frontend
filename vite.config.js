import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// En desarrollo, las peticiones a /api se reenvían al backend de Django.
// Así el navegador ve un solo origen (localhost:5173) y las cookies de
// sesión y de CSRF funcionan sin configurar CORS.
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Dos páginas: la tienda pública y el panel de administrador.
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
      },
    },
  },
});

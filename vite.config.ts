import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

import { sendOrderEmail } from "./server/email";

function localEmailApi(): Plugin {
  return {
    name: "local-email-api",
    configureServer(server) {
      server.middlewares.use("/api/send-order-email", (request, response) => {
        if (request.method !== "POST") {
          response.statusCode = 405;
          response.setHeader("content-type", "application/json");
          response.end(JSON.stringify({ ok: false, error: "Method not allowed." }));
          return;
        }

        let raw = "";
        request.on("data", (chunk: Buffer) => {
          raw += chunk.toString();
        });
        request.on("end", () => {
          void (async () => {
            try {
              const data = JSON.parse(raw) as Parameters<typeof sendOrderEmail>[0];
              if (!data.customer?.email || !Array.isArray(data.items) || data.items.length === 0) {
                response.statusCode = 400;
                response.setHeader("content-type", "application/json");
                response.end(JSON.stringify({ ok: false, error: "Invalid order payload." }));
                return;
              }
              const result = await sendOrderEmail(data);
              response.statusCode = 200;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ ok: true, ...result }));
            } catch (error) {
              console.error("[email-api]", error);
              response.statusCode = 400;
              response.setHeader("content-type", "application/json");
              response.end(JSON.stringify({ ok: false, error: "Invalid request." }));
            }
          })();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), tailwindcss(), tsconfigPaths(), localEmailApi()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "::",
      port: 8080,
    },
  };
});

import { serve } from "bun";
import { watch } from "node:fs";
import path from "node:path";
import index from "./index.html";
import { scanSpecs } from "./specs";
import type { SpecMeta } from "./specs";

const SPECS_DIR = path.resolve(
  process.env.SPECS_DIR ?? path.join(import.meta.dir, "../../specs"),
);
const PORT = parseInt(process.env.PORT ?? "3000", 10);

console.log(`📁 Specs directory: ${SPECS_DIR}`);

// Initial spec scan
let cachedSpecs: SpecMeta[] = await scanSpecs(SPECS_DIR);
console.log(`📋 Found ${cachedSpecs.length} spec(s): ${cachedSpecs.map((s) => s.title).join(", ")}`);

// Track connected WebSocket clients
const wsClients = new Set<import("bun").ServerWebSocket<unknown>>();

// File watcher with debounce
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function setupFileWatcher() {
  try {
    const watcher = watch(SPECS_DIR, { recursive: false }, (_event, _filename) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.log("🔄 Spec files changed, rescanning...");
        cachedSpecs = await scanSpecs(SPECS_DIR);
        console.log(`📋 Found ${cachedSpecs.length} spec(s)`);

        // Notify all connected clients
        const message = JSON.stringify({ type: "reload", specs: cachedSpecs });
        for (const ws of wsClients) {
          try {
            ws.send(message);
          } catch {
            wsClients.delete(ws);
          }
        }
      }, 300);
    });

    // Handle watcher errors gracefully
    watcher.on("error", (err) => {
      console.warn("⚠️  File watcher error:", err);
    });

    return watcher;
  } catch (err) {
    console.warn("⚠️  Could not set up file watcher:", err);
    return null;
  }
}

setupFileWatcher();

const server = serve({
  port: PORT,
  routes: {
    "/*": index,

    "/api/specs": {
      GET(_req) {
        return Response.json(cachedSpecs);
      },
    },

    "/api/specs/:filename": {
      async GET(req) {
        const filename = req.params.filename;
        const filepath = path.join(SPECS_DIR, filename);

        // Prevent path traversal
        if (!path.resolve(filepath).startsWith(path.resolve(SPECS_DIR))) {
          return new Response("Forbidden", { status: 403 });
        }

        try {
          const file = Bun.file(filepath);
          if (!(await file.exists())) {
            return new Response("Not found", { status: 404 });
          }

          const content = await file.text();
          const ext = path.extname(filename).toLowerCase();
          const contentType =
            ext === ".json" ? "application/json" : "text/yaml";

          return new Response(content, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "no-cache",
            },
          });
        } catch {
          return new Response("Error reading spec file", { status: 500 });
        }
      },
    },
  },

  // Handle WebSocket upgrade requests not matched by routes
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return new Response("Not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      wsClients.add(ws);
      // Send current specs list on connect
      ws.send(JSON.stringify({ type: "connected", specs: cachedSpecs }));
    },
    message(_ws, _message) {
      // No client->server messages needed
    },
    close(ws) {
      wsClients.delete(ws);
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 API Portal running at ${server.url}`);

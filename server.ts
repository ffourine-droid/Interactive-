import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  app.use(express.json());
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => res.json({ status: "ok", env: nodeEnv }));
  
  // Catch-all for API
  app.all("/api/*", (req, res) => res.status(404).json({ error: "API Route Not Found" }));

  // Static Files
  if (nodeEnv !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) res.sendFile(indexPath);
      else res.status(404).send("Frontend missing");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Listening on 0.0.0.0:${PORT}`);
  });
}

startServer();

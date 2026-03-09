import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import crypto from "crypto";
import twilio from "twilio";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = (() => {
  try {
    const d = new Database("users.db");
    d.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    return d;
  } catch (err) {
    console.error("[DATABASE] Error:", err);
    return null;
  }
})();

const hashPassword = (password: string, salt: string) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
};

let twilioClient: any = null;
const getTwilioClient = () => {
  if (!twilioClient) {
    const sid = (process.env.TWILIO_ACCOUNT_SID || process.env.ACCOUNT_SID || "").trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || process.env.AUTH_TOKEN || "").trim();
    if (!sid || !token) return null;
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
};

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
  app.get("/api/health", (req, res) => res.json({ status: "ok", db: !!db, env: nodeEnv }));
  
  app.post("/api/register", (req, res) => {
    const { username, password } = req.body;
    if (!db) return res.status(500).json({ error: "Database error" });
    try {
      const salt = crypto.randomBytes(16).toString("hex");
      const password_hash = hashPassword(password, salt);
      db.prepare("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)").run(username, password_hash, salt);
      res.status(201).json({ message: "Success" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/auth/send-otp", async (req, res) => {
    const { phone } = req.body;
    const sanitizedPhone = '+' + (phone || "").replace(/\D/g, '');
    const client = getTwilioClient();
    const serviceSid = (process.env.TWILIO_SERVICE_SID || process.env.SERVICE_SID || "").trim();

    if (!client || !serviceSid || !serviceSid.startsWith('VA')) {
      return res.json({ message: "Mock OTP sent", mock: true });
    }
    try {
      await client.verify.v2.services(serviceSid).verifications.create({ to: sanitizedPhone, channel: 'sms' });
      res.json({ message: "Sent" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    const { phone, code } = req.body;
    const sanitizedPhone = '+' + (phone || "").replace(/\D/g, '');
    const client = getTwilioClient();
    const serviceSid = (process.env.TWILIO_SERVICE_SID || process.env.SERVICE_SID || "").trim();

    if (!client || !serviceSid || !serviceSid.startsWith('VA')) {
      return code === "123456" ? res.json({ success: true }) : res.status(400).json({ error: "Wrong code" });
    }
    try {
      const v = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: sanitizedPhone, code });
      res.json({ success: v.status === 'approved' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/users", (req, res) => {
    if (!db) return res.status(500).json({ error: "Database error" });
    res.json(db.prepare("SELECT id, username FROM users").all());
  });

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

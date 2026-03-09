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

const db = new Database("users.db");

// Initialize Twilio client lazily
let twilioClient: any = null;
const getTwilioClient = () => {
  if (!twilioClient) {
    const sid = (process.env.TWILIO_ACCOUNT_SID || process.env.ACCOUNT_SID || "").trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || process.env.AUTH_TOKEN || "").trim();
    if (!sid || !token) {
      console.warn("Twilio credentials missing. OTP features will be disabled.");
      return null;
    }
    twilioClient = twilio(sid, token);
  }
  return twilioClient;
};

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const hashPassword = (password: string, salt: string) => {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`[SERVER] Starting in ${nodeEnv} mode on port ${PORT}`);

  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health check (at root level for infrastructure)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: nodeEnv, time: new Date().toISOString() });
  });

  // API Router
  const apiRouter = express.Router();

  // Registration
  apiRouter.post(["/register", "/register/"], (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });
    
    try {
      const salt = crypto.randomBytes(16).toString("hex");
      const password_hash = hashPassword(password, salt);
      const stmt = db.prepare("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)");
      stmt.run(username, password_hash, salt);
      res.status(201).json({ message: "User registered successfully" });
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "Username already exists" });
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // OTP - Send
  apiRouter.post(["/auth/send-otp", "/auth/send-otp/"], async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    const sanitizedPhone = '+' + phone.replace(/\D/g, '');
    const client = getTwilioClient();
    const serviceSid = (process.env.TWILIO_SERVICE_SID || process.env.SERVICE_SID || "").trim();

    if (!client || !serviceSid || !serviceSid.startsWith('VA')) {
      console.log(`[MOCK OTP] Sending code 123456 to ${sanitizedPhone}`);
      return res.json({ 
        message: "OTP sent (Mock Mode)", 
        mock: true,
        details: !serviceSid ? "Missing TWILIO_SERVICE_SID" : !serviceSid.startsWith('VA') ? `Invalid Service SID type. You provided an Account SID (starts with 'AC'), but you need a Verify Service SID (starts with 'VA'). Create one here: https://console.twilio.com/us1/develop/verify/services` : "Missing Twilio Credentials"
      });
    }

    try {
      await client.verify.v2.services(serviceSid).verifications.create({ to: sanitizedPhone, channel: 'sms' });
      res.json({ message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Twilio Send Error:", error);
      if (error.message.includes('Invalid parameter') || error.code === 21604) {
        return res.status(400).json({ error: "Invalid phone number format. Please ensure it includes the country code (e.g., +254...)", code: "INVALID_PARAMETER" });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // OTP - Verify
  apiRouter.post(["/auth/verify-otp", "/auth/verify-otp/"], async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "Phone and code are required" });

    const sanitizedPhone = '+' + phone.replace(/\D/g, '');
    const client = getTwilioClient();
    const serviceSid = (process.env.TWILIO_SERVICE_SID || process.env.SERVICE_SID || "").trim();

    if (!client || !serviceSid || !serviceSid.startsWith('VA')) {
      if (code === "123456") return res.json({ message: "Verified (Mock Mode)", success: true });
      return res.status(400).json({ error: "Invalid mock code. Use 123456" });
    }

    try {
      const verification = await client.verify.v2.services(serviceSid).verificationChecks.create({ to: sanitizedPhone, code: code });
      if (verification.status === 'approved') {
        res.json({ message: "Verified successfully", success: true });
      } else {
        res.status(400).json({ error: "Invalid verification code" });
      }
    } catch (error: any) {
      console.error("Twilio Verify Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Users List
  apiRouter.get(["/users", "/users/"], (req, res) => {
    try {
      const stmt = db.prepare("SELECT id, username, created_at FROM users ORDER BY created_at DESC");
      const users = stmt.all();
      res.json(users);
    } catch (error) {
      console.error("Fetch users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Mount API Router
  app.use("/api", apiRouter);

  // Root redirect for convenience
  app.get("/health", (req, res) => res.json({ status: "ok", service: "root" }));

  // API 404 Handler
  app.all("/api/*", (req, res) => {
    console.warn(`[SERVER] 404 on API route: ${req.method} ${req.url}`);
    res.status(404).json({ error: "API route not found", path: req.url });
  });

  // Frontend Serving
  if (nodeEnv !== "production") {
    console.log("[SERVER] Initializing Vite middleware for development");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    console.log(`[SERVER] Production mode: Serving static files from ${distPath}`);
    
    // Check if dist exists
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          console.error(`[SERVER] index.html missing at ${indexPath}`);
          res.status(404).json({ error: "Frontend index.html missing" });
        }
      });
    } else {
      console.error(`[SERVER] dist directory missing at ${distPath}`);
      app.get("*", (req, res) => {
        res.status(404).json({ error: "Frontend dist directory missing. Please run build." });
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Listening on http://0.0.0.0:${PORT}`);
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[SERVER] Global Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message });
  });
}

startServer();

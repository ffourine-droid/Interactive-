import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import crypto from "crypto";
import twilio from "twilio";
import path from "path";
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

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);

  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: process.env.NODE_ENV || "development" });
  });

  // API routes
  app.post(["/api/register", "/api/register/"], (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    try {
      const salt = crypto.randomBytes(16).toString("hex");
      const password_hash = hashPassword(password, salt);

      const stmt = db.prepare("INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)");
      stmt.run(username, password_hash, salt);

      res.status(201).json({ message: "User registered successfully" });
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({ error: "Username already exists" });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Twilio OTP Endpoints
  app.post(["/api/auth/send-otp", "/api/auth/send-otp/"], async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number is required" });

    // Sanitize phone number: remove all non-digit characters except the leading +
    const sanitizedPhone = '+' + phone.replace(/\D/g, '');

    const client = getTwilioClient();
    const serviceSid = (process.env.TWILIO_SERVICE_SID || process.env.SERVICE_SID || "").trim();

    // Mock mode if no credentials or invalid SID format
    if (!client || !serviceSid || !serviceSid.startsWith('VA')) {
      console.log(`[MOCK OTP] Sending code 123456 to ${sanitizedPhone}`);
      return res.json({ 
        message: "OTP sent (Mock Mode)", 
        mock: true,
        details: !serviceSid ? "Missing TWILIO_SERVICE_SID" : !serviceSid.startsWith('VA') ? `Invalid Service SID type. You provided an Account SID (starts with 'AC'), but you need a Verify Service SID (starts with 'VA'). Create one here: https://console.twilio.com/us1/develop/verify/services` : "Missing Twilio Credentials"
      });
    }

    try {
      await client.verify.v2.services(serviceSid)
        .verifications
        .create({ to: sanitizedPhone, channel: 'sms' });
      res.json({ message: "OTP sent successfully" });
    } catch (error: any) {
      console.error("Twilio Send Error:", error);
      // Handle "Invalid parameter" specifically
      if (error.message.includes('Invalid parameter') || error.code === 21604) {
        return res.status(400).json({ 
          error: "Invalid phone number format. Please ensure it includes the country code (e.g., +254...)",
          code: "INVALID_PARAMETER"
        });
      }
      res.status(500).json({ error: error.message });
    }
  });

  app.post(["/api/auth/verify-otp", "/api/auth/verify-otp/"], async (req, res) => {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "Phone and code are required" });

    const sanitizedPhone = '+' + phone.replace(/\D/g, '');
    const client = getTwilioClient();
    const serviceSid = (process.env.TWILIO_SERVICE_SID || process.env.SERVICE_SID || "").trim();

    // Mock mode verification
    if (!client || !serviceSid || !serviceSid.startsWith('VA')) {
      if (code === "123456") {
        return res.json({ message: "Verified (Mock Mode)", success: true });
      }
      return res.status(400).json({ error: "Invalid mock code. Use 123456" });
    }

    try {
      const verification = await client.verify.v2.services(serviceSid)
        .verificationChecks
        .create({ to: sanitizedPhone, code: code });
      
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

  app.get(["/api/users", "/api/users/"], (req, res) => {
    try {
      const stmt = db.prepare("SELECT id, username, created_at FROM users ORDER BY created_at DESC");
      const users = stmt.all();
      res.json(users);
    } catch (error) {
      console.error("Fetch users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API 404 Handler - Ensure API routes always return JSON
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware for development");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    console.log(`Production mode: Serving static files from ${distPath}`);
    
    // Verify dist directory exists
    import("fs").then(fs => {
      if (fs.existsSync(distPath)) {
        console.log("Dist directory found");
        if (fs.existsSync(path.join(distPath, "index.html"))) {
          console.log("index.html found in dist");
        } else {
          console.error("index.html NOT found in dist!");
        }
      } else {
        console.error("Dist directory NOT found!");
      }
    });

    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      // Don't handle API routes here, they should have been caught above
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found (catch-all)" });
      }

      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error(`Error sending index.html:`, err);
          res.status(404).json({ 
            error: "Frontend not found", 
            message: "The application frontend files are missing. Please run build.",
            path: indexPath
          });
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Global Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      path: req.path
    });
  });
}

startServer();

const app = require("../app");
const connectDB = require("../src/shared/db");

const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:4000",
  "https://auronway.vercel.app",
];

const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  const isVercelPreview = typeof origin === "string" && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || isVercelPreview;

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");

    const requestedHeaders = req.headers["access-control-request-headers"];
    res.setHeader(
      "Access-Control-Allow-Headers",
      requestedHeaders || "Content-Type,Authorization"
    );
  }

  return isAllowed;
};

const connectWithTimeout = async (ms = 8000) => {
  await Promise.race([
    connectDB(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DB connection timeout")), ms)
    ),
  ]);
};

module.exports = async (req, res) => {
  try {
    const requestPath = req.url || "";
    const isAllowedOrigin = setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      if (!isAllowedOrigin && req.headers.origin) {
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ ok: false, message: "Origin not allowed" }));
      }

      res.statusCode = 204;
      return res.end();
    }

    if (requestPath === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ ok: true, runtime: "vercel" }));
    }

    await connectWithTimeout(8000);
    return app(req, res);
  } catch (error) {
    console.error("[vercel] Failed to handle request:", error);
    setCorsHeaders(req, res);
    res.statusCode = error.message === "DB connection timeout" ? 503 : 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        ok: false,
        message:
          error.message === "DB connection timeout"
            ? "Database temporarily unavailable"
            : "Internal Server Error",
      })
    );
  }
};

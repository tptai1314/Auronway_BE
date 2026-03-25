const app = require("../app");
const connectDB = require("../src/shared/db");

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

    if (requestPath === "/health") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ ok: true, runtime: "vercel" }));
    }

    await connectWithTimeout(8000);
    return app(req, res);
  } catch (error) {
    console.error("[vercel] Failed to handle request:", error);
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

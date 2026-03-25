const serverless = require("serverless-http");
const app = require("../app");
const connectDB = require("../src/config/db");

let handler;

module.exports = async (req, res) => {
  try {
    await connectDB();

    if (!handler) {
      handler = serverless(app);
    }

    return handler(req, res);
  } catch (error) {
    console.error("[vercel] Failed to handle request:", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ ok: false, message: "Internal Server Error" }));
  }
};

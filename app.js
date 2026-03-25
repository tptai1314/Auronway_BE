require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const passport = require("./src/config/passport");
const { errorMiddleware } = require("./src/shared/http/handle-error");

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use(passport.initialize());


app.get("/health", (_req, res) => res.json({ ok: true }));

const skillRoutes = require("./src/modules/skills/skills.routes");

// Mount routers 
app.use("/api/auth", require("./src/modules/auth/auth.routes"));
app.use("/api/tenants", require("./src/modules/tenants/tenants.routes"));
app.use("/api/organizers", require("./src/modules/organizers/organizers.routes"));
app.use("/api/events", require("./src/modules/events/events.routes"));
app.use("/api/certificates", require("./src/modules/certificates/certificates.routes"));
app.use("/api/skills", skillRoutes);
app.use("/api/daily", require("./src/modules/daily/daily.routes"));
app.use("/api/history", require("./src/modules/history/history.routes"));
app.use("/api/articles", require("./src/modules/articles/article.routes"));
app.use("/api/users", require("./src/modules/users/users.routes"));
app.use("/api/admin", require("./src/modules/admin/admin.routes"));

// app.use('/api/registrations', require('./src/modules/registrations/registrations.routes'));

app.use(errorMiddleware);
module.exports = app;

import "./config.ts"; // first: pins process.env.TZ before anything reads the clock

import fs from "node:fs";
import path from "node:path";

import express from "express";

import { loadSession, pruneExpiredSessions, requireAdmin, requireUser } from "./auth.ts";
import { config } from "./config.ts";
import { errorHandler } from "./http.ts";
import { adminRouter } from "./routes/admin.ts";
import { authRouter } from "./routes/auth.ts";
import { bookingsRouter } from "./routes/bookings.ts";
import { seed } from "./seed.ts";

await seed();
pruneExpiredSessions();
setInterval(pruneExpiredSessions, 6 * 60 * 60_000).unref();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

app.use("/api", express.json({ limit: "20kb" }), loadSession);

// Development only: pretend the server is far away, to see the loading states
// the way people on the hosted app will. e.g. API_DELAY_MS=800 npm run dev
const apiDelay = config.production ? 0 : Number(process.env.API_DELAY_MS) || 0;
if (apiDelay > 0) {
  console.log(`[office] adding ${apiDelay}ms to every API response`);
  app.use("/api", (_req, _res, next) => {
    setTimeout(() => next(), apiDelay);
  });
}

// Every write must be JSON. A cross-site form cannot send that without a CORS
// preflight this server never approves, which is the CSRF protection here.
app.use("/api", (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
    res.status(415).json({ error: "Send JSON." });
    return;
  }
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/admin", requireAdmin, adminRouter);
app.use("/api", requireUser, bookingsRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found." });
});
app.use(errorHandler);

// In production the built web app is served from here too, so the whole thing
// is one process on one port.
if (fs.existsSync(config.distDir)) {
  app.use(express.static(config.distDir, { index: false, maxAge: "1h" }));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(config.distDir, "index.html"));
  });
}

app.listen(config.port, () => {
  console.log(`[office] API listening on http://localhost:${config.port} (office time: ${process.env.TZ})`);
});

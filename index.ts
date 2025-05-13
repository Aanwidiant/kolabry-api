import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import process from "node:process";
import { User, Kol, KolType } from "./routes/index.js";
import { connectDB } from "./config/db.js";

const app = new Hono().basePath("/api");

const customLogger = (message: string, ...rest: any[]) => {
  console.log(`[${new Date().toISOString()}] ${message}`, ...rest);
};

app.use("*", logger(customLogger), prettyJSON());
app.use(
  "*",
  cors({
    origin: (origin) => {
      return origin;
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["Upgrade"],
    maxAge: 86400,
  })
);

app.get("/", (c) => c.text("Welcome to the API!"));
app.get("/healthcheck", (c) => {
  return c.json({
    message: "API running",
    timestamp: new Date().toISOString(),
    status: "healthy",
  });
});

app.route("/user", User);
app.route("/kol", Kol);
app.route("/kol-type", KolType);

const startServer = async () => {
  try {
    await connectDB();

    const server = serve({
      fetch: app.fetch,
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    });

    console.log(`Server running on port ${process.env.PORT || 3000}`);

    process.on("SIGTERM", () => {
      console.log("SIGTERM signal received. Closing HTTP server.");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT signal received. Closing HTTP server.");
      server.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;

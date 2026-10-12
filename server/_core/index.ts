import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { assistantHandler } from "../assistant";
import { dailyRouter, scheduledDailyHandler } from "../daily";
import { socialRouter } from "../social";
import { githubRouter } from "../github";
import { gitlabRouter } from "../gitlab";
import { analyticsRouter } from "../analytics";
import { councilRouter } from "../council";
import { managedGitRouter, startManagedGitSync } from "../managed-git";

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  app.post("/api/assistant", express.json({ limit: "24kb" }), assistantHandler);
  app.use("/api/analytics", express.json({ limit: "2kb" }), analyticsRouter);
  app.use("/api/council", express.json({ limit: "8kb" }), councilRouter);
  app.use("/api/managed-git", express.json({ limit: "16kb" }), managedGitRouter);
  app.use("/api/daily", dailyRouter);
  app.use("/api/social", express.json({ limit: "8kb" }), socialRouter);
  app.use("/api/github", githubRouter);
  app.use("/api/gitlab", gitlabRouter);
  app.post("/api/scheduled/daily", express.json({ limit: "2kb" }), scheduledDailyHandler);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on port ${port}`);
    startManagedGitSync();
  });
}

startServer().catch(error => { console.error(error); process.exit(1); });

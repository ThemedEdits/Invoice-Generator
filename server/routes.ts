import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // The application is completely serverless and uses Firebase on the client.
  // The only backend route needed might be a simple health check or placeholder.

  app.get(api.health.get.path, (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  return httpServer;
}

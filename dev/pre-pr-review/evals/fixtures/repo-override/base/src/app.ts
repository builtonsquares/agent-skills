import express, { type RequestHandler } from "express";
import { projectsRouter } from "./routes/projects";

/** Builds the API. `authenticate` is the session middleware that sets `req.user` for signed-in callers. */
export function createApp(authenticate: RequestHandler) {
  const app = express();
  app.use(authenticate);
  app.use(projectsRouter);
  return app;
}

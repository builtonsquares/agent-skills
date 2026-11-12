import express, { type RequestHandler } from "express";
import { projectsRouter } from "./routes/projects";
import { tasksRouter } from "./routes/tasks";

/** Builds the API. `authenticate` is the session middleware that sets `req.user` for signed-in callers. */
export function createApp(authenticate: RequestHandler) {
  const app = express();
  app.use(authenticate);
  app.use(projectsRouter);
  app.use(tasksRouter);
  return app;
}

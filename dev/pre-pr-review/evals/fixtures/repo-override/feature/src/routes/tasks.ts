import { Router, type Request, type Response } from "express";
import { requireUser, type AuthedRequest } from "../auth";
import { db } from "../db";

interface Task {
  id: string;
  title: string;
  done: boolean;
}

/** Lists a project's tasks, oldest first. Responds 404 unless the signed-in user owns the project. */
export async function listProjectTasks(req: Request, res: Response) {
  const { user } = req as AuthedRequest;
  const { projectId } = req.params;
  const owned = await db.query(
    "SELECT id FROM projects WHERE id = $1 AND owner_id = $2",
    [projectId, user.id],
  );
  if (owned.length === 0) {
    res.status(404).json({ error: "project not found" });
    return;
  }
  const tasks = await db.query<Task>(
    "SELECT id, title, done FROM tasks WHERE project_id = $1 ORDER BY created_at",
    [projectId],
  );
  res.json({ tasks });
}

export const tasksRouter = Router();
tasksRouter.get("/projects/:projectId/tasks", requireUser, listProjectTasks);

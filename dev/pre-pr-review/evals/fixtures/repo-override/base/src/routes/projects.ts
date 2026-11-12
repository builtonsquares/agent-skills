import { Router, type Request, type Response } from "express";
import { requireUser, type AuthedRequest } from "../auth";
import { findProjectsByOwner } from "../repositories/projects";

export async function listProjects(req: Request, res: Response) {
  const { user } = req as AuthedRequest;
  const projects = await findProjectsByOwner(user.id);
  res.json({ projects });
}

export const projectsRouter = Router();
projectsRouter.get("/projects", requireUser, listProjects);

import { db } from "../db";

export interface Project {
  id: string;
  name: string;
}

/** Projects owned by the user, oldest first. */
export function findProjectsByOwner(ownerId: string): Promise<Project[]> {
  return db.query<Project>("SELECT id, name FROM projects WHERE owner_id = $1 ORDER BY created_at", [ownerId]);
}

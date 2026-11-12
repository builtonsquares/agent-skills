import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../db";
import { listProjectTasks } from "./tasks";

vi.mock("../db", () => ({ db: { query: vi.fn() } }));

function fakeResponse() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function fakeRequest(userId: string, projectId: string) {
  return { user: { id: userId }, params: { projectId } } as unknown as Request;
}

beforeEach(() => {
  vi.mocked(db.query).mockReset();
});

describe("listProjectTasks", () => {
  it("returns the project's tasks when the user owns the project", async () => {
    const tasks = [{ id: "tsk-1", title: "Draft copy", done: false }];
    vi.mocked(db.query).mockResolvedValueOnce([{ id: "prj-1" }]).mockResolvedValueOnce(tasks);
    const res = fakeResponse();

    await listProjectTasks(fakeRequest("usr-1", "prj-1"), res as unknown as Response);

    expect(db.query).toHaveBeenNthCalledWith(1, expect.stringContaining("owner_id = $2"), ["prj-1", "usr-1"]);
    expect(db.query).toHaveBeenNthCalledWith(2, expect.stringContaining("project_id = $1"), ["prj-1"]);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ tasks });
  });

  it("responds 404 without loading tasks when the user does not own the project", async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);
    const res = fakeResponse();

    await listProjectTasks(fakeRequest("usr-2", "prj-1"), res as unknown as Response);

    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("owner_id = $2"), ["prj-1", "usr-2"]);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "project not found" });
  });
});

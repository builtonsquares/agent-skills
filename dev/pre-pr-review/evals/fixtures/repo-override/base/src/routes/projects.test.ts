import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findProjectsByOwner } from "../repositories/projects";
import { listProjects } from "./projects";

vi.mock("../repositories/projects", () => ({ findProjectsByOwner: vi.fn() }));

function fakeResponse() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.mocked(findProjectsByOwner).mockReset();
});

describe("listProjects", () => {
  it("returns the signed-in user's projects", async () => {
    const projects = [{ id: "prj-1", name: "Website" }];
    vi.mocked(findProjectsByOwner).mockResolvedValue(projects);
    const res = fakeResponse();

    await listProjects({ user: { id: "usr-1" } } as unknown as Request, res as unknown as Response);

    expect(findProjectsByOwner).toHaveBeenCalledWith("usr-1");
    expect(res.json).toHaveBeenCalledWith({ projects });
  });
});

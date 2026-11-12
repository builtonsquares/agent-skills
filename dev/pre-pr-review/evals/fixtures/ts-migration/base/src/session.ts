import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

const COOKIE_NAME = "sid";

function sign(payload: string): string {
  return createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");
}

export function issueSession(res: Response, userId: number): void {
  const maxAge = config.sessionTtlHours * 60 * 60 * 1000;
  const payload = `${userId}.${Date.now() + maxAge}`;
  res.cookie(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: config.sessionCookieSecure,
    sameSite: "lax",
    maxAge,
  });
}

function readSession(raw: unknown): number | null {
  if (typeof raw !== "string") {
    return null;
  }
  const [id, expires, signature] = raw.split(".");
  if (!id || !expires || !signature) {
    return null;
  }
  const expected = Buffer.from(sign(`${id}.${expires}`));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  if (Number(expires) < Date.now()) {
    return null;
  }
  return Number(id);
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const userId = readSession(req.cookies?.[COOKIE_NAME]);
  if (userId === null) {
    res.status(401).json({ error: "not signed in" });
    return;
  }
  res.locals.userId = userId;
  next();
}

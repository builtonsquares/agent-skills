import type { NextFunction, Request, Response } from "express";

export interface AuthedRequest extends Request {
  user: { id: string };
}

/** Rejects unauthenticated requests with 401. Session middleware upstream sets `req.user`. */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!(req as AuthedRequest).user) {
    res.status(401).end();
    return;
  }
  next();
}

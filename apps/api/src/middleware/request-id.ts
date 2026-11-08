import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  request.requestId = randomUUID();
  response.setHeader("x-request-id", request.requestId);
  next();
}

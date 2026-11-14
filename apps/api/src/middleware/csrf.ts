import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";

export function requireCsrfHeaders(allowedOrigin: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      next();
      return;
    }

    response.setHeader("Cache-Control", "no-store");

    const origin = request.get("origin");
    const requestedWith = request.get("x-requested-with");

    if (
      (origin !== undefined && origin !== allowedOrigin) ||
      requestedWith !== "XMLHttpRequest"
    ) {
      next(
        new AppError(
          403,
          "CSRF_REJECTED",
          "Request origin could not be verified.",
        ),
      );
      return;
    }

    next();
  };
}

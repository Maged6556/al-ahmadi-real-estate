import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";

export function requireCsrfHeaders(allowedOrigin: string) {
  return (request: Request, _response: Response, next: NextFunction) => {
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

import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import type { ErrorRequestHandler } from "express";
import { AppError } from "../lib/app-error.js";

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        requestId: request.requestId,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          code: issue.code,
        })),
        requestId: request.requestId,
      },
    });
    return;
  }

  if (error instanceof SyntaxError) {
    response.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON.",
        requestId: request.requestId,
      },
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    response.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "The uploaded file exceeds the allowed size.",
        requestId: request.requestId,
      },
    });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    response.status(409).json({
      error: {
        code: "CONFLICT",
        message: "The request conflicts with an existing record.",
        requestId: request.requestId,
      },
    });
    return;
  }

  console.error(
    JSON.stringify({
      level: "error",
      event: "unhandled_api_error",
      requestId: request.requestId,
    }),
  );
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred.",
      requestId: request.requestId,
    },
  });
};

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import type { AuthService } from "../modules/auth/auth.service.js";
import { can, type Permission } from "../modules/auth/permissions.js";

function getAccessToken(request: Request) {
  const authorization = request.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  const token = request.cookies?.access_token;
  return typeof token === "string" ? token : undefined;
}

export function requireAuth(authService: AuthService) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    const user = await authService.authenticate(getAccessToken(request));

    if (!user) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
      return;
    }

    request.authUser = user;
    next();
  };
}

export function requirePermission(permission: Permission) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.authUser) {
      next(new AppError(401, "UNAUTHENTICATED", "Authentication is required."));
      return;
    }

    if (!can(request.authUser, permission)) {
      next(new AppError(403, "FORBIDDEN", "You do not have permission."));
      return;
    }

    next();
  };
}

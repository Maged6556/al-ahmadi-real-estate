import { Router } from "express";
import { AppError } from "../../lib/app-error.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireCsrfHeaders } from "../../middleware/csrf.js";
import type { AuthService } from "./auth.service.js";
import {
  accountProfileSchema,
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from "./account-lifecycle.schemas.js";
import type { AccountLifecycleService } from "./account-lifecycle.service.js";

export function createAccountRouter(
  authService: AuthService,
  lifecycle: AccountLifecycleService,
  allowedOrigin: string,
  clearSession: (response: import("express").Response) => void,
) {
  const router = Router();
  const authenticate = requireAuth(authService);
  const csrf = requireCsrfHeaders(allowedOrigin);

  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use(authenticate);

  router.get("/", async (request, response) => {
    if (!request.authUser) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }
    response.status(200).json({
      data: { user: await lifecycle.getProfile(request.authUser.id) },
    });
  });

  router.patch("/", csrf, async (request, response) => {
    if (!request.authUser) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }
    const input = accountProfileSchema.parse(request.body);
    response.status(200).json({
      data: { user: await lifecycle.updateProfile(request.authUser.id, input) },
    });
  });

  router.post("/email", csrf, async (request, response) => {
    if (!request.authUser) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }
    const { email } = changeEmailSchema.parse(request.body);
    await lifecycle.requestEmailChange(request.authUser.id, email);
    response.status(202).json({
      data: {
        message:
          "If the address can be used, a confirmation link has been sent.",
      },
    });
  });

  router.post("/password", csrf, async (request, response) => {
    if (!request.authUser) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }
    const input = changePasswordSchema.parse(request.body);
    await lifecycle.updatePassword(
      request.authUser.id,
      input.currentPassword,
      input.newPassword,
    );
    clearSession(response);
    response.status(204).end();
  });

  router.delete("/", csrf, async (request, response) => {
    if (!request.authUser) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }
    const { currentPassword } = deleteAccountSchema.parse(request.body);
    await lifecycle.deleteAccount(request.authUser.id, currentPassword);
    clearSession(response);
    response.status(204).end();
  });

  return router;
}

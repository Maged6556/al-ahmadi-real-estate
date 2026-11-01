import { Router } from "express";
import type { Request, Response } from "express";
import { AppError } from "../../lib/app-error.js";
import { requireAuth } from "../../middleware/auth.js";
import type { ApiRateLimiters } from "../../middleware/rate-limit.js";
import { requireCsrfHeaders } from "../../middleware/csrf.js";
import {
  resetPasswordSchema,
  resetRequestSchema,
  verifyEmailSchema,
} from "./account-lifecycle.schemas.js";
import { resetRequestResponse } from "./account-lifecycle.service.js";
import type { AccountLifecycleService } from "./account-lifecycle.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import type { AuthService, AuthSession } from "./auth.service.js";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const AUTH_COOKIE_PATH = "/api";

function metadataFrom(request: Request) {
  const userAgent = request.get("user-agent");

  return {
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
    ip: (request.ip ?? request.socket.remoteAddress ?? "").slice(0, 64),
  };
}

function refreshCookie(request: Request) {
  const token = request.cookies?.[REFRESH_COOKIE];
  return typeof token === "string" ? token : undefined;
}

function setSessionCookies(
  response: Response,
  session: AuthSession,
  secure: boolean,
) {
  const commonOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: AUTH_COOKIE_PATH,
  };

  response.cookie(ACCESS_COOKIE, session.accessToken, {
    ...commonOptions,
    maxAge: session.accessTokenExpiresIn * 1000,
  });
  response.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...commonOptions,
    expires: session.refreshTokenExpiresAt,
  });
}

export function clearSessionCookies(response: Response, secure: boolean) {
  const options = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: AUTH_COOKIE_PATH,
  };

  response.clearCookie(ACCESS_COOKIE, options);
  response.clearCookie(REFRESH_COOKIE, options);
}

export function createAuthRouter(
  authService: AuthService,
  config: { cookieSecure: boolean; allowedOrigin: string },
  limiters: Pick<ApiRateLimiters, "auth" | "login" | "register">,
  lifecycle?: AccountLifecycleService,
) {
  const router = Router();
  const csrf = requireCsrfHeaders(config.allowedOrigin);
  const authenticate = requireAuth(authService);

  router.use(limiters.auth);
  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  router.post(
    "/register",
    csrf,
    limiters.register,
    async (request, response) => {
      const input = registerSchema.parse(request.body);
      const session = await authService.register(input, metadataFrom(request));
      if (lifecycle) {
        await lifecycle.sendVerificationEmail(session.user);
      } else {
        console.error(
          JSON.stringify({
            level: "error",
            event: "email_verification_not_queued",
            reason: "Account lifecycle service is not configured",
          }),
        );
      }
      setSessionCookies(response, session, config.cookieSecure);
      response.status(201).json({
        data: { user: session.user },
        meta: { accessTokenExpiresIn: session.accessTokenExpiresIn },
      });
    },
  );

  router.post("/login", csrf, limiters.login, async (request, response) => {
    const input = loginSchema.parse(request.body);
    const session = await authService.login(input, metadataFrom(request));
    setSessionCookies(response, session, config.cookieSecure);
    response.status(200).json({
      data: { user: session.user },
      meta: { accessTokenExpiresIn: session.accessTokenExpiresIn },
    });
  });

  router.post("/refresh", csrf, async (request, response, next) => {
    try {
      const session = await authService.refresh(
        refreshCookie(request),
        metadataFrom(request),
      );
      setSessionCookies(response, session, config.cookieSecure);
      response.status(200).json({
        data: { user: session.user },
        meta: { accessTokenExpiresIn: session.accessTokenExpiresIn },
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        clearSessionCookies(response, config.cookieSecure);
      }
      next(error);
    }
  });

  router.post("/logout", csrf, async (request, response) => {
    await authService.logout(refreshCookie(request));
    clearSessionCookies(response, config.cookieSecure);
    response.status(204).end();
  });

  router.get("/me", authenticate, (request, response) => {
    if (!request.authUser) {
      throw new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
    }

    response.status(200).json({ data: { user: request.authUser } });
  });

  router.post("/verify-email", csrf, async (request, response) => {
    if (!lifecycle) {
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email services are not configured.",
      );
    }
    const { token } = verifyEmailSchema.parse(request.body);
    await lifecycle.confirmEmailLink(token);
    response.status(200).json({ data: { message: "Email address verified." } });
  });

  router.post("/forgot-password", csrf, async (request, response) => {
    if (!lifecycle) {
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email services are not configured.",
      );
    }
    const { email } = resetRequestSchema.parse(request.body);
    void lifecycle.requestPasswordReset(email).catch((error: unknown) => {
      console.error(
        JSON.stringify({
          level: "error",
          event: "password_reset_request_failed",
          errorName: error instanceof Error ? error.name : "UnknownError",
        }),
      );
    });
    response.status(200).json({ data: resetRequestResponse });
  });

  router.post("/reset-password", csrf, async (request, response) => {
    if (!lifecycle) {
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email services are not configured.",
      );
    }
    const { token, password } = resetPasswordSchema.parse(request.body);
    await lifecycle.resetPassword(token, password);
    response.status(200).json({ data: { message: "Password updated." } });
  });

  router.post(
    "/resend-verification",
    csrf,
    authenticate,
    async (request, response) => {
      if (!lifecycle || !request.authUser) {
        throw new AppError(
          503,
          "EMAIL_UNAVAILABLE",
          "Email services are not configured.",
        );
      }
      if (!request.authUser.emailVerifiedAt) {
        await lifecycle.sendVerificationEmail(request.authUser);
      }
      response.status(202).json({
        data: {
          message: "If verification is needed, a new link has been sent.",
        },
      });
    },
  );

  return router;
}

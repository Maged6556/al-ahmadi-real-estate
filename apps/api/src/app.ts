import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import Redis from "ioredis";
import type { Redis as RedisClient } from "ioredis";
import { errorHandler } from "./middleware/error.js";
import { requestId } from "./middleware/request-id.js";
import { createApiRateLimiters } from "./middleware/rate-limit.js";
import { AppError } from "./lib/app-error.js";
import { prisma } from "./lib/prisma.js";
import {
  authRepository,
  type AuthRepository,
} from "./modules/auth/auth.repository.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { clearSessionCookies } from "./modules/auth/auth.routes.js";
import { createAccountRouter } from "./modules/auth/account.routes.js";
import type { AccountLifecycleService } from "./modules/auth/account-lifecycle.service.js";
import { AuthService } from "./modules/auth/auth.service.js";
import type { ApiEnv } from "./config/env.js";
import {
  listingsRepository,
  type ListingRepository,
} from "./modules/listings/listings.repository.js";
import { createListingsRouter } from "./modules/listings/listings.routes.js";
import {
  mediaRepository,
  type MediaRepository,
} from "./modules/media/media.repository.js";
import { createMediaRouter } from "./modules/media/media.routes.js";
import { CloudinaryStorage } from "./modules/media/cloudinary-storage.js";
import type { StorageProvider } from "./modules/media/storage-provider.js";
import {
  dashboardRepository,
  type DashboardRepository,
} from "./modules/admin/dashboard.repository.js";
import { createDashboardRouter } from "./modules/admin/dashboard.routes.js";
import { requireCsrfHeaders } from "./middleware/csrf.js";

export function createApp(
  env: ApiEnv,
  dependencies: {
    authRepository?: AuthRepository;
    listingsRepository?: ListingRepository;
    mediaRepository?: MediaRepository;
    mediaStorage?: StorageProvider;
    dashboardRepository?: DashboardRepository;
    accountLifecycle?: AccountLifecycleService;
    rateLimiters?: ReturnType<typeof createApiRateLimiters>;
    redisClient?: RedisClient;
  } = {},
) {
  const app = express();
  const redis =
    dependencies.redisClient ??
    new Redis(env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  const rateLimiters =
    dependencies.rateLimiters ?? createApiRateLimiters(redis);
  const authService = new AuthService(
    dependencies.authRepository ?? authRepository,
    {
      accessTokenSecret: env.JWT_ACCESS_SECRET,
      accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTokenTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    },
  );
  const mediaStorage =
    dependencies.mediaStorage ??
    (env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
      ? new CloudinaryStorage({
          cloudName: env.CLOUDINARY_CLOUD_NAME,
          apiKey: env.CLOUDINARY_API_KEY,
          apiSecret: env.CLOUDINARY_API_SECRET,
        })
      : undefined);

  app.locals.redisClient = redis;
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'none'"],
          frameAncestors: ["'none'"],
          formAction: ["'none'"],
          mediaSrc: ["https:"],
        },
      },
      frameguard: { action: "deny" },
    }),
  );
  app.use((_request, response, next) => {
    response.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Upload-Token",
        "X-Upload-Content-Type",
      ],
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  );
  app.use(requestId);
  app.use("/api", requireCsrfHeaders(env.CORS_ORIGIN));
  app.use(rateLimiters.global);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/healthz", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.get("/readyz", async (_request, response) => {
    try {
      await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
      response.status(200).json({ status: "ready" });
    } catch {
      console.error(
        JSON.stringify({
          level: "error",
          event: "readiness_check_failed",
        }),
      );
      response.status(503).json({ status: "not_ready" });
    }
  });

  app.use(
    "/api/auth",
    createAuthRouter(
      authService,
      {
        cookieSecure: env.NODE_ENV === "production",
        allowedOrigin: env.CORS_ORIGIN,
      },
      rateLimiters,
      dependencies.accountLifecycle,
    ),
  );

  if (dependencies.accountLifecycle) {
    app.use(
      "/api/account",
      createAccountRouter(
        authService,
        dependencies.accountLifecycle,
        env.CORS_ORIGIN,
        (response) =>
          clearSessionCookies(response, env.NODE_ENV === "production"),
      ),
    );
  }

  app.use(
    "/api",
    createListingsRouter(
      dependencies.listingsRepository ?? listingsRepository,
      authService,
      env,
    ),
  );

  app.use(
    "/api/admin",
    createDashboardRouter(
      dependencies.dashboardRepository ?? dashboardRepository,
      authService,
    ),
  );

  app.use(
    "/api/admin/media",
    createMediaRouter(
      dependencies.mediaRepository ?? mediaRepository,
      authService,
      env,
      mediaStorage,
    ),
  );

  app.use("/api", (_request, _response, next) => {
    next(
      new AppError(404, "NOT_FOUND", "The requested resource was not found."),
    );
  });
  app.use(errorHandler);

  return app;
}

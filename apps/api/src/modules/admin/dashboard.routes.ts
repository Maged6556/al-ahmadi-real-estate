import { Router } from "express";
import { z } from "zod";
import { requireAuth, requirePermission } from "../../middleware/auth.js";
import type { AuthService } from "../auth/auth.service.js";
import type { DashboardRepository } from "./dashboard.repository.js";

const auditQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export function createDashboardRouter(
  repository: DashboardRepository,
  authService: AuthService,
) {
  const router = Router();
  const authenticate = requireAuth(authService);

  router.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get(
    "/stats",
    authenticate,
    requirePermission("admin:access"),
    async (_request, response) => {
      response.status(200).json({ data: await repository.getStats() });
    },
  );

  router.get(
    "/audit",
    authenticate,
    requirePermission("admin:view_audit"),
    async (request, response) => {
      const { page, limit } = auditQuerySchema.parse(request.query);
      const result = await repository.getAuditPage({
        skip: (page - 1) * limit,
        take: limit,
      });
      response.status(200).json({
        data: result.data,
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    },
  );

  return router;
}

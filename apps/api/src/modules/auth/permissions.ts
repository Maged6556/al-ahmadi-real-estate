import { UserRole } from "@prisma/client";
import type { PublicUser } from "./auth.service.js";

export type Permission =
  | "admin:access"
  | "admin:manage_users"
  | "admin:view_audit"
  | "listing:write"
  | "listing:delete"
  | "media:write";

const permissionMap: Record<Permission, ReadonlySet<UserRole>> = {
  "admin:access": new Set([UserRole.ADMIN, UserRole.EDITOR]),
  "admin:manage_users": new Set([UserRole.ADMIN]),
  "admin:view_audit": new Set([UserRole.ADMIN]),
  "listing:write": new Set([UserRole.ADMIN, UserRole.EDITOR]),
  "listing:delete": new Set([UserRole.ADMIN]),
  "media:write": new Set([UserRole.ADMIN]),
};

export function can(
  user: Pick<PublicUser, "role"> | null | undefined,
  permission: Permission,
) {
  return user ? permissionMap[permission].has(user.role) : false;
}

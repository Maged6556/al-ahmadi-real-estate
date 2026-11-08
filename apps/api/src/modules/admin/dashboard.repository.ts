import { ListingStatus, ListingType, type PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export type DashboardStats = {
  listings: {
    total: number;
    published: number;
    byStatus: { value: ListingStatus; count: number }[];
    byType: { value: ListingType; count: number }[];
  };
  inquiries: {
    total: number;
    whatsappClicks: number;
    byChannel: { value: string; count: number }[];
  };
};

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  diff: unknown;
  createdAt: Date;
  actor: { id: string; name: string | null; email: string } | null;
};

export interface DashboardRepository {
  getStats(): Promise<DashboardStats>;
  getAuditPage(input: {
    skip: number;
    take: number;
  }): Promise<{ data: AuditEntry[]; total: number }>;
}

export function createDashboardRepository(
  client: PrismaClient,
): DashboardRepository {
  return {
    async getStats() {
      const activeListings = { deletedAt: null };
      const [
        total,
        published,
        statusGroups,
        typeGroups,
        totalInquiries,
        whatsappClicks,
        channelGroups,
      ] = await Promise.all([
        client.listing.count({ where: activeListings }),
        client.listing.count({
          where: { ...activeListings, isPublished: true },
        }),
        client.listing.groupBy({
          by: ["status"],
          where: activeListings,
          _count: { _all: true },
        }),
        client.listing.groupBy({
          by: ["type"],
          where: activeListings,
          _count: { _all: true },
        }),
        client.inquiry.count(),
        client.inquiry.count({
          where: { channel: { contains: "whatsapp", mode: "insensitive" } },
        }),
        client.inquiry.groupBy({
          by: ["channel"],
          _count: { _all: true },
        }),
      ]);

      return {
        listings: {
          total,
          published,
          byStatus: statusGroups.map(({ status, _count }) => ({
            value: status,
            count: _count._all,
          })),
          byType: typeGroups.map(({ type, _count }) => ({
            value: type,
            count: _count._all,
          })),
        },
        inquiries: {
          total: totalInquiries,
          whatsappClicks,
          byChannel: channelGroups.map(({ channel, _count }) => ({
            value: channel,
            count: _count._all,
          })),
        },
      };
    },

    async getAuditPage({ skip, take }) {
      const [rows, total] = await Promise.all([
        client.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          skip,
          take,
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            diff: true,
            createdAt: true,
            actor: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        client.auditLog.count(),
      ]);

      return { data: rows, total };
    },
  };
}

export const dashboardRepository = createDashboardRepository(prisma);

import { LeadStage, type Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

function validateE164(phone: string) {
  const normalizedPhone = phone.trim();

  if (!/^\+[1-9]\d{1,14}$/.test(normalizedPhone)) {
    throw new Error("Lead phone must be a normalized E.164 number.");
  }

  return normalizedPhone;
}

export const leadsRepository = {
  findActiveByPhone(phone: string) {
    return prisma.lead.findUnique({
      where: { activePhone: validateE164(phone) },
    });
  },

  create(data: Prisma.LeadCreateInput) {
    const phone = validateE164(data.phone);
    const stage = data.stage ?? LeadStage.NEW;

    return prisma.lead.create({
      data: {
        ...data,
        phone,
        activePhone:
          stage === LeadStage.WON || stage === LeadStage.LOST ? null : phone,
      },
    });
  },

  update(id: string, data: Prisma.LeadUpdateInput) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.lead.findUniqueOrThrow({
        where: { id },
        select: { phone: true, stage: true },
      });
      const phone = validateE164(
        typeof data.phone === "string"
          ? data.phone
          : (data.phone?.set ?? current.phone),
      );
      const stage =
        typeof data.stage === "string"
          ? data.stage
          : (data.stage?.set ?? current.stage);

      return transaction.lead.update({
        where: { id },
        data: {
          ...data,
          phone,
          activePhone:
            stage === LeadStage.WON || stage === LeadStage.LOST ? null : phone,
        },
      });
    });
  },
};

// Compatibility surface for code that still imports the Prisma ORM 6 client
// package (the frozen test suites). The application itself uses the Prisma 8
// client from the Composer service; this module only re-exports the same enum
// values and Decimal class the generated Prisma ORM 6 client exported.
//
// Enum members keep their Prisma ORM 6 member-name values (the values the old
// generated client exported); database-mapped members (`@map`) keep the member
// name as the exported value, exactly as Prisma ORM 6 did.
import { Decimal as DecimalClass } from "decimal.js";

export const UserRole = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  USER: "USER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const EmailTokenType = {
  VERIFY_EMAIL: "VERIFY_EMAIL",
  RESET_PASSWORD: "RESET_PASSWORD",
  CHANGE_EMAIL: "CHANGE_EMAIL",
} as const;
export type EmailTokenType =
  (typeof EmailTokenType)[keyof typeof EmailTokenType];

export const ImportJobStatus = {
  PENDING: "PENDING",
  VALIDATED: "VALIDATED",
  COMMITTED: "COMMITTED",
  FAILED: "FAILED",
} as const;
export type ImportJobStatus =
  (typeof ImportJobStatus)[keyof typeof ImportJobStatus];

export const ListingType = {
  APARTMENT: "APARTMENT",
  BUILDING: "BUILDING",
  RESIDENTIAL_UNIT: "RESIDENTIAL_UNIT",
  VILLA: "VILLA",
  LAND: "LAND",
} as const;
export type ListingType = (typeof ListingType)[keyof typeof ListingType];

export const ListingOffer = {
  SALE: "SALE",
  RENT: "RENT",
} as const;
export type ListingOffer = (typeof ListingOffer)[keyof typeof ListingOffer];

export const ListingStatus = {
  AVAILABLE: "AVAILABLE",
  SOLD: "SOLD",
  RENTED: "RENTED",
} as const;
export type ListingStatus =
  (typeof ListingStatus)[keyof typeof ListingStatus];

export const LeadSource = {
  WHATSAPP_LISTING: "WHATSAPP_LISTING",
  WHATSAPP_FLOATING: "WHATSAPP_FLOATING",
  PROPERTY_REQUEST: "PROPERTY_REQUEST",
  OWNER_SUBMISSION: "OWNER_SUBMISSION",
  PHONE: "PHONE",
  REFERRAL: "REFERRAL",
  SOCIAL: "SOCIAL",
  OTHER: "OTHER",
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LeadStage = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  NEGOTIATING: "NEGOTIATING",
  WON: "WON",
  LOST: "LOST",
} as const;
export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

export const LeadLostReason = {
  NO_RESPONSE: "NO_RESPONSE",
  BUDGET_MISMATCH: "BUDGET_MISMATCH",
  BOUGHT_ELSEWHERE: "BOUGHT_ELSEWHERE",
  LOCATION_MISMATCH: "LOCATION_MISMATCH",
  NOT_SERIOUS: "NOT_SERIOUS",
  OTHER: "OTHER",
} as const;
export type LeadLostReason =
  (typeof LeadLostReason)[keyof typeof LeadLostReason];

export const CommissionStatus = {
  EXPECTED: "EXPECTED",
  INVOICED: "INVOICED",
  COLLECTED: "COLLECTED",
  WAIVED: "WAIVED",
} as const;
export type CommissionStatus =
  (typeof CommissionStatus)[keyof typeof CommissionStatus];

export const LeadActivityType = {
  NOTE: "NOTE",
  CALL: "CALL",
  WHATSAPP: "WHATSAPP",
  STAGE_CHANGE: "STAGE_CHANGE",
  REMINDER_DONE: "REMINDER_DONE",
} as const;
export type LeadActivityType =
  (typeof LeadActivityType)[keyof typeof LeadActivityType];

export const PropertyRequestStatus = {
  OPEN: "OPEN",
  MATCHED: "MATCHED",
  CLOSED: "CLOSED",
} as const;
export type PropertyRequestStatus =
  (typeof PropertyRequestStatus)[keyof typeof PropertyRequestStatus];

export const OwnerSubmissionStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NEEDS_INFO: "NEEDS_INFO",
} as const;
export type OwnerSubmissionStatus =
  (typeof OwnerSubmissionStatus)[keyof typeof OwnerSubmissionStatus];

export const MediaKind = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
} as const;
export type MediaKind = (typeof MediaKind)[keyof typeof MediaKind];

export const Prisma = {
  Decimal: DecimalClass,
};
export type Prisma = {
  Decimal: DecimalClass;
};

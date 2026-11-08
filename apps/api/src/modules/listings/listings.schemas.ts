import { z } from "zod";
import {
  listingOfferSchema,
  listingStatusSchema,
  listingTypeSchema,
} from "@al-ahmadi/shared";

const pageSchema = z.coerce.number().int().min(1).max(1_000_000).default(1);
const limitSchema = z.coerce.number().int().min(1).max(24).default(24);
const searchSchema = z.string().trim().min(1).max(100).optional();
const citySchema = z.string().trim().min(1).max(120).optional();
const districtSchema = z.string().trim().min(1).max(120).optional();
const listingFeaturesSchema = z.array(z.string().trim().min(1).max(80)).max(30);

export const publicListingQuerySchema = z
  .object({
    type: listingTypeSchema.optional(),
    offer: listingOfferSchema.optional(),
    city: citySchema,
    district: districtSchema,
    status: listingStatusSchema.optional(),
    q: searchSchema,
    page: pageSchema,
    limit: limitSchema,
  })
  .strict();

export const adminListingQuerySchema = z
  .object({
    type: listingTypeSchema.optional(),
    offer: listingOfferSchema.optional(),
    status: listingStatusSchema.optional(),
    city: citySchema,
    q: searchSchema,
    isPublished: z.enum(["true", "false"]).optional(),
    page: pageSchema,
    limit: limitSchema,
  })
  .strict();

const listingFieldsSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{2,40}$/),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u),
  type: listingTypeSchema,
  offer: listingOfferSchema,
  titleAr: z.string().trim().min(1).max(180),
  titleEn: z.string().trim().min(1).max(180),
  descriptionAr: z.string().trim().min(1).max(10_000),
  descriptionEn: z.string().trim().min(1).max(10_000),
  city: z.string().trim().min(1).max(120),
  district: z.string().trim().max(120).nullable().optional(),
  addressText: z.string().trim().max(500).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  areaSqm: z.number().positive().max(1_000_000).nullable().optional(),
  bedrooms: z.number().int().min(0).max(100).nullable().optional(),
  bathrooms: z.number().int().min(0).max(100).nullable().optional(),
  floor: z.number().int().min(-10).max(300).nullable().optional(),
  features: listingFeaturesSchema,
});

export const createListingSchema = listingFieldsSchema
  .extend({ features: listingFeaturesSchema.default([]) })
  .strict();

export const updateListingSchema = listingFieldsSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one listing field must be provided.",
  });

export const listingIdParamsSchema = z
  .object({ id: z.string().uuid() })
  .strict();

export const listingSlugParamsSchema = z
  .object({ slug: z.string().min(1).max(180) })
  .strict();

export const listingStatusBodySchema = z
  .object({ status: listingStatusSchema })
  .strict();

export const listingPublishBodySchema = z
  .object({ isPublished: z.boolean() })
  .strict();

export type PublicListingQuery = z.infer<typeof publicListingQuerySchema>;
export type AdminListingQuery = z.infer<typeof adminListingQuerySchema>;
export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

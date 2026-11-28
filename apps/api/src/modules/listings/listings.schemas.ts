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

const optionalIntSchema = z.coerce.number().int().min(0).max(10000).optional();
const optionalNonNegativeSchema = z.coerce
  .number()
  .min(0)
  .max(1_000_000)
  .optional();
const finishingTypeSchema = z.enum(["full", "semi", "raw"]).optional();
const yesNoSchema = z.enum(["yes", "no"]).optional();

const apartmentDetailsSchema = z
  .object({
    floorNumber: optionalIntSchema,
    totalFloors: optionalIntSchema,
    finishingType: finishingTypeSchema,
    elevator: yesNoSchema,
    utilities: z
      .array(z.enum(["electricity", "water", "gas"]))
      .optional(),
  })
  .strip();

const residentialUnitDetailsSchema = z
  .object({
    unitSubType: z
      .enum(["duplex", "roof", "studio", "ground_garden"])
      .optional(),
    gardenRoofArea: optionalNonNegativeSchema,
    finishingType: finishingTypeSchema,
    privateEntrance: yesNoSchema,
  })
  .strip();

const villaDetailsSchema = z
  .object({
    landArea: optionalNonNegativeSchema,
    gardenArea: optionalNonNegativeSchema,
    swimmingPool: yesNoSchema,
    garage: yesNoSchema,
    finishingType: finishingTypeSchema,
  })
  .strip();

const buildingDetailsSchema = z
  .object({
    totalLandArea: optionalNonNegativeSchema,
    builtUpAreaPerFloor: optionalNonNegativeSchema,
    totalUnits: optionalIntSchema,
    commercialShops: optionalIntSchema,
    elevator: yesNoSchema,
    buildingStatus: z.enum(["licensed", "under_construction", "ready"]).optional(),
    incomeYield: optionalNonNegativeSchema,
  })
  .strip();

const landDetailsSchema = z
  .object({
    landClassification: z
      .enum(["residential", "commercial", "agricultural", "industrial"])
      .optional(),
    streetWidth: optionalNonNegativeSchema,
    facadeLength: optionalNonNegativeSchema,
    buildingLicense: yesNoSchema,
    utilities: z.array(z.enum(["water", "electricity", "sewage"])).optional(),
  })
  .strip();

const detailSchemas = {
  apartment: apartmentDetailsSchema,
  residential_unit: residentialUnitDetailsSchema,
  villa: villaDetailsSchema,
  building: buildingDetailsSchema,
  land: landDetailsSchema,
} as const;

export function normalizeListingDetails(
  type: string,
  details: unknown,
): Record<string, unknown> | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const schema = detailSchemas[type as keyof typeof detailSchemas];
  if (!schema) {
    return details as Record<string, unknown>;
  }
  return schema.parse(details) as Record<string, unknown>;
}

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
  details: z
    .preprocess(
      (value) => (value === undefined ? undefined : value),
      z.record(z.string(), z.any()).nullable().optional(),
    ),
});

export const createListingSchema = listingFieldsSchema
  .extend({ features: listingFeaturesSchema.default([]) })
  .refine((value) => {
    const details = value.details;
    if (!details) return true;
    const schema = detailSchemas[value.type];
    if (!schema) return true;
    return schema.safeParse(details).success;
  }, {
    message: "Invalid property details for the selected property type.",
    path: ["details"],
  })
  .strict();

export const updateListingSchema = listingFieldsSchema
  .partial()
  .refine((value) => {
    const details = value.details;
    if (!details) return true;
    if (value.type === undefined) return true;
    const schema = detailSchemas[value.type];
    if (!schema) return true;
    return schema.safeParse(details).success;
  }, {
    message: "Invalid property details for the selected property type.",
    path: ["details"],
  })
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

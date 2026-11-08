import { z } from "zod";

export const supportedImageMimeSchema = z.enum([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const createUploadGrantSchema = z
  .object({
    listingId: z.string().uuid(),
    contentType: supportedImageMimeSchema,
  })
  .strict();

export const videoLinkSchema = z
  .object({
    listingId: z.string().uuid(),
    url: z
      .string()
      .trim()
      .url()
      .max(2048)
      .refine((value) => {
        try {
          const parsed = new URL(value);
          return (
            parsed.protocol === "https:" &&
            !parsed.username &&
            !parsed.password &&
            /\.(mp4|webm)$/i.test(parsed.pathname)
          );
        } catch {
          return false;
        }
      }),
  })
  .strict();

export const mediaIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

const reorderItemSchema = z
  .object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0).max(19),
    isCover: z.boolean(),
  })
  .strict();

export const reorderMediaSchema = z
  .object({
    listingId: z.string().uuid(),
    media: z.array(reorderItemSchema).min(1).max(20),
  })
  .strict()
  .superRefine(({ media }, context) => {
    const ids = new Set(media.map(({ id }) => id));
    const sortOrders = new Set(media.map(({ sortOrder }) => sortOrder));
    const coverCount = media.filter(({ isCover }) => isCover).length;

    if (ids.size !== media.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["media"],
        message: "Media IDs must be unique.",
      });
    }

    if (
      sortOrders.size !== media.length ||
      media.some(({ sortOrder }) => sortOrder >= media.length)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["media"],
        message: "Sort orders must be contiguous and unique starting at zero.",
      });
    }

    if (coverCount > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["media"],
        message: "At most one media item can be marked as the cover.",
      });
    }
  });

export type SupportedImageMime = z.infer<typeof supportedImageMimeSchema>;
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;

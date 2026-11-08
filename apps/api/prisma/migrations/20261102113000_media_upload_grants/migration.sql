CREATE TABLE "MediaUploadGrant" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "mimeType" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUploadGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaUploadGrant_tokenHash_key"
ON "MediaUploadGrant"("tokenHash");

CREATE INDEX "MediaUploadGrant_listingId_expiresAt_idx"
ON "MediaUploadGrant"("listingId", "expiresAt");

CREATE INDEX "MediaUploadGrant_actorId_expiresAt_idx"
ON "MediaUploadGrant"("actorId", "expiresAt");

CREATE UNIQUE INDEX "Media_one_cover_per_listing_idx"
ON "Media"("listingId")
WHERE "isCover" = true;

ALTER TABLE "MediaUploadGrant"
ADD CONSTRAINT "MediaUploadGrant_listingId_fkey"
FOREIGN KEY ("listingId") REFERENCES "Listing"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaUploadGrant"
ADD CONSTRAINT "MediaUploadGrant_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

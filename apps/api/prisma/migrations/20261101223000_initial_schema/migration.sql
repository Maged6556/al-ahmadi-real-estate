CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR', 'USER');

-- CreateEnum
CREATE TYPE "EmailTokenType" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'VALIDATED', 'COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "ListingType" AS ENUM ('apartment', 'building', 'residential_unit', 'villa', 'land');

-- CreateEnum
CREATE TYPE "ListingOffer" AS ENUM ('sale', 'rent');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('available', 'sold', 'rented');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('whatsapp_listing', 'whatsapp_floating', 'property_request', 'owner_submission', 'phone', 'referral', 'social', 'other');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('new', 'contacted', 'negotiating', 'won', 'lost');

-- CreateEnum
CREATE TYPE "LeadLostReason" AS ENUM ('no_response', 'budget_mismatch', 'bought_elsewhere', 'location_mismatch', 'not_serious', 'other');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('EXPECTED', 'INVOICED', 'COLLECTED', 'WAIVED');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('NOTE', 'CALL', 'WHATSAPP', 'STAGE_CHANGE', 'REMINDER_DONE');

-- CreateEnum
CREATE TYPE "PropertyRequestStatus" AS ENUM ('OPEN', 'MATCHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OwnerSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "preferredLocale" VARCHAR(2) NOT NULL DEFAULT 'ar',
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "EmailTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","listingId")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "okRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errorReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "type" "ListingType",
    "offer" "ListingOffer",
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "introAr" TEXT NOT NULL,
    "introEn" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "activePhone" VARCHAR(16),
    "email" VARCHAR(320),
    "source" "LeadSource" NOT NULL,
    "stage" "LeadStage" NOT NULL DEFAULT 'new',
    "assignedToId" UUID,
    "interestedListingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredLocale" VARCHAR(2) NOT NULL DEFAULT 'ar',
    "budgetMin" DECIMAL(14,2),
    "budgetMax" DECIMAL(14,2),
    "notesSummary" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "lostReason" "LeadLostReason",
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "listingId" UUID,
    "offer" "ListingOffer" NOT NULL,
    "agreedPrice" DECIMAL(14,2),
    "commissionPercent" DECIMAL(5,2),
    "commissionAmount" DECIMAL(14,2),
    "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'EXPECTED',
    "collectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyRequest" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "offer" "ListingOffer" NOT NULL,
    "types" "ListingType"[],
    "city" TEXT NOT NULL,
    "districts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bedroomsMin" INTEGER,
    "areaMin" DECIMAL(10,2),
    "budgetMin" DECIMAL(14,2),
    "budgetMax" DECIMAL(14,2),
    "notes" TEXT,
    "status" "PropertyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerSubmission" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "ownerName" TEXT NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "offer" "ListingOffer" NOT NULL,
    "type" "ListingType" NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "addressText" TEXT,
    "areaSqm" DECIMAL(10,2),
    "bedrooms" INTEGER,
    "description" TEXT NOT NULL,
    "ownerAskingPrice" DECIMAL(14,2),
    "ownerAskingCurrency" CHAR(3),
    "commissionNoticeVersion" TEXT,
    "commissionAcknowledgedAt" TIMESTAMP(3),
    "commissionAckIpHash" TEXT,
    "commissionTermsSnapshot" JSONB,
    "status" "OwnerSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "convertedListingId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerSubmissionMedia" (
    "id" UUID NOT NULL,
    "ownerSubmissionId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerSubmissionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "consented" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ListingType" NOT NULL,
    "offer" "ListingOffer" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'available',
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT,
    "addressText" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "areaSqm" DECIMAL(10,2),
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "floor" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "rentedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "altAr" TEXT,
    "altEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" UUID NOT NULL,
    "listingId" UUID,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailToken_userId_type_expiresAt_idx" ON "EmailToken"("userId", "type", "expiresAt");

-- CreateIndex
CREATE INDEX "Favorite_listingId_idx" ON "Favorite"("listingId");

-- CreateIndex
CREATE INDEX "ImportJob_actorId_createdAt_idx" ON "ImportJob"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_status_createdAt_idx" ON "ImportJob"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_isPublished_city_idx" ON "LandingPage"("isPublished", "city");

-- CreateIndex
CREATE INDEX "LandingPage_city_district_type_offer_idx" ON "LandingPage"("city", "district", "type", "offer");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_activePhone_key" ON "Lead"("activePhone");

-- CreateIndex
CREATE INDEX "Lead_stage_nextFollowUpAt_idx" ON "Lead"("stage", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_assignedToId_stage_updatedAt_idx" ON "Lead"("assignedToId", "stage", "updatedAt");

-- CreateIndex
CREATE INDEX "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_leadId_key" ON "Deal"("leadId");

-- CreateIndex
CREATE INDEX "Deal_commissionStatus_createdAt_idx" ON "Deal"("commissionStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Deal_listingId_idx" ON "Deal"("listingId");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_actorId_createdAt_idx" ON "LeadActivity"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyRequest_status_offer_city_idx" ON "PropertyRequest"("status", "offer", "city");

-- CreateIndex
CREATE INDEX "PropertyRequest_leadId_createdAt_idx" ON "PropertyRequest"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerSubmission_convertedListingId_key" ON "OwnerSubmission"("convertedListingId");

-- CreateIndex
CREATE INDEX "OwnerSubmission_status_createdAt_idx" ON "OwnerSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerSubmission_phone_city_type_createdAt_idx" ON "OwnerSubmission"("phone", "city", "type", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerSubmission_leadId_idx" ON "OwnerSubmission"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerSubmissionMedia_publicId_key" ON "OwnerSubmissionMedia"("publicId");

-- CreateIndex
CREATE INDEX "OwnerSubmissionMedia_ownerSubmissionId_sortOrder_idx" ON "OwnerSubmissionMedia"("ownerSubmissionId", "sortOrder");

-- CreateIndex
CREATE INDEX "ConsentLog_version_createdAt_idx" ON "ConsentLog"("version", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_family_idx" ON "RefreshToken"("userId", "family");

-- CreateIndex
CREATE INDEX "RefreshToken_family_revokedAt_idx" ON "RefreshToken"("family", "revokedAt");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_code_key" ON "Listing"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE INDEX "Listing_status_type_offer_city_idx" ON "Listing"("status", "type", "offer", "city");

-- CreateIndex
CREATE INDEX "Listing_isPublished_deletedAt_createdAt_idx" ON "Listing"("isPublished", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Listing_city_district_idx" ON "Listing"("city", "district");

-- CreateIndex
CREATE INDEX "Listing_type_offer_status_idx" ON "Listing"("type", "offer", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Media_publicId_key" ON "Media"("publicId");

-- CreateIndex
CREATE INDEX "Media_listingId_sortOrder_idx" ON "Media"("listingId", "sortOrder");

-- CreateIndex
CREATE INDEX "Media_listingId_isCover_idx" ON "Media"("listingId", "isCover");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_listingId_createdAt_idx" ON "Inquiry"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "Inquiry_channel_createdAt_idx" ON "Inquiry"("channel", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyRequest" ADD CONSTRAINT "PropertyRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerSubmission" ADD CONSTRAINT "OwnerSubmission_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerSubmission" ADD CONSTRAINT "OwnerSubmission_convertedListingId_fkey" FOREIGN KEY ("convertedListingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerSubmissionMedia" ADD CONSTRAINT "OwnerSubmissionMedia_ownerSubmissionId_fkey" FOREIGN KEY ("ownerSubmissionId") REFERENCES "OwnerSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
    ADD CONSTRAINT "User_email_lowercase_check" CHECK ("email" = lower("email")),
    ADD CONSTRAINT "User_preferredLocale_check" CHECK ("preferredLocale" IN ('ar', 'en')),
    ADD CONSTRAINT "User_failedLoginCount_nonnegative_check" CHECK ("failedLoginCount" >= 0);

ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_phone_e164_check" CHECK ("phone" ~ '^[+][1-9][0-9]{1,14}$'),
    ADD CONSTRAINT "Lead_activePhone_consistency_check"
        CHECK (
            ("stage" IN ('won', 'lost') AND "activePhone" IS NULL)
            OR ("stage" NOT IN ('won', 'lost') AND "activePhone" = "phone")
        ),
    ADD CONSTRAINT "Lead_budget_range_check"
        CHECK ("budgetMin" IS NULL OR "budgetMax" IS NULL OR "budgetMin" <= "budgetMax"),
    ADD CONSTRAINT "Lead_preferredLocale_check" CHECK ("preferredLocale" IN ('ar', 'en'));

ALTER TABLE "PropertyRequest"
    ADD CONSTRAINT "PropertyRequest_budget_range_check"
        CHECK ("budgetMin" IS NULL OR "budgetMax" IS NULL OR "budgetMin" <= "budgetMax"),
    ADD CONSTRAINT "PropertyRequest_nonnegative_requirements_check"
        CHECK (("bedroomsMin" IS NULL OR "bedroomsMin" >= 0) AND ("areaMin" IS NULL OR "areaMin" >= 0));

ALTER TABLE "OwnerSubmission"
    ADD CONSTRAINT "OwnerSubmission_nonnegative_values_check"
        CHECK (("phone" ~ '^[+][1-9][0-9]{1,14}$') AND ("ownerAskingPrice" IS NULL OR "ownerAskingPrice" >= 0) AND ("areaSqm" IS NULL OR "areaSqm" >= 0) AND ("bedrooms" IS NULL OR "bedrooms" >= 0));

ALTER TABLE "Deal"
    ADD CONSTRAINT "Deal_nonnegative_amounts_check"
        CHECK (
            ("agreedPrice" IS NULL OR "agreedPrice" >= 0)
            AND ("commissionPercent" IS NULL OR ("commissionPercent" >= 0 AND "commissionPercent" <= 100))
            AND ("commissionAmount" IS NULL OR "commissionAmount" >= 0)
        );

ALTER TABLE "Listing"
    ADD CONSTRAINT "Listing_coordinate_range_check"
        CHECK (
            ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90)
            AND ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
        ),
    ADD CONSTRAINT "Listing_nonnegative_dimensions_check"
        CHECK (
            ("areaSqm" IS NULL OR "areaSqm" >= 0)
            AND ("bedrooms" IS NULL OR "bedrooms" >= 0)
            AND ("bathrooms" IS NULL OR "bathrooms" >= 0)
        );

CREATE INDEX "Listing_titleAr_trgm_idx" ON "Listing" USING GIN ("titleAr" gin_trgm_ops);
CREATE INDEX "Listing_titleEn_trgm_idx" ON "Listing" USING GIN ("titleEn" gin_trgm_ops);
CREATE INDEX "Listing_city_trgm_idx" ON "Listing" USING GIN ("city" gin_trgm_ops);

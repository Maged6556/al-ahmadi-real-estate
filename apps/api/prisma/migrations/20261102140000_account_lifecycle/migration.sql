ALTER TYPE "EmailTokenType" ADD VALUE 'CHANGE_EMAIL';

ALTER TABLE "User"
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" VARCHAR(32),
ADD COLUMN "privacyVersion" VARCHAR(32);

ALTER TABLE "EmailToken"
ADD COLUMN "targetEmail" VARCHAR(320);

CREATE INDEX "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");

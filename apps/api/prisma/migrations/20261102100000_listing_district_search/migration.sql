CREATE INDEX "Listing_district_trgm_idx"
ON "Listing" USING GIN ("district" gin_trgm_ops);

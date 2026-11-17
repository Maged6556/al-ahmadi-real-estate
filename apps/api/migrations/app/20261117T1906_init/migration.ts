#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d1da3067423918d0121167030f063052689363f18fa1377c3ab8e38816c19caf/contract';
import endContract from '../../snapshots/d1da3067423918d0121167030f063052689363f18fa1377c3ab8e38816c19caf/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'CommissionStatus',
        members: ['EXPECTED', 'INVOICED', 'COLLECTED', 'WAIVED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'EmailTokenType',
        members: ['VERIFY_EMAIL', 'RESET_PASSWORD', 'CHANGE_EMAIL'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ImportJobStatus',
        members: ['PENDING', 'VALIDATED', 'COMMITTED', 'FAILED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'LeadActivityType',
        members: ['NOTE', 'CALL', 'WHATSAPP', 'STAGE_CHANGE', 'REMINDER_DONE'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'LeadLostReason',
        members: [
          'no_response',
          'budget_mismatch',
          'bought_elsewhere',
          'location_mismatch',
          'not_serious',
          'other',
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'LeadSource',
        members: [
          'whatsapp_listing',
          'whatsapp_floating',
          'property_request',
          'owner_submission',
          'phone',
          'referral',
          'social',
          'other',
        ],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'LeadStage',
        members: ['new', 'contacted', 'negotiating', 'won', 'lost'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ListingOffer',
        members: ['sale', 'rent'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ListingStatus',
        members: ['available', 'sold', 'rented'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'ListingType',
        members: ['apartment', 'building', 'residential_unit', 'villa', 'land'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'MediaKind',
        members: ['IMAGE', 'VIDEO'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'OwnerSubmissionStatus',
        members: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_INFO'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'PropertyRequestStatus',
        members: ['OPEN', 'MATCHED', 'CLOSED'],
      }),
      this.createNativeEnumType({
        schema: 'public',
        typeName: 'UserRole',
        members: ['ADMIN', 'EDITOR', 'USER'],
      }),
      this.createTable({
        schema: 'public',
        table: 'AuditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('diff', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('entity', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ip', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ConsentLog',
        columns: [
          col('consented', 'bool', { notNull: true, codecRef: { codecId: 'pg/bool@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('version', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Deal',
        columns: [
          col('agreedPrice', 'numeric(14,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('collectedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('commissionAmount', 'numeric(14,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('commissionPercent', 'numeric(5,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('commissionStatus', '"CommissionStatus"', {
            notNull: true,
            default: lit('EXPECTED'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'CommissionStatus' } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('leadId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('listingId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('offer', '"ListingOffer"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingOffer' } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'EmailToken',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('targetEmail', 'character varying(320)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 320 } },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', '"EmailTokenType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'EmailTokenType' } },
          }),
          col('usedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Favorite',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('listingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['userId', 'listingId'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'ImportJob',
        columns: [
          col('actorId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('errorReport', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('errorRows', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('filename', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('okRows', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', '"ImportJobStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ImportJobStatus' } },
          }),
          col('totalRows', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Inquiry',
        columns: [
          col('channel', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('listingId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'LandingPage',
        columns: [
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('district', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('introAr', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('introEn', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isPublished', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('offer', '"ListingOffer"', {
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingOffer' } },
          }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('titleAr', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('titleEn', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', '"ListingType"', {
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingType' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Lead',
        columns: [
          col('activePhone', 'character varying(16)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 16 } },
          }),
          col('assignedToId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('budgetMax', 'numeric(14,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('budgetMin', 'numeric(14,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'character varying(320)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 320 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('interestedListingIds', 'text[]', {
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('lastContactAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('lostAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('lostReason', '"LeadLostReason"', {
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'LeadLostReason' } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nextFollowUpAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('notesSummary', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'character varying(16)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 16 } },
          }),
          col('preferredLocale', 'character varying(2)', {
            notNull: true,
            default: lit('ar'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 2 } },
          }),
          col('source', '"LeadSource"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'LeadSource' } },
          }),
          col('stage', '"LeadStage"', {
            notNull: true,
            default: lit('new'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'LeadStage' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('utmCampaign', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('utmMedium', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('utmSource', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('wonAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'LeadActivity',
        columns: [
          col('actorId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('body', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('leadId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('type', '"LeadActivityType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'LeadActivityType' } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Listing',
        columns: [
          col('addressText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('areaSqm', 'numeric(10,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('bathrooms', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('bedrooms', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'character varying(32)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 32 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('deletedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('descriptionAr', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('descriptionEn', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('district', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('features', 'text[]', {
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('floor', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isPublished', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('latitude', 'numeric(10,7)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 7 } },
          }),
          col('longitude', 'numeric(10,7)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 7 } },
          }),
          col('offer', '"ListingOffer"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingOffer' } },
          }),
          col('publishedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('rentedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('soldAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('status', '"ListingStatus"', {
            notNull: true,
            default: lit('available'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingStatus' } },
          }),
          col('titleAr', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('titleEn', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', '"ListingType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingType' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Media',
        columns: [
          col('altAr', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('altEn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('height', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isCover', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('kind', '"MediaKind"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'MediaKind' } },
          }),
          col('listingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('publicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('width', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'MediaUploadGrant',
        columns: [
          col('actorId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('consumedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('listingId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('mimeType', 'character varying(64)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 64 } },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'OwnerSubmission',
        columns: [
          col('addressText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('areaSqm', 'numeric(10,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('bedrooms', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('commissionAckIpHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('commissionAcknowledgedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('commissionNoticeVersion', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('commissionTermsSnapshot', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('convertedListingId', 'uuid', { codecRef: { codecId: 'pg/uuid@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('description', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('district', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('leadId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('offer', '"ListingOffer"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingOffer' } },
          }),
          col('ownerAskingCurrency', 'character(3)', {
            codecRef: { codecId: 'sql/char@1', typeParams: { length: 3 } },
          }),
          col('ownerAskingPrice', 'numeric(14,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('ownerName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'character varying(16)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 16 } },
          }),
          col('rejectionNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', '"OwnerSubmissionStatus"', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'OwnerSubmissionStatus' } },
          }),
          col('type', '"ListingType"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingType' } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'OwnerSubmissionMedia',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('height', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('kind', '"MediaKind"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'MediaKind' } },
          }),
          col('ownerSubmissionId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('publicId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('url', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('width', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'PropertyRequest',
        columns: [
          col('areaMin', 'numeric(10,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('bedroomsMin', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('budgetMax', 'numeric(14,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('budgetMin', 'numeric(14,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 14, scale: 2 } },
          }),
          col('city', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('districts', 'text[]', {
            default: lit([]),
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('leadId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('offer', '"ListingOffer"', {
            notNull: true,
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingOffer' } },
          }),
          col('status', '"PropertyRequestStatus"', {
            notNull: true,
            default: lit('OPEN'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'PropertyRequestStatus' } },
          }),
          col('types', '"ListingType"[]', {
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'ListingType' }, many: true },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'RefreshToken',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('expiresAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('family', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('ip', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('revokedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'User',
        columns: [
          col('createdAt', 'timestamp(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('email', 'character varying(320)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 320 } },
          }),
          col('emailVerifiedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('failedLoginCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('id', 'uuid', { notNull: true, codecRef: { codecId: 'pg/uuid@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('lockedUntil', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('passwordHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('preferredLocale', 'character varying(2)', {
            notNull: true,
            default: lit('ar'),
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 2 } },
          }),
          col('privacyVersion', 'character varying(32)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 32 } },
          }),
          col('role', '"UserRole"', {
            notNull: true,
            default: lit('USER'),
            codecRef: { codecId: 'pg/enum@1', typeParams: { typeName: 'UserRole' } },
          }),
          col('termsAcceptedAt', 'timestamp(3)', {
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
          col('termsVersion', 'character varying(32)', {
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 32 } },
          }),
          col('updatedAt', 'timestamp(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamp-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_actorId_createdAt_idx',
        columns: ['actorId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_entity_entityId_createdAt_idx',
        columns: ['entity', 'entityId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ConsentLog',
        index: 'ConsentLog_version_createdAt_idx',
        columns: ['version', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Deal',
        index: 'Deal_commissionStatus_createdAt_idx',
        columns: ['commissionStatus', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Deal',
        index: 'Deal_leadId_key',
        columns: ['leadId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Deal',
        index: 'Deal_listingId_idx',
        columns: ['listingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailToken',
        index: 'EmailToken_expiresAt_idx',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailToken',
        index: 'EmailToken_tokenHash_key',
        columns: ['tokenHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmailToken',
        index: 'EmailToken_userId_type_expiresAt_idx',
        columns: ['userId', 'type', 'expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Favorite',
        index: 'Favorite_listingId_idx',
        columns: ['listingId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ImportJob',
        index: 'ImportJob_actorId_createdAt_idx',
        columns: ['actorId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ImportJob',
        index: 'ImportJob_status_createdAt_idx',
        columns: ['status', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Inquiry',
        index: 'Inquiry_channel_createdAt_idx',
        columns: ['channel', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Inquiry',
        index: 'Inquiry_listingId_createdAt_idx',
        columns: ['listingId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LandingPage',
        index: 'LandingPage_city_district_type_offer_idx',
        columns: ['city', 'district', 'type', 'offer'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LandingPage',
        index: 'LandingPage_isPublished_city_idx',
        columns: ['isPublished', 'city'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LandingPage',
        index: 'LandingPage_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_activePhone_key',
        columns: ['activePhone'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_assignedToId_stage_updatedAt_idx',
        columns: ['assignedToId', 'stage', 'updatedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_createdAt_idx',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_source_createdAt_idx',
        columns: ['source', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_stage_nextFollowUpAt_idx',
        columns: ['stage', 'nextFollowUpAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadActivity',
        index: 'LeadActivity_actorId_createdAt_idx',
        columns: ['actorId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadActivity',
        index: 'LeadActivity_leadId_createdAt_idx',
        columns: ['leadId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Listing',
        index: 'Listing_city_district_idx',
        columns: ['city', 'district'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Listing',
        index: 'Listing_code_key',
        columns: ['code'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Listing',
        index: 'Listing_isPublished_deletedAt_createdAt_idx',
        columns: ['isPublished', 'deletedAt', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Listing',
        index: 'Listing_slug_key',
        columns: ['slug'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'Listing',
        index: 'Listing_status_type_offer_city_idx',
        columns: ['status', 'type', 'offer', 'city'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Listing',
        index: 'Listing_type_offer_status_idx',
        columns: ['type', 'offer', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Media',
        index: 'Media_listingId_isCover_idx',
        columns: ['listingId', 'isCover'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Media',
        index: 'Media_listingId_sortOrder_idx',
        columns: ['listingId', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Media',
        index: 'Media_publicId_key',
        columns: ['publicId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'MediaUploadGrant',
        index: 'MediaUploadGrant_actorId_expiresAt_idx',
        columns: ['actorId', 'expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MediaUploadGrant',
        index: 'MediaUploadGrant_listingId_expiresAt_idx',
        columns: ['listingId', 'expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'MediaUploadGrant',
        index: 'MediaUploadGrant_tokenHash_key',
        columns: ['tokenHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'OwnerSubmission',
        index: 'OwnerSubmission_convertedListingId_key',
        columns: ['convertedListingId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'OwnerSubmission',
        index: 'OwnerSubmission_leadId_idx',
        columns: ['leadId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OwnerSubmission',
        index: 'OwnerSubmission_phone_city_type_createdAt_idx',
        columns: ['phone', 'city', 'type', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OwnerSubmission',
        index: 'OwnerSubmission_status_createdAt_idx',
        columns: ['status', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OwnerSubmissionMedia',
        index: 'OwnerSubmissionMedia_ownerSubmissionId_sortOrder_idx',
        columns: ['ownerSubmissionId', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'OwnerSubmissionMedia',
        index: 'OwnerSubmissionMedia_publicId_key',
        columns: ['publicId'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'PropertyRequest',
        index: 'PropertyRequest_leadId_createdAt_idx',
        columns: ['leadId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PropertyRequest',
        index: 'PropertyRequest_status_offer_city_idx',
        columns: ['status', 'offer', 'city'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RefreshToken',
        index: 'RefreshToken_expiresAt_idx',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RefreshToken',
        index: 'RefreshToken_family_revokedAt_idx',
        columns: ['family', 'revokedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RefreshToken',
        index: 'RefreshToken_tokenHash_key',
        columns: ['tokenHash'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'RefreshToken',
        index: 'RefreshToken_userId_family_idx',
        columns: ['userId', 'family'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_email_key',
        columns: ['email'],
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'User',
        index: 'User_role_isActive_idx',
        columns: ['role', 'isActive'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AuditLog',
        foreignKey: {
          name: 'AuditLog_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Deal',
        foreignKey: {
          name: 'Deal_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Deal',
        foreignKey: {
          name: 'Deal_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'Listing', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmailToken',
        foreignKey: {
          name: 'EmailToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Favorite',
        foreignKey: {
          name: 'Favorite_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Favorite',
        foreignKey: {
          name: 'Favorite_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'Listing', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ImportJob',
        foreignKey: {
          name: 'ImportJob_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Inquiry',
        foreignKey: {
          name: 'Inquiry_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'Listing', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_assignedToId_fkey',
          columns: ['assignedToId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadActivity',
        foreignKey: {
          name: 'LeadActivity_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadActivity',
        foreignKey: {
          name: 'LeadActivity_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Media',
        foreignKey: {
          name: 'Media_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'Listing', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MediaUploadGrant',
        foreignKey: {
          name: 'MediaUploadGrant_listingId_fkey',
          columns: ['listingId'],
          references: { schema: 'public', table: 'Listing', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'MediaUploadGrant',
        foreignKey: {
          name: 'MediaUploadGrant_actorId_fkey',
          columns: ['actorId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OwnerSubmission',
        foreignKey: {
          name: 'OwnerSubmission_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OwnerSubmission',
        foreignKey: {
          name: 'OwnerSubmission_convertedListingId_fkey',
          columns: ['convertedListingId'],
          references: { schema: 'public', table: 'Listing', columns: ['id'] },
          onDelete: 'setNull',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'OwnerSubmissionMedia',
        foreignKey: {
          name: 'OwnerSubmissionMedia_ownerSubmissionId_fkey',
          columns: ['ownerSubmissionId'],
          references: { schema: 'public', table: 'OwnerSubmission', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PropertyRequest',
        foreignKey: {
          name: 'PropertyRequest_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'restrict',
          onUpdate: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RefreshToken',
        foreignKey: {
          name: 'RefreshToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
          onUpdate: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);

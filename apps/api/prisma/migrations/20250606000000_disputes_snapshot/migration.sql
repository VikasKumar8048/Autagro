-- Dispute order snapshot + notification types
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "snapshot_order_status" "OrderStatus";

UPDATE "disputes" SET "snapshot_order_status" = 'DELIVERED' WHERE "snapshot_order_status" IS NULL;

ALTER TABLE "disputes" ALTER COLUMN "snapshot_order_status" SET NOT NULL;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DISPUTE_OPENED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DISPUTE_RESOLVED';

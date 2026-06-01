-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'PURCHASE_REQUEST',
  'REQUEST_ACCEPTED',
  'REQUEST_REJECTED',
  'ORDER_CONFIRMED',
  'TRANSPORT_ASSIGNED',
  'PAYMENT_RECEIVED',
  'SHIPMENT_UPDATE',
  'DELIVERY_COMPLETE',
  'ESCROW_RELEASED',
  'SYSTEM'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "sms_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

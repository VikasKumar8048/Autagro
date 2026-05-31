-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum (ListingStatus if not exists from partial deploy)
DO $$ BEGIN
  CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'EXPIRED', 'REMOVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (OrderStatus)
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'REQUESTED', 'SELLER_ACCEPTED', 'BUYER_CONFIRMED', 'TRANSPORT_PENDING', 'TRANSPORT_ASSIGNED', 'PAID_ESCROW', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "crop_listings" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "crop_name" VARCHAR(100) NOT NULL,
    "variety" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "grade" VARCHAR(50) NOT NULL,
    "harvest_date" DATE NOT NULL,
    "price_per_unit" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "state" VARCHAR(80) NOT NULL,
    "district" VARCHAR(80) NOT NULL,
    "pincode" VARCHAR(6) NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "image_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crop_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "message" VARCHAR(500),
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "purchase_request_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'REQUESTED',
    "crop_amount" DECIMAL(14,2) NOT NULL,
    "transport_fee" DECIMAL(14,2),
    "platform_fee" DECIMAL(14,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crop_listings_seller_id_status_idx" ON "crop_listings"("seller_id", "status");
CREATE INDEX "crop_listings_crop_name_status_idx" ON "crop_listings"("crop_name", "status");
CREATE INDEX "crop_listings_state_district_idx" ON "crop_listings"("state", "district");
CREATE INDEX "purchase_requests_listing_id_status_idx" ON "purchase_requests"("listing_id", "status");
CREATE INDEX "purchase_requests_buyer_id_idx" ON "purchase_requests"("buyer_id");
CREATE UNIQUE INDEX "orders_purchase_request_id_key" ON "orders"("purchase_request_id");
CREATE INDEX "orders_buyer_id_status_idx" ON "orders"("buyer_id", "status");
CREATE INDEX "orders_seller_id_status_idx" ON "orders"("seller_id", "status");

-- AddForeignKey
ALTER TABLE "crop_listings" ADD CONSTRAINT "crop_listings_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "crop_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

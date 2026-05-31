-- CreateTable
CREATE TABLE "transport_jobs" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "transporter_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "pickup_lat" DECIMAL(10,7),
    "pickup_lng" DECIMAL(10,7),
    "drop_lat" DECIMAL(10,7),
    "drop_lng" DECIMAL(10,7),
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "eta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_points" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transport_jobs_order_id_key" ON "transport_jobs"("order_id");
CREATE INDEX "transport_jobs_transporter_id_status_idx" ON "transport_jobs"("transporter_id", "status");
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");
CREATE INDEX "gps_points_shipment_id_recorded_at_idx" ON "gps_points"("shipment_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "transport_jobs" ADD CONSTRAINT "transport_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transport_jobs" ADD CONSTRAINT "transport_jobs_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gps_points" ADD CONSTRAINT "gps_points_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

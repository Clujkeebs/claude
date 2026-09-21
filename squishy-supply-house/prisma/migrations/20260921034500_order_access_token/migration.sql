-- Guards the confirmation page against order-number enumeration.
ALTER TABLE "Order" ADD COLUMN "accessToken" TEXT NOT NULL;
CREATE UNIQUE INDEX "Order_accessToken_key" ON "Order"("accessToken");

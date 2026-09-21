-- Links an order back to the cart it came from so payment can clear it.
ALTER TABLE "Order" ADD COLUMN "cartToken" TEXT;

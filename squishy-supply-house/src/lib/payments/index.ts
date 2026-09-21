import "server-only";

import { env } from "@/lib/env";
import { paypalProvider } from "./paypal";
import { stripeProvider } from "./stripe";
import type { PaymentProvider, ProviderName } from "./types";

const registry: Record<ProviderName, PaymentProvider> = {
  STRIPE: stripeProvider,
  PAYPAL: paypalProvider,
};

/** The provider PAYMENT_PROVIDER selects. Switching is an env change only. */
export function activeProvider(): PaymentProvider {
  return env().PAYMENT_PROVIDER === "paypal" ? paypalProvider : stripeProvider;
}

/** Used by webhook routes and refunds, which must address a specific provider. */
export function providerByName(name: ProviderName): PaymentProvider {
  return registry[name];
}

export * from "./types";

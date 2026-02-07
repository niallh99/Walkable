import Stripe from "stripe";
import { config } from "./config";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!config.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripe) {
    stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return stripe;
}

export function isStripeConfigured(): boolean {
  return !!config.STRIPE_SECRET_KEY;
}

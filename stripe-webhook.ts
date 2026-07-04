import { Request, Response } from "express";
import { stripe } from "./stripe";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import type { PlanId } from "./stripe";

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ENV.stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;

        if (userId && subscriptionId) {
          const db = await getDb();
          if (db) {
            // Get subscription to determine plan
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0]?.price?.id;
            const plan = getPlanFromPriceId(priceId);

            await db.update(users)
              .set({
                plan,
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: subscriptionId,
              })
              .where(eq(users.id, parseInt(userId)));

            console.log(`[Stripe Webhook] User ${userId} upgraded to ${plan}`);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId);
        const status = subscription.status;

        const db = await getDb();
        if (db) {
          if (status === "active" || status === "trialing") {
            await db.update(users)
              .set({ plan, stripeSubscriptionId: subscription.id })
              .where(eq(users.stripeCustomerId, customerId));
            console.log(`[Stripe Webhook] Customer ${customerId} plan updated to ${plan}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const db = await getDb();
        if (db) {
          await db.update(users)
            .set({ plan: "free", stripeSubscriptionId: null })
            .where(eq(users.stripeCustomerId, customerId));
          console.log(`[Stripe Webhook] Customer ${customerId} subscription cancelled, downgraded to free`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;
        console.log(`[Stripe Webhook] Payment failed for customer ${customerId}`);
        // Could send notification here
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
  }

  res.json({ received: true });
}

// Map Stripe Price IDs to plan names
// These will be set when products are created in Stripe
function getPlanFromPriceId(priceId: string | undefined): PlanId {
  if (!priceId) return "free";
  
  // Check against stored price IDs (set via env or config)
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID || "";
  const businessPriceId = process.env.STRIPE_BUSINESS_PRICE_ID || "";

  if (priceId === proPriceId) return "pro";
  if (priceId === businessPriceId) return "business";

  // Fallback: check price amount via metadata or name
  return "pro"; // Default to pro for unknown paid plans
}

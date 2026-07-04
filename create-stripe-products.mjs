import Stripe from "stripe";

// Load env from the project
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY not found in environment");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

async function createProducts() {
  console.log("Creating Stripe products and prices...\n");

  // Create Pro product
  const proProduct = await stripe.products.create({
    name: "Eugê Financeiro - Pro",
    description: "Para freelancers e MEIs que querem crescer. Transações ilimitadas, 15 jobs ativos, DRE, Metas, Orçamentos e mais.",
    metadata: { plan_id: "pro" },
  });
  console.log(`✓ Pro product created: ${proProduct.id}`);

  // Create Pro price (R$29/month)
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 2900, // R$29.00 in centavos
    currency: "brl",
    recurring: { interval: "month" },
    metadata: { plan_id: "pro" },
  });
  console.log(`✓ Pro price created: ${proPrice.id} (R$29/mês)`);

  // Create Business product
  const bizProduct = await stripe.products.create({
    name: "Eugê Financeiro - Business",
    description: "Para estúdios e agências que precisam de tudo. Tudo ilimitado, Bot Telegram, suporte prioritário.",
    metadata: { plan_id: "business" },
  });
  console.log(`✓ Business product created: ${bizProduct.id}`);

  // Create Business price (R$59/month)
  const bizPrice = await stripe.prices.create({
    product: bizProduct.id,
    unit_amount: 5900, // R$59.00 in centavos
    currency: "brl",
    recurring: { interval: "month" },
    metadata: { plan_id: "business" },
  });
  console.log(`✓ Business price created: ${bizPrice.id} (R$59/mês)`);

  console.log("\n=== SUMMARY ===");
  console.log(`Pro Price ID: ${proPrice.id}`);
  console.log(`Business Price ID: ${bizPrice.id}`);
  console.log("\nUpdate these in server/stripe.ts → PLANS.pro.stripePriceId and PLANS.business.stripePriceId");
}

createProducts().catch(console.error);

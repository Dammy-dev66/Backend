import { squareClient } from "./_squareClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { serviceName, barberName, price, duration } = req.body;

    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: `${Date.now()}`,
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: [
          {
            name: `${serviceName} with ${barberName}`,
            quantity: "1",
            basePriceMoney: { amount: price * 100, currency: "USD" }
          }
        ]
      }
    });

    res.json({ url: response.result.paymentLink.url });
  } catch (err) {
    console.error("checkout error:", err);
    res.json({ url: null });
  }
}

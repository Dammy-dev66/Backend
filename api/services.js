import { squareClient } from "./_squareClient.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await squareClient.catalogApi.listCatalog({ types: "ITEM" });
    const objects = response.result.objects || [];

    res.json({ services: objects });
  } catch (err) {
    console.error("services error:", err);
    res.json({ services: demoServices() });
  }
}

function demoServices() {
  return [
    {
      id: "demo-1",
      item_data: {
        name: "Gentleman's Cut",
        variations: [
          { id: "v1", item_variation_data: { price_money: { amount: 4500, currency: "USD" } } }
        ]
      }
    },
    {
      id: "demo-2",
      item_data: {
        name: "Beard Sculpting",
        variations: [
          { id: "v2", item_variation_data: { price_money: { amount: 2500, currency: "USD" } } }
        ]
      }
    }
  ];
}

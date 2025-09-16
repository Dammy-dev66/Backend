import { squareClient } from "./_squareClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { serviceVariationId } = req.body || {};

  try {
    const body = {
      query: {
        filter: {
          serviceVariationId: serviceVariationId,
          locationId: process.env.SQUARE_LOCATION_ID,
        }
      }
    };

    const response = await squareClient.bookingsApi.searchAvailability(body);
    const availability = response.result.availabilities || [];

    res.json({ availability });
  } catch (err) {
    console.error("availability error:", err);
    res.json({ availability: demoAvailability() });
  }
}

function demoAvailability() {
  const now = new Date();
  return [
    { start_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString() }, // 2h later
    { start_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString() },
    { start_at: new Date(now.getTime() + 26 * 60 * 60 * 1000).toISOString() }
  ];
}

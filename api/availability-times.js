module.exports = async (req, res) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  const { appointmentTypeID, date, calendarID } = req.query;
  if (!appointmentTypeID || !date) {
    return res.status(400).json({
      ok: false,
      error: "appointmentTypeID and date are required."
    });
  }

  const userId = process.env.ACUITY_USER_ID;
  const apiKey = process.env.ACUITY_API_KEY;

  if (!userId || !apiKey) {
    return res.status(500).json({ ok: false, error: "Acuity credentials are not configured." });
  }

  const params = new URLSearchParams({ appointmentTypeID, date });
  if (calendarID) params.set("calendarID", calendarID);

  try {
    const acuityRes = await fetch(
      `https://acuityscheduling.com/api/v1/availability/times?${params.toString()}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${userId}:${apiKey}`).toString("base64")}`,
          Accept: "application/json"
        }
      }
    );

    const data = await acuityRes.json();

    if (!acuityRes.ok) {
      return res.status(acuityRes.status).json({ ok: false, error: data });
    }

    return res.status(200).json({ ok: true, times: data });
  } catch (error) {
    console.error("availability-times error", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

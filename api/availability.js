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

  const { appointmentTypeID, month, date, calendarID, mode } = req.query;
  const userId = process.env.ACUITY_USER_ID;
  const apiKey = process.env.ACUITY_API_KEY;

  if (!userId || !apiKey) {
    return res.status(500).json({ ok: false, error: "Acuity credentials are not configured." });
  }

  try {
    const auth = `Basic ${Buffer.from(`${userId}:${apiKey}`).toString("base64")}`;
    const headers = {
      Authorization: auth,
      Accept: "application/json"
    };
    const params = new URLSearchParams();
    if (appointmentTypeID) params.set("appointmentTypeID", appointmentTypeID);
    if (calendarID) params.set("calendarID", calendarID);

    if (mode === "times" || date) {
      if (!appointmentTypeID || !date) {
        return res.status(400).json({
          ok: false,
          error: "appointmentTypeID and date are required."
        });
      }
      params.set("date", date);
      const acuityRes = await fetch(`https://acuityscheduling.com/api/v1/availability/times?${params.toString()}`, { headers });
      const data = await acuityRes.json();
      if (!acuityRes.ok) {
        return res.status(acuityRes.status).json({ ok: false, error: data });
      }
      return res.status(200).json({ ok: true, times: data });
    }

    if (!appointmentTypeID || !month) {
      return res.status(400).json({
        ok: false,
        error: "appointmentTypeID and month are required."
      });
    }

    params.set("month", month);
    const acuityRes = await fetch(`https://acuityscheduling.com/api/v1/availability/dates?${params.toString()}`, { headers });
    const data = await acuityRes.json();
    if (!acuityRes.ok) {
      return res.status(acuityRes.status).json({ ok: false, error: data });
    }

    return res.status(200).json({ ok: true, dates: data });
  } catch (error) {
    console.error("availability error", error);
    return res.status(500).json({ ok: false, error: error.message });
  }
};

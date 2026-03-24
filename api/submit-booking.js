// api/submit-booking.js
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      type, // 'facility' | 'le_mansion' | 'barkers' | 'oasis'
      memberId,
      memberName,
      memberEmail,
      memberPhone,
      facility, // 'tennis' | 'squash' | 'gym' | 'le_mansion' etc.
      date,
      time,
      pax,
      guestName,
      guestEmail,
      guestPhone,
    } = req.body;

    // Validate required fields
    if (!type || !memberId || !facility || !date || !time) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    // GHL Inbound Webhook URL (from your workflow)
    const webhookUrl = process.env.GHL_INBOUND_WEBHOOK_URL;

    // Prepare payload for GHL
    const payload = {
      memberId,
      memberName,
      memberEmail,
      memberPhone,
      bookingType: type,
      facility,
      date,
      time,
      pax: pax || 1,
      source: "Member Portal Dashboard",
      timestamp: new Date().toISOString(),
    };

    // Add guest info if provided
    if (guestName) {
      payload.guestName = guestName;
      payload.guestEmail = guestEmail || "";
      payload.guestPhone = guestPhone || "";
    }

    // Send to GHL Inbound Webhook
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`GHL webhook failed: ${response.status}`);
    }

    const ghlResponse = await response.json();

    return res.status(200).json({
      success: true,
      message: "Booking submitted to GHL workflow",
      ghlResponse,
    });
  } catch (error) {
    console.error("Submit Booking Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

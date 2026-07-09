// Secure proxy to Kit (ConvertKit) subscriber API
// Keeps API key server-side; validates origin, honeypot, and email format.

const ALLOWED_ORIGINS = [
  "https://www.gaoptimizer.com",
  "https://gaoptimizer.com",
  "http://localhost",
];

// Simple but effective email regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getAllowedOrigin(event) {
  const origin = (event.headers.origin || "").toLowerCase();
  const referer = (event.headers.referer || "").toLowerCase();

  for (const allowed of ALLOWED_ORIGINS) {
    if (origin.startsWith(allowed)) return origin;
    if (referer.startsWith(allowed)) return allowed;
  }
  return null;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "https://www.gaoptimizer.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

exports.handler = async (event) => {
  const allowedOrigin = getAllowedOrigin(event);
  const headers = corsHeaders(allowedOrigin);

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Validate origin/referer
  if (!allowedOrigin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: "Forbidden" }),
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }

  // Honeypot check — bots fill hidden "website" field
  if (body.website) {
    // Return fake success so bots think it worked
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Subscribed successfully" }),
    };
  }

  // Validate email
  const email = (body.email || "").trim().toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Please provide a valid email address" }),
    };
  }

  // Call Kit API
  const KIT_API_KEY = process.env.KIT_API_KEY;
  const KIT_FORM_ID = process.env.KIT_FORM_ID;

  if (!KIT_API_KEY || !KIT_FORM_ID) {
    console.error("Missing KIT_API_KEY or KIT_FORM_ID environment variables");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server configuration error" }),
    };
  }

  try {
    const response = await fetch(
      `https://api.kit.com/v4/subscribers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": KIT_API_KEY,
        },
        body: JSON.stringify({ email_address: email }),
      }
    );

    if (!response.ok) {
      // Log the actual error server-side for debugging
      const errorText = await response.text();
      console.error(`Kit API error (${response.status}): ${errorText}`);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Subscription failed. Please try again later." }),
      };
    }

    // Subscriber created/upserted — now add to the form
    const subscriberData = await response.json();
    const subscriberId = subscriberData.subscriber && subscriberData.subscriber.id;

    if (subscriberId && KIT_FORM_ID) {
      const formRes = await fetch(
        `https://api.kit.com/v4/forms/${KIT_FORM_ID}/subscribers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Kit-Api-Key": KIT_API_KEY,
          },
          body: JSON.stringify({ id: subscriberId }),
        }
      );
      if (!formRes.ok) {
        const formErr = await formRes.text();
        console.error(`Kit Form API error (${formRes.status}): ${formErr}`);
        // Non-fatal: subscriber was still created, just not added to form
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Subscribed successfully" }),
    };
  } catch (err) {
    console.error("Kit API request failed:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Subscription failed. Please try again later." }),
    };
  }
};

const jsonHeaders = {
  "content-type": "application/json; charset=UTF-8",
};

function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowed.includes(origin) ? origin : allowed[0] || "*";
}

function corsHeaders(request, env) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request, env),
    "Access-Control-Allow-Credentials": "false",
    "Access-Control-Allow-Headers": "Content-Type, X-Dewify-Cart-Id",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function response(request, env, payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...jsonHeaders,
      ...corsHeaders(request, env),
      ...extraHeaders,
    },
  });
}

function requireSecret(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(name + " is not configured");
  }
  return value;
}

function base64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)),
  );
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

function hexToBytes(hex) {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  const expected = await hmacSha256(secret, orderId + "|" + paymentId);
  const supplied = hexToBytes(signature);
  return Boolean(supplied && timingSafeEqual(expected, supplied));
}

async function verifyRazorpayWebhook(rawBody, signature, secret) {
  const expected = await hmacSha256(secret, rawBody);
  const supplied = hexToBytes(signature || "");
  return Boolean(supplied && timingSafeEqual(expected, supplied));
}

async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parts = String(signatureHeader || "")
    .split(",")
    .map((value) => value.trim());

  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatureParts = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestampPart || !signatureParts.length) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;

  // Stripe signs webhook payloads with a timestamp and enforces a freshness window.
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > 300) return false;

  const expected = await hmacSha256(
    secret,
    timestamp + "." + rawBody,
  );

  return signatureParts.some((hex) => {
    const supplied = hexToBytes(hex);
    return Boolean(supplied && timingSafeEqual(expected, supplied));
  });
}

async function handleRazorpayOrder(request, env) {
  const keyId = requireSecret(env, "RAZORPAY_KEY_ID");
  const keySecret = requireSecret(env, "RAZORPAY_KEY_SECRET");
  const body = await request.json();

  const amount = Number(body.amountInPaise);
  const currency = String(body.currency || "INR").toUpperCase();
  const receipt = String(
    body.receipt || "dewify_" + crypto.randomUUID().replaceAll("-", "").slice(0, 20),
  );

  if (!Number.isInteger(amount) || amount <= 0) {
    return response(request, env, {
      ok: false,
      error: "amountInPaise must be a positive integer",
    }, 400);
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return response(request, env, {
      ok: false,
      error: "currency must be a 3-letter ISO code",
    }, 400);
  }

  const upstream = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(keyId + ":" + keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes: body.notes && typeof body.notes === "object" ? body.notes : undefined,
    }),
  });

  const data = await upstream.json();

  return response(request, env, {
    ok: upstream.ok,
    provider: "razorpay",
    keyId,
    order: data,
  }, upstream.ok ? 200 : upstream.status);
}

async function handleRazorpayVerify(request, env) {
  const secret = requireSecret(env, "RAZORPAY_KEY_SECRET");
  const body = await request.json();

  const orderId = String(body.orderId || "");
  const paymentId = String(body.paymentId || "");
  const signature = String(body.signature || "");

  if (!orderId || !paymentId || !signature) {
    return response(request, env, {
      ok: false,
      verified: false,
      error: "orderId, paymentId and signature are required",
    }, 400);
  }

  const verified = await verifyRazorpaySignature(
    orderId,
    paymentId,
    signature,
    secret,
  );

  return response(request, env, {
    ok: verified,
    verified,
    provider: "razorpay",
  }, verified ? 200 : 400);
}

async function handleStripeCheckout(request, env) {
  const secret = requireSecret(env, "STRIPE_SECRET_KEY");
  const body = await request.json();

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length || items.length > 100) {
    return response(request, env, {
      ok: false,
      error: "items must contain between 1 and 100 entries",
    }, 400);
  }

  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set(
    "success_url",
    String(body.successUrl || "http://localhost:8788/payments-test.html?status=success"),
  );
  params.set(
    "cancel_url",
    String(body.cancelUrl || "http://localhost:8788/payments-test.html?status=cancelled"),
  );

  if (body.customerEmail) {
    params.set("customer_email", String(body.customerEmail));
  }

  if (body.clientReferenceId) {
    params.set("client_reference_id", String(body.clientReferenceId));
  }

  items.forEach((item, index) => {
    const priceId = String(item.priceId || "");
    const quantity = Number(item.quantity || 1);

    if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
      throw new Error("Invalid Stripe Price ID at item " + index);
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new Error("Invalid quantity at item " + index);
    }

    params.set(
      "line_items[" + index + "][price]",
      priceId,
    );
    params.set(
      "line_items[" + index + "][quantity]",
      String(quantity),
    );
  });

  if (body.metadata && typeof body.metadata === "object") {
    Object.entries(body.metadata).slice(0, 20).forEach(([key, value]) => {
      const safeKey = String(key).slice(0, 40);
      const safeValue = String(value).slice(0, 500);
      params.set("metadata[" + safeKey + "]", safeValue);
    });
  }

  const upstream = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await upstream.json();

  return response(request, env, {
    ok: upstream.ok,
    provider: "stripe",
    session: upstream.ok
      ? {
          id: data.id,
          url: data.url,
          status: data.status,
          payment_status: data.payment_status,
        }
      : data,
  }, upstream.ok ? 200 : upstream.status);
}

async function handleRazorpayWebhook(request, env) {
  const secret = requireSecret(env, "RAZORPAY_WEBHOOK_SECRET");
  const signature = request.headers.get("X-Razorpay-Signature") || "";
  const rawBody = await request.text();

  const valid = await verifyRazorpayWebhook(rawBody, signature, secret);
  if (!valid) {
    return response(request, env, {
      ok: false,
      error: "Invalid Razorpay webhook signature",
    }, 400);
  }

  let event = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return response(request, env, {
      ok: false,
      error: "Webhook body is not valid JSON",
    }, 400);
  }

  return response(request, env, {
    ok: true,
    provider: "razorpay",
    event: event.event || null,
    received: true,
  });
}

async function handleStripeWebhook(request, env) {
  const secret = requireSecret(env, "STRIPE_WEBHOOK_SECRET");
  const signature = request.headers.get("Stripe-Signature") || "";
  const rawBody = await request.text();

  const valid = await verifyStripeSignature(rawBody, signature, secret);
  if (!valid) {
    return response(request, env, {
      ok: false,
      error: "Invalid Stripe webhook signature",
    }, 400);
  }

  let event = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return response(request, env, {
      ok: false,
      error: "Webhook body is not valid JSON",
    }, 400);
  }

  return response(request, env, {
    ok: true,
    provider: "stripe",
    event: event.type || null,
    received: true,
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return response(request, env, {
          ok: true,
          service: "dewify-payment-test-api",
          providers: {
            razorpay: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
            stripe: Boolean(env.STRIPE_SECRET_KEY),
            razorpayWebhook: Boolean(env.RAZORPAY_WEBHOOK_SECRET),
            stripeWebhook: Boolean(env.STRIPE_WEBHOOK_SECRET),
          },
        });
      }

      if (request.method === "POST" && url.pathname === "/api/razorpay/order") {
        return await handleRazorpayOrder(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/razorpay/verify") {
        return await handleRazorpayVerify(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/stripe/checkout-session") {
        return await handleStripeCheckout(request, env);
      }

      if (request.method === "POST" && url.pathname === "/webhooks/razorpay") {
        return await handleRazorpayWebhook(request, env);
      }

      if (request.method === "POST" && url.pathname === "/webhooks/stripe") {
        return await handleStripeWebhook(request, env);
      }

      return response(request, env, {
        ok: false,
        error: "Not found",
      }, 404);
    } catch (error) {
      return response(request, env, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }, 500);
    }
  },
};

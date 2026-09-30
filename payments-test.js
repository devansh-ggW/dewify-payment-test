(() => {
  const apiBaseInput = document.getElementById("api-base");
  const emailInput = document.getElementById("email");
  const statusBox = document.getElementById("payment-test-status");

  const savedApi = localStorage.getItem("dewify_payment_test_api") || "";
  apiBaseInput.value = savedApi;

  function setStatus(message) {
    statusBox.textContent = message;
  }

  function apiBase() {
    const value = apiBaseInput.value.trim().replace(/\/$/, "");
    if (!value) throw new Error("Enter your Cloudflare Worker URL first.");
    localStorage.setItem("dewify_payment_test_api", value);
    return value;
  }

  async function post(path, payload) {
    const response = await fetch(apiBase() + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || "Payment API request failed.");
    }
    return data;
  }

  async function testRazorpay() {
    const amountInRupees = Number(document.getElementById("rzp-amount").value);
    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      throw new Error("Enter a valid Razorpay amount.");
    }

    setStatus("Creating Razorpay order…");

    const order = await post("/api/razorpay/order", {
      amountInPaise: Math.round(amountInRupees * 100),
      currency: "INR",
      notes: { source: "dewify-payment-test" },
    });

    const rzp = new Razorpay({
      key: order.keyId,
      amount: order.order.amount,
      currency: order.order.currency,
      name: "Dewify Payment Test",
      description: "Test digital product payment",
      order_id: order.order.id,
      prefill: {
        email: emailInput.value.trim(),
      },
      handler: async (result) => {
        try {
          setStatus("Payment returned. Verifying signature…");

          const verified = await post("/api/razorpay/verify", {
            orderId: result.razorpay_order_id,
            paymentId: result.razorpay_payment_id,
            signature: result.razorpay_signature,
          });

          setStatus(
            verified.verified
              ? "Razorpay payment signature verified."
              : "Razorpay verification failed.",
          );
        } catch (error) {
          setStatus("Razorpay verification error: " + error.message);
        }
      },
      modal: {
        ondismiss: () => setStatus("Razorpay checkout closed."),
      },
    });

    rzp.open();
  }

  async function testStripe() {
    const priceId = document.getElementById("stripe-price").value.trim();
    const quantity = Number(document.getElementById("stripe-qty").value);

    if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
      throw new Error("Enter a valid Stripe test Price ID.");
    }

    setStatus("Creating Stripe Checkout Session…");

    const origin = window.location.origin;
    const data = await post("/api/stripe/checkout-session", {
      items: [{ priceId, quantity }],
      customerEmail: emailInput.value.trim() || undefined,
      successUrl: origin + window.location.pathname + "?status=stripe-success",
      cancelUrl: origin + window.location.pathname + "?status=stripe-cancelled",
      clientReferenceId: "dewify_test_" + Date.now(),
      metadata: {
        source: "dewify-payment-test",
      },
    });

    if (!data.session?.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    window.location.href = data.session.url;
  }

  document.getElementById("rzp-buy").addEventListener("click", () => {
    testRazorpay().catch((error) => setStatus(error.message));
  });

  document.getElementById("stripe-buy").addEventListener("click", () => {
    testStripe().catch((error) => setStatus(error.message));
  });

  const status = new URLSearchParams(location.search).get("status");
  if (status === "stripe-success") setStatus("Returned from Stripe Checkout.");
  if (status === "stripe-cancelled") setStatus("Stripe Checkout was cancelled.");
})();

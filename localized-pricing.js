(() => {
  "use strict";

  const cfg = window.DEWIFY_CONFIG || {};
  const products = Array.isArray(cfg.products) ? cfg.products : [];
  const token = String(cfg.PADDLE_CLIENT_TOKEN || "").trim();

  function setText(productId, textValue) {
    document.querySelectorAll('[data-price-product="' + productId + '"]').forEach(el => {
      el.textContent = textValue;
    });
  }

  function preview(product) {
    const priceId = String(product?.priceId || "").trim();
    if (!window.Paddle || !priceId) return Promise.resolve();

    return Paddle.PricePreview({
      items: [{ priceId, quantity: 1 }]
    }).then(result => {
      const line = result?.data?.details?.lineItems?.[0];
      const localized = line?.formattedTotals?.total || line?.formattedUnitTotals?.total || line?.formattedTotals?.subtotal || line?.formattedUnitTotals?.subtotal;
      if (localized) setText(product.id, localized);
    }).catch(error => {
      console.warn("Localized price preview failed:", error);
    });
  }

  function init() {
    if (!window.Paddle || !token) return;

    try {
      if (String(cfg.PADDLE_ENVIRONMENT || "production").toLowerCase() === "sandbox") {
        Paddle.Environment.set("sandbox");
      }

      Paddle.Initialize({ token });

      products.forEach(product => preview(product));
    } catch (error) {
      console.warn("Localized pricing could not initialize:", error);
    }
  }

  window.addEventListener("load", init, { once: true });
})();
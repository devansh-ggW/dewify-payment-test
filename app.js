(() => {
  "use strict";

  const cfg = window.DEWIFY_CONFIG || {};
  const products = Array.isArray(cfg.products) ? cfg.products : [];
  const $ = (selector, root = document) => root.querySelector(selector);

  let paddleReady = false;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function validProduct(product) {
    return product && product.id && product.name && product.description;
  }

  function renderProducts() {
    const grid = $("#productGrid");
    if (!grid) return;

    const valid = products.filter(validProduct);
    if (!valid.length) {
      grid.innerHTML = '<div class="empty-state"><strong>No drops yet.</strong><span>New digital products will appear here.</span></div>';
      return;
    }

    grid.innerHTML = valid.map((p, index) => {
      const image = p.image
        ? '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
        : '<div class="art-fallback"><span>DEWIFY</span><strong>' + escapeHtml(p.name) + '</strong></div>';

      return `
        <article class="product-card" data-product-id="${escapeHtml(p.id)}" tabindex="0">
          <div class="product-art">
            <span class="product-number">DROP /${String(index + 1).padStart(2, "0")}</span>
            <span class="product-badge">DIGITAL</span>
            ${image}
          </div>
          <div class="product-copy">
            <div class="product-meta"><span>${escapeHtml(p.category)}</span><span>${escapeHtml(p.version || "CURRENT")}</span></div>
            <h3>${escapeHtml(p.name)}</h3>
            <p>${escapeHtml(p.description)}</p>
            <div class="product-bottom">
              <strong>${escapeHtml(p.displayPrice || "View price at checkout")}</strong>
              <button class="button button-light buy-button" data-buy="${escapeHtml(p.id)}" type="button">Buy now <span>↗</span></button>
            </div>
          </div>
        </article>`;
    }).join("");

    grid.querySelectorAll(".product-card").forEach(card => {
      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        openProduct(card.dataset.productId);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProduct(card.dataset.productId);
        }
      });
    });

    grid.querySelectorAll("[data-buy]").forEach(button => {
      button.addEventListener("click", () => openCheckout(button.dataset.buy));
    });
  }

  function getProduct(id) {
    return products.find(product => product.id === id) || null;
  }

  function openProduct(id) {
    const product = getProduct(id);
    if (!product) return;

    $("#detailTitle").textContent = product.name;
    $("#detailBody").innerHTML = `
      <div class="detail-grid">
        <div class="detail-art">
          ${product.image
            ? '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" decoding="async" referrerpolicy="no-referrer">'
            : '<div class="art-fallback large"><span>DEWIFY</span><strong>' + escapeHtml(product.name) + '</strong></div>'}
        </div>
        <div class="detail-copy">
          <div class="product-meta"><span>${escapeHtml(product.category)}</span><span>${escapeHtml(product.type)}</span></div>
          <h1>${escapeHtml(product.name)}</h1>
          <p class="detail-description">${escapeHtml(product.description)}</p>
          <div class="spec-grid">
            <div><span>VERSION</span><strong>${escapeHtml(product.version || "CURRENT")}</strong></div>
            <div><span>COMPATIBILITY</span><strong>${escapeHtml(product.compatibility || "SUPPORTED DEVICES")}</strong></div>
            <div><span>DELIVERY</span><strong>INSTANT / DIGITAL</strong></div>
            <div><span>CHECKOUT</span><strong>PADDLE</strong></div>
          </div>
          <div class="detail-list">
            ${(product.highlights || []).map((item, index) =>
              '<div><b>' + String(index + 1).padStart(2, "0") + '</b><span>' + escapeHtml(item) + '</span></div>'
            ).join("")}
          </div>
          <div class="detail-buy-row">
            <strong>${escapeHtml(product.displayPrice || "View price at checkout")}</strong>
            <button class="button button-light" data-detail-buy="${escapeHtml(product.id)}" type="button">Buy now <span>↗</span></button>
          </div>
        </div>
      </div>`;

    const modal = $("#productModal");
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");

    const buy = $("[data-detail-buy]", modal);
    if (buy) buy.addEventListener("click", () => openCheckout(product.id));
  }

  function closeProduct() {
    const modal = $("#productModal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!$("#successModal").classList.contains("is-open")) document.body.classList.remove("locked");
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function setCheckoutState() {
    const hasToken = Boolean(String(cfg.PADDLE_CLIENT_TOKEN || "").trim());
    const hasPrice = products.some(product => String(product.priceId || "").trim());

    const pill = $("#storePill");
    const dot = $("#statusDot");
    const title = $("#statusTitle");
    const copy = $("#statusCopy");
    const state = $("#checkoutState");

    if (hasToken && hasPrice && window.Paddle) {
      pill.textContent = "PADDLE READY";
      dot.classList.add("ready");
      title.textContent = "Checkout ready";
      copy.textContent = "Paddle is connected. Product buttons can open the live checkout.";
      state.textContent = "PADDLE / READY";
    } else {
      pill.textContent = "DIGITAL STORE";
      dot.classList.remove("ready");
      title.textContent = "Checkout setup pending";
      copy.textContent = "Add your Paddle client-side token and the product price ID in config.js. No API key belongs in this file.";
      state.textContent = "PADDLE / PENDING";
    }
  }

  function initPaddle() {
    const token = String(cfg.PADDLE_CLIENT_TOKEN || "").trim();
    if (!token || !window.Paddle) {
      setCheckoutState();
      return;
    }

    try {
      if (String(cfg.PADDLE_ENVIRONMENT || "production").toLowerCase() === "sandbox") {
        Paddle.Environment.set("sandbox");
      }

      Paddle.Initialize({
        token,
        eventCallback(event) {
          if (!event || event.name !== "checkout.completed") return;

          const data = event.data || {};
          const items = Array.isArray(data.items) ? data.items : [];
          const priceId = items[0]?.price_id || items[0]?.priceId || "";
          const product = products.find(item => item.priceId === priceId) || products.find(item => item.id === "devcore") || products[0];

          $("#successProduct").textContent = product?.name || "DEWIFY digital product";
          $("#successTransaction").textContent = data.transaction_id || "Completed";

          const download = $("#downloadButton");
          if (product?.downloadUrl) {
            download.href = product.downloadUrl;
            download.style.display = "inline-flex";
          } else {
            download.style.display = "none";
          }

          const success = $("#successModal");
          success.classList.add("is-open");
          success.setAttribute("aria-hidden", "false");
          document.body.classList.add("locked");
        }
      });

      paddleReady = true;
      setCheckoutState();
    } catch (error) {
      console.error("Paddle initialization failed", error);
      paddleReady = false;
      setCheckoutState();
      showToast("Paddle could not be initialized");
    }
  }

  function openCheckout(productId) {
    const product = getProduct(productId);
    if (!product) return;

    if (!paddleReady || !window.Paddle) {
      showToast("Paddle checkout is not connected yet");
      openProduct(productId);
      return;
    }

    const priceId = String(product.priceId || "").trim();
    if (!priceId) {
      showToast("This product still needs its Paddle price ID");
      return;
    }

    try {
      Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          theme: "dark",
          locale: "en"
        }
      });
    } catch (error) {
      console.error("Paddle checkout failed", error);
      showToast("Checkout could not be opened");
    }
  }

  function initStars() {
    const canvas = $("#starfield");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0, height = 0, stars = [];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.max(80, Math.min(180, Math.floor((width * height) / 15000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.15 + 0.15,
        a: Math.random() * 0.45 + 0.12,
        s: Math.random() * 0.18 + 0.025
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        ctx.globalAlpha = star.a;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced) {
          star.y += star.s;
          if (star.y > height + 2) {
            star.y = -2;
            star.x = Math.random() * width;
          }
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced) requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    draw();
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-close-modal]")) closeProduct();
    if (event.target.id === "closeSuccess") {
      const success = $("#successModal");
      success.classList.remove("is-open");
      success.setAttribute("aria-hidden", "true");
      document.body.classList.remove("locked");
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if ($("#productModal").classList.contains("is-open")) closeProduct();
    if ($("#successModal").classList.contains("is-open")) {
      $("#successModal").classList.remove("is-open");
      $("#successModal").setAttribute("aria-hidden", "true");
      document.body.classList.remove("locked");
    }
  });

  renderProducts();
  setCheckoutState();
  initPaddle();
  initStars();
})();
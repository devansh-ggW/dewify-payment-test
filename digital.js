(() => {
  "use strict";

  const cfg = window.DEWIFY_CONFIG || {};
  const product = (cfg.products || []).find(p => p.id === "ai-money-arc");
  const $ = (selector) => document.querySelector(selector);
  const token = String(cfg.PADDLE_CLIENT_TOKEN || "").trim();
  const priceId = String(product?.priceId || "").trim();

  let paddleReady = false;
  let checkoutOpen = false;
  const deviceKey = "dewify:device-id";
  const deviceId = (() => {
    try {
      let id = localStorage.getItem(deviceKey);
      if (!id) {
        id = (crypto?.randomUUID?.() || ("dewify-" + Date.now() + "-" + Math.random().toString(36).slice(2)));
        localStorage.setItem(deviceKey, id);
      }
      return id;
    } catch (_) {
      return "temporary-device";
    }
  })();
  const storageKey = "dewify:download-ready:ai-money-arc:" + deviceId;
  const progressKey = "dewify:progress:ai-money-arc:" + deviceId;

  const setStatus = (message) => {
    const el = $("#checkoutStatus");
    if (el) {
      el.textContent = message;
      el.setAttribute("aria-live", "polite");
    }
  };

  const setPrice = (value) => {
    const el = $("#productPrice");
    if (el && value) el.textContent = value;
  };

  const downloadFilename = "AI MONEY ARC.zip";

  const saveProgress = () => {
    try {
      localStorage.setItem(progressKey, JSON.stringify({
        scrollY: Math.max(0, Math.round(window.scrollY || 0)),
        updatedAt: Date.now()
      }));
    } catch (error) {
      console.warn("Could not save reading progress:", error);
    }
  };

  const restoreProgress = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "null");
      if (!Number.isFinite(saved?.scrollY) || saved.scrollY <= 0) return;
      window.setTimeout(() => window.scrollTo({ top: saved.scrollY, behavior: "auto" }), 250);
    } catch (error) {
      console.warn("Could not restore reading progress:", error);
    }
  };

  const triggerNamedDownload = async (url, filename) => {
    if (!url) throw new Error("missing_download_url");
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error("download_http_" + response.status);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  };

  const setDownloadLocked = () => {
    ["#downloadBook", "#downloadPersistent"].forEach(selector => {
      const link = $(selector);
      if (!link) return;
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
      link.dataset.ready = "false";
      link.classList.add("is-download-locked");
    });

    const label = $("#downloadStateLabel");
    const title = $("#downloadStateTitle");
    const copy = $("#downloadStateCopy");
    if (label) label.textContent = "DOWNLOAD LOCKED";
    if (title) title.textContent = "Pay to unlock your download.";
    if (copy) copy.textContent = "Complete your purchase to unlock the AI MONEY ARC ZIP download.";
  };

  const setDownloadLinks = () => {
    if (!product?.downloadUrl) return;

    ["#downloadBook", "#downloadPersistent"].forEach(selector => {
      const link = $(selector);
      if (!link) return;
      link.href = product.downloadUrl;
      link.removeAttribute("aria-disabled");
      link.removeAttribute("tabindex");
      link.dataset.ready = "true";
      link.classList.remove("is-download-locked");
    });

    const label = $("#downloadStateLabel");
    const title = $("#downloadStateTitle");
    const copy = $("#downloadStateCopy");
    if (label) label.textContent = "DOWNLOAD READY";
    if (title) title.textContent = "Your AI MONEY ARC ZIP is ready.";
    if (copy) copy.textContent = "Your payment is confirmed. Your download is unlocked.";
  };

  const rememberDownload = (transactionId) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        transactionId: transactionId || "Completed",
        ready: true
      }));
    } catch (error) {
      console.warn("Could not remember download state:", error);
    }
  };

  const showDownloadBar = () => {
    const bar = $("#downloadBar");
    const link = $("#downloadPersistent");
    if (!bar || !link) return;
    setDownloadLinks();
    bar.hidden = false;
    link.setAttribute("aria-disabled", "false");
  };

  const restoreDownload = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.ready) showDownloadBar();
      else setDownloadLocked();
    } catch (error) {
      console.warn("Could not restore download state:", error);
      setDownloadLocked();
    }
  };

  const setBuyState = (ready) => {
    const button = $("#buyButton");
    if (!button) return;
    button.disabled = !ready;
    button.setAttribute("aria-disabled", String(!ready));
    button.textContent = ready ? "Buy AI MONEY ARC ↗" : "Preparing checkout…";
    button.classList.toggle("is-loading", !ready);
  };

  const setLocalizedPrice = async () => {
    if (!window.Paddle || !priceId) return;

    try {
      const result = await Paddle.PricePreview({
        items: [{ priceId, quantity: 1 }]
      });

      const line = result?.data?.details?.lineItems?.[0];
      const localized =
        line?.formattedTotals?.total ||
        line?.formattedUnitTotals?.total ||
        line?.formattedTotals?.subtotal ||
        line?.formattedUnitTotals?.subtotal;

      if (localized) {
        setPrice(localized);
        setStatus("Local price loaded. Checkout is ready.");
      }
    } catch (error) {
      console.warn("Localized price preview failed:", error);
      setStatus("Checkout is ready. Final tax and currency are confirmed in Paddle.");
    }
  };

  const closeSuccess = () => {
    const modal = $("#successModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
  };

  const showSuccess = (event) => {
    const out = $("#successTransaction");
    if (out) out.textContent = event?.data?.transaction_id || "Completed";

    const transactionId = event?.data?.transaction_id || "Completed";
    rememberDownload(transactionId);
    setDownloadLinks();
    showDownloadBar();

    const modal = $("#successModal");
    if (!modal) return;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");

    const download = $("#downloadBook");
    window.setTimeout(() => download?.focus(), 40);
  };

  if (product) {
    setPrice(product.displayPrice || "$9.99");
    const name = $("#productName");
    if (name) name.textContent = product.name;
  }

  async function init() {
    setBuyState(false);
    setStatus("Loading local price & secure checkout…");

    if (!window.Paddle) {
      setStatus("Paddle checkout could not load. Please refresh and try again.");
      return;
    }

    if (!token || !priceId) {
      setStatus("Checkout setup is incomplete. Please contact support.");
      return;
    }

    try {
      if (String(cfg.PADDLE_ENVIRONMENT || "production").toLowerCase() === "sandbox") {
        Paddle.Environment.set("sandbox");
      }

      Paddle.Initialize({
        token,
        eventCallback: (event) => {
          if (event?.name === "checkout.completed") {
            checkoutOpen = false;
            showSuccess(event);
            return;
          }

          if (event?.name === "checkout.closed") {
            checkoutOpen = false;
          }

          if (
            event?.name === "checkout.error" ||
            event?.name === "checkout.payment.error" ||
            event?.name === "checkout.warning"
          ) {
            checkoutOpen = false;
            const code = event?.code || "checkout_error";
            const detail = event?.detail || "Paddle could not complete this checkout.";
            console.error("Paddle checkout event:", event);
            setStatus(`Paddle: ${code} — ${detail}`);
            setBuyState(true);
          }
        }
      });

      paddleReady = true;
      setBuyState(true);
      await setLocalizedPrice();

      if (!$("#checkoutStatus")?.textContent || $("#checkoutStatus").textContent.includes("Loading")) {
        setStatus("Local price loaded. Checkout is ready.");
      }
    } catch (error) {
      console.error("Paddle.Initialize failed:", error);
      setStatus(`Checkout error: ${error?.message || "initialize_failed"}`);
    }
  }

  $("#buyButton")?.addEventListener("click", () => {
    if (!paddleReady || !window.Paddle) {
      setStatus("Checkout is still loading. Please try again in a moment.");
      return;
    }

    if (!priceId) {
      setStatus("Checkout setup is incomplete. Please contact support.");
      return;
    }

    if (checkoutOpen) return;

    try {
      checkoutOpen = true;
      setStatus("Opening secure checkout…");
      Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          theme: "light",
          locale: "en"
        }
      });
    } catch (error) {
      checkoutOpen = false;
      console.error("Paddle.Checkout.open failed:", error);
      setStatus(`Checkout error: ${error?.message || "open_failed"}`);
    }
  });

  $("#downloadBook, #downloadPersistent")?.forEach?.(() => {});

  ["#downloadBook", "#downloadPersistent"].forEach(selector => {
    $(selector)?.addEventListener("click", async (event) => {
      event.preventDefault();
      const link = event.currentTarget;

      if (link?.dataset?.ready !== "true" || !product?.downloadUrl) {
        setStatus("Please complete your purchase to unlock the download.");
        return;
      }

      link.dataset.downloading = "true";
      link.setAttribute("aria-busy", "true");
      link.textContent = "Preparing ZIP…";

      try {
        await triggerNamedDownload(product.downloadUrl, downloadFilename);
        setStatus("Download started — " + downloadFilename);
      } catch (error) {
        console.warn("Named download failed, opening the file directly:", error);
        window.open(product.downloadUrl, "_blank", "noopener");
        setStatus("Your ZIP opened in a new tab. Save it as " + downloadFilename + ".");
      } finally {
        link.dataset.downloading = "false";
        link.removeAttribute("aria-busy");
        link.textContent = "Download AI MONEY ARC ↗";
      }
    });
  });

  $("#closeSuccess")?.addEventListener("click", closeSuccess);
  $("#successModal .scrim")?.addEventListener("click", closeSuccess);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSuccess();
  });

  setDownloadLocked();
  restoreDownload();
  restoreProgress();
  let progressTimer = 0;
  window.addEventListener("scroll", () => {
    window.clearTimeout(progressTimer);
    progressTimer = window.setTimeout(saveProgress, 250);
  }, { passive: true });
  window.addEventListener("beforeunload", saveProgress);
  window.addEventListener("load", init, { once: true });
})();
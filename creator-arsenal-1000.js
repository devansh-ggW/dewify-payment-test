(() => {
  "use strict";

  const cfg = window.DEWIFY_CONFIG || {};
  const product = (cfg.products || []).find(p => p.id === "creator-arsenal-1000");
  const $ = selector => document.querySelector(selector);
  const token = String(cfg.PADDLE_CLIENT_TOKEN || "").trim();
  const priceId = String(product?.priceId || "").trim();
  const hasDownload = Boolean(String(product?.downloadUrl || "").trim());

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
    } catch (_) { return "temporary-device"; }
  })();
  const storageKey = "dewify:download-ready:creator-arsenal-1000:" + deviceId;
  const progressKey = "dewify:progress:creator-arsenal-1000:" + deviceId;
  const downloadFilename = "CREATOR ARSENAL 1000.zip";

  function setStatus(message) {
    const el = $("#checkoutStatus");
    if (el) { el.textContent = message; el.setAttribute("aria-live", "polite"); }
  }

  function setPrice(value) {
    const el = $("#productPrice");
    if (el && value) el.textContent = value;
  }

  function setBuyState(ready) {
    const button = $("#buyButton");
    if (!button) return;
    button.disabled = !ready;
    button.setAttribute("aria-disabled", String(!ready));
    button.textContent = ready ? "Buy CREATOR ARSENAL 1000 ↗" : "Currently unavailable";
  }

  function setDownloadLocked(message = "Complete your purchase to unlock the CREATOR ARSENAL 1000 ZIP download.") {
    ["#downloadVault", "#downloadPersistent"].forEach(selector => {
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
    if (label) label.textContent = "DOWNLOAD UNAVAILABLE";
    if (title) title.textContent = hasDownload ? "Pay to unlock your download." : "Delivery file is not configured yet.";
    if (copy) copy.textContent = message;
  }

  function setDownloadLink() {
    if (!hasDownload) { setDownloadLocked("The delivery ZIP has not been uploaded yet, so checkout is disabled to prevent a paid order with no download."); return; }
    ["#downloadVault", "#downloadPersistent"].forEach(selector => {
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
    if (title) title.textContent = "Your CREATOR ARSENAL 1000 ZIP is ready.";
    if (copy) copy.textContent = "Your payment is confirmed. Your download is unlocked.";
  }

  function rememberDownload(transactionId) {
    try { localStorage.setItem(storageKey, JSON.stringify({ transactionId: transactionId || "Completed", ready: true })); } catch (_) {}
  }

  function restoreDownload() {
    if (!hasDownload) { setDownloadLocked("The delivery ZIP has not been uploaded yet. Checkout is disabled until the file exists."); return; }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.ready) setDownloadLink(); else setDownloadLocked();
    } catch (_) { setDownloadLocked(); }
  }

  async function triggerNamedDownload(url, filename) {
    if (!url) throw new Error("missing_download_url");
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) throw new Error("download_http_" + response.status);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl; anchor.download = filename; anchor.rel = "noopener";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }

  function showSuccess(event) {
    if (!hasDownload) return;
    const tx = $("#successTransaction");
    if (tx) tx.textContent = event?.data?.transaction_id || "Completed";
    rememberDownload(event?.data?.transaction_id || "Completed");
    setDownloadLink();
    const modal = $("#successModal");
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");
    window.setTimeout(() => $("#downloadVault")?.focus(), 40);
  }

  function closeSuccess() {
    const modal = $("#successModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
  }

  function saveProgress() {
    try { localStorage.setItem(progressKey, JSON.stringify({ scrollY: Math.max(0, Math.round(window.scrollY || 0)), updatedAt: Date.now() })); } catch (_) {}
  }

  function restoreProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "null");
      if (Number.isFinite(saved?.scrollY) && saved.scrollY > 0) window.setTimeout(() => window.scrollTo({ top: saved.scrollY, behavior: "auto" }), 250);
    } catch (_) {}
  }

  async function initPaddle() {
    if (!hasDownload) {
      setBuyState(false);
      setStatus("This product is temporarily unavailable because its delivery ZIP has not been uploaded.");
      return;
    }
    setBuyState(false);
    setStatus("Loading local price & secure checkout…");
    if (!window.Paddle) { setStatus("Paddle checkout could not load. Please refresh and try again."); return; }
    if (!token || !priceId) { setStatus("Checkout setup is incomplete. Please contact support."); return; }
    try {
      if (String(cfg.PADDLE_ENVIRONMENT || "production").toLowerCase() === "sandbox") Paddle.Environment.set("sandbox");
      Paddle.Initialize({
        token,
        eventCallback: event => {
          if (event?.name === "checkout.completed") { checkoutOpen = false; showSuccess(event); return; }
          if (event?.name === "checkout.closed") checkoutOpen = false;
          if (["checkout.error", "checkout.payment.error", "checkout.warning"].includes(event?.name)) {
            checkoutOpen = false;
            console.error("Paddle checkout event:", event);
            setStatus("Paddle: " + (event?.detail || event?.code || "Checkout could not complete."));
            setBuyState(true);
          }
        }
      });
      paddleReady = true;
      setBuyState(true);
      try {
        const result = await Paddle.PricePreview({ items: [{ priceId, quantity: 1 }] });
        const line = result?.data?.details?.lineItems?.[0];
        const localized = line?.formattedTotals?.total || line?.formattedUnitTotals?.total || line?.formattedTotals?.subtotal || line?.formattedUnitTotals?.subtotal;
        if (localized) { setPrice(localized); setStatus("Local price loaded. Checkout is ready."); }
        else setStatus("Checkout is ready. Final tax and currency are confirmed in Paddle.");
      } catch (_) { setStatus("Checkout is ready. Final tax and currency are confirmed in Paddle."); }
    } catch (error) { console.error("Paddle initialization failed:", error); setStatus("Checkout error: " + (error?.message || "initialize_failed")); }
  }

  $("#buyButton")?.addEventListener("click", () => {
    if (!hasDownload) { setStatus("This product cannot be purchased yet because its delivery ZIP is missing."); return; }
    if (!paddleReady || !window.Paddle) { setStatus("Checkout is still loading. Please try again in a moment."); return; }
    if (!priceId) { setStatus("Checkout setup is incomplete. Please contact support."); return; }
    if (checkoutOpen) return;
    try {
      checkoutOpen = true;
      setStatus("Opening secure checkout…");
      Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], settings: { displayMode: "overlay", theme: "light", locale: "en" } });
    } catch (error) { checkoutOpen = false; setStatus("Checkout error: " + (error?.message || "open_failed")); }
  });

  ["#downloadVault", "#downloadPersistent"].forEach(selector => {
    $(selector)?.addEventListener("click", async event => {
      event.preventDefault();
      const link = event.currentTarget;
      if (link?.dataset?.ready !== "true" || !hasDownload) { setStatus("Please complete your purchase to unlock the download."); return; }
      link.dataset.downloading = "true"; link.setAttribute("aria-busy", "true"); link.textContent = "Preparing ZIP…";
      try { await triggerNamedDownload(product.downloadUrl, downloadFilename); setStatus("Download started — " + downloadFilename); }
      catch (error) { console.warn("Named download failed, opening the file directly:", error); window.open(product.downloadUrl, "_blank", "noopener"); setStatus("Your ZIP opened in a new tab. Save it as " + downloadFilename + "."); }
      finally { link.dataset.downloading = "false"; link.removeAttribute("aria-busy"); link.textContent = "Download CREATOR ARSENAL 1000 ↗"; }
    });
  });

  $("#closeSuccess")?.addEventListener("click", closeSuccess);
  $("#successModal .scrim")?.addEventListener("click", closeSuccess);
  window.addEventListener("keydown", event => { if (event.key === "Escape") closeSuccess(); });
  restoreDownload();
  restoreProgress();
  let progressTimer = 0;
  window.addEventListener("scroll", () => { window.clearTimeout(progressTimer); progressTimer = window.setTimeout(saveProgress, 250); }, { passive: true });
  window.addEventListener("beforeunload", saveProgress);
  window.addEventListener("load", initPaddle, { once: true });
})();

(() => {
  "use strict";

  const cfg = window.DEWIFY_CONFIG || {};
  const product = (cfg.products || []).find(p => p.id === "creator-stash-700");
  const $ = selector => document.querySelector(selector);
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
  const storageKey = "dewify:download-ready:creator-stash-700:" + deviceId;
  const progressKey = "dewify:progress:creator-stash-700:" + deviceId;
  const downloadFilename = "CREATOR STASH 700.zip";

  function saveProgress() {
    try {
      localStorage.setItem(progressKey, JSON.stringify({
        scrollY: Math.max(0, Math.round(window.scrollY || 0)),
        updatedAt: Date.now()
      }));
    } catch (error) {
      console.warn("Could not save reading progress:", error);
    }
  }

  function restoreProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || "null");
      if (!Number.isFinite(saved?.scrollY) || saved.scrollY <= 0) return;
      window.setTimeout(() => window.scrollTo({ top: saved.scrollY, behavior: "auto" }), 250);
    } catch (error) {
      console.warn("Could not restore reading progress:", error);
    }
  }

  async function triggerNamedDownload(url, filename) {
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
  }

  function setStatus(message) {
    const el = $("#checkoutStatus");
    if (el) {
      el.textContent = message;
      el.setAttribute("aria-live", "polite");
    }
  }

  function setPrice(value) {
    const el = $("#productPrice");
    if (el && value) el.textContent = value;
  }

  function setDownloadLocked() {
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
    if (label) label.textContent = "DOWNLOAD LOCKED";
    if (title) title.textContent = "Pay to unlock your download.";
    if (copy) copy.textContent = "Complete your purchase to unlock the CREATOR STASH 700 ZIP download.";
  }

  function setDownloadLink() {
    if (!product?.downloadUrl) return;

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
    if (title) title.textContent = "Your CREATOR STASH 700 ZIP is ready.";
    if (copy) copy.textContent = "Your payment is confirmed. Your download is unlocked.";
  }

  function rememberDownload(transactionId) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        transactionId: transactionId || "Completed",
        ready: true
      }));
    } catch (error) {
      console.warn("Could not remember download state:", error);
    }
  }

  function showDownloadBar() {
    const bar = $("#downloadBar");
    const link = $("#downloadPersistent");
    if (!bar || !link) return;
    setDownloadLink();
    bar.hidden = false;
    link.setAttribute("aria-disabled", "false");
  }

  function restoreDownload() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (saved?.ready) showDownloadBar();
      else setDownloadLocked();
    } catch (error) {
      console.warn("Could not restore download state:", error);
      setDownloadLocked();
    }
  }

  function setBuyState(ready) {
    const button = $("#buyButton");
    if (!button) return;
    button.disabled = !ready;
    button.setAttribute("aria-disabled", String(!ready));
    button.textContent = ready ? "Buy CREATOR STASH 700 ↗" : "Preparing checkout…";
    button.classList.toggle("is-loading", !ready);
  }

  function showSuccess(event) {
    const modal = $("#successModal");
    if (!modal) return;

    const tx = $("#successTransaction");
    if (tx) tx.textContent = event?.data?.transaction_id || "Completed";

    const transactionId = event?.data?.transaction_id || "Completed";
    rememberDownload(transactionId);
    setDownloadLink();
    showDownloadBar();

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");

    const download = $("#downloadVault");
    window.setTimeout(() => download?.focus(), 40);
  }

  function closeSuccess() {
    const modal = $("#successModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
  }

  async function initPaddle() {
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
        eventCallback: event => {
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
            console.error("Paddle checkout event:", event);
            setStatus(
              "Paddle: " +
                (event?.detail || event?.code || "Checkout could not complete.")
            );
            setBuyState(true);
          }
        }
      });

      paddleReady = true;
      setBuyState(true);

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
        } else {
          setStatus("Checkout is ready. Final total is confirmed in Paddle.");
        }
      } catch (error) {
        console.warn("Price preview failed:", error);
        setStatus("Checkout is ready. Final tax and currency are confirmed in Paddle.");
      }
    } catch (error) {
      console.error("Paddle initialization failed:", error);
      setStatus("Checkout error: " + (error?.message || "initialize_failed"));
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
      console.error("Paddle checkout failed:", error);
      setStatus("Checkout error: " + (error?.message || "open_failed"));
    }
  });

  ["#downloadVault", "#downloadPersistent"].forEach(selector => {
    $(selector)?.addEventListener("click", async event => {
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
        link.textContent = "Download CREATOR STASH 700 ↗";
      }
    });
  });

  $("#closeSuccess")?.addEventListener("click", closeSuccess);
  $("#successModal .scrim")?.addEventListener("click", closeSuccess);
  window.addEventListener("keydown", event => {
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
  window.addEventListener("load", initPaddle, { once: true });
})();
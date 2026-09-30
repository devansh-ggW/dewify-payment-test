(() => {
  "use strict";

  const STORAGE_KEY = "dewify:local-profile:v2";
  const defaults = {
    name: "",
    email: "",
    business: "",
    phone: "",
    avatar: "",
    avatarZoom: 1,
    avatarX: 50,
    avatarY: 50
  };

  const loadProfile = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("dewify:local-profile:v1");
      if (!raw) return { ...defaults };
      const parsed = JSON.parse(raw);
      const profile = { ...defaults, ...(parsed && typeof parsed === "object" ? parsed : {}) };
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanProfile(profile)));
      }
      return profile;
    } catch {
      return { ...defaults };
    }
  };

  const hasProfile = (profile) =>
    Boolean(
      String(profile.name || "").trim() ||
      String(profile.email || "").trim() ||
      String(profile.business || "").trim() ||
      String(profile.phone || "").trim() ||
      profile.avatar
    );

  const cleanProfile = (profile) => ({
    name: String(profile.name || "").trim().slice(0, 120),
    email: String(profile.email || "").trim().slice(0, 190),
    business: String(profile.business || "").trim().slice(0, 160),
    phone: String(profile.phone || "").trim().slice(0, 40),
    avatar: typeof profile.avatar === "string" && profile.avatar.startsWith("data:image/") ? profile.avatar : "",
    avatarZoom: Number.isFinite(Number(profile.avatarZoom)) ? Math.min(3, Math.max(1, Number(profile.avatarZoom))) : 1,
    avatarX: Number.isFinite(Number(profile.avatarX)) ? Math.min(100, Math.max(0, Number(profile.avatarX))) : 50,
    avatarY: Number.isFinite(Number(profile.avatarY)) ? Math.min(100, Math.max(0, Number(profile.avatarY))) : 50
  });

  const saveProfile = (profile) => {
    const cleaned = cleanProfile(profile);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    return cleaned;
  };

  const displayName = (profile) =>
    String(profile.name || "").trim() ||
    String(profile.business || "").trim() ||
    String(profile.email || "").trim() ||
    "Your profile";

  const initials = (profile) => {
    const source = displayName(profile).replace(/\s+/g, " ").trim();
    const parts = source.split(" ").filter(Boolean);
    return (parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2))
      .toUpperCase();
  };

  const renderAvatar = (element, profile, large = false) => {
    if (!element) return;
    element.classList.toggle("has-image", Boolean(profile.avatar));
    element.classList.toggle("is-large", large);
    if (profile.avatar) {
      const img = document.createElement("img");
      img.src = profile.avatar;
      img.alt = "";
      img.draggable = false;
      element.replaceChildren(img);
      if (element.matches(".dewify-profile-avatar-adjust")) {
        applyAvatarPosition(element, profile);
      } else {
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.maxWidth = "none";
        img.style.maxHeight = "none";
        img.style.objectFit = "cover";
        img.style.objectPosition = "50% 50%";
        img.style.left = "0";
        img.style.top = "0";
        img.style.transform = "none";
        img.style.transformOrigin = "center";
      }
    } else {
      element.innerHTML = '<span>' + initials(profile) + '</span>';
    }
    element.setAttribute("aria-label", displayName(profile) + " profile");
  };

  const applyAvatarPosition = (element, profile) => {
    if (!element) return;
    const img = element.querySelector("img");
    if (!img) return;

    const zoom = Math.min(3, Math.max(1, Number(profile.avatarZoom) || 1));
    const x = Math.min(100, Math.max(0, Number(profile.avatarX) || 50));
    const y = Math.min(100, Math.max(0, Number(profile.avatarY) || 50));

    const width = element.clientWidth || 1;
    const height = element.clientHeight || 1;
    const maxPanX = (width * (zoom - 1)) / 2;
    const maxPanY = (height * (zoom - 1)) / 2;
    const tx = ((50 - x) / 50) * maxPanX;
    const ty = ((50 - y) / 50) * maxPanY;

    img.style.width = "100%";
    img.style.height = "100%";
    img.style.maxWidth = "none";
    img.style.maxHeight = "none";
    img.style.objectFit = "cover";
    img.style.objectPosition = "50% 50%";
    img.style.left = "50%";
    img.style.top = "50%";
    img.style.transform = "translate(calc(-50% + " + tx.toFixed(2) + "px),calc(-50% + " + ty.toFixed(2) + "px)) scale(" + zoom.toFixed(3) + ")";
    img.style.transformOrigin = "center";
  };

  const resizeImage = (file) =>
    new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        reject(new Error("invalid_image"));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read_failed"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("image_failed"));
        image.onload = () => {
          const max = 320;
          const scale = Math.min(1, max / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
          const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
          const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("canvas_unavailable"));
            return;
          }
          ctx.drawImage(image, 0, 0, width, height);
          let data = "";
          try {
            data = canvas.toDataURL("image/webp", 0.82);
          } catch {
            data = "";
          }
          if (!data || data === "data:image/webp") {
            data = canvas.toDataURL("image/jpeg", 0.82);
          }
          resolve(data);
        };
        image.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });

  const ready = () => {
    if (!document.body || document.getElementById("dewify-local-profile-panel")) return;

    let profile = loadProfile();

    const nav = document.querySelector(".nav");
    const existingPill = nav?.querySelector(".store-pill");

    const trigger = document.createElement("button");
    trigger.id = "dewify-local-profile-trigger";
    trigger.type = "button";
    trigger.className = "dewify-local-profile-nav";
    trigger.setAttribute("aria-controls", "dewify-local-profile-panel");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = `
      <span class="dewify-profile-nav-copy">
        <small>LOCAL PROFILE</small>
        <strong>View profile</strong>
      </span>
      <span class="dewify-profile-avatar dewify-profile-avatar-nav"></span>
    `;

    if (existingPill) existingPill.replaceWith(trigger);
    else nav?.appendChild(trigger);

    const dropdown = document.createElement("div");
    dropdown.className = "dewify-profile-dropdown";
    dropdown.setAttribute("aria-hidden", "true");
    dropdown.innerHTML = `
      <div class="dewify-profile-dropdown-summary">
        <div class="dewify-profile-avatar dewify-profile-avatar-dropdown"></div>
        <div>
          <strong data-dropdown-name>Local profile</strong>
          <span data-dropdown-status>No profile saved yet</span>
        </div>
      </div>
      <div class="dewify-profile-dropdown-menu">
        <button type="button" data-profile-action="view"><span>View profile</span><small>Open saved details</small></button>
        <button type="button" data-profile-action="edit"><span>Edit profile</span><small>Change your details</small></button>
      </div>
      <p class="dewify-profile-dropdown-note">Stored only in this browser on this device.</p>
    `;
    trigger.appendChild(dropdown);

    const backdrop = document.createElement("div");
    backdrop.id = "dewify-local-profile-backdrop";

    const panel = document.createElement("aside");
    panel.id = "dewify-local-profile-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="dewify-local-profile-head">
        <div>
          <p class="dewify-local-profile-kicker">DEWIFY / BROWSER PROFILE</p>
          <h2 class="dewify-local-profile-title">Your profile</h2>
        </div>
        <button class="dewify-local-profile-close" type="button" aria-label="Close profile">×</button>
      </div>

      <div class="dewify-local-profile-body">
        <section class="dewify-profile-view" aria-label="Saved profile">
          <div class="dewify-profile-hero">
            <div class="dewify-profile-avatar dewify-profile-avatar-large" data-profile-avatar></div>
            <div>
              <p class="dewify-profile-active"><i></i> LOCAL PROFILE ACTIVE</p>
              <h3 data-profile-name>Your profile</h3>
              <p data-profile-subtitle>Saved in this browser on this device.</p>
            </div>
          </div>

          <div class="dewify-profile-details">
            <div><span>NAME</span><strong data-profile-field="name">Not set</strong></div>
            <div><span>EMAIL</span><strong data-profile-field="email">Not set</strong></div>
            <div><span>BUSINESS / BRAND</span><strong data-profile-field="business">Not set</strong></div>
            <div><span>PHONE</span><strong data-profile-field="phone">Not set</strong></div>
          </div>

          <div class="dewify-local-profile-view-actions">
            <button class="dewify-local-profile-edit" type="button">Edit profile</button>
            <button class="dewify-local-profile-clear" type="button">Clear local info</button>
          </div>

          <p class="dewify-local-profile-note">No login is required. Profile information is stored locally in this browser and is not used as server-side authentication.</p>
          <p class="dewify-local-profile-warning">Do not enter payment card details, passwords, or other secrets here. Clearing this site's browser data can remove the profile.</p>
        </section>

        <form class="dewify-local-profile-form" hidden>
          <div class="dewify-profile-edit-hero">
            <div class="dewify-profile-avatar dewify-profile-avatar-large" data-edit-avatar></div>
            <div>
              <p class="dewify-local-profile-kicker">EDIT PROFILE</p>
              <strong>Saved only on this browser</strong>
            </div>
          </div>

          <label class="dewify-avatar-picker">
            <span>Profile picture</span>
            <input name="avatar" type="file" accept="image/*">
            <em>Choose an image</em>
          </label>

          <div class="dewify-avatar-adjuster" hidden>
            <div class="dewify-avatar-adjuster-head">
              <div>
                <p>Adjust picture</p>
                <span>Use the sliders to position your picture inside the circle.</span>
              </div>
              <button type="button" class="dewify-avatar-reset">Reset</button>
            </div>
            <div class="dewify-avatar-adjust-preview">
              <div class="dewify-profile-avatar dewify-profile-avatar-adjust" data-adjust-avatar></div>
            </div>
            <label class="dewify-avatar-range">
              <span>Zoom</span>
              <output data-avatar-zoom-value>100%</output>
              <input name="avatarZoom" type="range" min="1" max="3" step="0.05" value="1">
            </label>
            <label class="dewify-avatar-range">
              <span>Horizontal position</span>
              <output data-avatar-x-value>50%</output>
              <input name="avatarX" type="range" min="0" max="100" step="1" value="50">
            </label>
            <label class="dewify-avatar-range">
              <span>Vertical position</span>
              <output data-avatar-y-value>50%</output>
              <input name="avatarY" type="range" min="0" max="100" step="1" value="50">
            </label>
          </div>

          <button class="dewify-avatar-remove" type="button">Remove picture</button>

          <div class="dewify-local-profile-field">
            <label for="dewify-profile-name">Name</label>
            <input id="dewify-profile-name" name="name" type="text" autocomplete="name" maxlength="120">
          </div>
          <div class="dewify-local-profile-field">
            <label for="dewify-profile-email">Email</label>
            <input id="dewify-profile-email" name="email" type="email" autocomplete="email" maxlength="190">
          </div>
          <div class="dewify-local-profile-field">
            <label for="dewify-profile-business">Business / brand</label>
            <input id="dewify-profile-business" name="business" type="text" autocomplete="organization" maxlength="160">
          </div>
          <div class="dewify-local-profile-field">
            <label for="dewify-profile-phone">Phone</label>
            <input id="dewify-profile-phone" name="phone" type="tel" autocomplete="tel" maxlength="40">
          </div>

          <div class="dewify-local-profile-actions">
            <button class="dewify-local-profile-save" type="submit">Save profile</button>
            <button class="dewify-local-profile-cancel" type="button">Cancel</button>
          </div>
          <p class="dewify-local-profile-status" role="status" aria-live="polite"></p>
        </form>
      </div>
    `;

    document.body.append(backdrop, panel);

    const view = panel.querySelector(".dewify-profile-view");
    const form = panel.querySelector(".dewify-local-profile-form");
    const status = panel.querySelector(".dewify-local-profile-status");
    const close = panel.querySelector(".dewify-local-profile-close");
    const edit = panel.querySelector(".dewify-local-profile-edit");
    const cancel = panel.querySelector(".dewify-local-profile-cancel");
    const clear = panel.querySelector(".dewify-local-profile-clear");
    const avatarInput = panel.querySelector('input[name="avatar"]');
    const avatarRemove = panel.querySelector(".dewify-avatar-remove");
    const avatarAdjuster = panel.querySelector(".dewify-avatar-adjuster");
    const adjustAvatar = panel.querySelector("[data-adjust-avatar]");
    const avatarZoom = panel.querySelector('input[name="avatarZoom"]');
    const avatarX = panel.querySelector('input[name="avatarX"]');
    const avatarY = panel.querySelector('input[name="avatarY"]');
    const avatarZoomValue = panel.querySelector("[data-avatar-zoom-value]");
    const avatarXValue = panel.querySelector("[data-avatar-x-value]");
    const avatarYValue = panel.querySelector("[data-avatar-y-value]");
    const avatarReset = panel.querySelector(".dewify-avatar-reset");
    const fields = {
      name: panel.querySelector("#dewify-profile-name"),
      email: panel.querySelector("#dewify-profile-email"),
      business: panel.querySelector("#dewify-profile-business"),
      phone: panel.querySelector("#dewify-profile-phone")
    };

    const navAvatar = trigger.querySelector(".dewify-profile-avatar-nav");
    const dropdownAvatar = dropdown.querySelector(".dewify-profile-avatar-dropdown");
    const dropdownName = dropdown.querySelector("[data-dropdown-name]");
    const dropdownStatus = dropdown.querySelector("[data-dropdown-status]");
    const viewAvatar = panel.querySelector("[data-profile-avatar]");
    const editAvatar = panel.querySelector("[data-edit-avatar]");
    const dropdownView = dropdown.querySelector('[data-profile-action="view"]');
    const dropdownEdit = dropdown.querySelector('[data-profile-action="edit"]');

    const fillForm = () => {
      Object.entries(fields).forEach(([key, input]) => { input.value = profile[key] || ""; });
      avatarZoom.value = String(profile.avatarZoom || 1);
      avatarX.value = String(profile.avatarX ?? 50);
      avatarY.value = String(profile.avatarY ?? 50);
      renderAvatar(editAvatar, profile, true);
      renderAvatar(adjustAvatar, profile, true);
      avatarRemove.hidden = !profile.avatar;
      avatarAdjuster.hidden = !profile.avatar;
      avatarZoomValue.textContent = Math.round((Number(profile.avatarZoom) || 1) * 100) + "%";
      avatarXValue.textContent = Math.round(Number(profile.avatarX) || 50) + "%";
      avatarYValue.textContent = Math.round(Number(profile.avatarY) || 50) + "%";
    };

    const renderView = () => {
      renderAvatar(navAvatar, profile);
      renderAvatar(dropdownAvatar, profile);
      renderAvatar(viewAvatar, profile, true);
      trigger.querySelector(".dewify-profile-nav-copy strong").textContent = hasProfile(profile) ? "View profile" : "Set up profile";
      trigger.title = hasProfile(profile)
        ? "Your profile is saved in this browser"
        : "Create your local profile";
      if (dropdownName) dropdownName.textContent = displayName(profile);
      if (dropdownStatus) dropdownStatus.textContent = hasProfile(profile)
        ? "Local profile is active"
        : "No profile saved yet";

      const name = panel.querySelector("[data-profile-name]");
      const subtitle = panel.querySelector("[data-profile-subtitle]");
      if (name) name.textContent = displayName(profile);
      if (subtitle) subtitle.textContent = hasProfile(profile)
        ? "Saved in this browser on this device."
        : "Create a local profile for this browser.";

      panel.querySelectorAll("[data-profile-field]").forEach((el) => {
        const key = el.dataset.profileField;
        el.textContent = profile[key] || "Not set";
      });
    };

    const setEditMode = (enabled) => {
      view.hidden = enabled;
      form.hidden = !enabled;
      if (enabled) {
        fillForm();
        window.setTimeout(() => fields.name.focus(), 20);
      }
    };

    const openPanel = (editMode = false) => {
      renderView();
      setEditMode(editMode);
      panel.classList.add("is-open");
      backdrop.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      dropdown.classList.remove("is-open");
      dropdown.setAttribute("aria-hidden", "true");
    };

    const toggleDropdown = () => {
      const next = !dropdown.classList.contains("is-open");
      dropdown.classList.toggle("is-open", next);
      dropdown.setAttribute("aria-hidden", String(!next));
      trigger.setAttribute("aria-expanded", String(next));
    };

    const hidePanel = () => {
      panel.classList.remove("is-open");
      backdrop.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
    };

    const hideDropdown = () => {
      dropdown.classList.remove("is-open");
      dropdown.setAttribute("aria-hidden", "true");
      trigger.setAttribute("aria-expanded", "false");
    };

    trigger.addEventListener("click", (event) => {
      if (event.target.closest(".dewify-profile-dropdown")) return;
      toggleDropdown();
    });
    dropdownView.addEventListener("click", () => openPanel(false));
    dropdownEdit.addEventListener("click", () => openPanel(true));
    close.addEventListener("click", hidePanel);
    backdrop.addEventListener("click", hidePanel);
    edit.addEventListener("click", () => setEditMode(true));
    cancel.addEventListener("click", () => {
      status.textContent = "";
      setEditMode(false);
    });

    const applyAllAvatarPreviews = () => {
      renderAvatar(editAvatar, profile, true);
      renderAvatar(adjustAvatar, profile, true);
      avatarZoomValue.textContent = Math.round(profile.avatarZoom * 100) + "%";
      avatarXValue.textContent = Math.round(profile.avatarX) + "%";
      avatarYValue.textContent = Math.round(profile.avatarY) + "%";
    };

    const updateAvatarAdjustments = () => {
      profile = {
        ...profile,
        avatarZoom: Number(avatarZoom.value),
        avatarX: Number(avatarX.value),
        avatarY: Number(avatarY.value)
      };
      applyAllAvatarPreviews();
    };

    [avatarZoom, avatarX, avatarY].forEach((input) => {
      input.addEventListener("input", updateAvatarAdjustments);
    });

    avatarReset.addEventListener("click", () => {
      avatarZoom.value = "1";
      avatarX.value = "50";
      avatarY.value = "50";
      updateAvatarAdjustments();
    });

    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files?.[0];
      if (!file) return;
      status.textContent = "Processing profile picture…";
      try {
        profile = { ...profile, avatar: await resizeImage(file), avatarZoom: 1, avatarX: 50, avatarY: 50 };
        avatarZoom.value = "1";
        avatarX.value = "50";
        avatarY.value = "50";
        renderAvatar(editAvatar, profile, true);
        renderAvatar(adjustAvatar, profile, true);
        avatarRemove.hidden = false;
        avatarAdjuster.hidden = false;
        updateAvatarAdjustments();
        status.textContent = "Picture ready. Adjust it below, then save the profile.";
      } catch {
        status.textContent = "That image could not be used.";
        avatarInput.value = "";
      }
    });

    avatarRemove.addEventListener("click", () => {
      profile = { ...profile, avatar: "", avatarZoom: 1, avatarX: 50, avatarY: 50 };
      avatarInput.value = "";
      renderAvatar(editAvatar, profile, true);
      renderAvatar(adjustAvatar, profile, true);
      avatarAdjuster.hidden = true;
      avatarRemove.hidden = true;
      status.textContent = "Picture removed. Save the profile to apply it.";
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        profile = saveProfile({
          ...profile,
          name: fields.name.value,
          email: fields.email.value,
          business: fields.business.value,
          phone: fields.phone.value,
          avatarZoom: Number(avatarZoom.value),
          avatarX: Number(avatarX.value),
          avatarY: Number(avatarY.value)
        });
        status.textContent = "Profile saved locally in this browser.";
        renderView();
        window.setTimeout(() => setEditMode(false), 450);
      } catch {
        status.textContent = "This browser blocked local profile storage.";
      }
    });

    clear.addEventListener("click", () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        profile = { ...defaults };
        renderView();
        setEditMode(false);
        status.textContent = "";
        hideDropdown();
      } catch {
        status.textContent = "Could not clear local profile storage.";
      }
    });

    document.addEventListener("click", (event) => {
      if (!trigger.contains(event.target)) hideDropdown();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (panel.classList.contains("is-open")) {
        hidePanel();
        return;
      }
      hideDropdown();
    });

    renderView();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  } else {
    ready();
  }
})();

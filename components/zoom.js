// Zoom-slider 100–500 % som skalar videon i Full Window via CSS-variabeln --yt-ext-zoom
const CSS_HREF = chrome.runtime.getURL("components/zoom.css");
const SLOT_SEL = ".yt-ext-zoom-slot";
const Z_VAR    = "--yt-ext-zoom";
let currentPercent = 100;

function injectCssOnce() {
    if (!document.querySelector(`link[href="${CSS_HREF}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_HREF;
        document.head.appendChild(link);
    }
}

function activeWrapper() {
    return document.querySelector(".yt-ext-fw-wrap") || null;
}

function normalize(pct) {
    const n = Number(pct);
    if (Number.isNaN(n)) return 100;
    return Math.min(500, Math.max(100, Math.round(n)));
}

function applyZoomInternal(targetWrap /* nullable */) {
    const scale = currentPercent / 100;
    // Sätt även på <html> om andra patcher vill läsa den
    document.documentElement.style.setProperty(Z_VAR, String(scale));
    if (targetWrap) targetWrap.style.setProperty(Z_VAR, String(scale));
}

export function applyZoomTo(wrapMaybe) {
    const wrap = wrapMaybe || activeWrapper();
    applyZoomInternal(wrap);
}

export function mountIntoButtons(buttonsRoot, getActiveWrapperFn) {
    injectCssOnce();
    const slot = buttonsRoot.querySelector(SLOT_SEL);
    if (!slot) return;

    slot.innerHTML = `
    <div class="yt-ext-zoom-wrap">
      <input class="yt-ext-zoom-range" type="range" min="100" max="500" step="1" value="${currentPercent}" />
      <div class="yt-ext-zoom-value">${currentPercent}%</div>
    </div>
  `;

    const range = slot.querySelector(".yt-ext-zoom-range");
    const value = slot.querySelector(".yt-ext-zoom-value");

    const update = (pct) => {
        currentPercent = normalize(pct);
        value.textContent = `${currentPercent}%`;
        const wrap = (typeof getActiveWrapperFn === "function") ? getActiveWrapperFn() : activeWrapper();
        applyZoomInternal(wrap);
    };

    range.addEventListener("input", (e) => update(e.target.value));

    // Init
    update(currentPercent);

    // Re-apply efter SPA-navigering
    window.addEventListener("yt-navigate-finish", () => update(currentPercent), { passive: true });
}

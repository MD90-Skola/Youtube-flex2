// Zoom: slider 100–200% som skalar videon via CSS-variabeln --yt-ext-zoom på aktuell wrap.
// Sparar värdet i documentElement och applicerar på nuvarande wrap.

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
    return document.querySelector(".yt-ext-fw-wrap") || document.querySelector(".yt-ext-flex-wrap") || null;
}

function setZoomPercent(pct) {
    currentPercent = Math.max(100, Math.min(200, Number(pct) || 100));
    document.documentElement.style.setProperty(Z_VAR, (currentPercent / 100).toString());
    applyZoomTo(activeWrapper());
}

export function applyZoomTo(wrap) {
    if (!wrap) return;
    // Inline vinner över ev. gamla värden – säkert och snabbt
    wrap.style.setProperty(Z_VAR, (currentPercent / 100).toString());
}

export function mountIntoButtons(buttonsRoot, getActiveWrapperFn) {
    injectCssOnce();
    const slot = buttonsRoot.querySelector(SLOT_SEL);
    if (!slot) return;

    slot.innerHTML = `
    <div class="yt-ext-zoom-wrap">
      <input class="yt-ext-zoom-range" type="range" min="100" max="200" step="1" value="${currentPercent}" />
      <div class="yt-ext-zoom-value">${currentPercent}%</div>
    </div>
  `;

    const range = slot.querySelector(".yt-ext-zoom-range");
    const value = slot.querySelector(".yt-ext-zoom-value");

    const update = (pct) => {
        setZoomPercent(pct);
        value.textContent = `${currentPercent}%`;
        const aw = (typeof getActiveWrapperFn === "function") ? getActiveWrapperFn() : activeWrapper();
        applyZoomTo(aw);
    };

    range.addEventListener("input", (e) => update(e.target.value));
    // Init – synca UI & var
    update(currentPercent);
}

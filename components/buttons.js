// Integrerad zoom-slider + Expand-knapp i YT-kontrollraden (med slot för zoom.js)
const ROOT_ID = "yt-ext-buttons-root";
const BTN_CLASS = "ytp-button";
const EXPAND_BTN_ID = "yt-ext-btn-expand";
const SLIDER_WRAP_ID = "yt-ext-zoom-wrap";
const SLIDER_ID = "yt-ext-zoom-range";

function injectMaterialSymbols() {
    const href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=zoom_out_map";
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href;
        document.head.appendChild(link);
    }
    if (!document.getElementById("yt-ext-ms-style")) {
        const style = document.createElement("style"); style.id = "yt-ext-ms-style";
        style.textContent = `.material-symbols-outlined{font-variation-settings:'FILL' 0,'wght' 300,'GRAD' -25,'opsz' 24}`;
        document.head.appendChild(style);
    }
}
function injectCss() {
    const href = chrome.runtime.getURL("components/buttons.css");
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href;
        document.head.appendChild(link);
    }
}
const raf = () => new Promise(r => requestAnimationFrame(r));
async function waitFor(sel, { timeout = 8000 } = {}) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) { const el = document.querySelector(sel); if (el) return el; await raf(); }
    return null;
}
async function getRightControls() { await waitFor(".html5-video-player"); await waitFor(".ytp-chrome-bottom"); return document.querySelector(".ytp-right-controls"); }
async function tryImport(path) {
    try {
        const url = chrome.runtime.getURL(path);
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) return null;
        return await import(url);
    } catch { return null; }
}

function makeYtpButton({ id, title, contentNode, onClick }) {
    const btn = document.createElement("button");
    btn.id = id; btn.className = BTN_CLASS;
    btn.setAttribute("aria-label", title); btn.setAttribute("title", title);
    if (contentNode) btn.appendChild(contentNode);
    if (onClick) btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); onClick(e); }, { passive: false });
    return btn;
}
function makeMaterialIcon(name) {
    const span = document.createElement("span");
    span.className = "material-symbols-outlined yt-ext-material-icon";
    span.textContent = name;
    return span;
}
function buildInlineSlider() {
    const wrap = document.createElement("div");
    wrap.id = SLIDER_WRAP_ID;
    wrap.innerHTML = `
    <input id="${SLIDER_ID}" type="range" min="100" max="500" step="5" value="100" />
    <span class="yt-ext-zoom-percent" id="yt-ext-zoom-val">100%</span>
  `;
    return wrap;
}

export async function attachButtons({ onFullWindow } = {}) {
    injectMaterialSymbols(); injectCss();
    const right = await getRightControls(); if (!right) return null;

    // Rot i kontrollraden (precis före YouTubes fullscreen-knapp)
    let root = right.querySelector(`#${ROOT_ID}`);
    if (!root) {
        root = document.createElement("div"); root.id = ROOT_ID;
        const fsNative = right.querySelector(".ytp-fullscreen-button");
        if (fsNative) right.insertBefore(root, fsNative); else right.appendChild(root);
    }
    root.innerHTML = "";

    // DOLD SLOT för zoom.js (krävs för alt+scroll & alt+drag)
    const slot = document.createElement("div");
    slot.className = "yt-ext-zoom-slot"; // zoom.js letar exakt efter denna
    root.appendChild(slot);

    // Moduler
    const [fullApi, zoomApi] = await Promise.all([
        tryImport("components/fullWindow.js"), // { toggleFullWindow }
        tryImport("components/zoom.js"),       // { setScale, getScale, subscribe, mountIntoButtons }
    ]);

    // Låt zoom.js montera UI + events (Alt+scroll/Alt+Mouse1)
    try { zoomApi?.mountIntoButtons?.(root); } catch {}

    // ===== Zoom-slider (inline) =====
    const sliderWrap = buildInlineSlider();
    const slider = sliderWrap.querySelector(`#${SLIDER_ID}`);
    const valEl = sliderWrap.querySelector("#yt-ext-zoom-val");

    const readScale = () => {
        const s = Number(zoomApi?.getScale?.() ?? 1.0);
        return (Number.isFinite(s) && s > 0) ? s : 1.0;
    };
    const writeScale = (scale) => {
        if (zoomApi?.setScale) zoomApi.setScale(scale);
        else window.dispatchEvent(new CustomEvent("yt-ext-zoom-set", { detail: { scale } }));
    };
    const refreshFromState = () => {
        const pct = Math.round(readScale() * 100);
        slider.value = String(pct);
        valEl.textContent = `${pct}%`;
    };
    refreshFromState();

    slider.addEventListener("input", () => {
        const pct = Math.max(100, Math.min(500, Number(slider.value)));
        valEl.textContent = `${pct}%`;
        writeScale(pct / 100);
    });

    // Håll slider i synk via subscribe i stället för polling
    let unsub = null;
    try {
        unsub = zoomApi?.subscribe?.(() => refreshFromState()) || null;
    } catch {}

    // ===== Expand-knapp =====
    const expandBtn = makeYtpButton({
        id: EXPAND_BTN_ID,
        title: "Full Window",
        contentNode: makeMaterialIcon("zoom_out_map"),
        onClick: () => {
            if (typeof onFullWindow === "function") onFullWindow();
            else if (fullApi?.toggleFullWindow) fullApi.toggleFullWindow();
        },
    });

    // Lägg till i ordning: [slot (dold)][slider][expand]
    root.appendChild(sliderWrap);
    root.appendChild(expandBtn);

    // Återmontera säkert om YT ritar om
    const mo = new MutationObserver(() => {
        const still = document.body.contains(root) && right.contains(root);
        if (!still) {
            try { unsub?.(); } catch {}
            mo.disconnect();
            attachButtons({ onFullWindow }).catch(() => {});
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return root;
}

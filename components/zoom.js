// Zoom 100–500% med len övergång + Alt+Mouse1 pan.
// Delad state för normal-läge och FullWindow via CSS-variabler på ytd-watch-flexy.
// Rör inte din FullWindow-kod.
const CSS_HREF = chrome.runtime.getURL("components/zoom.css");
const SLOT_SEL = ".yt-ext-zoom-slot";
const VAR_ZOOM = "--yt-ext-zoom";   // 1.0–5.0
const VAR_PANX = "--yt-ext-pan-x";  // px
const VAR_PANY = "--yt-ext-pan-y";  // px
const KEY = "yt_ext_zoom_v2";
const STEP = 0.05;                  // 5%/steg (Alt +/- och mushjul)
const MIN_SCALE = 1.0;
const MAX_SCALE = 5.0;

let current = load() ?? 1.0;
let mounted = false;

// Pan-state
let panX = 0, panY = 0;
let dragging = false;
let dragStartX = 0, dragStartY = 0;
let panStartX = 0, panStartY = 0;

// subscribers (t.ex. normalZoom.js)
const subs = new Set();
function notify() { for (const fn of subs) { try { fn(current); } catch {} } }

function injectCssOnce() {
    if (!document.querySelector(`link[href="${CSS_HREF}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_HREF;
        document.head.appendChild(link);
    }
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function pct(n) { return Math.round(n * 100); }

function load() {
    try {
        const v = parseFloat(localStorage.getItem(KEY) || "");
        return isFinite(v) ? clamp(v, MIN_SCALE, MAX_SCALE) : null;
    } catch { return null; }
}
function save(v) { try { localStorage.setItem(KEY, String(v)); } catch {} }

function flexy() { return document.querySelector("ytd-watch-flexy"); }
function isFW() { return !!flexy()?.classList.contains("yt-ext-fullwindow-active"); }

function setVar(name, value) {
    const f = flexy(); if (!f) return;
    f.style.setProperty(name, String(value));
}

function applyToRoot() {
    const f = flexy(); if (!f) return;
    const val = clamp(current, MIN_SCALE, MAX_SCALE);
    f.style.setProperty(VAR_ZOOM, String(val));
    // Lägg klass endast i normal-läge när vi faktiskt zoomar
    if (!isFW() && val !== 1) f.classList.add("yt-ext-zooming"); else f.classList.remove("yt-ext-zooming");
    // Pan-klasser (aktiv när pan != 0)
    const panActive = (Math.abs(panX) > 0.5 || Math.abs(panY) > 0.5);
    if (panActive) f.classList.add("yt-ext-pan-active"); else f.classList.remove("yt-ext-pan-active");
}

function internalSetScale(v, { fromUI = false } = {}) {
    current = clamp(v, MIN_SCALE, MAX_SCALE);
    save(current);
    // När skalan ändras: clamp:a aktuell pan så inget "hoppar bort"
    clampAndApplyPan();
    applyToRoot();
    if (fromUI) updateUI();
    notify();
}

// === publika API:n för andra moduler ===
export function setScale(v) { internalSetScale(v); }
export function getScale() { return current; }
export function subscribe(fn) {
    if (typeof fn === "function") { subs.add(fn); try { fn(current); } catch {} }
    return () => subs.delete(fn);
}
// ======================================

function step(delta) { internalSetScale(current + delta); }
function reset() {
    internalSetScale(1.0, { fromUI: true });
    setPan(0, 0, { immediate: true });
}

function updateUI() {
    const wrap = document.getElementById("yt-ext-zoom-ui");
    if (!wrap) return;
    const range = wrap.querySelector("input[type=range]");
    const label = wrap.querySelector(".yt-ext-zoom-label");
    if (range) range.value = String(pct(current));
    if (label) label.textContent = pct(current) + "%";
}

// ====== PAN LOGIK ======
function getBounds() {
    // Baserat på viewport/containerns storlek: max pan = ((scale-1)/scale)/2 * size
    const f = flexy();
    const rect = (f || document.documentElement).getBoundingClientRect();
    const scale = current;
    if (scale <= 1) return { maxX: 0, maxY: 0 };
    const factor = (scale - 1) / scale / 2;
    return { maxX: rect.width * factor, maxY: rect.height * factor };
}

function setPan(x, y, { immediate = false } = {}) {
    panX = x; panY = y;
    setVar(VAR_PANX, `${Math.round(panX)}px`);
    setVar(VAR_PANY, `${Math.round(panY)}px`);
    const f = flexy(); if (!f) return;
    if (immediate) f.classList.add("yt-ext-pan-dragging"); else f.classList.remove("yt-ext-pan-dragging");
    applyToRoot();
}

function clampAndApplyPan() {
    const { maxX, maxY } = getBounds();
    const cx = clamp(panX, -maxX, maxX);
    const cy = clamp(panY, -maxY, maxY);
    setPan(cx, cy, { immediate: false });
}

function onMouseDown(e) {
    // Alt + vänster musknapp för pan
    if (e.button !== 0 || !e.altKey) return;
    dragging = true;
    dragStartX = e.clientX; dragStartY = e.clientY;
    panStartX = panX; panStartY = panY;
    const f = flexy(); if (f) f.classList.add("yt-ext-pan-dragging");
    // förhindra textselektion + scroll-hjul
    e.preventDefault();
}

function onMouseMove(e) {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    const { maxX, maxY } = getBounds();
    const nx = clamp(panStartX + dx, -maxX, maxX);
    const ny = clamp(panStartY + dy, -maxY, maxY);
    setPan(nx, ny, { immediate: true });
}

function onMouseUp() {
    if (!dragging) return;
    dragging = false;
    const f = flexy(); if (f) f.classList.remove("yt-ext-pan-dragging");
    clampAndApplyPan();
}

function installPanHandlers() {
    // Globalt (enkelt) – gäller både normal & FW utan att röra FW-koden.
    document.addEventListener("mousedown", onMouseDown, { passive: false, capture: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    // Re-clampa när FW växlar (layout ändras)
    window.addEventListener("YT_EXT_FW_STATE", () => clampAndApplyPan(), { passive: true });
}
// =======================

function makeUI() {
    const wrap = document.createElement("div");
    wrap.id = "yt-ext-zoom-ui";
    wrap.className = "yt-ext-zoom-wrap";
    wrap.innerHTML = `
    <button class="yt-ext-zoom-btn" data-z="-">–</button>
    <input class="yt-ext-zoom-range" type="range" min="100" max="500" step="1" value="${pct(current)}" />
    <span class="yt-ext-zoom-label">${pct(current)}%</span>
    <button class="yt-ext-zoom-btn" data-z="reset" title="Reset">100%</button>
    <button class="yt-ext-zoom-btn" data-z="+">+</button>
  `;

    // Slider
    const range = wrap.querySelector(".yt-ext-zoom-range");
    range.addEventListener("input", () => {
        const scale = clamp(range.valueAsNumber / 100, MIN_SCALE, MAX_SCALE);
        internalSetScale(scale, { fromUI: true });
    });

    // Buttons
    wrap.addEventListener("click", (e) => {
        const btn = e.target.closest(".yt-ext-zoom-btn");
        if (!btn) return;
        const a = btn.getAttribute("data-z");
        if (a === "+") step(STEP);
        else if (a === "-") step(-STEP);
        else if (a === "reset") reset();
    });

    // Alt + mushjul
    const onWheel = (ev) => {
        if (!ev.altKey) return;
        const dy = ev.deltaY || ev.wheelDeltaY || ev.wheelDelta || 0;
        if (dy === 0) return;
        ev.preventDefault();
        (dy > 0) ? step(-STEP) : step(STEP);
    };
    document.addEventListener("wheel", onWheel, { passive: false, capture: true });

    // Alt+= / Alt+- / Alt+0
    const onKey = (ev) => {
        if (!ev.altKey) return;
        if (ev.key === "=" || ev.key === "+") { ev.preventDefault(); step(STEP); }
        else if (ev.key === "-") { ev.preventDefault(); step(-STEP); }
        else if (ev.key === "0") { ev.preventDefault(); reset(); }
    };
    window.addEventListener("keydown", onKey, { passive: false });

    // FW-state resync
    window.addEventListener("YT_EXT_FW_STATE", () => { applyToRoot(); clampAndApplyPan(); }, { passive: true });

    // Installera pan-hanterare en gång
    installPanHandlers();

    return wrap;
}

export function mountIntoButtons(root) {
    injectCssOnce();
    if (!root || mounted) return;
    const slot = root.querySelector(SLOT_SEL);
    if (!slot) return;
    slot.innerHTML = "";
    slot.appendChild(makeUI());
    // Init CSS-variabler
    setVar(VAR_ZOOM, String(current));
    setVar(VAR_PANX, "0px");
    setVar(VAR_PANY, "0px");
    applyToRoot();
    mounted = true;
}

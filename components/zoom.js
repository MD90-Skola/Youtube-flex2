// Zoom 100–500% med len övergång, fungerar i normal + FullWindow.
// Rör inte FullWindow-koden. Vi sätter bara CSS-variabeln på ytd-watch-flexy.
const CSS_HREF = chrome.runtime.getURL("components/zoom.css");
const SLOT_SEL = ".yt-ext-zoom-slot";
const VAR_NAME = "--yt-ext-zoom"; // 1.0–5.0
const KEY = "yt_ext_zoom_v2";
const STEP = 0.05;            // 5% per steg (Alt +/-, mushjul)
const MIN_SCALE = 1.0;
const MAX_SCALE = 5.0;

let current = load() ?? 1.0;
let mounted = false;

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
    try { const v = parseFloat(localStorage.getItem(KEY) || ""); return isFinite(v) ? clamp(v, MIN_SCALE, MAX_SCALE) : null; } catch { return null; }
}
function save(v) {
    try { localStorage.setItem(KEY, String(v)); } catch {}
}

function getFlexy() { return document.querySelector("ytd-watch-flexy"); }

function applyToRoot() {
    const flexy = getFlexy();
    if (!flexy) return;
    const val = clamp(current, MIN_SCALE, MAX_SCALE);
    flexy.style.setProperty(VAR_NAME, String(val));
    // Lägg klass endast när vi faktiskt zoomar i normal-läge (FW sköter sin egen CSS)
    if (!flexy.classList.contains("yt-ext-fullwindow-active") && val !== 1) {
        flexy.classList.add("yt-ext-zooming");
    } else {
        flexy.classList.remove("yt-ext-zooming");
    }
}

function setScale(v, { fromUI = false } = {}) {
    current = clamp(v, MIN_SCALE, MAX_SCALE);
    save(current);
    applyToRoot();
    if (fromUI) updateUI();
}

function step(delta) { setScale(current + delta); }
function reset() { setScale(1.0, { fromUI: true }); }

function updateUI() {
    const wrap = document.getElementById("yt-ext-zoom-ui");
    if (!wrap) return;
    const range = wrap.querySelector("input[type=range]");
    const label = wrap.querySelector(".yt-ext-zoom-label");
    if (range) range.value = String(pct(current));
    if (label) label.textContent = pct(current) + "%";
}

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
        setScale(scale);
        updateUI();
    });

    // Buttons
    wrap.addEventListener("click", (e) => {
        const btn = e.target.closest(".yt-ext-zoom-btn");
        if (!btn) return;
        const a = btn.getAttribute("data-z");
        if (a === "+") step(STEP);
        else if (a === "-") step(-STEP);
        else if (a === "reset") reset();
        updateUI();
    });

    // Alt + mushjul (över videon eller sidan)
    const onWheel = (ev) => {
        if (!ev.altKey) return;
        const dy = ev.deltaY || ev.wheelDeltaY || ev.wheelDelta || 0;
        if (dy === 0) return;
        ev.preventDefault();
        step(dy > 0 ? -STEP : STEP);
        updateUI();
    };
    // Lyssna på video, player och dokument (capture för säkerhets skull)
    document.addEventListener("wheel", onWheel, { passive: false, capture: true });

    // Kortkommandon: Alt+= / Alt+- / Alt+0
    const onKey = (ev) => {
        if (!ev.altKey) return;
        // =/+ (både = och + beroende på layout)
        if (ev.key === "=" || ev.key === "+") { ev.preventDefault(); step(STEP); updateUI(); }
        else if (ev.key === "-") { ev.preventDefault(); step(-STEP); updateUI(); }
        else if (ev.key === "0") { ev.preventDefault(); reset(); }
    };
    window.addEventListener("keydown", onKey, { passive: false });

    // Sync när FW aktiveras/avaktiveras → vi ändrar klass yt-ext-zooming korrekt
    window.addEventListener("YT_EXT_FW_STATE", () => applyToRoot(), { passive: true });

    return wrap;
}

export function mountIntoButtons(root) {
    injectCssOnce();
    if (!root || mounted) return;
    const slot = root.querySelector(SLOT_SEL);
    if (!slot) return;
    slot.innerHTML = "";
    slot.appendChild(makeUI());
    applyToRoot();
    mounted = true;
}

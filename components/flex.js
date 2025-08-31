// Flex: flytta spelaren till resizable overlay. Ömsesidig exkludering med Full Window.
import { getPlayer, moveIntoWrapper, getWatchRoot } from "../utils/dom.js";

let state = { active: false, restore: null };

export function toggleFlex() {
    if (state.active) disable(); else enable();
}

function forceResizePings() {
    const ping = () => window.dispatchEvent(new Event("resize"));
    ping(); setTimeout(ping, 80); setTimeout(ping, 200);
}

function injectCss() {
    const href = chrome.runtime.getURL("components/flex.css");
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }
}

function enable() {
    injectCss();

    // Stäng Full Window om aktivt
    window.postMessage({ type: "YT_EXT_DISABLE_FULL_IF_ACTIVE" }, "*");

    const player = getPlayer();
    if (!player) return;

    const wrap = document.createElement("div");
    wrap.className = "yt-ext-flex-wrap";
    (getWatchRoot() || document.body).appendChild(wrap);

    state.restore = moveIntoWrapper(player, wrap);
    state.active = true;

    // Grip + snap-storlekar
    const handle = document.createElement("div");
    handle.className = "yt-ext-flex-handle";
    wrap.appendChild(handle);

    const snaps = [[1280,720],[1600,900],[1920,1080],[854,480]];
    let i = 0;
    wrap.addEventListener("dblclick", () => {
        i = (i + 1) % snaps.length;
        const [w,h] = snaps[i];
        wrap.style.width  = w + "px";
        wrap.style.height = h + "px";
        forceResizePings();
    });

    forceResizePings();
}

function disable() {
    if (!state.active) return;
    if (state.restore) state.restore();
    state.restore = null;
    state.active = false;
    forceResizePings();
}

// Auto-reset vid navigation
window.addEventListener("yt-navigate-start", () => { if (state.active) disable(); });

// Lyssna på "stäng mig" när andra läget startas
window.addEventListener("message", (ev) => {
    if (ev?.data?.type === "YT_EXT_DISABLE_FLEX_IF_ACTIVE" && state.active) {
        disable();
    }
});

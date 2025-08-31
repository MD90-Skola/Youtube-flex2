// Super-stabil FullWindow med mjuk enter/exit, ingen DOM-flytt
let active = false;
let toggling = false;

function injectCss() {
    const href = chrome.runtime.getURL("components/fullWindow.css");
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }
}

const raf = () => new Promise(r => requestAnimationFrame(r));
async function waitFor(sel, { timeout = 5000 } = {}) {
    const t0 = performance.now();
    while (performance.now() - t0 < timeout) {
        const el = document.querySelector(sel);
        if (el) return el;
        await raf();
    }
    return null;
}

function emit() {
    window.dispatchEvent(new CustomEvent("YT_EXT_FW_STATE", { detail: { active } }));
}
function pingResize() {
    window.dispatchEvent(new Event("resize"));
    setTimeout(() => window.dispatchEvent(new Event("resize")), 90);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 220);
}
function reviveVideo() {
    const v = document.querySelector("video.html5-main-video, ytd-player video, video");
    if (!v) return;
    try { v.setAttribute("playsinline", ""); } catch {}
    const t = v.currentTime;
    try { v.currentTime = t + 0.000001; } catch {}
    if (v.paused) { v.play().catch(()=>{}); }
    pingResize();
}

export function isActive() { return active; }

export async function enable() {
    if (active || toggling) return;
    toggling = true;
    try {
        injectCss();
        const flexy  = await waitFor("ytd-watch-flexy");
        const player = await waitFor("#player,#player-container,#player-theater-container");
        if (!flexy || !player) return;

        document.documentElement.classList.add("yt-ext-no-scroll");
        document.body.classList.add("yt-ext-no-scroll");

        // len enter
        flexy.classList.add("yt-ext-fw-prep");
        void document.documentElement.offsetHeight; // flush
        flexy.classList.add("yt-ext-fullwindow-active","yt-ext-fw-entering");

        let ended = false;
        const done = () => {
            if (ended) return;
            ended = true;
            flexy.classList.remove("yt-ext-fw-entering","yt-ext-fw-prep");
            flexy.classList.add("yt-ext-fw-ready");
            active = true;
            emit(); pingResize(); reviveVideo();
        };

        const v = document.querySelector("video");
        if (v && "requestVideoFrameCallback" in v) {
            // @ts-ignore
            v.requestVideoFrameCallback(() => done());
            setTimeout(done, 450); // safety
        } else {
            setTimeout(done, 250);
        }
    } finally {
        toggling = false;
    }
}

export async function disable() {
    if (!active || toggling) return;
    toggling = true;
    try {
        const flexy = document.querySelector("ytd-watch-flexy");
        if (!flexy) return;

        // len exit
        flexy.classList.add("yt-ext-fw-leaving");

        const finish = () => {
            flexy.classList.remove(
                "yt-ext-fullwindow-active","yt-ext-fw-ready",
                "yt-ext-fw-leaving","yt-ext-fw-prep","yt-ext-fw-entering"
            );
            document.documentElement.classList.remove("yt-ext-no-scroll");
            document.body.classList.remove("yt-ext-no-scroll");
            active = false;
            emit(); pingResize(); reviveVideo();
        };

        let ended = false;
        const onend = () => { if (ended) return; ended = true; finish(); };
        setTimeout(onend, 260);
        const player = document.querySelector("#player,#player-container,#player-theater-container");
        if (player) {
            player.addEventListener("transitionend", onend, { once: true });
            player.addEventListener("animationend", onend, { once: true });
        }
    } finally {
        toggling = false;
    }
}

export function toggleFullWindow() { (active ? disable() : enable()); }

// Autostäng vid SPA/miniplayer
window.addEventListener("yt-navigate-start", () => { if (active) disable(); }, { passive: true });
document.addEventListener("ytp-miniplayer-activate", () => { if (active) disable(); }, { passive: true });

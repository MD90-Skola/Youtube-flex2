// content.js (ES module) — stabil boot + SPA-safe mount
if (globalThis.__yt_ext_boot__) {
    // redan bootad
} else {
    globalThis.__yt_ext_boot__ = true;

    const isWatch = () =>
        location.pathname.startsWith("/watch") && !location.pathname.startsWith("/watch/");

    const raf = () => new Promise(r => requestAnimationFrame(r));
    async function waitFor(sel, { timeout = 8000 } = {}) {
        const t0 = performance.now();
        while (performance.now() - t0 < timeout) {
            const el = document.querySelector(sel);
            if (el) return el;
            await raf();
        }
        return null;
    }

    async function importModSafe(path) {
        const url = chrome.runtime.getURL(path);
        // för tydligare fel vid saknade filer
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${path}`);
        return import(url);
    }

    let buttonsRoot = null;
    let fullApi = null;
    let zoomApi = null;
    let rafId = 0;

    async function mount() {
        try {
            if (!isWatch()) { unmount(); return; }

            const flexy  = await waitFor("ytd-watch-flexy");
            const player = await waitFor("#player,#player-container,#player-theater-container");
            if (!flexy || !player) return;

            const [buttons, zoom, full] = await Promise.all([
                importModSafe("components/buttons.js"),
                importModSafe("components/zoom.js"),
                importModSafe("components/fullWindow.js"),
            ]);

            const { attachButtons } = buttons;
            zoomApi = zoom;
            fullApi = full;

            buttonsRoot = attachButtons({ onFullWindow: () => fullApi.toggleFullWindow() });
            zoomApi?.mountIntoButtons?.(buttonsRoot);

            const sync = () => {
                const btn = buttonsRoot?.querySelector("#yt-ext-btn-fullwindow");
                if (btn) btn.textContent = fullApi.isActive() ? "Exit FullWindow" : "FullWindow";
            };
            window.addEventListener("YT_EXT_FW_STATE", sync, { passive: true });
            sync();
        } catch (err) {
            console.error("[YT-FLEX2] mount failed:", err);
        }
    }

    function unmount() {
        try {
            if (fullApi?.isActive()) fullApi.disable();
            document.getElementById("yt-ext-buttons-root")?.remove();
        } catch (err) {
            console.error("[YT-FLEX2] unmount failed:", err);
        }
    }

    const schedule = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(mount);
    };

    // SPA / annonser / miniplayer
    window.addEventListener("yt-navigate-start", () => {
        try { if (fullApi?.isActive()) fullApi.disable(); } catch {}
    }, { passive: true });
    window.addEventListener("yt-navigate-finish", schedule, { passive: true });
    document.addEventListener("ytp-ad-ended", schedule, { passive: true });

    // initial mount
    schedule();
}

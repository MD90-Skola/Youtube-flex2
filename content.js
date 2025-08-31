// content.js — ES module: stabil boot för YouTube SPA, FW orörd, Zoom + Banner
if (!globalThis.__yt_flex2_boot__) {
    globalThis.__yt_flex2_boot__ = true;

    // ---------- helpers ----------
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
        // Precheck för tydligare fel (404 osv)
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${path}`);
        return import(url);
    }

    // ---------- state ----------
    let buttonsRoot = null;
    let fullApi = null;
    let zoomApi = null;
    let showBanner = null;
    let rafId = 0;

    // ---------- mount/unmount ----------
    async function mount() {
        try {
            if (!isWatch()) { unmount(); return; }

            // Vänta in YouTube-layout
            const flexy  = await waitFor("ytd-watch-flexy");
            const player = await waitFor("#player,#player-container,#player-theater-container");
            if (!flexy || !player) return;

            // Ladda moduler (banner/normalZoom är valfria)
            const [buttons, zoom, full, fade, normalZoom] = await Promise.all([
                importModSafe("components/buttons.js"),
                importModSafe("components/zoom.js"),
                importModSafe("components/fullWindow.js"),
                importModSafe("components/Fade.js").catch(() => null),
                importModSafe("components/normalZoom.js").catch(() => null),
            ]);

            fullApi = full;
            zoomApi = zoom;
            showBanner = fade?.showBanner;

            const { attachButtons } = buttons;

            // Montera knappar
            buttonsRoot = attachButtons({
                onFullWindow: async () => {
                    const wasActive = fullApi.isActive();
                    fullApi.toggleFullWindow();

                    // Visa banner endast när vi GÅR IN i FullWindow
                    if (!wasActive && fullApi.isActive() && typeof showBanner === "function") {
                        try { showBanner(); } catch {}
                    }
                }
            });

            // Montera zoom-UI i panelens slot
            zoomApi?.mountIntoButtons?.(buttonsRoot);

            // Koppla normal-zoom till samma state/slider (om modulen finns)
            normalZoom?.connectZoom?.(zoomApi);

            // Hålla knapptext i synk med FW-state
            const syncBtn = () => {
                const btn = buttonsRoot?.querySelector("#yt-ext-btn-fullwindow");
                if (btn) btn.textContent = fullApi.isActive() ? "Exit FullWindow" : "FullWindow";
            };
            window.addEventListener("YT_EXT_FW_STATE", syncBtn, { passive: true });
            syncBtn();

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

    // ---------- SPA debounce ----------
    const schedule = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(mount);
    };


    // Lyssna på popup-meddelanden
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        try {
            if (msg.type === "TOGGLE_FULLWINDOW") {
                fullApi?.toggleFullWindow();
            } else if (msg.type === "SET_ZOOM") {
                zoomApi?.setScale?.(msg.value);
            }
        } catch (err) {
            console.error("[YT-FLEX2] message handling failed:", err);
        }
    });




    // ---------- YouTube SPA/ads hooks ----------
    window.addEventListener("yt-navigate-start", () => {
        try { if (fullApi?.isActive()) fullApi.disable(); } catch {}
    }, { passive: true });

    window.addEventListener("yt-navigate-finish", schedule, { passive: true });
    document.addEventListener("ytp-ad-ended", schedule, { passive: true });

    // ---------- initial mount ----------
    schedule();
}

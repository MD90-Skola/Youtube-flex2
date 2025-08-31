// Laddar komponenter, monterar knappar + zoom-slider och ser till att zoom appliceras
// direkt efter att Full Window / Flex aktiveras.

const urls = {
    buttons: chrome.runtime.getURL("components/buttons.js"),
    full:    chrome.runtime.getURL("components/fullWindow.js"),
    flex:    chrome.runtime.getURL("components/flex.js"),
    zoom:    chrome.runtime.getURL("components/zoom.js"),
};

let Mods = { buttons: null, full: null, flex: null, zoom: null };

async function loadAll() {
    const [buttons, full, flex, zoom] = await Promise.all([
        import(urls.buttons),
        import(urls.full),
        import(urls.flex),
        import(urls.zoom),
    ]);
    Mods = { buttons, full, flex, zoom };
}

function activeWrapper() {
    return document.querySelector(".yt-ext-fw-wrap") || document.querySelector(".yt-ext-flex-wrap") || null;
}

function mountUI() {
    if (!Mods.buttons || !Mods.zoom) return;

    const root = Mods.buttons.attachButtons({
        onFullWindow: () => {
            Mods.full?.toggleFullWindow?.();
            // ⬇️ säkerställ att aktuell zoom sätts på nya wrapen direkt
            setTimeout(() => Mods.zoom?.applyZoomTo?.(activeWrapper()), 0);
        },
        onFlex: () => {
            Mods.flex?.toggleFlex?.();
            setTimeout(() => Mods.zoom?.applyZoomTo?.(activeWrapper()), 0);
        },
    });

    // Montera zoom–slider i knapparnas slot
    Mods.zoom.mountIntoButtons(root, () => activeWrapper());
    Mods.zoom.applyZoomTo(activeWrapper()); // init
}

function keepAlive() {
    window.addEventListener("yt-navigate-finish", () => {
        mountUI();
        Mods.zoom?.applyZoomTo?.(activeWrapper());
    }, { passive: true });

    const mo = new MutationObserver(() => {
        if (!document.getElementById("yt-ext-buttons-root")) mountUI();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => { await loadAll(); keepAlive(); mountUI(); });
} else {
    (async () => { await loadAll(); keepAlive(); mountUI(); })();
}

// (Valfritt) Popup-kommandon
chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.command) return;
    if (msg.command === "toggleFullWindow") { Mods.full?.toggleFullWindow?.(); setTimeout(() => Mods.zoom?.applyZoomTo?.(activeWrapper()), 0); }
    if (msg.command === "toggleFlex")       { Mods.flex?.toggleFlex?.();       setTimeout(() => Mods.zoom?.applyZoomTo?.(activeWrapper()), 0); }
});

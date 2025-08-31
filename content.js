// Mountar UI, uppdaterar knapptext, och ser till att zoom appliceras direkt.
const urls = {
    buttons: chrome.runtime.getURL("components/buttons.js"),
    full:    chrome.runtime.getURL("components/fullWindow.js"),
    zoom:    chrome.runtime.getURL("components/zoom.js"),
};

let Mods = { buttons: null, full: null, zoom: null };

async function loadAll() {
    const [buttons, full, zoom] = await Promise.all([
        import(urls.buttons),
        import(urls.full),
        import(urls.zoom),
    ]);
    Mods = { buttons, full, zoom };
}

function activeWrapper() {
    return document.querySelector(".yt-ext-fw-wrap") || null;
}

function mountUI() {
    if (!Mods.buttons || !Mods.zoom) return;

    const root = Mods.buttons.attachButtons({
        onFullWindow: () => {
            Mods.full?.toggleFullWindow?.();
            // applicera zoom & uppdatera label efter toggle
            setTimeout(() => {
                Mods.zoom?.applyZoomTo?.(activeWrapper());
            }, 0);
        }
    });

    // zoom in i knapplådan + init
    Mods.zoom.mountIntoButtons(root, () => activeWrapper());
    Mods.zoom.applyZoomTo(activeWrapper());

    // lyssna på FW-state för att byta knapptext
    window.addEventListener("YT_EXT_FW_STATE", (e) => {
        Mods.buttons?.setFullButtonLabel?.(e?.detail?.active ? "Normal" : "FullWindow");
    }, { passive: true });

    // initial label
    Mods.buttons?.setFullButtonLabel?.(activeWrapper() ? "Normal" : "FullWindow");
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

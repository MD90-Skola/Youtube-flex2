// Lättvikt: laddar modulerna och monterar Buttons-komponenten
// Behåller popup-stödet via chrome.runtime.onMessage

const urlButtons   = chrome.runtime.getURL("components/buttons.js");
const urlFullWin   = chrome.runtime.getURL("components/fullWindow.js"); // ditt namn
const urlFlex      = chrome.runtime.getURL("components/flex.js");

let Mods = { buttons: null, full: null, flex: null };

async function loadAll() {
    const [buttons, full, flex] = await Promise.all([
        import(urlButtons),
        import(urlFullWin),
        import(urlFlex),
    ]);
    Mods.buttons = buttons;
    Mods.full    = full;
    Mods.flex    = flex;
}

function mountUI() {
    if (!Mods.buttons) return;
    if (document.getElementById("yt-ext-buttons-root")) return;

    Mods.buttons.attachButtons({
        onFullWindow: () => {
            // Anropa din full window-funktion
            if (Mods.full?.toggleFullWindow) Mods.full.toggleFullWindow();
        },
        onFlex: () => {
            if (Mods.flex?.toggleFlex) Mods.flex.toggleFlex();
        }
    });
}

function boot() {
    mountUI();
    // YouTubes SPA: se till att knapparna finns kvar
    window.addEventListener("yt-navigate-finish", mountUI, { passive: true });
    window.addEventListener("yt-page-data-fetched", mountUI, { passive: true });

    const mo = new MutationObserver(() => {
        if (!document.getElementById("yt-ext-buttons-root")) mountUI();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
}

// Popup-kommandon
chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.command) return;
    if (msg.command === "toggleFullWindow") Mods.full?.toggleFullWindow?.();
    if (msg.command === "toggleFlex")       Mods.flex?.toggleFlex?.();
});

// Starta
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => { await loadAll(); boot(); });
} else {
    (async () => { await loadAll(); boot(); })();
}

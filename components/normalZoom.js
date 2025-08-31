// components/normalZoom.js
// Normal-läge (standard + bioläge):
// - Skala en WRAPPER runt .html5-video-container med CSS transform (inte <video>)
// - Player-roten (standard/bioläge) centrerar wrappern via CSS Grid (se normalZoom.css)

import { waitFor, raf, qs } from "../utils/dom.js";

const CSS_HREF = chrome.runtime.getURL("components/normalZoom.css");
const WRAP_ID  = "yt-ext-normalzoom-wrap";

function injectCssOnce() {
    if (!document.querySelector(`link[href="${CSS_HREF}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_HREF;
        document.head.appendChild(link);
    }
}

function getRoots() {
    const flexy = qs("ytd-watch-flexy");
    const playerRoot =
        qs("#player-theater-container") ||
        qs("#player-container") ||
        qs("#player") ||
        qs("#movie_player") ||
        qs(".html5-video-player") ||
        null;
    return { flexy, playerRoot };
}

function getVideoContainer(root = null) {
    const r = root || document;
    return r.querySelector(".html5-video-container");
}

function ensureWrapper(playerRoot, videoContainer) {
    if (!playerRoot || !videoContainer) return null;

    // Finns redan?
    let wrap = playerRoot.querySelector(`#${WRAP_ID}`);
    if (wrap && wrap.contains(videoContainer)) return wrap;

    // Skapa wrapper och flytta in containern
    wrap = document.createElement("div");
    wrap.id = WRAP_ID;
    wrap.className = "yt-ext-normalzoom-wrap";
    videoContainer.parentNode.insertBefore(wrap, videoContainer);
    wrap.appendChild(videoContainer);
    return wrap;
}

export function clear() {
    injectCssOnce();
    const { playerRoot } = getRoots();
    if (!playerRoot) return;

    const wrap = playerRoot.querySelector(`#${WRAP_ID}`);
    const vc   = getVideoContainer(wrap || playerRoot);

    // Återställ skalning
    if (wrap) wrap.style.transform = "";

    // Säkerställ att vi inte lämnar kvar legacy zoom
    if (vc) vc.style.zoom = "";

    // Behåll wrappern för att undvika DOM-churn (ingen nackdel när transform är tom)
    playerRoot.style.overflow  = "";
    playerRoot.style.background = "";
}

export async function apply(percent) {
    injectCssOnce();
    const { playerRoot } = getRoots();

    // Vänta in container om den inte finns (SPA/annons)
    const vc = getVideoContainer(playerRoot) || await waitFor(".html5-video-container", { timeout: 3000 });
    if (!vc || !playerRoot) return;

    // Skapa/återanvänd wrapper som bara innehåller video-containern
    const wrap = ensureWrapper(playerRoot, vc);
    if (!wrap) return;

    // Player-roten klipper och centrerar via CSS (normalZoom.css)
    playerRoot.style.overflow  = "hidden";
    playerRoot.style.background = "#000";

    // Skala WRAPPERN (inte <video> och inte .html5-video-container direkt)
    const factor = Math.max(1, Math.min(5, Number(percent) / 100 || 1));
    wrap.style.transform = factor === 1 ? "" : `scale(${factor})`;

    // Liten layout-nudge utan pause
    await raf();
    window.dispatchEvent(new Event("resize"));
}

export function onNavigate() {
    // Rensa mellan videos; zoom.js applicerar om rätt värde efter SPA
    clear();
}

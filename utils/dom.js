// utils/dom.js — robusta DOM-hjälpare för YouTube SPA
// Fokus: stabil väntan på noder, events, state guards, och små utilities.

//// Timing ////
export const raf = () => new Promise(r => requestAnimationFrame(r));
export const nextTick = () => Promise.resolve();
export const sleep = (ms) => new Promise(r => setTimeout(r, ms));

//// Selectors ////
export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

//// Existence ////
export const exists = (sel, root = document) => !!qs(sel, root);

//// Class helpers ////
export function addClass(el, cls)     { if (el) el.classList.add(cls); }
export function removeClass(el, cls)  { if (el) el.classList.remove(cls); }
export function toggleClass(el, cls, force) { if (el) el.classList.toggle(cls, force); }

//// Events ////
export function on(target, type, handler, opts)  { target?.addEventListener?.(type, handler, opts); return () => off(target, type, handler, opts); }
export function off(target, type, handler, opts) { target?.removeEventListener?.(type, handler, opts); }
export function once(target, type, opts) {
    return new Promise((resolve) => {
        const fn = (e) => { off(target, type, fn, opts); resolve(e); };
        on(target, type, fn, opts);
    });
}

//// Waiters ////
/**
 * Vänta tills en nod finns. Returnerar element eller null vid timeout.
 */
export async function waitFor(sel, { timeout = 5000, root = document } = {}) {
    const t0 = performance.now();
    for (;;) {
        const el = qs(sel, root);
        if (el) return el;
        if (performance.now() - t0 >= timeout) return null;
        await raf();
    }
}

/**
 * Vänta tills ALLA selektorer finns. Returnerar array av element (eller null vid timeout).
 */
export async function waitForAll(selectors, { timeout = 5000, root = document } = {}) {
    const t0 = performance.now();
    selectors = Array.isArray(selectors) ? selectors : [selectors];
    for (;;) {
        const els = selectors.map((s) => qs(s, root));
        if (els.every(Boolean)) return els;
        if (performance.now() - t0 >= timeout) return null;
        await raf();
    }
}

/**
 * Vänta tills villkor blir sant (pollar funktionen).
 */
export async function until(fn, { timeout = 5000, interval = 0 } = {}) {
    const t0 = performance.now();
    for (;;) {
        try { if (fn()) return true; } catch {}
        if (performance.now() - t0 >= timeout) return false;
        interval ? await sleep(interval) : await raf();
    }
}

//// MutationObserver ////
/**
 * Observa root och kör cb vid förändringar. Returnerar stop-funktion.
 */
export function observe(root, cb, options = { childList: true, subtree: true }) {
    if (!root) return () => {};
    const mo = new MutationObserver(cb);
    mo.observe(root, options);
    return () => mo.disconnect();
}

//// IntersectionObserver ////
export function whenVisible(el, { root = null, rootMargin = '0px', threshold = 0 } = {}) {
    return new Promise((resolve) => {
        if (!el) return resolve(false);
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) if (e.isIntersecting) { io.disconnect(); resolve(true); }
        }, { root, rootMargin, threshold });
        io.observe(el);
    });
}

//// Throttle/Debounce ////
export function debounce(fn, delay = 120) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
export function debounceRaf(fn) {
    let id = 0; return (...args) => { cancelAnimationFrame(id); id = requestAnimationFrame(() => fn(...args)); };
}
export function throttle(fn, limit = 100) {
    let inFlight = false, lastArgs;
    return (...args) => {
        if (inFlight) { lastArgs = args; return; }
        inFlight = true; fn(...args);
        setTimeout(() => { inFlight = false; if (lastArgs) { const a = lastArgs; lastArgs = undefined; fn(...a); } }, limit);
    };
}

//// Safe style apply ////
export function safeStyles(el, styles = {}) {
    if (!el) return;
    for (const [k, v] of Object.entries(styles)) {
        try { el.style[k] = v; } catch {}
    }
}

//// Locks (för att undvika dubbelklick/race) ////
export function withLock(fn) {
    let locking = false;
    return async (...args) => {
        if (locking) return;
        locking = true;
        try { return await fn(...args); }
        finally { locking = false; }
    };
}

//// YouTube-specifika helpers ////
export function isWatchPage() {
    const p = location.pathname;
    return p.startsWith('/watch') && !p.startsWith('/watch/');
}

export function isTheaterMode() {
    const flexy = qs('ytd-watch-flexy');
    return !!(flexy && (flexy.hasAttribute('theater') || flexy.getAttribute('theater') === ''));
}

export function isShorts() {
    return location.pathname.startsWith('/shorts');
}

export function isAdShowing() {
    const root = qs('.html5-video-player');
    return !!(root && root.classList.contains('ad-showing'));
}

/**
 * Hitta spelar-rötter (täcker standard + bioläge).
 */
export function getPlayerRoots() {
    const theater = qs('#player-theater-container');
    const standard = qs('#player-container') || qs('#player');
    const movie = qs('#movie_player') || qs('.html5-video-player');
    return {
        theater,
        standard,
        movie,
        any: theater || standard || movie || null,
    };
}

/**
 * Hämta videons container (stabil under de flesta varianter).
 */
export function getVideoContainer(root = null) {
    const r = root || getPlayerRoots().any || document;
    return qs('.html5-video-container', r) || qs('.html5-video-container');
}

/**
 * Vänta tills spelaren är "redo nog" (flexy + player-root + video-container).
 */
export async function waitForPlayerReady({ timeout = 8000 } = {}) {
    const ok = await waitFor('ytd-watch-flexy', { timeout });
    if (!ok) return null;
    const roots = await waitForAll(['#player, #player-container, #player-theater-container', '.html5-video-container'], { timeout });
    if (!roots) return null;
    return {
        flexy: qs('ytd-watch-flexy'),
        roots: getPlayerRoots(),
        videoContainer: getVideoContainer(),
    };
}

/**
 * “Ping” layout utan att pausa (hjälper YouTube räkna om).
 */
export function pingResize() {
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
}

/**
 * Emitta ett CustomEvent (används bl.a. för FW state).
 */
export function emit(name, detail = undefined) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
}

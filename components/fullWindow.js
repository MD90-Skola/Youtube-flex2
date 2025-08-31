// Full Window: flytta spelaren till en viewport-fylld wrapper
// Anti-black-screen körs både när vi aktiverar och när vi lämnar.
// Skickar event "YT_EXT_FW_STATE" med {active:true/false} för att uppdatera knapptext.
import { getPlayer, moveIntoWrapper, getWatchRoot } from '../utils/dom.js';

let state = { active: false, restore: null };

function injectCss() {
    const href = chrome.runtime.getURL('components/fullWindow.css');
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }
}

function emitState() {
    window.dispatchEvent(new CustomEvent("YT_EXT_FW_STATE", { detail: { active: state.active } }));
}

export function toggleFullWindow() {
    if (state.active) disable(); else enable();
}

function forceResizePings() {
    const ping = () => window.dispatchEvent(new Event('resize'));
    ping(); setTimeout(ping, 80); setTimeout(ping, 200); setTimeout(ping, 400);
}

// ---- Anti black-screen toolkit (extra robust dubbel-kick) ----
async function reviveVideoAfterMove(playerRoot) {
    const v  = playerRoot.querySelector('video.html5-main-video') || playerRoot.querySelector('video');
    const vc = playerRoot.querySelector('.html5-video-container');
    if (!v) { forceResizePings(); return; }

    v.setAttribute('playsinline', '');
    v.style.background = '#000';

    if (vc) {
        vc.style.transform = 'none';
        vc.style.willChange = 'auto';
        vc.style.opacity = '1';
    }

    const wasPaused = v.paused;
    const t = v.currentTime;

    const nudgeOnce = async () => {
        const prevDisp = v.style.display;
        v.style.display = 'none';
        void v.offsetHeight;                // reflow
        v.style.display = prevDisp || '';

        try { v.currentTime = t + 0.000001; } catch {}

        v.style.willChange = 'transform, opacity, filter';
        v.style.transform  = 'translateZ(0)';
        v.style.opacity    = '0.9999';
        v.style.filter     = 'brightness(1.0001)';

        if (!wasPaused) { try { await v.play(); } catch {} }

        const cleanup = () => {
            v.style.willChange = '';
            v.style.transform  = '';
            v.style.opacity    = '';
            v.style.filter     = '';
        };

        if ('requestVideoFrameCallback' in v) {
            // @ts-ignore
            v.requestVideoFrameCallback(() => cleanup());
        } else {
            setTimeout(cleanup, 120);
        }
    };

    await nudgeOnce();
    // extra spark efter ~150ms
    setTimeout(() => { nudgeOnce(); forceResizePings(); }, 150);
    // och en sista efter ~350ms (täcker sega codecs)
    setTimeout(() => { nudgeOnce(); forceResizePings(); }, 350);

    forceResizePings();
}

function enable() {
    injectCss();

    const player = getPlayer();
    if (!player) return;

    // Stabilare layout i theater
    const wf = getWatchRoot();
    if (wf && !wf.hasAttribute('theater')) {
        try { wf.setAttribute('theater', ''); } catch {}
    }

    const wrap = document.createElement('div');
    wrap.className = 'yt-ext-fw-wrap';
    Object.assign(wrap.style, {
        position: 'fixed', left: '0', top: '0',
        width: '100vw', height: '100vh',
        zIndex: '2147483646', background: '#000', overflow: 'hidden'
    });

    (getWatchRoot() || document.documentElement).appendChild(wrap);

    state.restore = moveIntoWrapper(player, wrap);
    state.active = true;

    document.documentElement.classList.add('yt-ext-no-scroll');
    document.body.classList.add('yt-ext-no-scroll');

    requestAnimationFrame(() => reviveVideoAfterMove(player));
    setTimeout(() => reviveVideoAfterMove(player), 120);   // double-kick
    forceResizePings();

    // ESC stänger
    window.addEventListener('keydown', onEscOnce, { once: true });

    emitState();
}

function disable() {
    if (!state.active) return;

    const doRestore = state.restore;
    state.restore = null;
    state.active = false;

    if (doRestore) doRestore();

    document.documentElement.classList.remove('yt-ext-no-scroll');
    document.body.classList.remove('yt-ext-no-scroll');

    // Reparera svart skärm efter att vi lämnat overlayn
    requestAnimationFrame(() => {
        const player = getPlayer();
        if (player) {
            reviveVideoAfterMove(player);
            setTimeout(() => reviveVideoAfterMove(player), 120);  // extra kick
        }
    });

    forceResizePings();

    emitState();
}

function onEscOnce(e) {
    if (e.key === 'Escape') disable();
}

// Stäng vid SPA-navigering
window.addEventListener('yt-navigate-start', () => { if (state.active) disable(); });

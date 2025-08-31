// Full Window: flytta spelaren till en viewport-fylld wrapper (med robust anti-black-screen)
import { getPlayer, moveIntoWrapper, getWatchRoot } from '../utils/dom.js';

let state = { active: false, restore: null };

export function toggleFullWindow() {
    if (state.active) disable(); else enable();
}

function forceResizePings() {
    const ping = () => window.dispatchEvent(new Event('resize'));
    ping(); setTimeout(ping, 80); setTimeout(ping, 200);
}

// ---- Anti black-screen toolkit ----
async function reviveVideoAfterMove(playerRoot) {
    const v  = playerRoot.querySelector('video.html5-main-video') || playerRoot.querySelector('video');
    const vc = playerRoot.querySelector('.html5-video-container');
    if (!v) { forceResizePings(); return; }

    // 0) Safeguards
    v.setAttribute('playsinline', '');
    v.style.background = '#000';

    // 1) Neutralize transforms/opacity på containern
    if (vc) {
        vc.style.transform = 'none';
        vc.style.willChange = 'auto';
        vc.style.opacity = '1';
    }

    // 2) Reflow + microseek + (re)play if needed
    const wasPaused = v.paused;
    const t = v.currentTime;

    // Dölj kort → reflow → visa
    const prevDisp = v.style.display;
    v.style.display = 'none';
    // force reflow
    void v.offsetHeight;
    v.style.display = prevDisp || '';

    // microseek för att kicka igång decodern (syns inte)
    try { v.currentTime = t + 0.000001; } catch {}

    // liten compositing-kick
    v.style.willChange = 'transform, opacity, filter';
    v.style.transform  = 'translateZ(0)';
    v.style.opacity    = '0.9999';
    v.style.filter     = 'brightness(1.0001)';

    // Om den spelade: säkerställ play
    if (!wasPaused) { try { await v.play(); } catch {} }

    // 3) Vänta en frame → städa
    const cleanup = () => {
        v.style.willChange = '';
        v.style.transform  = '';
        v.style.opacity    = '';
        v.style.filter     = '';
        forceResizePings();
    };
    if ('requestVideoFrameCallback' in v) {
        // @ts-ignore
        v.requestVideoFrameCallback(() => cleanup());
    } else {
        setTimeout(cleanup, 120);
    }

    // 4) Sista-reserv: PiP snabbt in/ut (kräver user gesture – vi körs i klickflödet)
    try {
        if (document.pictureInPictureEnabled && !document.pictureInPictureElement && !v.disablePictureInPicture) {
            await v.requestPictureInPicture();
            // så snart vi är i PiP → ut igen
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
        }
    } catch {
        // Ignorera – inte alla miljöer tillåter PiP direkt
    }

    forceResizePings();
}

function enable() {
    const player = getPlayer();
    if (!player) return;

    // Stäng Flex om aktiv
    window.postMessage({ type: 'YT_EXT_DISABLE_FLEX_IF_ACTIVE' }, '*');

    // Hjälp YT med layout (theater ger stabilare mått)
    const wf = getWatchRoot();
    if (wf && !wf.hasAttribute('theater')) {
        try { wf.setAttribute('theater', ''); } catch {}
    }

    // Skapa viewport-wrap inne i watch-flexy (viktigt!)
    const wrap = document.createElement('div');
    wrap.className = 'yt-ext-fw-wrap';
    const host = getWatchRoot() || document.documentElement;
    host.appendChild(wrap);

    // Flytta spelaren in i vår wrap + markera för CSS att fylla
    state.restore = moveIntoWrapper(player, wrap);
    state.active = true;

    document.documentElement.classList.add('yt-ext-no-scroll');
    document.body.classList.add('yt-ext-no-scroll');

    // Kör anti-black-screen i nästa frame när DOM-flytten är klar
    requestAnimationFrame(() => { reviveVideoAfterMove(player); });

    forceResizePings();

    const onKey = (e) => { if (e.key === 'Escape') disable(); };
    window.addEventListener('keydown', onKey, { once: true });
}

function disable() {
    if (!state.active) return;
    if (state.restore) state.restore();
    state.restore = null;
    state.active = false;

    document.documentElement.classList.remove('yt-ext-no-scroll');
    document.body.classList.remove('yt-ext-no-scroll');

    forceResizePings();
}

// Auto-reset vid navigation
window.addEventListener('yt-navigate-start', () => { if (state.active) disable(); });

// Ömsesidig exkludering med Flex
window.addEventListener('message', (ev) => {
    if (ev?.data?.type === 'YT_EXT_DISABLE_FULL_IF_ACTIVE' && state.active) {
        disable();
    }
});

// Full Window: flytta spelaren till en viewport-fylld wrapper
import { getPlayer, moveIntoWrapper, getWatchRoot } from '../utils/dom.js';

let state = { active: false, restore: null };

export function toggleFullWindow() {
    if (state.active) disable(); else enable();
}

function forceResizePings() {
    const ping = () => window.dispatchEvent(new Event('resize'));
    ping(); setTimeout(ping, 100); setTimeout(ping, 300);
}

function enable() {
    const player = getPlayer();
    if (!player) return;

    // Stäng Flex om aktiv
    window.postMessage({ type: 'YT_EXT_DISABLE_FLEX_IF_ACTIVE' }, '*');

    const wrap = document.createElement('div');
    wrap.className = 'yt-ext-fw-wrap';

    // ⬅️ lägg wrappern INNE i ytd-watch-flexy (viktigt)
    const host = getWatchRoot();
    host.appendChild(wrap);

    state.restore = moveIntoWrapper(player, wrap);
    state.active = true;

    document.documentElement.classList.add('yt-ext-no-scroll');
    document.body.classList.add('yt-ext-no-scroll');

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
    // ge YouTube en chans att re-layouta
    forceResizePings();
}

window.addEventListener('yt-navigate-start', () => { if (state.active) disable(); });

window.addEventListener('message', (ev) => {
    if (ev?.data?.type === 'YT_EXT_DISABLE_FULL_IF_ACTIVE') {
        if (state.active) disable();
    }
});

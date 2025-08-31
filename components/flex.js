// Flex: gör hela ytd-watch-flexy till en flyttbar/resizable låda (videon flyttas inte).
function getWatchRoot() {
    return document.querySelector('ytd-watch-flexy');
}

let active = false;
let handle = null;
let prevAttr = null;

export function toggleFlex() {
    if (active) disable(); else enable();
}

function enable() {
    const wf = getWatchRoot();
    if (!wf) return;

    // stäng Full Window om den är igång
    window.postMessage({ type: 'YT_EXT_DISABLE_FULL_IF_ACTIVE' }, '*');

    // spara inline
    prevAttr = wf.getAttribute('style');

    // basstil (position:fixed m.m.)
    wf.classList.add('yt-ext-flex-mode');
    wf.style.position = 'fixed';
    wf.style.top = '72px';
    wf.style.left = '72px';
    wf.style.width = '1280px';
    wf.style.height = '720px';
    wf.style.zIndex = '2147483645';
    wf.style.background = '#000';
    wf.style.overflow = 'hidden';

    // resize-handle
    handle = document.createElement('div');
    handle.className = 'yt-ext-flex-handle';
    wf.appendChild(handle);

    // drag move
    let sx=0, sy=0, ox=0, oy=0, dragging=false;
    const downMove = (e) => {
        const ev = e.touches ? e.touches[0] : e;
        dragging = true;
        sx = ev.clientX; sy = ev.clientY;
        const rect = wf.getBoundingClientRect();
        ox = rect.left; oy = rect.top;
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', up);
    };
    const move = (e) => {
        if (!dragging) return;
        const ev = e.touches ? e.touches[0] : e;
        if (e.touches) e.preventDefault();
        const nx = Math.max(0, ox + (ev.clientX - sx));
        const ny = Math.max(0, oy + (ev.clientY - sy));
        wf.style.left = nx + 'px';
        wf.style.top  = ny + 'px';
    };
    const up = () => {
        dragging = false;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', up);
    };
    // drag med hela övre spelarytan: enklast, men oönskat? Ta bort om du vill.
    wf.addEventListener('mousedown', downMove);
    wf.addEventListener('touchstart', downMove, { passive: true });

    // resize (hörn)
    let rx=0, ry=0, rw=0, rh=0, resizing=false;
    const downResize = (e) => {
        const ev = e.touches ? e.touches[0] : e;
        resizing = true;
        rx = ev.clientX; ry = ev.clientY;
        const rect = wf.getBoundingClientRect();
        rw = rect.width; rh = rect.height;
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('touchend', stopResize);
        e.stopPropagation();
    };
    const doResize = (e) => {
        if (!resizing) return;
        if (e.touches) e.preventDefault();
        const ev = e.touches ? e.touches[0] : e;
        const w = Math.max(480, rw + (ev.clientX - rx));
        const h = Math.max(270, rh + (ev.clientY - ry));
        wf.style.width  = w + 'px';
        wf.style.height = h + 'px';
        window.dispatchEvent(new Event('resize'));
    };
    const stopResize = () => {
        resizing = false;
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('touchend', stopResize);
    };
    handle.addEventListener('mousedown', downResize);
    handle.addEventListener('touchstart', downResize, { passive: true });

    // dubbelklick = snaps
    const snaps = [[1280,720],[1600,900],[1920,1080],[854,480]];
    let i = 0;
    wf.addEventListener('dblclick', () => {
        i = (i + 1) % snaps.length;
        const [w,h] = snaps[i];
        wf.style.width  = w + 'px';
        wf.style.height = h + 'px';
        window.dispatchEvent(new Event('resize'));
    });

    active = true;
    pingResize();
}

function disable() {
    if (!active) return;
    const wf = getWatchRoot();
    if (wf) {
        wf.classList.remove('yt-ext-flex-mode');
        if (prevAttr === null) wf.removeAttribute('style');
        else wf.setAttribute('style', prevAttr);
        if (handle && handle.parentNode === wf) handle.remove();
    }
    handle = null;
    active = false;
    pingResize();
}

function pingResize() {
    const ping = () => window.dispatchEvent(new Event('resize'));
    ping(); setTimeout(ping, 100); setTimeout(ping, 300);
}

window.addEventListener('yt-navigate-start', () => { if (active) disable(); });
window.addEventListener('message', (ev) => {
    if (ev?.data?.type === 'YT_EXT_DISABLE_FLEX_IF_ACTIVE' && active) disable();
});

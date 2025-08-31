// Robust player-finder + säker flytt + watch-root
export function getPlayer() {
    return (
        document.querySelector('ytd-watch-flexy ytd-player') ||
        document.querySelector('ytd-player') ||
        document.getElementById('ytd-player') ||
        (document.getElementById('movie_player')?.closest('ytd-player')) ||
        null
    );
}

// Viktigt: håll spelaren kvar under ytd-watch-flexy
export function getWatchRoot() {
    return document.querySelector('ytd-watch-flexy') || document.body;
}

export function moveIntoWrapper(targetEl, wrapperEl) {
    const container = targetEl.tagName === 'YTD-PLAYER'
        ? targetEl
        : (targetEl.closest && targetEl.closest('ytd-player')) || targetEl;

    const parent = container.parentElement;
    const next = container.nextSibling;

    wrapperEl.appendChild(container);
    container.classList.add('yt-ext-size-fill');

    return () => {
        container.classList.remove('yt-ext-size-fill');
        if (next && next.parentNode === parent) parent.insertBefore(container, next);
        else parent.appendChild(container);
        wrapperEl.remove();
    };
}

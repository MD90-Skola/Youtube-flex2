// Skapar flytande meny (Full Window / Flex) och injicerar CSS.
// Zoom-slidern monteras i .yt-ext-zoom-slot av zoom.js.

const ROOT_ID = "yt-ext-buttons-root";

function injectCss() {
    const href = chrome.runtime.getURL("components/buttons.css");
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }
}

export function attachButtons({ onFullWindow, onFlex }) {
    injectCss();

    let root = document.getElementById(ROOT_ID);
    if (!root) {
        root = document.createElement("div");
        root.id = ROOT_ID;
        document.body.appendChild(root);
    }

    root.innerHTML = `
    <div class="yt-ext-buttons">
      <div class="yt-ext-btn-row">
        <button class="yt-ext-btn" data-action="full" title="Full Window">Full Window</button>
        <button class="yt-ext-btn" data-action="flex" title="Flex Resize">Flex</button>
      </div>
      <div class="yt-ext-zoom-slot"></div>
    </div>
  `;

    root.addEventListener("click", (e) => {
        const btn = e.target.closest(".yt-ext-btn");
        if (!btn) return;
        const a = btn.getAttribute("data-action");
        if (a === "full") onFullWindow?.();
        if (a === "flex") onFlex?.();
    });

    return root;
}

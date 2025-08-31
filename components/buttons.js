// FullWindow-knapp + slot för zoom; exponerar setFullButtonLabel()
const ROOT_ID = "yt-ext-buttons-root";
let fullBtn = null;

function injectCss() {
    const href = chrome.runtime.getURL("components/buttons.css");
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }
}

export function setFullButtonLabel(text) {
    if (fullBtn) fullBtn.textContent = text;
}

export function attachButtons({ onFullWindow }) {
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
        <button class="yt-ext-btn" id="yt-ext-btn-fullwindow" data-action="full" title="Full Window">FullWindow</button>
      </div>
      <div class="yt-ext-zoom-slot"></div>
    </div>
  `;

    fullBtn = root.querySelector("#yt-ext-btn-fullwindow");

    root.addEventListener("click", (e) => {
        const btn = e.target.closest(".yt-ext-btn");
        if (!btn) return;
        const a = btn.getAttribute("data-action");
        if (a === "full") onFullWindow?.();
    });

    return root;
}

// Skapar flytande knappar (egen CSS-fil) och binder callbacks.
// Använd: attachButtons({ onFullWindow, onFlex })

const ROOT_ID = "yt-ext-buttons-root";

function cssLinkHref() {
    return chrome.runtime.getURL("components/buttons.css");
}

export function attachButtons({ onFullWindow, onFlex }) {
    // Finns redan?
    const old = document.getElementById(ROOT_ID);
    if (old) return old;

    // Rot + stylesheet
    const root = document.createElement("div");
    root.id = ROOT_ID;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssLinkHref();

    // UI
    root.innerHTML = `
    <div class="yt-ext-buttons">
      <button class="yt-ext-btn" data-action="fullwindow" title="Full Window">Full Window</button>
      <button class="yt-ext-btn" data-action="flex" title="Flex Resize">Flex</button>
    </div>
  `;

    document.body.appendChild(root);
    document.head.appendChild(link);

    // Events
    root.addEventListener("click", (e) => {
        const btn = e.target.closest("button.yt-ext-btn");
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        if (action === "fullwindow" && typeof onFullWindow === "function") onFullWindow();
        if (action === "flex"       && typeof onFlex === "function")       onFlex();
    });

    return root;
}

export function detachButtons() {
    const el = document.getElementById(ROOT_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
    // lämna CSS-länken kvar (ofarligt), eller rensa om du vill:
    // document.querySelectorAll(`link[href="${cssLinkHref()}"]`).forEach(n => n.remove());
}

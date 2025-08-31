// Fade.js — visa en temporär banner med fade in/out
const CSS_HREF = chrome.runtime.getURL("components/Fade.css");
let injected = false;

function injectCss() {
    if (injected) return;
    if (!document.querySelector(`link[href="${CSS_HREF}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_HREF;
        document.head.appendChild(link);
    }
    injected = true;
}

export function showBanner() {
    injectCss();

    // skapa element
    const banner = document.createElement("div");
    banner.className = "yt-ext-fade-banner";
    banner.innerHTML = `
    <div class="yt-ext-fade-text">
      Press <b>ESC</b> to return<br/>
      Hold <b>Alt + Mouse1</b> to move zoom
    </div>
  `;

    document.body.appendChild(banner);

    // trigga fade-in
    requestAnimationFrame(() => banner.classList.add("visible"));

    // fade ut efter 2.5s
    setTimeout(() => banner.classList.remove("visible"), 2500);
    // ta bort helt efter animation
    setTimeout(() => banner.remove(), 2500 + 500);
}

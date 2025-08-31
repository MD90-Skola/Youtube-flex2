// popup.js — visar status om aktiv tabb är YouTube
async function detectActiveYoutube() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;
        const ok = /^https?:\/\/(www\.)?youtube\.com\//i.test(tab.url || "");
        document.getElementById('status').textContent =
            ok ? "YouTube är aktiv – content script hanterar knapparna där."
                : "Inte på en YouTube-sida just nu.";
    } catch {
        document.getElementById('status').textContent = "Kunde inte läsa aktiv tabb.";
    }
}


// popup.js — hanterar knappar/slider i popupen
async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

document.getElementById("popup-fw-btn").addEventListener("click", async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FULLWINDOW" });
});

document.getElementById("popup-zoom-slider").addEventListener("input", async (e) => {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    const scale = e.target.valueAsNumber / 100;
    chrome.tabs.sendMessage(tab.id, { type: "SET_ZOOM", value: scale });
});





detectActiveYoutube();

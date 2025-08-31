// popup/popup.js
async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
}
function isYouTubeWatch(url) {
    return typeof url === 'string' && url.includes('youtube.com/watch');
}

async function send(command) {
    const tab = await getActiveTab();
    if (!tab?.id || !isYouTubeWatch(tab.url)) {
        alert('Open a YouTube video tab first.');
        return;
    }
    chrome.tabs.sendMessage(tab.id, { command });
}

document.getElementById('btnFull').addEventListener('click', () => send('toggleFullWindow'));
document.getElementById('btnFlex').addEventListener('click', () => send('toggleFlex'));

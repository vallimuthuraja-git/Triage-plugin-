chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var url = tab.url;
    if (isUrl(url)) {
        chrome.action.enable(tabId);
    } else {
        chrome.action.disable(tabId);
    }
});

// Notify popup when active tab changes
chrome.tabs.onActivated.addListener(function(activeInfo) {
    // Send message to popup to refresh data
    chrome.runtime.sendMessage({
        action: 'tabActivated',
        tabId: activeInfo.tabId
    }).catch(() => {
        // Popup might not be open, ignore
    });
});

function isUrl(url) {
    // Enable extension on all websites
    return true;
}

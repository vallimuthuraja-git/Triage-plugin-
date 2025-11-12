// send the page title as a chrome message
//chrome.runtime.sendMessage(document.getElementById('status_whiteboard').value);
//chrome.runtime.sendMessage(document.getElementsByClassName("bz_comment_time")[0].innerText);

//chrome.runtime.sendMessage({content: document.getElementById('status_whiteboard').value, type: "m1"});
//chrome.runtime.sendMessage({content: document.getElementsByClassName("bz_comment_time")[0].innerText, type: "m2"});

var port = chrome.tabs.connect(tab.id);
port.postMessage({type: "m1", content: document.getElementById('status_whiteboard').value});
port.postMessage({type: "m2", content: document.getElementsByClassName("bz_comment_time")[0].innerText});
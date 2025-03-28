let extractedData = null;
let aiEnabled = true; // Default state

// Handle messages from popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXTRACTED_DATA") {
    extractedData = message.data;
  } else if (message.type === "GET_EXTRACTED_DATA") {
    sendResponse(extractedData);
  } else if (message.type === "GET_AI_STATE") {
    sendResponse({ aiEnabled });
  } else if (message.type === "SET_AI_STATE") {
    aiEnabled = message.enabled;
    // Broadcast the state change to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { 
            action: "toggleAI", 
            enabled: aiEnabled 
          });
        }
      });
    });
    sendResponse({ success: true });
  }
  return true;
});

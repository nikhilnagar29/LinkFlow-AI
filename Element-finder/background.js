chrome.action.onClicked.addListener(async (tab) => {
    const url = chrome.runtime.getURL('popup.html');
  
    // Focus existing window if it exists
    if (popupWindowId) {
      try {
        await chrome.windows.update(popupWindowId, { focused: true });
        return;
      } catch (e) {
        popupWindowId = null;
      }
    }
  
    // Create new window
    const window = await chrome.windows.create({
      url: url,
      type: 'normal',  // "popup" type works but can still auto-close if it loses focus
      width: 350,
      height: 500,
      left: screen.width - 400,
      top: 50
    });
  
    popupWindowId = window.id;
  
    // Handle window closure
    chrome.windows.onRemoved.addListener((closedWindowId) => {
      if (closedWindowId === popupWindowId) {
        popupWindowId = null;
      }
    });
  });
  
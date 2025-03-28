// popup.js

document.addEventListener("DOMContentLoaded", () => {
    const toggleButton = document.getElementById("toggle");
    const statusDiv = document.getElementById("body");
    const descriptionTextarea = document.getElementById("conversation-description");
    const saveDescriptionButton = document.getElementById("save-description");

    if (!toggleButton || !descriptionTextarea || !saveDescriptionButton) {
        console.error("Required elements not found");
        return;
    }

    // Function to update UI
    function updateUI(isEnabled) {
        toggleButton.textContent = isEnabled ? "Turn AI Off" : "Turn AI On";
        statusDiv.textContent = isEnabled ? "AI is currently ON" : "AI is currently OFF";
    }

    // Function to notify content script
    async function notifyContentScript(enabled) {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleAI",
                    enabled: enabled
                });
            }
        } catch (error) {
            console.error("Error notifying content script:", error);
        }
    }

    // Load initial state and description
    chrome.storage.local.get(["aiEnabled", "conversationDescription"], (result) => {
        const isEnabled = result.aiEnabled ?? true;
        updateUI(isEnabled);
        
        // Load saved description if exists
        if (result.conversationDescription) {
            descriptionTextarea.value = result.conversationDescription;
        }
    });

    // Handle description save
    saveDescriptionButton.addEventListener("click", async () => {
        const description = descriptionTextarea.value.trim();
        try {
            await chrome.storage.local.set({ conversationDescription: description });
            
            // Notify content script about the new description
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]?.id) {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateDescription",
                    description: description
                });
            }
            
            // Show success feedback
            const originalText = saveDescriptionButton.textContent;
            saveDescriptionButton.textContent = "Saved!";
            saveDescriptionButton.style.backgroundColor = "#28a745";
            setTimeout(() => {
                saveDescriptionButton.textContent = originalText;
                saveDescriptionButton.style.backgroundColor = "";
            }, 2000);
        } catch (error) {
            console.error("Error saving description:", error);
        }
    });

    // Handle toggle click
    toggleButton.addEventListener("click", async () => {
        try {
            const result = await chrome.storage.local.get(["aiEnabled"]);
            const currentState = result.aiEnabled ?? true;
            const newState = !currentState;

            // Update storage
            await chrome.storage.local.set({ aiEnabled: newState });
            
            // Update UI
            updateUI(newState);
            
            // Notify content script
            await notifyContentScript(newState);
            
            console.log(`AI has been ${newState ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Error toggling AI:", error);
        }
    });
});

chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab.id) return;
  
    try {
      // Inject content.js
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });
  
      // Function with retry logic to send the message to the content script
      const sendMessageWithRetry = async (retries = 3) => {
        try {
          const response = await new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tab.id, { action: "extractInfo" }, (response) => {
              if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
              else resolve(response);
            });
          });
          return response;
        } catch (error) {
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return sendMessageWithRetry(retries - 1);
          }
          throw error;
        }
      };
  
      const response = await sendMessageWithRetry();
      
      // Update UI with the received response.
      document.getElementById("title").textContent = response.title || "No title found";
      // If response.body is an array, join it; otherwise, use it directly.
      document.getElementById("body").textContent = 
        Array.isArray(response.body) ? response.body.join("\n") : response.body || "No body found";
      document.getElementById("profile").textContent = 
        Array.isArray(response.profile) ? response.profile.join("\n") : response.profile || "No profile found";
      
    } catch (error) {
      console.error("Error:", error.message);
      document.getElementById("title").textContent = "Error extracting data";
    }
  });
  
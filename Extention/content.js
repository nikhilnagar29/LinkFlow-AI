(() => {
    // Global variables
    let lastProfilesCount = 0;
    let isEnabled = false; // Start disabled until we check storage
    let intervalId = null;
    let lastMessageTime = Date.now();
    let isInitialized = false;
    let conversationDescription = ""; // Store the conversation description
    let timerLineInterval = null;
    let autoSendTimeout = null;

    // NEW: Add flag to prevent multiple API calls
    let isProcessing = false;
    let currentRequestController = null; // For aborting requests
    let userIsTyping = false; //Track if user is typing

  
    // Function to stop timer and auto-send
    function stopAutoSend() {
        // Clear the timer line
        if (timerLineInterval) {
            clearInterval(timerLineInterval);
            timerLineInterval = null;
        }
        
        // Remove the timer line from UI
        const existingContainer = document.querySelector('.timer-line-container');
        if (existingContainer) {
            existingContainer.remove();
        }

        // Clear the auto-send timeout
        if (autoSendTimeout) {
            clearTimeout(autoSendTimeout);
            autoSendTimeout = null;
        }

        console.log("🛑 Auto-send cancelled by user interaction");
    }

    // NEW: Function to check if text box is empty or contains only whitespace
    function isTextBoxEmpty() {
        const messageInput = document.querySelector('.msg-form__contenteditable');
        if (!messageInput) return true;
        
        const text = messageInput.innerText.trim();
        return text === '' || text === 'AI is thinking...';
    }

    // NEW: Function to check if user is currently typing
    function checkUserTyping() {
        const messageInput = document.querySelector('.msg-form__contenteditable');
        if (!messageInput) return false;
        
        const text = messageInput.innerText.trim();
        
        // If there's text that's not our AI thinking message, user is typing
        if (text !== '' && text !== 'AI is thinking...') {
            return true;
        }
        
        return false;
    }


      // NEW: Function to show "AI is thinking..." in text box
      function showThinkingMessage() {
        const messageInput = document.querySelector('.msg-form__contenteditable');
        if (messageInput) {
            const thinkingMessage = document.createElement('p');
            thinkingMessage.textContent = 'AI is thinking...';
            thinkingMessage.style.color = '#666';
            thinkingMessage.style.fontStyle = 'italic';
            thinkingMessage.setAttribute('data-ai-thinking', 'true'); // Mark as AI message
            messageInput.innerHTML = thinkingMessage.outerHTML;
            
            const event = new Event('input', { bubbles: true });
            messageInput.dispatchEvent(event);
        }
    }

    // NEW: Function to clear the message input
    function clearMessageInput() {
        const messageInput = document.querySelector('.msg-form__contenteditable');
        if (messageInput) {
            messageInput.innerHTML = '';
            const event = new Event('input', { bubbles: true });
            messageInput.dispatchEvent(event);
        }
    }

    // Create and inject timer line styles
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
        .timer-line-container {
            width: 100%;
            height: 4px;
            background-color:rgb(255, 255, 255);
            position: absolute;
            top: 0;
            left: 0;
            z-index: 9999;
        }
        .timer-line {
            height: 100%;
            width: 0%;
            background-color:rgb(194, 10, 10);
            transition: width 0.05s linear;
        }
        .msg-form__contenteditable {
            position: relative !important;
        }
    `;
    document.head.appendChild(styleSheet);

    // Function to create and start timer line
    function startTimerLine(duration = 10000) {
        try {
            // Find the message form container
            const messageInput = document.querySelector('.msg-form__contenteditable');
            if (!messageInput) {
                console.error("Message input not found");
                return;
            }

            // Remove any existing timer
            stopAutoSend();

            // Create new timer elements
            const container = document.createElement('div');
            container.className = 'timer-line-container';
            const timerLine = document.createElement('div');
            timerLine.className = 'timer-line';
            container.appendChild(timerLine);

            // Add timer to message input
            messageInput.insertAdjacentElement('beforebegin', container);

            // Add event listeners to stop timer on user interaction
            messageInput.addEventListener('click', stopAutoSend);
            messageInput.addEventListener('input', stopAutoSend);
            messageInput.addEventListener('focus', stopAutoSend);

            // Start timer animation
            const startTime = Date.now();
            timerLineInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const progress = (elapsed / duration) * 100;
                
                if (progress >= 100) {
                    clearInterval(timerLineInterval);
                    container.remove();
                    return;
                }
                
                timerLine.style.width = `${progress}%`;
            }, 50);

            return timerLineInterval;
        } catch (error) {
            console.error("Error in startTimerLine:", error);
        }
    }

    // Function to extract messages and, if new messages are detected, send a backend request.
    function extractAndSend() {
      if (!isEnabled) {
        console.log("🔴 AI is disabled; skipping message extraction.");
        return;
      }

      // NEW: Check if already processing
      if (isProcessing) {
          console.log("⏳ Already processing a request, skipping...");
          return;
      }

      try {
        const bodies = Array.from(document.querySelectorAll(".msg-s-event-listitem__body"))
          .map(el => el.innerText.trim());
        const profiles = Array.from(document.querySelectorAll(".msg-s-message-group__profile-link"))
          .map(el => el.innerText.trim());
        
        if (!bodies.length || !profiles.length) {
          console.log("No messages found in conversation");
          return;
        }

        const receiver = document.querySelector(".msg-overlay-bubble-header__title")?.innerText.trim();
        
        if (!receiver) {
          console.log("No receiver found");
          return;
        }

        // Get the latest message
        const latestMessage = bodies[bodies.length - 1];
        const latestSender = profiles[profiles.length - 1];

        // If the latest message is from the AI (us), skip
        if (latestSender !== receiver) {
          console.log("Latest message is from us, skipping");
          return;
        }
        console.log("Last message no" , lastProfilesCount);
        console.log("now profile message no" , profiles.length)
        // If we've already processed this message count, skip
        if (profiles.length <= lastProfilesCount) {
          console.log("No new messages to process");
          return;
        }

        // NEW: Set processing flag and show thinking message
        isProcessing = true;
        showThinkingMessage();
    
        let maxLength = Math.min(profiles.length, bodies.length);
        if (maxLength > 10) maxLength = 10;
    
        const messages = [];
        for (let i = 0; i < maxLength; i++) {
          messages.push({
            role: profiles[profiles.length - 1 - i] || "Unknown",
            message: bodies[bodies.length - 1 - i] || "No message"
          });
        }
    
        console.log("💬 Processing conversation with:", receiver);
        console.log("📝 Latest message from:", latestSender);
    
        // const formattedMessages = { 
        //   receiver, 
        //   messages,
        //   description: conversationDescription // Include the description in the request
        // };
        const formattedMessages = { 
            receiver, 
            messages,
          };
          console.log("HELLOOOOOOOOOOOOOOOOOOO");
        // Send POST request to backend.
        fetch("http://localhost:3000/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(formattedMessages),
        })
          .then(res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .then(data => {
            // NEW: Reset processing flag
            isProcessing = false;
            currentRequestController = null;

             // Update our last processed count
              lastProfilesCount = profiles.length;

            if (!isEnabled) {
              console.log("🔴 AI was disabled while waiting for response");
              clearMessageInput(); // Clear the thinking message
              return;
            }

            const reply = data.response || "No reply received";
            console.log("🤖 AI Reply:", reply);
    
            // Insert the reply into the message input.
            const messageInput = document.querySelector('.msg-form__contenteditable');
            if (messageInput) {
              const newMessage = document.createElement('p');
              newMessage.textContent = reply;
              messageInput.innerHTML = newMessage.outerHTML;
              const event = new Event('input', { bubbles: true });
              messageInput.dispatchEvent(event);

              // Start the timer line
              console.log("Starting timer line...");
              startTimerLine(10000);
    
              // Set timeout for auto-send
              autoSendTimeout = setTimeout(() => {
                if (!isEnabled) {
                  console.log("🔴 AI was disabled before sending message");
                  return;
                }
                const sendButton = document.querySelector('.msg-form__send-button');
                if (sendButton && timerLineInterval !== null) { // Only send if timer wasn't cancelled
                  sendButton.click();
                  console.log("📨 Message sent!");
                  lastMessageTime = Date.now();
                } else {
                  console.warn("⚠️ Send button not found or timer was cancelled!");
                }
              }, 10000);
            }
          })
          .catch(err => {
            // NEW: Reset processing flag on error
            isProcessing = false;
            currentRequestController = null;

            if (err.name === 'AbortError') {
                console.log("🛑 Request was cancelled");
            } else {
                console.error("❌ Error:", err);
            }
            
            // Clear the thinking message on error
            clearMessageInput();
          });
      } catch (error) {
        // NEW: Reset processing flag on error
        isProcessing = false;
        console.error("❌ Error in message processing:", error);
        clearMessageInput();
      }
    }

    // 🚀 Start polling
    function startPolling() {
        if (!intervalId) {
            isEnabled = true;
            intervalId = setInterval(extractAndSend, 5000);
            console.log("🟢 AI Assistant activated");
            chrome.storage.local.set({ aiEnabled: true });
        }
    }

    // 🛑 Stop polling
    function stopPolling() {
        isEnabled = false;

        // NEW: Cancel any ongoing request
        if (currentRequestController) {
            currentRequestController.abort();
            currentRequestController = null;
        }

        // NEW: Reset processing flag
        isProcessing = false;
        
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            console.log("🔴 AI Assistant deactivated");
            chrome.storage.local.set({ aiEnabled: false });
        }

        // Clear any thinking message
        clearMessageInput();
    }
  
    // Set up message listener for both extractInfo and toggleAI actions
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        if (request.action === "extractInfo") {
          if (!isEnabled) {
            sendResponse({ status: "AI is currently disabled" });
            return true;
          }
          extractAndSend();
          sendResponse({ 
            status: "Processing messages",
            aiEnabled: isEnabled,
            isProcessing: isProcessing // NEW: Include processing status
          });
          return true;
        } else if (request.action === "toggleAI") {
          console.log("🔄 Toggling AI:", request.enabled);
          if (request.enabled) {
            startPolling();
          } else {
            stopPolling();
          }
          sendResponse({ 
            status: `AI ${isEnabled ? 'enabled' : 'disabled'}`,
            aiEnabled: isEnabled
          });
          return true;
        } else if (request.action === "updateDescription") {
          console.log("📝 Updating conversation description");
          conversationDescription = request.description;
          sendResponse({ status: "Description updated" });
          return true;
        }
      } catch (error) {
        console.error("❌ Error in message handler:", error);
        sendResponse({ error: error.message });
        return true;
      }
    });

    // Initialize on load
    function initialize() {
      if (isInitialized) return;
      isInitialized = true;

      chrome.storage.local.get(["aiEnabled", "conversationDescription"], (result) => {
        try {
          const shouldEnable = result.aiEnabled ?? false; // default to false on first load
          conversationDescription = result.conversationDescription || ""; // Load saved description
          console.log(`🔌 AI Assistant initializing, should be ${shouldEnable ? 'enabled' : 'disabled'}`);
          if (shouldEnable) {
            startPolling();
          } else {
            stopPolling();
          }
        } catch (error) {
          console.error("❌ Error in initialization:", error);
        }
      });
    }

    // Run initialization
    initialize();
})();
  
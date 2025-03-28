document.getElementById("searchBtn").addEventListener("click", () => {
    const id = document.getElementById("idInput").value.trim();
    const className = document.getElementById("classInput").value.trim();
    const tag = document.getElementById("tagInput").value.trim();
  
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content.js"],
          },
          () => {
            if (chrome.runtime.lastError) {
              document.getElementById("results").textContent =
                "Error injecting script: " + chrome.runtime.lastError.message;
              return;
            }
            chrome.tabs.sendMessage(tab.id, { id, className, tag }, (response) => {
              const resultsDiv = document.getElementById("results");
              resultsDiv.innerHTML = "";
  
              if (chrome.runtime.lastError) {
                resultsDiv.textContent = "Error: " + chrome.runtime.lastError.message;
                return;
              }
  
              if (!response || response.length === 0) {
                resultsDiv.textContent = "No elements found.";
                return;
              }
  
              response.forEach((element) => {
                const elementDiv = document.createElement("div");
                elementDiv.innerHTML = `<strong>Tag:</strong> ${element.tag}<br><strong>Content:</strong> `;
                const contentPre = document.createElement("pre");
                contentPre.textContent = element.content;
                elementDiv.appendChild(contentPre);
                elementDiv.appendChild(document.createElement("hr"));
                resultsDiv.appendChild(elementDiv);
              });
            });
          }
        );
      }
    });
  });
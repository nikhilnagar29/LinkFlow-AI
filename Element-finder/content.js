chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { id, className, tag } = request;
  
  let tagPart = tag ? tag.toLowerCase() : "*";
  let selector = tagPart;

  if (id) selector += `#${id}`;
  if (className) {
      const classSelector = className.split(" ").filter(c => c).join(".");
      if (classSelector) selector += `.${classSelector}`;
  }

  try {
      const elements = document.querySelectorAll(selector);
      const results = Array.from(elements)
          .map(element => ({
              tag: element.tagName.toLowerCase(),
              content: element.textContent.trim() // Extract only visible text
          }))
          .filter(item => item.content.length > 0); // Exclude empty content
      
      sendResponse(results);
  } catch (error) {
      console.error("Error querying elements:", error);
      sendResponse([]);
  }

  return true;
});

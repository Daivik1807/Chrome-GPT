// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "textSelected") {
    console.log("Background received selected text:", message.text);
    // Store the selected text temporarily for the popup to retrieve
    chrome.storage.local.set({ latestSelectedText: message.text }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error storing selected text:", chrome.runtime.lastError);
        sendResponse({ status: "error", message: chrome.runtime.lastError.message });
      } else {
        console.log("Selected text stored successfully.");
         // Optional: Indicate to the user that text has been captured
         chrome.action.setBadgeText({ text: "✓" });
         chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // Green color
         // Clear the badge after a short delay
         setTimeout(() => {
            chrome.action.setBadgeText({ text: "" });
         }, 2000);

        sendResponse({ status: "success" });
      }
    });
    // Return true to indicate you wish to send a response asynchronously
    return true;
  }
});

// Clear the temporary text when the browser closes (optional cleanup)
chrome.windows.onRemoved.addListener(() => {
  chrome.storage.local.remove("latestSelectedText", () => {
     console.log("Cleared temporary selected text on browser close.");
  });
});
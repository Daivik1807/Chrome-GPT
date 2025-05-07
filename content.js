let lastSelection = "";
let lastProcessedTime = 0;
const DEBOUNCE_MS = 500; // Prevent spamming messages

document.addEventListener("mouseup", handleSelection);
document.addEventListener("keyup", handleSelection); // Handle selection via keyboard

function handleSelection(event) {
  // Don't trigger on input fields or textareas to avoid annoyance
  const activeElement = document.activeElement;
  const isEditable = activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA');
  if (isEditable && window.getSelection().toString().trim() === activeElement.value.substring(activeElement.selectionStart, activeElement.selectionEnd)) {
       // console.log("Selection is inside an editable field, ignoring.");
       return;
  }


  const selectedText = window.getSelection().toString().trim();
  const now = Date.now();

  if (
    !selectedText || // No text selected
    selectedText === lastSelection || // Same text as last time
    now - lastProcessedTime < DEBOUNCE_MS // Too soon since last processing
  ) {
    return;
  }

  // Only update if selection is significantly different (e.g., not just whitespace change)
  if (selectedText.length > 0) {
      console.log("Content script detected selection:", selectedText);
      lastSelection = selectedText;
      lastProcessedTime = now;

      // Send the selected text to the background script
      chrome.runtime.sendMessage({ action: "textSelected", text: selectedText }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("Error sending message:", chrome.runtime.lastError.message);
          // Handle potential context invalidated error if page navigates away quickly
        } else if (response && response.status === "success") {
          console.log("Background script acknowledged selection.");
        } else {
           console.warn("Background script response:", response);
        }
      });
  }
}

// Clear last selection if the user clicks without selecting new text
document.addEventListener("mousedown", () => {
    if (window.getSelection().toString() === "") {
        lastSelection = ""; // Reset if click clears selection
    }
});
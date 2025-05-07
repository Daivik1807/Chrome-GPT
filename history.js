document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("historyContainer");
  
    chrome.storage.local.get("history", (data) => {
      const history = data.history || [];
  
      if (history.length === 0) {
        container.innerHTML = "<p>No history yet.</p>";
        return;
      }
  
      history.forEach(entry => {
        const item = document.createElement("div");
        item.className = "history-item";
  
        item.innerHTML = `
          <div class="timestamp">${entry.time}</div>
          <div class="question">❓ ${entry.question}</div>
          <div class="answer">🤖 ${entry.answer}</div>
        `;
  
        container.appendChild(item);
      });
    });
  
    document.getElementById("clearBtn").addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all saved history?")) {
        chrome.storage.local.remove("history", () => {
          location.reload();
        });
      }
    });
  });

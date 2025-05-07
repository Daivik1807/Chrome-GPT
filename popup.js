// --- Configuration ---
const OLLAMA_URL = "http://localhost:11434/api/generate";
// const OLLAMA_MODEL = "deepseek-coder:1.3b";
const OLLAMA_MODEL = "deepseek-r1:7b";
const OLLAMA_OPTIONS = {
  temperature: 0.6,
  top_p: 0.9
};
const MAX_HISTORY_ITEMS = 50;

// --- Globals ---
let currentQuestion = "";
let currentAnswer = "";

// --- DOM Elements ---
const loadingElement = document.getElementById("loading");
const initialMessageElement = document.getElementById("initialMessage");
const responseAreaElement = document.getElementById("responseArea");
const historyDisplayArea = document.getElementById("historyDisplayArea");
const historyEntriesElement = document.getElementById("historyEntries");
const actionButtonsElement = document.getElementById("actionButtons");
const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const copyBtn = document.getElementById("copyBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

function showLoading(isLoading) {
  loadingElement.style.display = isLoading ? "block" : "none";
  responseAreaElement.style.display = isLoading ? "none" : "block";
  initialMessageElement.style.display = isLoading ? "none" : "none";
  actionButtonsElement.style.display = "none";
}

function displayError(message) {
  responseAreaElement.innerHTML = `<div class=\"error-message\">Error: ${message}</div>`;
  responseAreaElement.style.display = "block";
  actionButtonsElement.style.display = "none";
  console.error("Display Error:", message);
}

function displayResponse(question, answer) {
  currentQuestion = question;
  currentAnswer = answer;
  const formatted = `
    <div class=\"message-block\">
      <div class=\"message-title\">You asked:</div>
      <div class=\"message-question\">${escapeHtml(question)}</div>
    </div>
    <div class=\"message-block\">
      <div class=\"message-title\">AI says:</div>
      <div class=\"message-answer\">${escapeHtml(answer)}</div>
    </div>`;
  responseAreaElement.innerHTML = formatted;
  responseAreaElement.style.display = "block";
  initialMessageElement.style.display = "none";
  actionButtonsElement.style.display = "flex";
}

async function fetchOllamaResponse(text) {
  showLoading(true);
  currentQuestion = text;
  currentAnswer = "";
  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text,
        stream: true,
        options: OLLAMA_OPTIONS
      })
    });

    if (!res.ok) throw new Error(`Ollama request failed with status ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      console.log("📦 RAW CHUNK:", chunk);
      const lines = chunk.split("\n").filter(line => line.trim() !== "");
      for (const line of lines) {
        let json = line.trim();
        if (json.startsWith("data:")) {
          json = json.slice(5).trim();
        }

        if (json === "[DONE]") break;

        try {
          const parsed = JSON.parse(json);
          if (parsed.response) {
            fullText += parsed.response;
          } else if (parsed.message?.content) {
            fullText += parsed.message.content;
          } else if (parsed.output) {
            fullText += parsed.output;
          }
        } catch (err) {
          console.warn("⚠️ Failed to parse streamed JSON line:", line);
        }
      }

    }

    fullText = fullText.trim();
    if (!fullText) displayResponse(text, "(No response content received)");
    else {
      displayResponse(text, fullText);
      await saveToHistory(text, fullText);
    }

  } catch (err) {
    console.error("❌ Streamed Ollama Error:", err);
    displayError("Error contacting Ollama: " + err.message);
  } finally {
    showLoading(false);
  }
}

async function saveToHistory(question, answer) {
  if (!question || !answer) return;
  try {
    const data = await chrome.storage.local.get({ history: [] });
    const history = data.history || [];
    const newEntry = {
      question,
      answer,
      model: OLLAMA_MODEL,
      time: new Date().toISOString()
    };
    const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_ITEMS);
    await chrome.storage.local.set({ history: updatedHistory });
    if (historyDisplayArea.style.display !== "none") loadHistory();
  } catch (error) {
    console.error("Error saving history:", error);
  }
}

async function loadHistory() {
  try {
    const data = await chrome.storage.local.get({ history: [] });
    const history = data.history || [];
    historyEntriesElement.innerHTML = "";
    if (history.length === 0) {
      historyEntriesElement.innerHTML = "<p style='font-size: 13px; color: gray; text-align: center;'>No history saved yet.</p>";
      clearHistoryBtn.style.display = 'none';
      return;
    }
    clearHistoryBtn.style.display = 'block';
    history.forEach(entry => {
      const div = document.createElement("div");
      div.className = "history-entry";
      const timestamp = entry.time ? new Date(entry.time).toLocaleString() : 'Unknown time';
      div.innerHTML = `
        <div class=\"timestamp\" style=\"font-size:11px; color:#777; margin-bottom:4px;\">${timestamp} (${entry.model || 'Unknown Model'})</div>
        <div class=\"message-question\" style=\"font-size: 13px; margin-bottom: 5px;\">${escapeHtml(entry.question)}</div>
        <div class=\"message-answer\" style=\"font-size: 13px;\">${escapeHtml(entry.answer)}</div>
        <hr style=\"margin:10px 0; border-top: 1px solid #eee; border-bottom: none;\">
      `;
      historyEntriesElement.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading history:", error);
    historyEntriesElement.innerHTML = "<p class='error-message'>Could not load history.</p>";
    clearHistoryBtn.style.display = 'none';
  }
}

async function clearAllHistory() {
  if (confirm("Are you sure you want to clear ALL saved history? This cannot be undone.")) {
    try {
      await chrome.storage.local.remove("history");
      loadHistory();
    } catch (error) {
      console.error("Error clearing history:", error);
      alert("Could not clear history. Please try again.");
    }
  }
}

function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    console.warn("escapeHtml called with non-string value:", unsafe);
    return '';
  }
  return unsafe
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"")
    .replace(/'/g, "'");
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await chrome.storage.local.get("latestSelectedText");
    if (data && data.latestSelectedText) {
      const textToProcess = data.latestSelectedText;
      await chrome.storage.local.remove("latestSelectedText");
      fetchOllamaResponse(textToProcess);
    } else {
      initialMessageElement.style.display = "block";
      responseAreaElement.style.display = "none";
      actionButtonsElement.style.display = "none";
    }
  } catch (error) {
    displayError("Failed to initialize. Please try selecting text again.");
  }

  regenerateBtn.addEventListener("click", () => {
    if (currentQuestion) fetchOllamaResponse(currentQuestion);
  });

  copyBtn.addEventListener("click", () => {
    if (currentQuestion || currentAnswer) {
      const textToCopy = `Question:\n${currentQuestion}\n\nAnswer (${OLLAMA_MODEL}):\n${currentAnswer}`;
      navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copied!";
        setTimeout(() => { copyBtn.innerText = originalText; }, 1500);
      }).catch(err => {
        console.error('Failed to copy: ', err);
        alert("Failed to copy text.");
      });
    }
  });

  toggleHistoryBtn.addEventListener("click", () => {
    const isHidden = historyDisplayArea.style.display === "none";
    if (isHidden) {
      historyDisplayArea.style.display = "block";
      toggleHistoryBtn.innerText = "Hide History";
      loadHistory();
    } else {
      historyDisplayArea.style.display = "none";
      toggleHistoryBtn.innerText = "View History";
      historyEntriesElement.innerHTML = "";
    }
  });

  clearHistoryBtn.addEventListener("click", clearAllHistory);
});
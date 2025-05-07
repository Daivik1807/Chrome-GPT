// async function extractTextFromImage(imageData) {
//     const worker = await Tesseract.createWorker();
//     await worker.loadLanguage("eng");
//     await worker.initialize("eng");
    
//     const { data } = await worker.recognize(imageData);
//     await worker.terminate();

//     return data.text;
// }

// chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
//     if (message.action === "extract_text") {
//         let text = await extractTextFromImage(message.image);
        
//         fetch("https://api.openai.com/v1/completions", {
//             method: "POST",
//             headers: {
//                 "Authorization": "Bearer YOUR_OPENAI_API_KEY",
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 model: "gpt-3.5-turbo",
//                 messages: [{ role: "user", content: text }]
//             })
//         })
//         .then(response => response.json())
//         .then(data => {
//             chrome.runtime.sendMessage({ action: "display_response", text: data.choices[0].message.content });
//         });
//     }
// });

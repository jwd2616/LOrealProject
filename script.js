/* The URL of your deployed Cloudflare Worker (replace with your actual URL) */
const CLOUDFLARE_WORKER_URL = "https://lively-sunset-c27e.justindavis5112.workers.dev/";

/* System prompt to keep the AI focused on L’Oréal and beauty topics */
const systemPrompt = "You are a helpful assistant for L’Oréal. Only answer questions related to L’Oréal products, routines, recommendations, or beauty-related topics. If asked about anything else, politely reply: 'Sorry, I can only help with L’Oréal products, routines, recommendations, and beauty-related topics.'";

/* Store the conversation history as an array of messages */
let messages = [
  { role: "system", content: systemPrompt }
];

// Function to format markdown-like text for bold and italics
function formatMessage(content) {
  // Replace **text** with <strong>text</strong>
  content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Replace *text* with <em>text</em>
  content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
  return content;
}

// Function to add a message bubble to the chat UI
function addMessageBubble(content, sender, isLoading = false) {
  const bubble = document.createElement("div");
  bubble.className = sender === "user" ? "user-bubble" : "assistant-bubble";
  if (isLoading) {
    bubble.innerHTML = `<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>`;
  } else {
    bubble.innerHTML = formatMessage(content);
  }
  // No need to set text-align, CSS handles alignment
  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return bubble;
}

// Wait for DOM to load before selecting elements and adding event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Select chat form, input, and chat window elements
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("userInput");
  const chatContainer = document.getElementById("chatWindow");

  // System prompt for L'Oréal/beauty topics only
  const systemPrompt = "You are a helpful assistant for L’Oréal. Only answer questions related to L’Oréal products, routines, recommendations, or beauty-related topics. If asked about anything else, politely reply: 'Sorry, I can only help with L’Oréal products, routines, recommendations, and beauty-related topics.'";

  // Store conversation history
  let messages = [
    { role: "system", content: systemPrompt }
  ];

  // Format markdown-like text for bold and italics
  function formatMessage(content) {
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return content;
  }

  // Add a message bubble to the chat UI
  function addMessageBubble(content, sender, isLoading = false) {
    const bubble = document.createElement("div");
    bubble.className = sender === "user" ? "user-bubble" : "assistant-bubble";
    if (isLoading) {
      bubble.innerHTML = `<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>`;
    } else {
      bubble.innerHTML = formatMessage(content);
    }
    // No need to set text-align, CSS handles alignment
    chatContainer.appendChild(bubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return bubble;
  }

  // Fullscreen and resize controls
  const chatWindow = document.getElementById("chatWindow");
  const chatboxSection = document.querySelector(".chatbox");
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const resizeBtn = document.getElementById("resizeBtn");

  // Toggle fullscreen class on chat window and chatbox section
  fullscreenBtn.addEventListener("click", () => {
    chatWindow.classList.toggle("fullscreen");
    chatboxSection.classList.toggle("fullscreen-active");
  });

  // Toggle resized class on chat window
  resizeBtn.addEventListener("click", () => {
    chatWindow.classList.toggle("resized");
  });

  // Listen for form submission (user sends a message)
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Get user's input and clear the input box
    const userInputValue = chatInput.value.trim();
    if (!userInputValue) return;
    chatInput.value = "";

    // Add user's message to conversation history and UI
    messages.push({ role: "user", content: userInputValue });
    addMessageBubble(userInputValue, "user");

    // Show animated loading dots while waiting for the assistant's reply
    const loadingBubble = addMessageBubble("", "assistant", true);

    // Send the conversation history to the Cloudflare Worker
    try {
      const response = await fetch("https://lively-sunset-c27e.justindavis5112.workers.dev/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages })
      });
      const data = await response.json();

      // Remove the loading message
      if (loadingBubble && loadingBubble.parentNode) {
        loadingBubble.parentNode.removeChild(loadingBubble);
      }

      // Get the assistant's reply from the API response
      const assistantReply = data.choices && data.choices[0].message.content
        ? data.choices[0].message.content
        : "Sorry, I couldn't get a response. Please try again.";

      // Add assistant's reply to conversation history and UI
      messages.push({ role: "assistant", content: assistantReply });
      addMessageBubble(assistantReply, "assistant");
    } catch (error) {
      if (loadingBubble && loadingBubble.parentNode) {
        loadingBubble.parentNode.removeChild(loadingBubble);
      }
      addMessageBubble("Sorry, there was an error connecting to the assistant.", "assistant");
    }
  });
});
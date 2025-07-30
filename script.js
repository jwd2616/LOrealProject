/* The URL of your deployed Cloudflare Worker (replace with your actual URL) */
const CLOUDFLARE_WORKER_URL = "https://your-cloudflare-worker-url.workers.dev/";

/* System prompt to keep the AI focused on L’Oréal and beauty topics */
const systemPrompt = "You are a helpful assistant for L’Oréal. Only answer questions related to L’Oréal products, routines, recommendations, or beauty-related topics. Politely refuse to answer anything else.";

/* Store the conversation history as an array of messages */
let messages = [
  { role: "system", content: systemPrompt }
];

/* DOM elements */
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatContainer = document.getElementById("chat-container");
const userQuestionDisplay = document.getElementById("user-question");

/* Function to add a message bubble to the chat UI */
function addMessageBubble(content, sender) {
  // Create a div for the message bubble
  const bubble = document.createElement("div");
  bubble.className = sender === "user" ? "user-bubble" : "assistant-bubble";
  bubble.textContent = content;
  chatContainer.appendChild(bubble);
  // Scroll to the bottom so the latest message is visible
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

/* Handle form submit */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Get the user's input and clear the input box
  const userInput = chatInput.value.trim();
  if (!userInput) return;
  chatInput.value = "";

  // Display the user's question above the chat response
  userQuestionDisplay.textContent = userInput;

  // Add user's message to conversation history and UI
  messages.push({ role: "user", content: userInput });
  addMessageBubble(userInput, "user");

  // Show a loading message while waiting for the assistant's reply
  addMessageBubble("...", "assistant");

  // Send the conversation to the Cloudflare Worker
  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    const data = await response.json();

    // Remove the loading message
    const bubbles = chatContainer.getElementsByClassName("assistant-bubble");
    if (bubbles.length > 0) {
      chatContainer.removeChild(bubbles[bubbles.length - 1]);
    }

    // Get the assistant's reply from the API response
    const assistantReply = data.choices && data.choices[0].message.content
      ? data.choices[0].message.content
      : "Sorry, I couldn't get a response. Please try again.";

    // Add assistant's reply to conversation history and UI
    messages.push({ role: "assistant", content: assistantReply });
    addMessageBubble(assistantReply, "assistant");
  } catch (error) {
    // Remove the loading message
    const bubbles = chatContainer.getElementsByClassName("assistant-bubble");
    if (bubbles.length > 0) {
      chatContainer.removeChild(bubbles[bubbles.length - 1]);
    }
    addMessageBubble("Sorry, there was an error connecting to the assistant.", "assistant");
  }
});
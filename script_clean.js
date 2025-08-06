/* L'Oréal Smart Routine & Product Advisor */

/* Configuration */
const CLOUDFLARE_WORKER_URL =
  "https://lively-sunset-c27e.justindavis5112.workers.dev/";

/* System prompt to keep the AI focused on L'Oréal and beauty topics */
const systemPrompt =
  "You are a helpful assistant for L'Oréal. Only answer questions related to L'Oréal products, routines, recommendations, or beauty-related topics. If asked about anything else, politely reply: 'Sorry, I can only help with L'Oréal products, routines, recommendations, and beauty-related topics.'";

/* Global variables for managing state */
let selectedProducts = [];
let conversationHistory = [{ role: "system", content: systemPrompt }];
let allProducts = [];
let generatedRoutine = null;

/* DOM elements - will be initialized after DOM loads */
let categoryFilter,
  productsContainer,
  chatForm,
  chatWindow,
  selectedProductsList,
  generateRoutineBtn,
  userInput,
  clearAllBtn,
  chatContainer;

/* Utility Functions */

// Format markdown-like text for bold and italics
function formatMessage(content) {
  // Replace **text** with <strong>text</strong>
  content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Replace *text* with <em>text</em>
  content = content.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Replace line breaks with <br> tags
  content = content.replace(/\n/g, "<br>");
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

  chatContainer.appendChild(bubble);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return bubble;
}

// Function to restore conversation history in the UI
function restoreConversationHistory() {
  // Clear the chat container first
  chatContainer.innerHTML = "";

  // Skip the system message and display user/assistant messages
  const messagesToDisplay = conversationHistory.slice(1);

  if (messagesToDisplay.length === 0) {
    // Show welcome message if no conversation yet
    chatContainer.innerHTML = `
      <div class="welcome-message">
        <h3>Welcome to your L'Oréal Beauty Assistant!</h3>
        <p>Select products above to generate a routine, or ask me any beauty-related questions.</p>
      </div>
    `;
    return;
  }

  // Add each message as a bubble
  messagesToDisplay.forEach((message) => {
    if (message.role === "user" || message.role === "assistant") {
      addMessageBubble(
        message.content,
        message.role === "user" ? "user" : "assistant"
      );
    }
  });
}

// Function to clear conversation history (for clear all functionality)
function clearConversationHistory() {
  conversationHistory = [{ role: "system", content: systemPrompt }];
  chatContainer.innerHTML = `
    <div class="welcome-message">
      <h3>Welcome to your L'Oréal Beauty Assistant!</h3>
      <p>Select products above to generate a routine, or ask me any beauty-related questions.</p>
    </div>
  `;
  saveConversationHistory();
}

// Save conversation history to localStorage
function saveConversationHistory() {
  localStorage.setItem(
    "conversationHistory",
    JSON.stringify(conversationHistory)
  );
}

// Load conversation history from localStorage
function loadConversationHistory() {
  const saved = localStorage.getItem("conversationHistory");
  if (saved) {
    try {
      const loadedHistory = JSON.parse(saved);
      // Ensure we always have a system message
      if (loadedHistory.length > 0 && loadedHistory[0].role === "system") {
        conversationHistory = loadedHistory;
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
      conversationHistory = [{ role: "system", content: systemPrompt }];
    }
  }
}

/* Product Management Functions */

// Load product data from JSON file
async function loadProducts() {
  if (allProducts.length === 0) {
    try {
      const response = await fetch("products.json");
      const data = await response.json();
      allProducts = data.products;
    } catch (error) {
      console.error("Error loading products:", error);
      productsContainer.innerHTML =
        '<div class="error-message">Error loading products. Please refresh the page.</div>';
    }
  }
  return allProducts;
}

// Save selected products to localStorage
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

// Load selected products from localStorage
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    try {
      selectedProducts = JSON.parse(saved);
    } catch (error) {
      console.error("Error loading saved products:", error);
      selectedProducts = [];
    }
  }
}

// Create HTML for displaying product cards
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML =
      '<div class="no-products">No products found in this category.</div>';
    return;
  }

  productsContainer.innerHTML = products
    .map(
      (product) => `
      <div class="product-card ${
        selectedProducts.some((p) => p.id === product.id) ? "selected" : ""
      }" 
           data-product-id="${product.id}">
        <div class="product-card-content">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p class="brand">${product.brand}</p>
            <button class="description-toggle" data-product-id="${product.id}">
              <i class="fa-solid fa-info-circle"></i> View Details
            </button>
          </div>
        </div>
        <div class="product-description" data-product-id="${
          product.id
        }" style="display: none;">
          <p>${product.description}</p>
        </div>
      </div>
    `
    )
    .join("");

  // Add click handlers to product cards for selection
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // Don't select if clicking the description button
      if (e.target.closest(".description-toggle")) return;

      const productId = parseInt(card.dataset.productId);
      toggleProductSelection(productId);
    });
  });

  // Add click handlers to description toggle buttons
  document.querySelectorAll(".description-toggle").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const productId = button.dataset.productId;
      toggleProductDescription(productId);
    });
  });
}

// Toggle product selection
function toggleProductSelection(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    // Remove from selection
    selectedProducts.splice(existingIndex, 1);
  } else {
    // Add to selection
    selectedProducts.push(product);
  }

  // Update visual state
  const card = document.querySelector(`[data-product-id="${productId}"]`);
  if (card) {
    card.classList.toggle("selected");
  }

  // Save to localStorage and update display
  saveSelectedProducts();
  updateSelectedProductsList();
}

// Toggle product description display
function toggleProductDescription(productId) {
  const descriptionDiv = document.querySelector(
    `.product-description[data-product-id="${productId}"]`
  );
  const button = document.querySelector(
    `.description-toggle[data-product-id="${productId}"]`
  );

  if (descriptionDiv && button) {
    if (descriptionDiv.style.display === "none") {
      descriptionDiv.style.display = "block";
      button.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Details';
    } else {
      descriptionDiv.style.display = "none";
      button.innerHTML = '<i class="fa-solid fa-info-circle"></i> View Details';
    }
  }
}

// Update the selected products list display
function updateSelectedProductsList() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="no-products">No products selected yet</p>';
    generateRoutineBtn.disabled = true;
    clearAllBtn.style.display = "none";
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item" data-product-id="${product.id}">
        <img src="${product.image}" alt="${product.name}" class="selected-product-image" loading="lazy">
        <div class="selected-product-info">
          <h4>${product.name}</h4>
          <p>${product.brand}</p>
        </div>
        <button class="remove-product" data-product-id="${product.id}" title="Remove product">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `
    )
    .join("");

  // Add remove handlers
  document.querySelectorAll(".remove-product").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = parseInt(button.dataset.productId);
      removeProductFromSelection(productId);
    });
  });

  generateRoutineBtn.disabled = false;
  clearAllBtn.style.display = "inline-block";
}

// Remove product from selection
function removeProductFromSelection(productId) {
  const index = selectedProducts.findIndex((p) => p.id === productId);
  if (index > -1) {
    selectedProducts.splice(index, 1);
    saveSelectedProducts();
    updateSelectedProductsList();

    // Update visual state if product card is visible
    const card = document.querySelector(`[data-product-id="${productId}"]`);
    if (card) {
      card.classList.remove("selected");
    }
  }
}

/* Chat Functions */

// Send message to OpenAI via Cloudflare Worker
async function sendMessageToAPI(messages) {
  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        model: "gpt-4o",
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices && data.choices[0].message.content
      ? data.choices[0].message.content
      : "Sorry, I couldn't get a response. Please try again.";
  } catch (error) {
    console.error("Error calling API:", error);
    return "Sorry, there was an error connecting to the assistant. Please try again.";
  }
}

// Handle chat form submission
async function handleChatSubmission(userMessage) {
  if (!userMessage.trim()) return;

  // Add user's message to conversation history and UI
  conversationHistory.push({ role: "user", content: userMessage });
  addMessageBubble(userMessage, "user");
  saveConversationHistory();

  // Show animated loading dots while waiting for the assistant's reply
  const loadingBubble = addMessageBubble("", "assistant", true);

  // Get response from API
  const assistantReply = await sendMessageToAPI(conversationHistory);

  // Remove the loading message
  if (loadingBubble && loadingBubble.parentNode) {
    loadingBubble.parentNode.removeChild(loadingBubble);
  }

  // Add assistant's reply to conversation history and UI
  conversationHistory.push({ role: "assistant", content: assistantReply });
  addMessageBubble(assistantReply, "assistant");
  saveConversationHistory();
}

// Generate personalized routine
async function generateRoutine() {
  if (selectedProducts.length === 0) {
    addMessageBubble(
      "Please select some products first to generate a routine!",
      "assistant"
    );
    return;
  }

  // Add user's request to conversation
  const userRequest = `Generate a personalized routine using: ${selectedProducts
    .map((p) => p.name)
    .join(", ")}`;
  conversationHistory.push({ role: "user", content: userRequest });
  addMessageBubble(userRequest, "user");
  saveConversationHistory();

  // Show loading bubble
  const loadingBubble = addMessageBubble("", "assistant", true);

  try {
    // Prepare the products data
    const productsData = selectedProducts.map((product) => ({
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
    }));

    // Create routine generation messages (separate from main conversation)
    const routineMessages = [
      {
        role: "system",
        content:
          "You are a professional beauty and skincare advisor. Create personalized routines based on the products provided. Give step-by-step instructions for morning and evening routines when applicable. Be specific about the order of application and any important tips. Format your response clearly with sections for Morning and Evening routines.",
      },
      {
        role: "user",
        content: `Please create a personalized routine using these products: ${JSON.stringify(
          productsData,
          null,
          2
        )}`,
      },
    ];

    // Get routine from API
    const routineResponse = await sendMessageToAPI(routineMessages);
    generatedRoutine = routineResponse;

    // Remove loading bubble
    if (loadingBubble && loadingBubble.parentNode) {
      loadingBubble.parentNode.removeChild(loadingBubble);
    }

    // Add routine response to conversation history and display
    conversationHistory.push({ role: "assistant", content: routineResponse });
    addMessageBubble(routineResponse, "assistant");
    saveConversationHistory();
  } catch (error) {
    console.error("Error generating routine:", error);

    // Remove loading bubble
    if (loadingBubble && loadingBubble.parentNode) {
      loadingBubble.parentNode.removeChild(loadingBubble);
    }

    const errorMessage =
      "Sorry, there was an error generating your routine. Please try again.";
    conversationHistory.push({ role: "assistant", content: errorMessage });
    addMessageBubble(errorMessage, "assistant");
    saveConversationHistory();
  }
}

/* Event Listeners Setup */

// Wait for DOM to load before setting up event listeners
document.addEventListener("DOMContentLoaded", () => {
  // Initialize DOM element references
  categoryFilter = document.getElementById("categoryFilter");
  productsContainer = document.getElementById("productsContainer");
  chatForm = document.getElementById("chatForm");
  chatWindow = document.getElementById("chatWindow");
  chatContainer = chatWindow; // For backward compatibility
  selectedProductsList = document.getElementById("selectedProductsList");
  generateRoutineBtn = document.getElementById("generateRoutine");
  userInput = document.getElementById("userInput");
  clearAllBtn = document.getElementById("clearAllBtn");

  // Show initial placeholder for products
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      <i class="fa-solid fa-arrow-up"></i>
      Select a category above to view products
    </div>
  `;

  // Load saved data and conversation history
  loadSelectedProducts();
  loadConversationHistory();
  updateSelectedProductsList();

  // Initialize chat with conversation history or welcome message
  restoreConversationHistory();

  // Set up fullscreen and resize controls
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  const resizeBtn = document.getElementById("resizeBtn");
  const chatboxSection = document.querySelector(".chatbox");

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", () => {
      const isFullscreen = chatWindow.classList.contains("fullscreen");

      if (isFullscreen) {
        // Exit fullscreen
        chatWindow.classList.remove("fullscreen");
        chatboxSection.classList.remove("fullscreen-active");
        document.body.classList.remove("fullscreen-active");
        fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i>';
        fullscreenBtn.title = "Fullscreen";
      } else {
        // Enter fullscreen
        chatWindow.classList.add("fullscreen");
        chatboxSection.classList.add("fullscreen-active");
        document.body.classList.add("fullscreen-active");
        fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i>';
        fullscreenBtn.title = "Exit Fullscreen";
      }
    });
  }

  if (resizeBtn) {
    resizeBtn.addEventListener("click", () => {
      const isResized = chatWindow.classList.contains("resized");

      if (isResized) {
        // Make smaller
        chatWindow.classList.remove("resized");
        resizeBtn.innerHTML = '<i class="fa-solid fa-expand-arrows-alt"></i>';
        resizeBtn.title = "Resize Chat";
      } else {
        // Make larger
        chatWindow.classList.add("resized");
        resizeBtn.innerHTML = '<i class="fa-solid fa-compress-arrows-alt"></i>';
        resizeBtn.title = "Make Smaller";
      }
    });
  }

  // Category filter event listener
  if (categoryFilter) {
    categoryFilter.addEventListener("change", async (e) => {
      const products = await loadProducts();
      const selectedCategory = e.target.value;

      if (!selectedCategory) {
        productsContainer.innerHTML = `
          <div class="placeholder-message">
            <i class="fa-solid fa-arrow-up"></i>
            Select a category above to view products
          </div>
        `;
        return;
      }

      // Filter products by selected category
      const filteredProducts = products.filter(
        (product) => product.category === selectedCategory
      );

      displayProducts(filteredProducts);
    });
  }

  // Generate Routine button event listener
  if (generateRoutineBtn) {
    generateRoutineBtn.addEventListener("click", generateRoutine);
  }

  // Clear all selections button event listener
  if (clearAllBtn) {
    clearAllBtn.addEventListener("click", () => {
      if (
        confirm(
          "Are you sure you want to clear all selected products and conversation history?"
        )
      ) {
        selectedProducts = [];
        saveSelectedProducts();
        updateSelectedProductsList();

        // Update visual state of all product cards
        document.querySelectorAll(".product-card.selected").forEach((card) => {
          card.classList.remove("selected");
        });

        // Clear conversation history
        clearConversationHistory();
        generatedRoutine = null;
      }
    });
  }

  // Chat form submission event listener
  if (chatForm) {
    chatForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const userMessage = userInput.value.trim();
      if (!userMessage) return;

      // Clear input
      userInput.value = "";

      // Handle the chat message
      await handleChatSubmission(userMessage);
    });
  }

  // Load products initially (for caching)
  loadProducts();
});

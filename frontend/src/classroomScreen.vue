<template>
  <div class="app-container">
    <!-- Main Content: AI Chat -->
    <div class="main-content">
      <div class="content-header">
        <h1>Classroom Chat</h1>
        <button class="back-btn" @click="goBack">Back to Classrooms</button>
      </div>

      <div class="chat-container">
        <h2 class="chat-header">Conversation with AI</h2>
        <div class="chat-messages" ref="chatMessages">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            class="chat-message"
            :class="{
              'user-message': msg.type === 'user',
              'ai-message': msg.type === 'ai',
            }"
          >
            <div
              class="message-content"
              v-html="renderMessageContent(msg.content)"
            ></div>
            <div v-if="msg.images && msg.images.length" class="message-images">
              <img
                v-for="(img, imgIndex) in msg.images"
                :key="imgIndex"
                :src="img"
                alt="AI response image"
                class="response-image"
              />
            </div>
          </div>
          <div v-if="isGenerating" class="generating-message">
            <span class="spinner"></span>
            Generating AI response...
          </div>
        </div>
      </div>

      <div class="persistent-input">
        <textarea
          v-model="currentMessage"
          placeholder="Ask AI or start a conversation..."
          @keydown.enter.prevent="sendMessage"
          @input="resizeTextarea"
          ref="textarea"
        ></textarea>
        <button class="send-btn" @click="sendMessage">Send</button>
      </div>
    </div>

    <!-- Right Sidebar: Flashcards Button -->
    <div class="flashcards-sidebar">
      <button class="flashcards-btn" @click="handleFlashcardsClick">
        <div class="flashcards-btn-content">
          <span class="flashcards-text">Flashcards</span>
          <div class="flashcards-effect">
            <span class="effect-card card-1"></span>
            <span class="effect-card card-2"></span>
            <span class="effect-card card-3"></span>
            <span class="effect-glow"></span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import axios from "axios";
import katex from "katex";
import MarkdownIt from "markdown-it";

const BASE_URL = "http://localhost:8080";

const username = ref("Anonymous");
const currentMessage = ref("");
const messages = ref([]);
const isGenerating = ref(false);
const chatMessages = ref(null);
const textarea = ref(null);
const router = useRouter();
const route = useRoute();

const classroomId = computed(() => route.params.classroomId);

// Initialize markdown-it
const md = new MarkdownIt({
  html: false, // Disable raw HTML for security
  linkify: true, // Convert URLs to links
  breaks: true, // Convert newlines to <br>
});

// Render message content with LaTeX and Markdown
const renderMessageContent = (content) => {
  if (!content) {
    console.log("Empty content received");
    return "";
  }

  console.log("Rendering content:", content);

  try {
    // Escape HTML to prevent XSS
    const escapeHtml = (text) =>
      text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    // Regular expression to detect LaTeX-like patterns
    // Matches common LaTeX commands (e.g., \frac, \sqrt) or math expressions
    const latexPattern =
      /\\(?:[a-zA-Z]+)\{.*?\}|\^[0-9]+|_[0-9]+|[a-zA-Z]+\^\{[0-9]+\}|[0-9]+\/[0-9]+/g;

    // Split content into parts based on potential LaTeX expressions
    const parts = content.split(latexPattern);
    const matches = content.match(latexPattern) || [];
    let processedParts = [];
    let matchIndex = 0;

    // Process each part
    content.replace(latexPattern, (match, offset) => {
      // Add text before the match
      if (offset > 0) {
        const before = content.slice(0, offset);
        processedParts.push(md.render(before));
        content = content.slice(offset);
      }

      // Process LaTeX match
      try {
        const rendered = katex.renderToString(match, {
          throwOnError: false,
          displayMode: false,
          output: "html",
        });
        console.log("LaTeX rendered:", rendered);
        processedParts.push(rendered);
      } catch (err) {
        console.error("KaTeX error for:", match, err);
        processedParts.push(
          `<span class="latex-error">Invalid LaTeX: ${escapeHtml(match)}</span>`
        );
      }

      // Update remaining content
      content = content.slice(match.length);
      matchIndex++;
    });

    // Add remaining content
    if (content) {
      processedParts.push(md.render(content));
    }

    const result = processedParts.join("");
    console.log("Final rendered content:", result);
    return result;
  } catch (err) {
    console.error("Rendering error:", err);
    const fallback = md.render(content);
    console.log("Fallback to Markdown:", fallback);
    return fallback;
  }
};

// Send message to AI
const sendMessage = async () => {
  if (!currentMessage.value.trim()) {
    console.log("Empty message ignored");
    return;
  }

  console.log("Sending user message:", currentMessage.value);

  // Add user message
  messages.value.push({
    type: "user",
    content: currentMessage.value,
    timestamp: new Date().toISOString(),
  });

  isGenerating.value = true;
  const userMessage = currentMessage.value;
  currentMessage.value = "";

  if (textarea.value) {
    textarea.value.style.height = "48px";
  }

  // Scroll to bottom
  await nextTick();
  if (chatMessages.value) {
    chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
  }

  try {
    const response = await axios.post(`${BASE_URL}/ask_ai/`, {
      username: username.value,
      classID: Number(classroomId.value),
      prompt: userMessage,
    });
    console.log("AI response received:", response.data);

    // Check if response.data.response is an array
    if (Array.isArray(response.data.response)) {
      // Navigate to flashcards view
      router
        .push({
          name: "Flashcards",
          params: { classroomId: classroomId.value },
          query: { data: JSON.stringify(response.data.response) }, // Optionally pass the array as a query param
        })
        .catch((err) => {
          console.error("Navigation error:", err);
        });
    } else {
      // Add AI message for non-array responses
      messages.value.push({
        type: "ai",
        content: response.data.response || "No response from AI.",
        images: response.data.images || [],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("AI chat error:", err);
    messages.value.push({
      type: "ai",
      content: "Error: Could not get AI response.",
      images: [],
      timestamp: new Date().toISOString(),
    });
  } finally {
    isGenerating.value = false;
    await nextTick();
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    }
  }
};

// Resize textarea
const resizeTextarea = () => {
  if (textarea.value) {
    textarea.value.style.height = "auto";
    textarea.value.style.height = `${Math.min(
      textarea.value.scrollHeight,
      120
    )}px`;
  }
};

// Navigation
const goBack = () => {
  router.push({ name: "Classrooms" }).catch((err) => {
    console.error("Navigation error:", err);
  });
};

const handleFlashcardsClick = async () => {
  const prompt = "Generate me flashcards please";

  // Add user message
  messages.value.push({
    type: "user",
    content: prompt,
    timestamp: new Date().toISOString(),
  });

  isGenerating.value = true;
  currentMessage.value = "";

  // Reset textarea height
  if (textarea.value) {
    textarea.value.style.height = "48px";
  }

  // Scroll to bottom
  await nextTick();
  if (chatMessages.value) {
    chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
  }

  try {
    const response = await axios.post(`${BASE_URL}/ask_ai/`, {
      username: username.value,
      classID: Number(classroomId.value),
      prompt: prompt,
    });

    console.log("AI response received:", response.data);

    // Check if response.data.response is an array
    if (Array.isArray(response.data.response)) {
      // Navigate to flashcards view
      router
        .push({
          name: "Flashcards",
          params: { classroomId: classroomId.value },
          query: { data: JSON.stringify(response.data.response) },
        })
        .catch((err) => {
          console.error("Navigation error:", err);
        });
    } else {
      // Add AI message for non-array responses
      messages.value.push({
        type: "ai",
        content: response.data.response || "No response from AI.",
        images: response.data.images || [],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("AI chat error:", err);
    messages.value.push({
      type: "ai",
      content: "Error: Could not get AI response.",
      images: [],
      timestamp: new Date().toISOString(),
    });
  } finally {
    isGenerating.value = false;
    await nextTick();
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight;
    }
  }
};

// Initialize
onMounted(() => {
  if (textarea.value) {
    textarea.value.style.height = "48px";
  }
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", sans-serif;
}

body {
  margin: 0;
  padding: 0;
  width: 100vw;
  overflow-x: hidden;
  background: #1e1e2f;
}

.app-container {
  display: grid;
  grid-template-columns: 1fr 200px;
  width: 100vw;
  height: 100vh;
  background: #1e1e2f;
}

.chat-history-sidebar {
  background: #2a2a3b;
  border-right: 1px solid #3b4a59;
  padding: 1.5rem;
  overflow-y: auto;
}

.chat-history-sidebar h3 {
  font-size: 24px;
  font-weight: 600;
  color: #26c6da;
  margin-bottom: 1rem;
}

.new-conversation-btn {
  width: 100%;
  padding: 0.5rem;
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 1rem;
  transition: background 0.2s, border 0.2s;
}

.new-conversation-btn:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  color: #ecf0f1;
  font-size: 16px;
  font-weight: 400;
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: background 0.2s;
}

.history-item:hover {
  background: #3b4a59;
}

.history-item.active {
  background: #26c6da;
  color: #ffffff;
}

.history-title {
  flex: 1;
  cursor: pointer;
}

.delete-btn {
  background: none;
  border: none;
  color: #95a5a6;
  font-size: 14px;
  cursor: pointer;
  padding: 0 0.5rem;
}

.delete-btn:hover {
  color: #e74c3c;
}

.no-history {
  color: #95a5a6;
  font-size: 14px;
  font-weight: 400;
  text-align: center;
  margin-top: 1rem;
}

.main-content {
  display: flex;
  flex-direction: column;
  padding: 2rem;
  background: #1e1e2f;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  background: #2c3e50;
  padding: 1rem;
  border-radius: 8px;
}

.content-header h1 {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.back-btn {
  padding: 0.6rem 1.5rem;
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.back-btn:hover {
  background: #1aaebf;
  border-color: #159ba9;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.classroom-info {
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 1.5rem;
  flex: 1;
}

.classroom-info h2 {
  font-size: 32px;
  font-weight: 600;
  color: #ecf0f1;
  margin-bottom: 1rem;
}

.classroom-info h3 {
  font-size: 24px;
  font-weight: 600;
  color: #26c6da;
  margin-bottom: 0.5rem;
}

.classroom-info p {
  color: #ecf0f1;
  font-size: 16px;
  font-weight: 400;
  margin-bottom: 0.5rem;
}

.chat-container {
  width: 100%;
  max-width: 800px;
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  flex: 1;
  align-self: center;
}

.chat-header {
  font-size: 32px;
  font-weight: 600;
  color: #ecf0f1;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #3b4a59;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.chat-message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 8px;
  max-width: 80%;
  word-break: break-word;
  font-size: 16px;
  font-weight: 400;
}

.user-message {
  background: #26c6da;
  color: #ffffff;
  margin-left: auto;
  text-align: right;
}

.ai-message {
  background: #3b4a59;
  color: #ecf0f1;
  margin-right: auto;
}

.message-content {
  line-height: 1.6;
}

.response-image {
  max-width: 200px;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid #3b4a59;
}

.generating-message {
  display: flex;
  align-items: center;
  color: #95a5a6;
  font-size: 14px;
  font-weight: 400;
  margin-bottom: 1rem;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #26c6da;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.chat-controls {
  padding: 1rem;
  border-top: 1px solid #3b4a59;
  text-align: right;
}

.exit-btn {
  padding: 0.5rem 1rem;
  background: #3b4a59;
  color: #ecf0f1;
  border: 1px solid #5e6e7e;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background 0.2s, border 0.2s;
}

.exit-btn:hover {
  background: #5e6e7e;
  border: 1px solid #7f8c8d;
}

.persistent-input {
  display: flex;
  padding: 1rem;
  gap: 0.5rem;
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  margin-top: 1rem;
}

.persistent-input textarea {
  flex: 1;
  padding: 0.8rem;
  border: 1px solid #5e6e7e;
  background: #1e1e2f;
  color: #ecf0f1;
  border-radius: 8px;
  resize: none;
  font-size: 16px;
  line-height: 1.4;
  height: 48px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #26c6da transparent;
}

.persistent-input textarea:focus {
  outline: none;
  border: 2px solid #26c6da;
}

.persistent-input textarea::placeholder {
  color: #95a5a6;
  font-size: 0.9rem;
}

.persistent-input .send-btn {
  padding: 0.5rem 1.5rem;
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s, border 0.2s;
}

.persistent-input .send-btn:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
}

.flashcards-sidebar {
  background: #2a2a3b;
  border-left: 1px solid #3b4a59;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem;
}

.flashcards-btn {
  background: #26c6da;
  border: 1px solid #1aaebf;
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  width: 100%;
  height: 220px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  transition: background 0.2s, border 0.2s, box-shadow 0.3s ease;
}

.flashcards-btn:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.flashcards-btn-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #ffffff;
  z-index: 2;
}

.flashcards-text {
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.5px;
  margin-bottom: 4rem;
}

.flashcards-effect {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.effect-card {
  position: absolute;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  border: 1px solid #ecf0f1;
}

.card-1 {
  width: 70px;
  height: 90px;
  z-index: 3;
  animation: greyWhiteGrey 3s infinite;
  background-color: #a9a9a9;
}

.card-2 {
  width: 60px;
  height: 80px;
  z-index: 2;
  transform: translateX(-35px);
  animation: greyWhiteGrey 3s infinite;
  background-color: #a9a9a9;
}

.card-3 {
  width: 60px;
  height: 80px;
  z-index: 1;
  transform: translateX(35px);
  animation: greyWhiteGrey 3s infinite;
  background-color: #a9a9a9;
}

@keyframes greyWhiteGrey {
  0% {
    background-color: #a9a9a9;
  }
  50% {
    background-color: #c4c4c4;
  }
  100% {
    background-color: #a9a9a9;
  }
}

.flashcards-btn:hover .card-1 {
  animation: card-float-1 4.5s ease-in-out infinite;
}
.flashcards-btn:hover .card-2 {
  animation: card-float-2 4s ease-in-out infinite;
}
.flashcards-btn:hover .card-3 {
  animation: card-float-3 4.2s ease-in-out infinite;
}

.effect-glow {
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(52, 152, 219, 0.5), transparent);
  border-radius: 50%;
  position: absolute;
  bottom: -60px;
  opacity: 0.7;
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes card-float-1 {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

@keyframes card-float-2 {
  0%,
  100% {
    transform: translateX(-35px) translateY(0);
  }
  50% {
    transform: translateX(-35px) translateY(-10px);
  }
}

@keyframes card-float-3 {
  0%,
  100% {
    transform: translateX(35px) translateY(0);
  }
  50% {
    transform: translateX(35px) translateY(-12px);
  }
}

@keyframes glow-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.4;
  }
}

/* Responsive styles */
@media (max-width: 1024px) {
  .app-container {
    grid-template-columns: 1fr 150px;
  }
  .chat-container {
    max-width: 600px;
  }
  .flashcards-btn {
    height: 180px;
  }
  .flashcards-text {
    margin-bottom: 3rem;
  }
  .effect-card.card-1 {
    width: 60px;
    height: 80px;
  }
  .effect-card.card-2,
  .effect-card.card-3 {
    width: 50px;
    height: 70px;
    transform: translateX(-30px);
  }
  .effect-card.card-3 {
    transform: translateX(30px);
  }
}

@media (max-width: 768px) {
  .app-container {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  .flashcards-sidebar {
    border-left: none;
    border-top: 1px solid #ecf0f1;
  }
  .flashcards-btn {
    height: 150px;
  }
  .flashcards-text {
    font-size: 20px;
    margin-bottom: 2.5rem;
  }
  .effect-card.card-1 {
    width: 50px;
    height: 70px;
  }
  .effect-card.card-2,
  .effect-card.card-3 {
    width: 40px;
    height: 60px;
    transform: translateX(-25px);
  }
  .effect-card.card-3 {
    transform: translateX(25px);
  }
  .effect-glow {
    width: 100px;
    height: 100px;
    bottom: -50px;
  }
  .persistent-input {
    margin-top: 0.5rem;
  }
  .persistent-input textarea {
    font-size: 14px;
  }
}
</style>

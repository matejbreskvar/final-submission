<template>
  <div class="flashcards-container">
    <div class="flashcards-header">
      <h1>Flashcards</h1>
      <button class="back-btn" @click="goBack">Back to Classroom</button>
    </div>
    <div class="flashcards-content">
      <div v-if="isLoading" class="loading">Loading flashcards...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="flashcards.length === 0" class="no-flashcards">
        No flashcards available.
      </div>
      <div v-else>
        <div class="card-counter">
          Card {{ currentIndex + 1 }} of {{ flashcards.length }}
        </div>

        <div class="card-area">
          <div
            class="card-wrapper"
            :class="{ flipped: showAnswer, highlight: isHighlighted }"
            @click="flipCard"
          >
            <div class="card-inner">
              <div class="card-front">
                <h2>Question</h2>
                <div class="card-text">
                  {{ flashcards[currentIndex].question }}
                </div>
              </div>
              <div class="card-back">
                <h2>Answer</h2>
                <div class="card-text">
                  {{ flashcards[currentIndex].answer }}
                </div>
              </div>
            </div>
          </div>

          <div class="card-indicators">
            <span
              v-for="(card, index) in visibleIndicators"
              :key="index + indicatorOffset"
              :class="{ active: index + indicatorOffset === currentIndex }"
              @click="goToCard(index + indicatorOffset)"
            ></span>
          </div>
        </div>

        <div class="card-controls">
          <button
            class="nav-btn"
            @click="prevCard"
            :disabled="currentIndex === 0"
          >
            Previous
          </button>
          <button class="nav-btn flip-btn" @click="flipCard">
            {{ showAnswer ? "Show Question" : "Show Answer" }}
          </button>
          <button
            class="nav-btn"
            @click="nextCard"
            :disabled="currentIndex === flashcards.length - 1"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "./stores/user";
import axios from "axios";

const userStore = useUserStore();
const username = userStore.username; // Access global username

const router = useRouter();
const route = useRoute();
const classroomId = computed(() => route.params.classroomId); // Get classroomId

const BASE_URL = "http://localhost:8080";

// Reactive state for flashcards, loading, and error
const flashcards = ref([]);
const isLoading = ref(false);
const error = ref(null);
const currentIndex = ref(0);
const showAnswer = ref(false);
const isHighlighted = ref(false);
const lastDirection = ref(null);

// Load flashcards from query parameter or fetch from API
const loadFlashcards = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Check for query parameter data
    const queryData = route.query.data;
    if (queryData) {
      try {
        const parsedData = JSON.parse(queryData);
        if (Array.isArray(parsedData)) {
          flashcards.value = parsedData.map((item) => ({
            question: item.question || item.front || "",
            answer: item.answer || item.back || "",
          }));
          console.log("Flashcards loaded from query:", flashcards.value);
          return; // Exit if query data is successfully loaded
        }
      } catch (parseErr) {
        console.error("Failed to parse query data:", parseErr);
        error.value = "Invalid flashcard data provided.";
      }
    }

    // Fallback to fetching from API
    const response = await axios.get(
      `${BASE_URL}/flashcards?classroomId=${classroomId.value}`
    );
    flashcards.value = response.data.map((item) => ({
      question: item.question || item.front || "",
      answer: item.answer || item.back || "",
    }));
    console.log("Flashcards fetched from API:", flashcards.value);
  } catch (err) {
    error.value = "Failed to load flashcards. Please try again.";
    console.error("Flashcard load error:", err);
    flashcards.value = []; // Ensure flashcards is empty on error
  } finally {
    // Reset currentIndex if necessary
    if (flashcards.value.length === 0) {
      currentIndex.value = 0;
    } else if (currentIndex.value >= flashcards.value.length) {
      currentIndex.value = flashcards.value.length - 1;
    }
    isLoading.value = false;
  }
};

// Call loadFlashcards on mount
onMounted(() => {
  loadFlashcards();
});

// Compute visible indicators (7 dots, active dot progresses)
const maxVisibleDots = 7;
const indicatorOffset = computed(() => {
  if (flashcards.value.length <= maxVisibleDots) return 0;
  const activePos = Math.min(currentIndex.value, maxVisibleDots - 1);
  if (currentIndex.value < maxVisibleDots - 1) return 0;
  if (currentIndex.value >= flashcards.value.length - 1) {
    return flashcards.value.length - maxVisibleDots;
  }
  return Math.min(
    currentIndex.value - activePos,
    flashcards.value.length - maxVisibleDots
  );
});

const visibleIndicators = computed(() => {
  const count = Math.min(flashcards.value.length, maxVisibleDots);
  return Array.from({ length: count });
});

// Flip card to show question or answer
const flipCard = () => {
  if (flashcards.value.length > 0) {
    showAnswer.value = !showAnswer.value;
  }
};

// Navigate to specific card
const goToCard = (index) => {
  if (flashcards.value.length > 0) {
    lastDirection.value = index > currentIndex.value ? "next" : "prev";
    currentIndex.value = index;
    showAnswer.value = false;
    triggerHighlight();
  }
};

// Navigate to previous card
const prevCard = () => {
  if (currentIndex.value > 0) {
    lastDirection.value = "prev";
    currentIndex.value--;
    showAnswer.value = false;
    triggerHighlight();
  }
};

// Navigate to next card
const nextCard = () => {
  if (currentIndex.value < flashcards.value.length - 1) {
    lastDirection.value = "next";
    currentIndex.value++;
    showAnswer.value = false;
    triggerHighlight();
  }
};

// Trigger highlight animation
const triggerHighlight = () => {
  isHighlighted.value = true;
  setTimeout(() => {
    isHighlighted.value = false;
  }, 400);
};

// Return to classroom screen
const goBack = () => {
  router
    .push({
      name: "Classroom",
      params: { classroomId: classroomId.value },
    })
    .catch((err) => {
      console.error("Navigation error:", err);
    });
};

// Keyboard navigation
const handleKeyDown = (e) => {
  if (flashcards.value.length === 0) return;
  switch (e.key) {
    case "ArrowLeft":
      prevCard();
      break;
    case "ArrowRight":
      nextCard();
      break;
    case " ":
    case "Enter":
      flipCard();
      break;
  }
};

// Add keyboard event listener
window.addEventListener("keydown", handleKeyDown);

// Cleanup event listener when component unmounts
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", sans-serif;
}

.flashcards-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1e1e2f;
  padding: 2rem;
}

.flashcards-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: #2c3e50;
  padding: 1rem;
  border-radius: 8px;
}

.flashcards-header h1 {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
}

.back-btn:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
  transform: scale(1.05);
}

.flashcards-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.card-counter {
  font-size: 14px;
  font-weight: 400;
  color: #95a5a6;
  margin-bottom: 1rem;
}

.card-area {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-wrapper {
  perspective: 1000px;
  width: 100%;
  max-width: 500px;
  height: 300px;
  cursor: pointer;
  position: relative;
  z-index: 1;
  margin-bottom: 1.5rem;
}

.card-wrapper.highlight .card-inner {
  background: #2a2a3b;
  border: 2px solid #26c6da;
  transform: scale(1.05);
  transition: background 0.4s ease, border 0.4s ease, transform 0.4s ease;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  border-radius: 12px;
}

.card-wrapper.flipped .card-inner {
  transform: rotateY(180deg);
}

.card-front,
.card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  text-align: center;
  background: #2a2a3b;
  color: #ecf0f1;
}

.card-back {
  transform: rotateY(180deg);
}

.card-front h2,
.card-back h2 {
  font-size: 32px;
  font-weight: 600;
  color: #26c6da;
  margin-bottom: 1.5rem;
  margin-top: 0;
}

.card-text {
  font-size: 16px;
  font-weight: 400;
  color: #ecf0f1;
  line-height: 1.6;
  max-height: 180px;
  overflow-y: auto;
  width: 100%;
  padding: 0 0.5rem;
}

.card-indicators {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.card-indicators span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #5e6e7e;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.card-indicators span.active {
  background-color: #26c6da;
}

.card-indicators span:hover {
  background-color: #1aaebf;
}

.card-controls {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  z-index: 2;
  position: relative;
  flex-wrap: wrap;
  justify-content: center;
}

.nav-btn {
  padding: 0.6rem 1.5rem;
  background: #3b4a59;
  color: #ecf0f1;
  border: 1px solid #5e6e7e;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
  min-width: 100px;
}

.nav-btn:hover {
  background: #5e6e7e;
  border: 1px solid #7f8c8d;
  transform: scale(1.05);
}

.nav-btn:disabled {
  background: #5e6e7e;
  border: 1px solid #5e6e7e;
  cursor: not-allowed;
  transform: none;
}

.flip-btn {
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
}

.flip-btn:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
  transform: scale(1.05);
}

.loading,
.error,
.no-flashcards {
  text-align: center;
  font-size: 18px;
  color: #ecf0f1;
  margin-top: 2rem;
}

.error {
  color: #e74c3c;
}

.no-flashcards {
  color: #7f8c8d;
}

@media (max-width: 1024px) {
  .card-area {
    max-width: 450px;
  }

  .card-wrapper {
    max-width: 450px;
    height: 280px;
  }
}

@media (max-width: 768px) {
  .flashcards-container {
    padding: 1.5rem;
  }

  .flashcards-header {
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .flashcards-header h1 {
    font-size: 32px;
  }

  .card-area {
    max-width: 350px;
  }

  .card-wrapper {
    max-width: 350px;
    height: 250px;
  }

  .card-front h2,
  .card-back h2 {
    font-size: 24px;
  }

  .card-text {
    font-size: 14px;
  }

  .card-controls {
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .nav-btn {
    padding: 0.5rem 1.25rem;
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .card-area {
    max-width: 300px;
  }

  .card-wrapper {
    max-width: 300px;
    height: 220px;
  }

  .card-front,
  .card-back {
    padding: 1.5rem;
  }

  .card-text {
    font-size: 12px;
  }

  .card-controls {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
    margin-top: 1rem;
  }

  .nav-btn {
    width: 100%;
    padding: 0.5rem 1rem;
    font-size: 12px;
  }
}
</style>
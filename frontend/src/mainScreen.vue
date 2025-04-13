<template>
  <div class="app-container">
    <!-- Full-width Top Navigation Bar -->
    <nav class="top-navbar">
      <div class="navbar-content">
        <h1 class="app-title">Classroom Manager</h1>
        <button class="add-classroom-button" @click="navigateToCreateClassroom">
          ADD CLASSROOM
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="main-content">
      <div v-if="isLoading" class="loading">Loading classrooms...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="classroom-container">
        <div
  class="classroom-box"
  v-for="classroom in (classrooms.classrooms || [])"
  :key="classroom.classroom_id"
  @click="navigateToClassroom(classroom.classroom_id)"
>
          <img
            :src="getImageUrl(classroom.classroom_image)"
            alt="Classroom Image"
            class="classroom-image"
          />
          <p class="classroom-name">{{ classroom.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "./stores/user";
import axios from "axios";

// State from user store
const userStore = useUserStore();
const username = userStore.username; // Access global username

const router = useRouter();
const BASE_URL = "http://localhost:8080";

// Reactive state for classrooms, loading, and error
const classrooms = ref([]);
const isLoading = ref(false);
const error = ref(null);

// Fetch classrooms based on username
const fetchClassrooms = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await axios.get(`${BASE_URL}/classrooms`);
    classrooms.value = response.data; // This is correct
  } catch (err) {
    error.value = "Failed to fetch classrooms. Please try again.";
    console.error(err);
  } finally {
    isLoading.value = false;
  }
};

// Call fetchClassrooms on mount
onMounted(() => {
  fetchClassrooms();
});

// Image URL handler
const getImageUrl = (imageName) => {
  //console.log(JSON.stringify(classrooms));
  console.log(classrooms.value.classrooms);
  // If API returns an image URL, use it; otherwise, fallback to default
  return imageName
    ? imageName
    : new URL("./assets/images/demo-classroom.png", import.meta.url).href;
};

// Navigation handlers
const navigateToClassroom = (classroomId) => {
  router.push({ name: "Classroom", params: { classroomId } });
};

const navigateToCreateClassroom = () => {
  router.push({ name: "CreateClassroom" });
};
</script>

<style scoped>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  background: #1e1e2f;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", sans-serif;
}

h1,
h2,
h3,
h4,
h5,
h6 {
  margin: 0;
  padding: 0;
  color: #ecf0f1;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100vw;
  background: #1e1e2f;
  overflow-x: hidden;
  position: fixed;
  top: 0;
  left: 0;
}

.top-navbar {
  width: 100%;
  background: #2c3e50;
  padding: 1rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  margin: 0;
}

.navbar-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  padding: 0 2rem;
}

.app-title {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  padding: 0;
  line-height: 1;
}

.add-classroom-button {
  padding: 0.6rem 1.5rem;
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
}

.add-classroom-button:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
  transform: translateY(-2px);
}

.main-content {
  flex: 1;
  padding: 2rem;
  width: 100%;
  max-width: 1800px;
  margin: 0 auto;
  background: #1e1e2f;
  color: #ecf0f1;
}

.classroom-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(400px, 550px));
  gap: 2rem;
  justify-content: center;
  width: 100%;
}

.classroom-box {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  border-radius: 12px;
  overflow: hidden;
  width: 100%;
  height: 250px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.classroom-box:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
}

.classroom-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
  border: 1px solid #3b4a59;
  border-radius: 10px;
  box-sizing: border-box;
}

.classroom-name {
  position: relative;
  z-index: 2;
  margin: 1rem;
  padding: 0.5rem 1rem;
  background: rgba(38, 198, 218, 0.85);
  color: #ffffff;
  font-size: 16px;
  font-weight: 400;
  border-radius: 6px;
}

.loading,
.error {
  text-align: center;
  font-size: 18px;
  color: #ecf0f1;
  margin-top: 2rem;
}

.error {
  color: #e74c3c;
}

@media (max-width: 1800px) {
  .classroom-container {
    grid-template-columns: repeat(3, minmax(350px, 1fr));
  }

  .classroom-box {
    width: 100%;
  }
}

@media (max-width: 1400px) {
  .classroom-container {
    grid-template-columns: repeat(2, minmax(350px, 1fr));
  }
}

@media (max-width: 900px) {
  .navbar-content {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .app-title {
    font-size: 32px;
  }

  .add-classroom-button {
    padding: 0.5rem 1.25rem;
    font-size: 14px;
  }

  .main-content {
    padding: 1.5rem;
  }

  .classroom-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .app-title {
    font-size: 24px;
  }

  .add-classroom-button {
    padding: 0.5rem 1rem;
    font-size: 12px;
  }

  .main-content {
    padding: 1rem;
  }

  .classroom-box {
    height: 200px;
  }

  .classroom-name {
    font-size: 14px;
    margin: 0.5rem;
    padding: 0.4rem 0.8rem;
  }
}
</style>

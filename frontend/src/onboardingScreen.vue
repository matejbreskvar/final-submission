<template>
  <div class="main-container">
    <h1>Education First</h1>
    <div class="login-container">
      <input
        v-model="username"
        placeholder="Username"
        required
        class="login-input"
      />
      <button @click="handleLogin" class="login-button" :disabled="isLoading">
        {{ isLoading ? "Logging in..." : "Login" }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "./stores/user";
import axios from "axios";

const BASE_URL = "http://localhost:8080"; // No trailing slash for consistency

const username = ref(""); // Username input
const error = ref(""); // Error message
const isLoading = ref(false); // Loading state

const router = useRouter();
const userStore = useUserStore();

const handleLogin = async () => {
  if (!username.value.trim()) {
    error.value = "Username is required";
    return;
  }

  isLoading.value = true;
  error.value = "";

  try {
    // Store username globally
    userStore.setUsername(username.value);

    const response = await axios.post(`${BASE_URL}/username`, {
      username: userStore.username, // Use .value to get the string
    });

    if (response.status !== 200 || response.status !== 201) {
      console.log(error);
    }

    // Assuming the API returns some user data or confirmation
    console.log("Login response:", response.data);

    // Navigate to JoinClassroom page
    await router.push({
      name: "JoinClassroom",
      params: { username: username.value },
    });
  } catch (err) {
    console.error("Login error:", err);
    error.value =
      err.response?.data?.message || "Failed to login. Please try again.";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style>
body {
  margin: 0;
  background: #1e1e2f;
}
</style>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", sans-serif;
}

.main-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background: #1e1e2f; /* dark gray */
  padding: 2rem;
  overflow: hidden;
}

.main-container h1 {
  font-size: 40px;
  font-weight: 700;
  color: #ecf0f1;
  margin-bottom: 2rem;
}

.login-container {
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7); /* darker shadow */
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.login-input {
  padding: 12px 20px;
  border: 1px solid #5e6e7e;
  background: #1e1e2f;
  border-radius: 8px;
  outline: none;
  font-size: 16px;
  font-weight: 400;
  color: #ecf0f1;
  width: 100%;
  max-width: 300px;
  transition: border 0.2s, box-shadow 0.2s;
}

.login-input:focus {
  border: 2px solid #26c6da; /* cool cyan */
  box-shadow: 0 2px 8px rgba(38, 198, 218, 0.3);
}

.login-input::placeholder {
  color: #95a5a6;
  font-size: 0.9rem;
}

.login-button {
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  max-width: 300px;
  border-radius: 8px;
  transition: background 0.2s, border 0.2s, transform 0.2s ease, box-shadow 0.2s;
}

.login-button:hover:not(:disabled) {
  background: #1aaebf;
  border: 1px solid #159ba9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(38, 198, 218, 0.3);
}

.login-button:disabled {
  background: #7f8c8d;
  border: 1px solid #7f8c8d;
  cursor: not-allowed;
  transform: none;
}

.error {
  text-align: center;
  margin: 0.5rem 0;
  color: #e74c3c;
  font-size: 14px;
  background: #2a2a3b;
  border: 1px solid #e74c3c;
  border-radius: 6px;
  padding: 0.5rem;
}
</style>

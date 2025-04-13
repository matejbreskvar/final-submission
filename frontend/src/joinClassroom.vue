<template>
  <div class="main-container">
    <input
      v-model="classroomCode"
      class="classroom-input"
      type="text"
      placeholder="XXXXX-XXXXX"
      maxlength="11"
    />
    <p class="info-text">Enter your classroom code and press the button</p>

    <p v-if="error" class="error-message">{{ error }}</p>

    <div class="button-row">
      <button class="join-button" @click="JoinClass">Join Class</button>
    </div>

    <hr class="center-line" />

    <p class="info-text">or create a new classroom</p>

    <div class="button-row">
      <button class="create-button" @click="CreateClass">Create Class</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "./stores/user";
import axios from "axios";

const BASE_URL = "http://localhost:8080";

const classroomCode = ref("");
const error = ref("");
const router = useRouter();
const route = useRoute(); // Access route to get username
const userStore = useUserStore();
const username = userStore.username; // Access global username

const JoinClass = async () => {
  const codePattern = /^[A-Za-z0-9]{5}-[A-Za-z0-9]{5}$/;
  if (!codePattern.test(classroomCode.value)) {
    error.value = "Invalid classroom code format. Please use XXXXX-XXXXX.";
    return;
  }
  //api call to backend, containing username, classroom ID

  const numericClassID = parseInt(classroomCode.value.replace("-", ""), 10);

  if (isNaN(numericClassID)) {
    error.value = "Failed to convert classroom code to a valid number.";
    return;
  }

  try {
    const response = await axios.post(`${BASE_URL}/join_classroom`, {
      username: username,
      classID: numericClassID,
    });

    if(response.status == 200) {
      router
    .push({
      name: "Classroom",
      params: {
        classroomId: classroomCode.value,
      },
    })
    .catch((err) => {
      console.error("Navigation error:", err);
      error.value = "Failed to join classroom. Please try again.";
    });
    }

  } catch (error) {
    console.log(error);
  }

  error.value = "";
  console.log("Join Class button clicked with code:", classroomCode.value);
};

const CreateClass = () => {
  console.log("Create Class button clicked");
  console.log(username);
  router.push({
    name: "CreateClassroom",
  });
};
</script>

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
  min-height: 100vh;
  background: #1e1e2f;
  padding: 2rem;
  text-align: center;
  overflow: hidden;
}

.center-line {
  width: 66.66vw;
  border: none;
  border-top: 2px solid #3b4a59;
  margin: 20px 0;
}

.classroom-input {
  padding: 14px 24px;
  border: 1px solid #5e6e7e;
  background: #2a2a3b;
  border-radius: 6px;
  outline: none;
  font-size: 16px;
  font-weight: 400;
  color: #ecf0f1;
  width: 300px;
  margin-bottom: 5px;
  text-align: center;
  box-sizing: border-box;
}

.classroom-input:focus {
  border: 2px solid #26c6da;
}

.classroom-input::placeholder {
  color: #95a5a6;
  font-size: 0.9rem;
}

.info-text {
  text-align: center;
  margin: 5px 0 20px;
  color: #ecf0f1;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

.error-message {
  text-align: center;
  margin: 5px 0 20px;
  color: #e74c3c;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
}

.button-row {
  display: flex;
  justify-content: center;
  width: auto;
  margin-bottom: 5px;
}

.join-button,
.create-button {
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 300px;
  border-radius: 6px;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
  box-sizing: border-box;
}

.join-button:hover,
.create-button:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .main-container {
    padding: 1.5rem;
  }

  .classroom-input {
    width: 250px;
    font-size: 14px;
  }

  .info-text {
    font-size: 14px;
  }

  .error-message {
    font-size: 12px;
  }

  .join-button,
  .create-button {
    width: 250px;
    padding: 12px 20px;
    font-size: 14px;
  }

  .center-line {
    width: 80vw;
  }
}

@media (max-width: 480px) {
  .main-container {
    padding: 1rem;
  }

  .classroom-input {
    width: 200px;
    font-size: 12px;
  }

  .info-text {
    font-size: 12px;
  }

  .error-message {
    font-size: 10px;
  }

  .join-button,
  .create-button {
    width: 200px;
    padding: 10px 16px;
    font-size: 12px;
  }

  .center-line {
    width: 90vw;
  }
}
</style>

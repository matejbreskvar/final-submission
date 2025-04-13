<template>
  <div class="main-container">
    <h1>Create your classroom</h1>

    <p class="info-text">Enter class name</p>

    <input
      v-model="className"
      class="classroom-name-input"
      type="text"
      placeholder="Class name"
    />

    <p class="info-text">Add a class image</p>
    <label class="file-upload">
      <input type="file" @change="handleImageUpload" hidden />
      <span class="upload-btn">📸 Choose Class Image</span>
    </label>
    <p v-if="selectedImage" class="selected-file">📸 {{ selectedImage }}</p>

    <p class="info-text">Add sources</p>
    <label class="file-upload">
      <input type="file" @change="handleFileUpload" hidden />
      <span class="upload-btn">📁 Choose source</span>
    </label>
    <p v-if="selectedFile" class="selected-file">📁 {{ selectedFile }}</p>

    <hr class="center-line" />

    <div class="button-row">
      <button class="create-button" @click="createClass">Create Class</button>
      <p v-if="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const BASE_URL = "http://localhost:8080";
import { useRouter } from "vue-router";
import { useUserStore } from "./stores/user";

const userStore = useUserStore();
const username = userStore.username; // Access global username

const className = ref("");
const classID = ref("");
const classBookArray = ref([]);
const classImage = ref(null);
const selectedImage = ref("");
const selectedFile = ref("");
const imagePreview = ref("");
const error = ref("");
const router = useRouter(); // Initialize router

const generateClassID = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000);
};

onMounted(() => {
  classID.value = generateClassID();
});

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    classImage.value = file;
    imagePreview.value = URL.createObjectURL(file);
    console.log("Image uploaded:", file);
  }
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    classBookArray.value.push(file);
    console.log("added file to array");
  }
};

const verifyClassProperties = () => {
  if (!className.value.trim()) {
    console.log("Error: Class name is required.");
    return false;
  }
  return true;
};

const createClass = async () => {
  if (!verifyClassProperties()) {
    error.value = "Class name is required";
    return;
  }
  const formData = new FormData();

  const classObj = {
    className: className.value,
    classID: classID.value,
    username: username,
  };

  formData.append("classData", JSON.stringify(classObj));

  if (classImage.value) {
    formData.append("classImage", classImage.value);
  }

  classBookArray.value.forEach((file, index) => {
    formData.append(`classBookArray[${index}]`, file);
  });

  console.log("FormData contents:");
  for (const [key, value] of formData.entries()) {
    console.log(`${key}:`, value);
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/create_classroom`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    console.log("Class created successfully:", response.data);
  } catch (error) {
    console.error("Error creating class:", error);
  }
  console.log("Class Created:", classObj);
  router
    .push({
      name: "Classroom",
      params: { classroomId: classObj.classID },
    })
    .catch((err) => {
      console.error("Navigation error:", err);
      error.value = "Failed to join classroom. Please try again.";
    });
};
</script>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  background: #1e1e2f;
  overflow-x: hidden;
  height: 100%;
}

* {
  box-sizing: border-box;
  font-family: "Segoe UI", sans-serif;
}

.main-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  width: 100%;
  background: #1e1e2f;
  padding: 2rem;
}

.main-container h1 {
  font-size: 40px;
  font-weight: 700;
  color: #ecf0f1;
  margin-bottom: 2rem;
}

.card-container {
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: linear-gradient(135deg, #2a2a3b, #1e1e2f);
}

.info-text {
  text-align: center;
  margin: 0.5rem 0 1rem;
  color: #ecf0f1;
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
  max-width: 300px;
}

.center-line {
  width: 80%;
  border: none;
  border-top: 1px solid #3b4a59;
  margin: 1.5rem 0;
  opacity: 0.7;
}

.classroom-name-input {
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
  margin-bottom: 1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: border 0.2s, box-shadow 0.2s;
}

.classroom-name-input:focus {
  border: 2px solid #26c6da;
  box-shadow: 0 2px 6px rgba(38, 198, 218, 0.3);
}

.classroom-name-input::placeholder {
  color: #95a5a6;
  font-size: 0.9rem;
}

.file-upload {
  display: inline-block;
  cursor: pointer;
  width: 100%;
  max-width: 300px;
  margin-bottom: 1rem;
}

.file-upload input[type="file"] {
  display: none;
}

.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 20px;
  background: #3b4a59;
  color: #ecf0f1;
  border: 1px solid #5e6e7e;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
}

.upload-btn:hover {
  background: #5e6e7e;
  border: 1px solid #7f8c8d;
  transform: translateY(-2px);
}

.selected-file {
  text-align: center;
  margin: 0.5rem 0 1rem;
  color: #ecf0f1;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  max-width: 300px;
  background: #2a2a3b;
  border: 1px solid #3b4a59;
  border-radius: 6px;
  padding: 0.5rem;
  word-break: break-all;
}

:deep(.filter-dropdown) {
  width: 100%;
  max-width: 300px;
  padding: 12px 20px;
  border: 1px solid #5e6e7e;
  background: #1e1e2f;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 400;
  color: #ecf0f1;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
  transition: border 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

:deep(.filter-dropdown:focus) {
  border: 2px solid #26c6da;
  box-shadow: 0 2px 6px rgba(38, 198, 218, 0.3);
  outline: none;
}

.button-row {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 300px;
  margin-top: 1rem;
}

.create-button {
  background: #26c6da;
  color: #ffffff;
  border: 1px solid #1aaebf;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  border-radius: 8px;
  transition: background 0.2s, border 0.2s, transform 0.2s ease, box-shadow 0.2s;
}

.create-button:hover {
  background: #1aaebf;
  border: 1px solid #159ba9;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(38, 198, 218, 0.3);
}

@media (max-width: 768px) {
  .main-container {
    padding: 1.5rem;
  }

  .main-container h1 {
    font-size: 32px;
  }

  .card-container {
    padding: 1.5rem;
    max-width: 350px;
  }

  .classroom-name-input,
  .file-upload,
  .upload-btn,
  .selected-file,
  :deep(.filter-dropdown),
  .button-row,
  .create-button {
    width: 100%;
    max-width: 250px;
  }

  .info-text {
    font-size: 14px;
    max-width: 250px;
  }

  .create-button,
  .upload-btn,
  .classroom-name-input,
  :deep(.filter-dropdown) {
    font-size: 14px;
    padding: 10px 20px;
  }

  .selected-file {
    font-size: 12px;
  }

  .center-line {
    width: 85%;
  }
}

@media (max-width: 480px) {
  .main-container {
    padding: 1rem;
  }

  .main-container h1 {
    font-size: 24px;
  }

  .card-container {
    padding: 1rem;
    max-width: 300px;
  }

  .classroom-name-input,
  .file-upload,
  .upload-btn,
  .selected-file,
  :deep(.filter-dropdown),
  .button-row,
  .create-button {
    width: 100%;
    max-width: 200px;
  }

  .info-text {
    font-size: 12px;
    max-width: 200px;
  }

  .create-button,
  .upload-btn,
  .classroom-name-input,
  :deep(.filter-dropdown) {
    font-size: 12px;
    padding: 8px 16px;
  }

  .selected-file {
    font-size: 10px;
  }

  .center-line {
    width: 90%;
  }
}
</style>
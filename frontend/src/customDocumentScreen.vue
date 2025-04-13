<!-- src/views/CustomDocumentScreen.vue -->
<template>
  <div class="document-container">
    <div class="document-header">
      <h1>Upload Image</h1>
      <button class="back-btn" @click="goBack">Back to Classroom</button>
    </div>
    <div class="header-subtitle">
      Upload a JPG image to let our AI create personalized lessons for you.
    </div>
    <div class="document-content">
      <div class="upload-card" :class="{ 'drag-hover': isDragging }">
        <input
          type="file"
          accept="image/jpeg"
          ref="fileInput"
          @change="handleFileSelect"
          class="file-input"
        />
        <div
          class="upload-area"
          @dragover.prevent="handleDragOver"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <div v-if="!uploadedFile" class="upload-prompt">
            <svg
              class="upload-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p>Drag your image here (JPG only)</p>
            <p>or</p>
            <button class="browse-btn" @click="triggerFileInput">
              Browse Files
            </button>
          </div>
          <div v-else class="file-preview">
            <img
              :src="filePreviewUrl"
              alt="Uploaded Image"
              class="preview-image"
            />
            <p class="file-name">{{ uploadedFile.name }}</p>
            <p class="file-size">({{ formatFileSize(uploadedFile.size) }})</p>
            <button class="remove-btn" @click="removeFile">Remove</button>
          </div>
        </div>
      </div>
      <div v-if="isUploading" class="message info">Uploading image...</div>
      <div v-else-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
      <div v-if="uploadedImageUrl" class="uploaded-image">
        <h3>Uploaded Image</h3>
        <img :src="uploadedImageUrl" alt="Server Image" class="server-image" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "./stores/user";
import axios from "axios";

const userStore = useUserStore();
const username = userStore.username;

const uploadedFile = ref(null);
const fileInput = ref(null);
const isDragging = ref(false);
const message = ref("");
const messageType = ref("");
const isUploading = ref(false);
const uploadedImageUrl = ref("");
const filePreviewUrl = ref("");
const router = useRouter();
const route = useRoute();

const classroomId = computed(() => route.params.classroomId);
const BASE_URL = "http://localhost:8080";

// Trigger file input click
const triggerFileInput = () => {
  fileInput.value.click();
};

// Handle file selection
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  processFile(file);
};

// Handle drag over
const handleDragOver = () => {
  isDragging.value = true;
};

// Handle drag leave
const handleDragLeave = () => {
  isDragging.value = false;
};

// Handle file drop
const handleDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  processFile(file);
};

// Process uploaded file
const processFile = async (file) => {
  if (!file) return;
  if (file.type !== "image/jpeg") {
    message.value = "Please upload a valid JPG file.";
    messageType.value = "error";
    setTimeout(() => {
      message.value = "";
      messageType.value = "";
    }, 3000);
    return;
  }

  uploadedFile.value = file;
  // Generate local preview URL
  filePreviewUrl.value = URL.createObjectURL(file);
  message.value = "Image selected! Uploading to server...";
  messageType.value = "info";

  await uploadFile(file);
};

// Upload file to server
const uploadFile = async (file) => {
  isUploading.value = true;
  try {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("classroomId", classroomId.value);
    formData.append("username", username);

    const response = await axios.post(`${BASE_URL}/images/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    uploadedImageUrl.value = response.data.url;
    message.value = "Image uploaded successfully! Ready for AI processing.";
    messageType.value = "success";
  } catch (err) {
    console.error("Upload error:", err);
    message.value = "Failed to upload image. Please try again.";
    messageType.value = "error";
    uploadedFile.value = null;
    filePreviewUrl.value = "";
    uploadedImageUrl.value = "";
  } finally {
    isUploading.value = false;
    setTimeout(() => {
      message.value = "";
      messageType.value = "";
    }, 3000);
  }
};

// Fetch uploaded image (if any)
const fetchUploadedImage = async () => {
  try {
    const response = await axios.get(
      `/api/images?classroomId=${classroomId.value}&username=${username}`
    );
    if (response.data.url) {
      uploadedImageUrl.value = response.data.url;
      message.value = "Previously uploaded image loaded.";
      messageType.value = "info";
      setTimeout(() => {
        message.value = "";
        messageType.value = "";
      }, 3000);
    }
  } catch (err) {
    console.error("Fetch image error:", err);
    // Silent fail; no image is fine
  }
};

// Remove uploaded file
const removeFile = () => {
  if (uploadedFile.value) {
    URL.revokeObjectURL(filePreviewUrl.value);
  }
  uploadedFile.value = null;
  fileInput.value.value = "";
  filePreviewUrl.value = "";
  uploadedImageUrl.value = "";
  message.value = "Image removed.";
  messageType.value = "info";
  setTimeout(() => {
    message.value = "";
    messageType.value = "";
  }, 3000);
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// Navigate back
const goBack = () => {
  router
    .push({ name: "Classroom", params: { classroomId: classroomId.value } })
    .catch((err) => {
      console.error("Navigation error:", err);
    });
};

// Cleanup on unmount
onUnmounted(() => {
  if (filePreviewUrl.value) {
    URL.revokeObjectURL(filePreviewUrl.value);
  }
});

// Fetch existing image on mount
import { onMounted } from "vue";
onMounted(() => {
  fetchUploadedImage();
});
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Segoe UI", sans-serif;
}

.document-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
  padding: 2rem;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  background: #2c3e50;
  padding: 1rem;
  border-radius: 8px;
}

.document-header h1 {
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.header-subtitle {
  font-size: 16px;
  font-weight: 400;
  color: #2c3e50;
  text-align: center;
  margin: 0 auto 2rem auto;
  max-width: 700px;
  line-height: 1.5;
  opacity: 0;
  animation: fadeIn 0.5s ease forwards;
}

.back-btn {
  padding: 0.6rem 1.5rem;
  background: #3498db;
  color: #ffffff;
  border: 1px solid #2980b9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
}

.back-btn:hover {
  background: #2980b9;
  border: 1px solid #2472a4;
  transform: scale(1.05);
}

.document-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  justify-content: center;
}

.upload-card {
  background: #ffffff;
  border: 1px solid #ecf0f1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  padding: 2rem;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.upload-card.drag-hover {
  transform: scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  background: #ecf0f1;
}

.file-input {
  display: none;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 2px dashed #bdc3c7;
  border-radius: 12px;
  padding: 2rem;
  transition: border-color 0.2s ease;
}

.upload-card.drag-hover .upload-area {
  border-color: #3498db;
}

.upload-prompt p {
  color: #2c3e50;
  font-size: 16px;
  font-weight: 400;
  margin: 0.75rem 0;
}

.upload-icon {
  width: 56px;
  height: 56px;
  color: #3498db;
  margin-bottom: 1.25rem;
}

.browse-btn {
  padding: 0.75rem 2rem;
  background: #3498db;
  color: #ffffff;
  border: 1px solid #2980b9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
}

.browse-btn:hover {
  background: #2980b9;
  border: 1px solid #2472a4;
  transform: scale(1.05);
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.preview-image {
  max-width: 150px;
  max-height: 150px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #ecf0f1;
}

.file-name {
  font-size: 16px;
  font-weight: 400;
  color: #2c3e50;
  margin: 0;
}

.file-size {
  font-size: 14px;
  font-weight: 400;
  color: #7f8c8d;
  margin: 0;
}

.remove-btn {
  padding: 0.6rem 1.5rem;
  background: #ecf0f1;
  color: #2c3e50;
  border: 1px solid #bdc3c7;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background 0.2s, border 0.2s, transform 0.2s ease;
}

.remove-btn:hover {
  background: #d6dbdf;
  border: 1px solid #bdc3c7;
  transform: scale(1.05);
}

.message {
  margin-top: 1.5rem;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 400;
  color: #2c3e50;
  max-width: 600px;
  text-align: center;
}

.message.success {
  background: #ffffff;
  border: 1px solid #3498db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message.error {
  background: #ffffff;
  border: 1px solid #e74c3c;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message.info {
  background: #ffffff;
  border: 1px solid #7f8c8d;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.uploaded-image {
  margin-top: 2rem;
  text-align: center;
}

.uploaded-image h3 {
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.server-image {
  max-width: 300px;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #ecf0f1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1024px) {
  .document-header h1 {
    font-size: 32px;
  }

  .header-subtitle {
    font-size: 14px;
    max-width: 500px;
  }

  .upload-card {
    max-width: 500px;
    padding: 1.75rem;
  }

  .upload-area {
    min-height: 200px;
  }

  .upload-prompt p {
    font-size: 14px;
  }

  .preview-image {
    max-width: 120px;
    max-height: 120px;
  }

  .server-image {
    max-width: 250px;
    max-height: 250px;
  }
}

@media (max-width: 768px) {
  .document-container {
    padding: 1.5rem;
  }

  .document-header {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .document-header h1 {
    font-size: 24px;
  }

  .back-btn {
    padding: 0.5rem 1.25rem;
    font-size: 14px;
  }

  .header-subtitle {
    font-size: 14px;
    max-width: 400px;
  }

  .upload-card {
    max-width: 400px;
    padding: 1.5rem;
  }

  .upload-area {
    min-height: 180px;
    padding: 1.5rem;
  }

  .upload-prompt p {
    font-size: 14px;
  }

  .browse-btn {
    padding: 0.6rem 1.5rem;
    font-size: 14px;
  }

  .file-name {
    font-size: 14px;
  }

  .file-size {
    font-size: 12px;
  }

  .remove-btn {
    padding: 0.5rem 1.25rem;
    font-size: 14px;
  }

  .message {
    padding: 0.75rem 1.5rem;
    font-size: 14px;
  }

  .preview-image {
    max-width: 100px;
    max-height: 100px;
  }

  .server-image {
    max-width: 200px;
    max-height: 200px;
  }
}

@media (max-width: 480px) {
  .document-container {
    padding: 1rem;
  }

  .document-header h1 {
    font-size: 24px;
  }

  .back-btn {
    padding: 0.5rem 1rem;
    font-size: 12px;
  }

  .header-subtitle {
    font-size: 12px;
    max-width: 300px;
  }

  .upload-card {
    max-width: 300px;
    padding: 1.25rem;
  }

  .upload-area {
    min-height: 160px;
    padding: 1.25rem;
  }

  .upload-prompt p {
    font-size: 12px;
  }

  .upload-icon {
    width: 48px;
    height: 48px;
  }

  .browse-btn {
    padding: 0.5rem 1.25rem;
    font-size: 12px;
  }

  .preview-image {
    max-width: 80px;
    max-height: 80px;
  }

  .file-name {
    font-size: 12px;
  }

  .file-size {
    font-size: 10px;
  }

  .remove-btn {
    padding: 0.5rem 1rem;
    font-size: 12px;
  }

  .message {
    padding: 0.75rem 1.25rem;
    font-size: 12px;
  }

  .uploaded-image h3 {
    font-size: 16px;
  }

  .server-image {
    max-width: 150px;
    max-height: 150px;
  }
}
</style>

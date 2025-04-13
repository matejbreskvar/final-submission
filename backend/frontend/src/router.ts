// src/router.ts
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import JoinClassroom from "./joinClassroom.vue"; // Match file case
import OnboardingScreen from "./onboardingScreen.vue"; // Import onboarding screen
import ClassroomScreen from "./classroomScreen.vue";
import FlashcardsScreen from "./flashcardsScreen.vue";
import CreateClassroom from "./createClassroom.vue";
import Classrooms from "./mainScreen.vue"; // Match file case

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: OnboardingScreen,
    name: "OnboardingScreen",
    props: true,
  }, // Add onboarding route
  {
    path: "/join-classroom",
    component: JoinClassroom,
    name: "JoinClassroom",
    props: true,
  }, // Consistent case
  {
    path: "/classroom/:classroomId",
    component: ClassroomScreen,
    name: "Classroom",
    props: true,
  },
  {
    path: "//classroom/:classroomId/flashcards/:classroomId",
    component: FlashcardsScreen,
    name: "Flashcards",
    props: true,
  },
  {
    path: "/create-classroom",
    component: CreateClassroom,
    name: "CreateClassroom",
    props: true,
  },
  {
    path: "/classrooms",
    component: Classrooms,
    name: "Classrooms",
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

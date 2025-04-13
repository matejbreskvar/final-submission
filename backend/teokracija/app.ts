import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import route_username from "./routes/username.ts";
import route_join_classroom from "./routes/join_classroom.ts";
import route_create_classroom from "./routes/create_classroom.ts";
import route_ask_ai from "./routes/ask_ai.ts";
import route_get_classrooms from "./routes/get_classrooms.ts";

// Path configuration for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT: number = 8080;

const corsOptions = {
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
  credentials: true, // Allows cookies and credentials to be sent
  optionsSuccessStatus: 200, // For legacy browser support
};

// Apply the CORS middleware
app.use(cors(corsOptions));
app.use(express.json());
// Middleware to parse JSON and URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Static file serving for classroom files
const classroomsDir = path.join(__dirname, "classrooms");
console.log(`Classrooms directory: ${classroomsDir}`);
app.use("/files/classrooms", express.static(classroomsDir));

// ROUTES
app.use("/username", route_username);
app.use("/join_classroom", route_join_classroom);
app.use("/create_classroom", route_create_classroom);
app.use("/ask_ai", route_ask_ai);
app.use("/classrooms", route_get_classrooms);

// ERRORS
app.use((err, req, res, next) => {
  console.error("error:", err.message);
  res.status(500).send("internal server error");
});

// START SERVER
try {
  app.listen(PORT, () => {
    console.log(`\n server running on: ${PORT}\n`);
    console.log(`\n Class files available at: http://localhost:${PORT}/files/classrooms/{classroom_id}/books/{filename}`);
    console.log(`\n Class images available at: http://localhost:${PORT}/files/classrooms/{classroom_id}/image/{filename}`);
  });
} catch (error) {
  console.error("ERROR, cant start:", error);
}

export default app;

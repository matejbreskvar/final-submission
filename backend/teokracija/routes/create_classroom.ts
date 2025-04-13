import express from "express";
import fs from "fs";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import multer from "multer";

import { create_classroom_schema } from "../zod_schemas.ts";
import { checkCreateClassroom } from "../../utils/createClassroom.ts";

const router = express.Router();

// Path configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory for file uploads
const tempDir = path.join(__dirname, "..", "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Setup multer for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Setup multer upload
const upload = multer({
  storage: storage,
}).fields([
  { name: "classImage", maxCount: 1 },
  { name: "classBookArray[0]", maxCount: 1 },
  { name: "classBookArray[1]", maxCount: 1 },
  { name: "classBookArray[2]", maxCount: 1 },
  { name: "classBookArray[3]", maxCount: 1 },
  { name: "classBookArray[4]", maxCount: 1 },
  { name: "classBookArray[5]", maxCount: 1 },
  { name: "classBookArray[6]", maxCount: 1 },
  { name: "classBookArray[7]", maxCount: 1 },
  { name: "classBookArray[8]", maxCount: 1 },
  { name: "classBookArray[9]", maxCount: 1 },
]);

function create_classroom_directory(classroom_id: number): {
  success: boolean;
  booksDir: string;
  imageDir: string;
} {
  try {
    const base_directory = path.join(__dirname, "..", "classrooms");
    if (!fs.existsSync(base_directory)) fs.mkdirSync(base_directory, { recursive: true });

    const classroom_directory = path.join(base_directory, classroom_id.toString());
    if (!fs.existsSync(classroom_directory)) fs.mkdirSync(classroom_directory);

    const books_directory = path.join(classroom_directory, "books");
    if (!fs.existsSync(books_directory)) fs.mkdirSync(books_directory);

    const image_directory = path.join(classroom_directory, "image");
    if (!fs.existsSync(image_directory)) fs.mkdirSync(image_directory);

    return {
      success: true,
      booksDir: books_directory,
      imageDir: image_directory,
    };
  } catch (error) {
    console.error("Error creating classroom directories:", error);
    return { success: false, booksDir: "", imageDir: "" };
  }
}

router.post("/", (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.error("Unknown error during upload:", err);
      return res.status(500).json({ error: err.message });
    }

    try {
      console.log("Request body:", req.body);
      console.log("Files:", req.files);

      // Extract classroom data from JSON string
      let classData;
      try {
        classData = JSON.parse(req.body.classData);
      } catch (error) {
        console.error("Error parsing class data:", error);
        return res.status(400).json({ error: "Invalid classroom data format" });
      }

      // Now extract the individual fields from the parsed JSON
      const classroom_id = classData.classID;
      const username = classData.username;
      const className = classData.className;

      console.log("Parsed class data:", { classroom_id, username, className });

      if (!classroom_id) {
        return res.status(400).json({ error: "Missing classroom ID" });
      }

      // Create directories
      const directoryResult = create_classroom_directory(classroom_id);

      if (!directoryResult.success) {
        return res.status(500).json({ error: "Failed to create classroom directories" });
      }

      // Process the uploaded files first
      const fileInfo: any = { books: [], image: null };
      const bookFilePaths: string[] = [];

      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Process books - identify all classBookArray fields
        let bookIndex = 0;
        Object.keys(files).forEach((key) => {
          if (key.startsWith("classBookArray")) {
            files[key].forEach((book) => {
              // Use standard naming: book0.pdf, book1.pdf, etc.
              const bookFilename = `book${bookIndex}.pdf`;
              const targetPath = path.join(directoryResult.booksDir, bookFilename);

              // Move the file
              fs.renameSync(book.path, targetPath);

              // Add to book files array
              bookFilePaths.push(targetPath);

              // Add to file info
              fileInfo.books.push({
                filename: bookFilename,
                path: targetPath,
                mimetype: book.mimetype,
                size: book.size,
                originalName: book.originalname,
              });

              bookIndex++;
            });
          }
        });

        // Process image - always save as img.png
        if (files.classImage && files.classImage.length > 0) {
          const image = files.classImage[0];
          const targetPath = path.join(directoryResult.imageDir, "img.png");
          fs.renameSync(image.path, targetPath);

          fileInfo.image = {
            filename: "img.png",
            path: targetPath,
            mimetype: image.mimetype,
            size: image.size,
            originalName: image.originalname,
          };
        }
      }

      // Now check if the classroom already exists and create it
      // Pass individual book file paths, not the directory
      const check_created_classroom = await checkCreateClassroom(
        className,
        username,
        classroom_id,
        bookFilePaths, // Individual PDF file paths
        fileInfo.image ? fileInfo.image.path : ""
      );

      if (!check_created_classroom) {
        // Clean up any files since classroom creation failed
        fileInfo.books.forEach((book) => {
          if (fs.existsSync(book.path)) {
            fs.unlinkSync(book.path);
          }
        });

        if (fileInfo.image && fs.existsSync(fileInfo.image.path)) {
          fs.unlinkSync(fileInfo.image.path);
        }

        return res.status(409).json({ error: "Classroom already exists" });
      }

      // Generate URLs for the frontend
      const baseUrl = `http://localhost:8080/files/classrooms/${classroom_id}`;

      // Return success response with classroom details
      return res.status(201).json({
        classroom_id: classroom_id,
        username: username,
        className: className,
        files: {
          books: fileInfo.books.map((book) => ({
            url: `${baseUrl}/books/${book.filename}`,
            originalName: book.originalName,
            size: book.size,
          })),
          image: fileInfo.image
            ? {
                url: `${baseUrl}/image/img.png`,
                originalName: fileInfo.image.originalName,
                size: fileInfo.image.size,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Unexpected error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
});

export default router;

import type { Classroom } from "./types.ts";
import { connectToMongoDB } from "./mongodb.js";
import path from "path";

// Base URL for your application
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";

/**
 * Convert a local file path to a full URL for static file serving
 * @param filePath The file path to convert
 * @returns URL for accessing the file
 */
function convertToUrlPath(filePath: string): string {
  if (!filePath) return "";

  // For image paths
  const imageMatch = filePath.match(/classrooms[\/\\](\d+)[\/\\](image)(?:[\/\\]([^\/\\]+))?/i);
  if (imageMatch && imageMatch[1] && imageMatch[2]) {
    const classroomId = imageMatch[1];
    const folder = imageMatch[2];
    const filename = imageMatch[3] || "";

    // If we have a directory without a filename, use img.png
    if (!filename) {
      return `${BASE_URL}/files/classrooms/${classroomId}/${folder}/img.png`;
    }

    return `${BASE_URL}/files/classrooms/${classroomId}/${folder}/${filename}`;
  }

  // For book paths
  const bookMatch = filePath.match(/classrooms[\/\\](\d+)[\/\\](books)[\/\\]([^\/\\]+)/i);
  if (bookMatch && bookMatch[1] && bookMatch[2] && bookMatch[3]) {
    const classroomId = bookMatch[1];
    const folder = bookMatch[2];
    const filename = bookMatch[3];
    return `${BASE_URL}/files/classrooms/${classroomId}/${folder}/${filename}`;
  }

  return filePath; // Return original if no match
}

/**
 * Retrieves all classrooms from the database and converts paths to URLs
 */
async function getAllClassroomsFromDb(): Promise<Classroom[]> {
  try {
    // Connect to the database
    const db = await connectToMongoDB();

    // Get the classrooms collection
    const classroomsCollection = db.collection("classrooms");

    // Find all classrooms
    const classrooms = await classroomsCollection.find({}).toArray();

    // Map MongoDB documents to Classroom type with URL-based paths
    const typedClassrooms = classrooms.map((doc) => {
      // Process the base classroom data
      const classroom = {
        username: doc.username,
        name: doc.name,
        classroom_id: doc.classroom_id,
        classroom_image: convertToUrlPath(doc.classroom_image),
        users: doc.users || [],
        books: [],
      } as Classroom;

      // Process book paths if any
      if (doc.books && Array.isArray(doc.books)) {
        classroom.books = doc.books.map((book) => ({
          ...book,
          path: convertToUrlPath(book.path),
        }));
      }

      return classroom;
    });

    return typedClassrooms;
  } catch (error) {
    console.error("Error fetching all classrooms:", error);
    return [];
  }
}

/**
 * Retrieves classrooms for a user or all classrooms
 */
async function getClassrooms(username?: string): Promise<Classroom[] | boolean> {
  try {
    if (!username) {
      // Get all classrooms when no username is provided
      return await getAllClassroomsFromDb();
    }

    // Connect to the database
    const db = await connectToMongoDB();
    const classroomsCollection = db.collection("classrooms");

    // Find classrooms for this user
    const classrooms = await classroomsCollection.find({ users: { $elemMatch: { $eq: username } } }).toArray();

    // Map MongoDB documents to Classroom type with URL-based paths
    const typedClassrooms = classrooms.map((doc) => {
      // Process the base classroom data
      const classroom = {
        username: doc.username,
        name: doc.name,
        classroom_id: doc.classroom_id,
        classroom_image: convertToUrlPath(doc.classroom_image),
        users: doc.users || [],
        books: [],
      } as Classroom;

      // Process book paths if any
      if (doc.books && Array.isArray(doc.books)) {
        classroom.books = doc.books.map((book) => ({
          ...book,
          path: convertToUrlPath(book.path),
        }));
      }

      return classroom;
    });

    return typedClassrooms;
  } catch (error) {
    console.error("Error fetching classrooms for user:", error);
    return false;
  }
}

export { getClassrooms, getAllClassroomsFromDb };

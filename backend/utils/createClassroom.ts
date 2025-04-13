import type { Classroom } from "./types.ts";
import { connectToMongoDB } from "./mongodb.js";
import { parsePDF, chunkText, generateEmbeddings, storeInLanceDB, generateFlashcards } from "../book-parser/parse.ts";
import path from "path";

/**
 * Creates a new classroom and assigns the user as the creator
 * @param username The username of the creator
 * @param classroomID Unique identifier for the classroom
 * @param bookFilePaths Array of file paths to process for this classroom
 * @returns {Promise<boolean>} Returns true if classroom was created successfully, false otherwise
 */
async function checkCreateClassroom(classname: string, username: string, classroomID: number, bookFilePaths: string[], imagePath: string): Promise<boolean> {
  try {
    // Connect to the database
    const db = await connectToMongoDB();

    // Get the classrooms collection
    const classroomsCollection = db.collection("classrooms");

    // Check if classroom with this ID already exists
    const existingClassroom = await classroomsCollection.findOne({ classroom_id: classroomID });
    if (existingClassroom) {
      console.log(`Classroom with ID ${classroomID} already exists`);
      return false;
    }

    // Process each book file
    const processedBooks: { id: string; name: string; path: string }[] = [];
    for (let i = 0; i < bookFilePaths.length; i++) {
      const filePath = bookFilePaths[i];
      const fileName = path.basename(filePath, path.extname(filePath));
      const documentId = `${fileName.replace(/\W+/g, "_").toLowerCase()}`;

      try {
        console.log(`Processing book: ${filePath}`);

        // 1. Parse the PDF
        const { fullText, sections } = await parsePDF(filePath);

        // 2. Create context-aware chunks
        const chunks = chunkText(sections);

        // 3. Generate embeddings
        const embeddings = await generateEmbeddings(chunks);

        // 4. Store in vector database
        const classroomIdString = classroomID.toString();
        await storeInLanceDB(chunks, embeddings, classroomIdString, documentId);

        // 5. Generate flashcards
        await generateFlashcards(chunks, classroomIdString, documentId);

        // Add to processed books
        processedBooks.push({
          id: documentId,
          name: fileName,
          path: filePath,
        });

        console.log(`Successfully processed book: ${fileName}`);
      } catch (error) {
        console.error(`Error processing book ${filePath}:`, error);
        // Continue with other books
      }
    }

    // Create new classroom object
    const newClassroom: Classroom = {
      username: username, // Creator of the classroom
      name: classname,
      classroom_id: classroomID,
      books: processedBooks,
      classroom_image: imagePath, // Using Image object structure
      users: [username], // Initially, only the creator is in the classroom
    };

    // Insert the new classroom into the database
    const result = await classroomsCollection.insertOne(newClassroom);

    return result.acknowledged;
  } catch (error) {
    console.error("Error creating classroom:", error);
    return false;
  }
}

export { checkCreateClassroom };

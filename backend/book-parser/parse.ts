import { promises as fs } from "fs";
import OpenAI from "openai";
import LanceDB from "@lancedb/lancedb";
import dotenv from "dotenv";

// Load environment variabless
dotenv.config();
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set your API key
});

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY, // Make sure to set your API key
  baseURL: "https://api.deepseek.com", // Switch as needed
});

// 1. Enhanced PDF Text Extraction with Late Chunking Preparation
async function parsePDF(absPath: string): Promise<{ fullText: string; sections: string[] }> {
  try {
    const dataBuffer = await fs.readFile(absPath);
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const { text } = await pdfParse(dataBuffer);

    // Enhanced document structure analysis
    const structuredText = text
      .replace(/(\n\s*\n)/g, "\x1E") // Preserve paragraph breaks
      .replace(/([.!?])(\s+|$)/g, "$1\x1F") // Mark sentence endings
      .replace(/(\d+\.)\s/g, "$1\x1F") // Preserve numbered lists
      .replace(/•|/g, "\x1E• ") // Preserve bullet points
      .replace(/([A-Z][A-Za-z ,]+:)/g, "\x1E$1"); // Preserve section headers

    // Split into logical sections while maintaining context
    const sections = structuredText
      .split("\x1E")
      .map((section) =>
        section
          .replace(/\x1F/g, " ") // Restore sentence markers
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim()
      )
      .filter((section) => section.length > 0);

    return {
      fullText: text,
      sections,
    };
  } catch (error) {
    throw new Error(`PDF parse failed: ${(error as Error).message}`);
  }
}

// 2. Context-Aware Chunking with Late Chunking Support
function chunkText(sections: string[], chunkSize = 512, overlap = 50): string[] {
  const chunks: string[] = [];

  for (const section of sections) {
    // Skip if section is already smaller than chunk size
    if (section.length <= chunkSize) {
      chunks.push(section);
      continue;
    }

    // Split larger sections with overlap
    let start = 0;
    while (start < section.length) {
      let end = start + chunkSize;

      // Find the nearest sentence boundary
      const sentenceBoundary = section.lastIndexOf(".", end);
      if (sentenceBoundary > start + chunkSize * 0.7) {
        end = sentenceBoundary + 1;
      }

      // Ensure we don't go beyond text length
      end = Math.min(end, section.length);
      chunks.push(section.slice(start, end).trim());

      // Move start position with overlap
      start = Math.max(start + chunkSize - overlap, end - overlap);
    }
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

// 3. OpenAI Embedding Generation
async function generateEmbeddings(chunks: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
      encoding_format: "float",
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw error;
  }
}

// 4. LanceDB Storage with classroom and document organization
async function storeInLanceDB(chunks: string[], embeddings: number[][], classroomId: string, documentId: string) {
  // Create directory path for the specific document
  const dbPath = `data/db/${classroomId}/${documentId}`;

  // Ensure directory exists
  await fs.mkdir(dbPath, { recursive: true });

  const db = await LanceDB.connect(dbPath);

  const records = chunks.map((text, index) => ({
    id: index,
    text,
    vector: embeddings[index],
  }));

  await db.createTable("documents", records);
  console.log(`Stored document in ${dbPath}`);
}

// Modify queryDatabase to handle missing tables more gracefully

async function queryDatabase(question: string, username: string, classroomId: string, documentId: string, topK: number = 7) {
  try {
    // Fix Windows path issues by normalizing the document ID
    let formattedDocId = documentId;

    // If it starts with a drive letter (C:), make sure it has proper backslash
    if (typeof documentId === "string" && /^[A-Za-z]:/.test(documentId)) {
      // Extract just the filename from the path
      const pathParts = documentId.split(/[\/\\]/);
      const filename = pathParts[pathParts.length - 1];
      formattedDocId = filename.replace(/\.[^/.]+$/, ""); // Remove extension

      console.log(`Using simplified document ID: ${formattedDocId} instead of path`);
    }

    const dbPath = `data/db/${classroomId}/${formattedDocId}`;
    console.log(`Attempting to query database at: ${dbPath}`);

    try {
      const db = await LanceDB.connect(dbPath);

      // Check if table exists before trying to open it
      const tables = await db.tableNames();
      if (!tables.includes("documents")) {
        console.log(`Table 'documents' not found in database. Processing document first...`);

        // You could add auto-processing here:
        // if (typeof documentId === "string" && documentId.includes('.pdf')) {
        //   // Process the PDF first
        //   await processPDF(documentId, classroomId, formattedDocId);
        // }

        return [{ text: "Document content hasn't been processed yet. Please try again later.", score: 0 }];
      }

      const table = await db.openTable("documents");

      // Generate query embedding
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: question,
        encoding_format: "float",
      });
      const queryVector = response.data[0].embedding;

      const results = await table.search(queryVector).limit(topK).toArray();

      // Log this query for the user (optional)
      await logUserQuery(username, classroomId, formattedDocId, question);

      return results.map((result) => ({
        text: result.text,
        score: result._distance || 0,
      }));
    } catch (dbError) {
      console.error("Database error:", dbError);
      if (dbError.message.includes("Table 'documents' was not found")) {
        // Document hasn't been processed yet
        return [{ text: "Document content hasn't been processed yet. Please try again later.", score: 0 }];
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Query failed:", error);
    throw new Error(`Query failed: ${(error as Error).message}`);
  }
}

// Helper function to log user queries (optional)
async function logUserQuery(username: string, classroomId: string, documentId: string, query: string) {
  try {
    const logPath = `data/logs/${classroomId}`;
    await fs.mkdir(logPath, { recursive: true });

    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} | ${username} | ${documentId} | ${query}\n`;

    await fs.appendFile(`${logPath}/queries.log`, logEntry);
  } catch (error) {
    console.error("Failed to log query:", error);
    // Non-fatal error, continue execution
  }
}

// 6. Generate flashcards from document content
async function generateFlashcards(
  chunks: string[],
  classroomId: string,
  documentId: string
): Promise<Array<{ question: string; answer: string; embedding: number[] }>> {
  console.log("Generating flashcards from document content...");
  const flashcards: Array<{ question: string; answer: string; embedding: number[] }> = [];

  // Group chunks into larger contexts (5 chunks per group)
  const groupSize = 5;
  const chunksGroups: string[] = [];

  for (let i = 0; i < chunks.length; i += groupSize) {
    const group = chunks.slice(i, i + groupSize).join("\n\n");
    chunksGroups.push(group);
  }

  console.log(`Created ${chunksGroups.length} chunk groups from ${chunks.length} chunks`);

  // Process groups in batches to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < chunksGroups.length; i += batchSize) {
    const batchGroups = chunksGroups.slice(i, i + batchSize);
    const batchPromises = batchGroups.map(async (groupText) => {
      try {
        // Generate Q&A pairs using DeepSeek with explicit JSON structure
        const response = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content:
                'You are an expert educational assistant. Create up to 5 high-quality flashcard-style question and answer pairs from the text. Focus on the most important concepts and core knowledge.\n\nRules for good questions:\n1. Ask about concrete concepts, theories, definitions, or applications\n2. DO NOT reference the text or section numbers (no "according to the text" questions)\n3. Questions should be standalone and test understanding of the material\n4. Avoid vague or overly broad questions\n\nOutput MUST be valid JSON with this structure:\n{\n  "flashcards": [\n    {\n      "question": "Concise question about a concept?",\n      "answer": "Clear, concise answer (under 50 words)"\n    },\n    {...more flashcards...}\n  ]\n}\n\nDo not include any text outside of the JSON structure.',
            },
            { role: "user", content: groupText },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5, // Lower temperature for more predictable output
        });

        const content = response.choices[0].message.content;
        if (!content) return [];

        // Parse the flashcards from JSON with error handling
        let parsedCards;
        try {
          parsedCards = JSON.parse(content);
          console.log(`Parsed ${parsedCards.flashcards.length} flashcards from group`);
          console.log(parsedCards.flashcards);
        } catch (parseError) {
          console.error("Failed to parse JSON response:", parseError);
          return [];
        }

        // Validate expected structure
        if (!parsedCards || !Array.isArray(parsedCards.flashcards)) {
          console.error("Invalid flashcard format received:", content);
          return [];
        }

        // Filter out any malformed flashcards
        const validFlashcards = parsedCards.flashcards.filter(
          (card) =>
            typeof card.question === "string" &&
            typeof card.answer === "string" &&
            !card.question.toLowerCase().includes("according to the text") &&
            !card.question.toLowerCase().includes("section") &&
            !card.question.toLowerCase().includes("passage")
        );

        if (validFlashcards.length === 0) return [];

        // Generate embeddings for each question for later retrieval
        const questions = validFlashcards.map((card) => card.question);
        const embeddings = await generateEmbeddings(questions);

        // Return the flashcards with their embeddings
        return validFlashcards.map((card, index) => ({
          question: card.question,
          answer: card.answer,
          embedding: embeddings[index],
        }));
      } catch (error) {
        console.error("Error generating flashcards for chunk group:", error);
        return [];
      }
    });

    const batchResults = await Promise.all(batchPromises);
    flashcards.push(...batchResults.flat());

    // Slow down requests to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // Store the flashcards in LanceDB
  await storeFlashcardsInDB(flashcards, classroomId, documentId);

  console.log(`Generated ${flashcards.length} flashcards for the document`);
  return flashcards;
}

// Store flashcards in the database
async function storeFlashcardsInDB(flashcards: Array<{ question: string; answer: string; embedding: number[] }>, classroomId: string, documentId: string) {
  const dbPath = `data/db/${classroomId}/${documentId}`;
  await fs.mkdir(dbPath, { recursive: true });

  const db = await LanceDB.connect(dbPath);

  const records = flashcards.map((card, index) => ({
    id: `flashcard_${index}`,
    question: card.question,
    answer: card.answer,
    vector: card.embedding,
  }));

  await db.createTable("flashcards", records);
  console.log(`Stored ${records.length} flashcards in ${dbPath}`);
}

async function queryFlashcards(topic: string, username: string, classroomId: string, documentId: string, maxResults: number = 25) {
  try {
    // Fix Windows path issues by normalizing the document ID
    let formattedDocId = documentId;

    // If it starts with a drive letter (C:), make sure it has proper backslash
    if (typeof documentId === "string" && /^[A-Za-z]:/.test(documentId)) {
      // Extract just the filename from the path
      const pathParts = documentId.split(/[\/\\]/);
      const filename = pathParts[pathParts.length - 1];
      formattedDocId = filename.replace(/\.[^/.]+$/, ""); // Remove extension

      console.log(`Using simplified document ID: ${formattedDocId} instead of path`);
    }

    const dbPath = `data/db/${classroomId}/${formattedDocId}`;
    console.log(`Attempting to query flashcards at: ${dbPath}`);

    const db = await LanceDB.connect(dbPath);
    const table = await db.openTable("flashcards");

    // Generate embedding for the topic
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: topic,
      encoding_format: "float",
    });
    const queryVector = response.data[0].embedding;

    // Estimate topic breadth by querying an evaluation from the AI
    const breadthEval = await evaluateTopicBreadth(topic);

    // Adjust number of results based on topic breadth (between 5-25)
    const numResults = Math.max(5, Math.min(maxResults, Math.round(breadthEval * maxResults)));

    // Search for relevant flashcards
    const results = await table.search(queryVector).limit(numResults).toArray();

    // Log this flashcard query for the user
    await logUserQuery(username, classroomId, documentId, `Flashcards for: ${topic}`);

    return results.map((result) => ({
      question: result.question,
      answer: result.answer,
      score: result._distance || 0,
    }));
  } catch (error) {
    console.error("Flashcard query failed:", error);
    throw new Error(`Flashcard query failed: ${(error as Error).message}`);
  }
}

// Evaluate how broad a topic is (returns value from 0.2 to 1.0)
async function evaluateTopicBreadth(topic: string): Promise<number> {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are an expert educational assistant. Evaluate how broad the given topic is on a scale from 0.2 (very narrow/specific) to 1.0 (very broad/general). Return only the numeric value.",
        },
        { role: "user", content: topic },
      ],
    });

    const content = response.choices[0].message.content?.trim() || "0.5";
    const breadthValue = parseFloat(content);

    // Ensure the value is within the expected range
    return isNaN(breadthValue) ? 0.5 : Math.max(0.2, Math.min(1.0, breadthValue));
  } catch (error) {
    console.error("Topic breadth evaluation failed:", error);
    return 0.5; // Default to medium breadth on error
  }
}

// Update the main processPDF function to include flashcard generation
async function processPDF(absPath: string, classroomId: string, documentId: string) {
  try {
    // 1. Parse with structure preservation
    const { fullText, sections } = await parsePDF(absPath);
    console.log(`Extracted text (${fullText.length} chars)`);
    console.log(`Identified ${sections.length} logical sections`);

    // 2. Create context-aware chunks
    const chunks = chunkText(sections);
    console.log(`Created ${chunks.length} chunks`);

    // 3. Show chunk samples with context
    console.log("\nSample Chunks:");
    chunks.slice(0, 3).forEach((chunk, i) => {
      console.log(`--- Chunk ${i + 1} (${chunk.length} chars) ---`);
      console.log(chunk.substring(0, 150) + (chunk.length > 150 ? "..." : ""));
      console.log("");
    });

    // 4. Generate embeddings using OpenAI
    console.log("Generating embeddings with OpenAI...");
    const embeddings = await generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings (${embeddings[0]?.length || 0} dimensions each)`);

    // 5. Store in vector database with classroom and document organization
    await storeInLanceDB(chunks, embeddings, classroomId, documentId);
    console.log("Document data stored successfully");

    // 6. Generate and store flashcards
    await generateFlashcards(chunks, classroomId, documentId);

    // 7. Run sample query (with username)
    const sampleUsername = "test_user";
    const results = await queryDatabase("Explain the fundamental theorem of calculus", sampleUsername, classroomId, documentId);

    console.log("\nQuery Results:");
    results.forEach((result, i) => {
      console.log(`#${i + 1} (Score: ${result.score.toFixed(4)})`);
      console.log(result.text.substring(0, 200) + "...");
      console.log("");
    });

    // 8. Run sample flashcard query
    const flashcardResults = await queryFlashcards("calculus fundamentals", sampleUsername, classroomId, documentId);

    console.log("\nFlashcard Results:");
    flashcardResults.forEach((card, i) => {
      console.log(`--- Flashcard ${i + 1} ---`);
      console.log(`Q: ${card.question}`);
      console.log(`A: ${card.answer}`);
      console.log("");
    });
  } catch (error) {
    console.error("Processing failed:", error);
    process.exit(1);
  }
}
/*
// Example usage with classroom and document IDs
const pdfPath = "C:\\Users\\domin\\Downloads\\dragonhack2025\\education-first-backend\\books\\Calculus1.pdf";
const classroomId = "math101";
const documentId = "calculus_textbook";

processPDF(pdfPath, classroomId, documentId);
*/
export { parsePDF, chunkText, generateEmbeddings, storeInLanceDB, queryDatabase, generateFlashcards, queryFlashcards };

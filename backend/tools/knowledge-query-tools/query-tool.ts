import { queryDatabase, queryFlashcards } from "../../book-parser/parse.ts";

/**
 * Tool definition for document content querying
 */
const documentQueryTool = {
  type: "function",
  function: {
    name: "queryDocumentContent",
    description: "Queries the document database to find relevant sections from educational content based on the question",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query or question to find relevant document content for",
        },
        classroomId: {
          type: "string",
          description: "The classroom ID for the document",
        },
        documentId: {
          type: "string",
          description: "The document ID to query",
        },
        username: {
          type: "string",
          description: "The username of the person making the query",
        },
        topK: {
          type: "integer",
          description: "Maximum number of results to return",
          default: 5,
        },
      },
      required: ["query", "classroomId", "documentId", "username"],
    },
  },
};

/**
 * Tool definition for flashcard querying
 */
const flashcardQueryTool = {
  type: "function",
  function: {
    name: "queryFlashcards",
    description: "Queries the flashcard database to find relevant flashcards for studying a topic. Use this only when explicitly asked by user.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The topic to find relevant flashcards for",
        },
        classroomId: {
          type: "string",
          description: "The classroom ID for the flashcards",
        },
        documentId: {
          type: "string",
          description: "The document ID containing the flashcards",
        },
        username: {
          type: "string",
          description: "The username of the person making the query",
        },
        maxResults: {
          type: "integer",
          description: "Maximum number of flashcards to return",
          default: 25,
        },
      },
      required: ["topic", "classroomId", "documentId", "username"],
    },
  },
};

/**
 * Handle document query tool calls
 */
export async function handleDocumentQuery(args: any): Promise<any> {
  try {
    const { query, classroomId, documentId, username, topK = 5 } = args;

    console.log(`🔍 Document query for ${classroomId}/${documentId}: "${query}"`);

    // Use directly the queryDatabase function from parse.ts
    console.time("⏱️ Document query time");
    const results = await queryDatabase(query, username, classroomId, documentId, topK);
    console.timeEnd("⏱️ Document query time");

    // Format the results
    const formattedResults = results.map((result) => ({
      content: result.text,
      relevance: Math.round((result.score || 0) * 100) / 100,
      source: `${documentId} (${classroomId})`,
    }));

    console.log(`✅ Found ${formattedResults.length} relevant sections from documents`);

    return {
      query: query,
      results: formattedResults,
      message: `Found ${formattedResults.length} relevant sections from educational content.`,
    };
  } catch (error) {
    console.error("Error in document query:", error);
    return {
      error: `Error querying document: ${error.message}`,
      results: [],
      fallbackMessage: "I couldn't find specific information in our educational content for this query. Let me provide a general explanation instead.",
    };
  }
}

/**
 * Handle flashcard query tool calls
 */
async function handleFlashcardQuery(args: any): Promise<any> {
  try {
    const { topic, classroomId, documentId, username, maxResults = 25 } = args;

    console.log(`🔍 Flashcard query for ${classroomId}/${documentId}: "${topic}"`);

    // Use directly the queryFlashcards function from parse.ts
    console.time("⏱️ Flashcard query time");
    const results = await queryFlashcards(topic, username, classroomId, documentId, maxResults);
    console.timeEnd("⏱️ Flashcard query time");

    console.log(`✅ Found ${results.length} relevant flashcards`);

    // Format the results
    const formattedFlashcards = results.map((card) => ({
      question: card.question,
      answer: card.answer,
      score: Math.round((card.score || 0) * 100) / 100,
    }));

    return {
      topic: topic,
      flashcards: formattedFlashcards,
      message: `Found ${formattedFlashcards.length} flashcards related to "${topic}".`,
      source: `${documentId} flashcards (${classroomId})`,
    };
  } catch (error) {
    console.error("Error in flashcard query:", error);
    return {
      error: `Error querying flashcards: ${error.message}`,
      flashcards: [],
      fallbackMessage: "I couldn't find any flashcards for this topic. Ask me about something else or request direct explanations instead.",
    };
  }
}

// Export the tools for external use
export { documentQueryTool, flashcardQueryTool, handleFlashcardQuery };

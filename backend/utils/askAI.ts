import type { Flashcard } from "./types.ts";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import path from "path";
import { documentQueryTool, flashcardQueryTool, handleDocumentQuery, handleFlashcardQuery } from "../tools/knowledge-query-tools/query-tool.ts";

// Load environment variables
dotenv.config();

// Cache for chat sessions to maintain context
const chatSessions: Record<string, any[]> = {};
/**
 * Normalize a file path to ensure proper formatting
 */
function normalizePath(filePath: string): string {
  if (!filePath) return filePath;

  // Fix common Windows path issues
  let normalizedPath = filePath;

  // Replace C: with C:\ if there's no backslash
  normalizedPath = normalizedPath.replace(/^([A-Za-z]:)(?![\\\/])/g, "$1\\");

  // Replace C:Users with C:\Users (missing backslash after drive letter)
  normalizedPath = normalizedPath.replace(/^([A-Za-z]:)(?:Users|users)/g, "$1\\Users");

  // Ensure consistent path separators
  normalizedPath = path.normalize(normalizedPath);

  console.log(`🛠️ Path normalized: "${filePath}" → "${normalizedPath}"`);
  return normalizedPath;
}
/**
 * Extract the main topic from a request
 */
async function extractTopic(ai: OpenAI, query: string, chatHistory: any[]): Promise<string> {
  try {
    // Get context from chat history
    const context = chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join("\n");

    const response = await ai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Extract the main educational topic from this request. Return ONLY the topic word or phrase.",
        },
        {
          role: "user",
          content: `Chat history:\n${context}\n\nCurrent request: ${query}\n\nWhat is the main topic?`,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    return response.choices[0].message.content?.trim() || "";
  } catch (error) {
    console.error(`❌ Topic extraction failed:`, error);
    return "";
  }
}

/**
 * Process a flashcard request and return results directly if found
 */
async function processFlashcardRequest(
  ai: OpenAI,
  prompt: string,
  chatHistory: any[],
  classroomID: number,
  normalizedDocID: string,
  username: string
): Promise<Flashcard[] | null> {
  // Extract topic from request
  const topic = await extractTopic(ai, prompt, chatHistory);
  console.log(`🏷️ Extracted topic: "${topic}"`);

  if (!topic) {
    return null;
  }

  // Query flashcards with normalized path
  const flashcardResults = await handleFlashcardQuery({
    topic,
    classroomId: classroomID,
    documentId: normalizedDocID,
    username,
    maxResults: 10,
  });

  console.log(`🃏 Flashcard query returned ${flashcardResults?.flashcards?.length || 0} flashcards`);

  // If flashcards found, return them directly
  if (flashcardResults?.flashcards?.length > 0) {
    console.log(`✅ Returning ${flashcardResults.flashcards.length} flashcards`);
    return flashcardResults.flashcards;
  }

  return null;
}

/**
 * Ask the AI a question about educational content
 */
async function askAI(classroomID: number, documentID: string, prompt: string, username: string): Promise<string | Flashcard[]> {
  console.log(`🤖 Processing AI request for classroom ${classroomID}, document ${documentID}`);
  console.log(`📝 Prompt: "${prompt}"`);

  // Always normalize document ID if it's a string
  const normalizedDocID = typeof documentID === "string" ? normalizePath(documentID) : documentID;

  // Log normalization results
  if (normalizedDocID !== documentID) {
    console.log(`🔄 Normalized document path: "${normalizedDocID}"`);
  }

  // Create a session key to maintain conversation context
  const sessionKey = `${username}:${classroomID}:${normalizedDocID}`;

  // Initialize chat session if it doesn't exist
  if (!chatSessions[sessionKey]) {
    chatSessions[sessionKey] = [];
    console.log(`📝 Creating new chat session for ${sessionKey}`);
  }

  try {
    // Initialize the AI client
    const ai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com" : undefined,
    });

    // Check if this is a flashcard request
    const isFlashcardRequest = detectFlashcardRequest(prompt);
    console.log(`🔍 Flashcard request: ${isFlashcardRequest ? "Yes" : "No"}`);

    // Add user message to chat history
    chatSessions[sessionKey].push({ role: "user", content: prompt });

    // For flashcard requests, try to get flashcards directly first
    if (isFlashcardRequest) {
      const flashcards = await processFlashcardRequest(ai, prompt, chatSessions[sessionKey], classroomID, normalizedDocID, username);

      if (flashcards) {
        return flashcards; // Return flashcards directly without any AI consultation
      }

      // If we couldn't find flashcards, continue with normal AI flow to generate an explanation
      console.log("No flashcards found, continuing with general AI consultation");
    }

    // For non-flashcard requests, expand the query for better results
    let expandedPrompt = prompt;
    if (!isFlashcardRequest) {
      expandedPrompt = await expandQuery(ai, prompt);
      console.log(`🔄 Expanded query: "${expandedPrompt}"`);

      // Query the document content with normalized path
      const documentResults = await handleDocumentQuery({
        query: expandedPrompt,
        classroomId: classroomID,
        documentId: normalizedDocID,
        username,
        topK: 5,
      });
      console.log(`📚 Document query returned ${documentResults?.results?.length || 0} results`);
    }

    // Call AI with tools
    const initialResponse = await ai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-3.5-turbo",
      messages: [...chatSessions[sessionKey]],
      tools: [
        {
          type: "function",
          function: {
            name: documentQueryTool.function.name,
            description: documentQueryTool.function.description,
            parameters: documentQueryTool.function.parameters,
          },
        },
        {
          type: "function",
          function: {
            name: flashcardQueryTool.function.name,
            description: flashcardQueryTool.function.description,
            parameters: flashcardQueryTool.function.parameters,
          },
        },
      ],
    });

    const aiMessage = initialResponse.choices[0].message;
    console.log(`🤖 AI response received, tool calls: ${aiMessage.tool_calls?.length || 0}`);

    // Add AI response to chat history
    chatSessions[sessionKey].push({
      role: "assistant",
      content: aiMessage.content || "",
      ...(aiMessage.tool_calls && { tool_calls: aiMessage.tool_calls }),
    });

    // Handle tool calls if present
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      const toolResponses: { role: string; tool_call_id: string; content: string }[] = [];

      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.type === "function") {
          const { name, arguments: argsString } = toolCall.function;
          const args = JSON.parse(argsString);
          console.log(`🔧 Tool call: ${name} with args:`, args);

          // Add classroom/document context with normalized path
          args.classroomId = classroomID;
          args.documentId = normalizedDocID;
          args.username = username;

          let result;
          if (name === "queryDocumentContent") {
            result = await handleDocumentQuery(args);
          } else if (name === "queryFlashcards") {
            result = await handleFlashcardQuery(args);

            // If flashcards found, return them directly without additional AI processing
            if (result?.flashcards?.length > 0) {
              console.log(`✅ Returning ${result.flashcards.length} flashcards from tool call`);
              return result.flashcards;
            }
          }

          // Create tool response message
          const toolResponseMessage = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result || {}),
          };

          // Add to chat history
          chatSessions[sessionKey].push(toolResponseMessage);
          toolResponses.push(toolResponseMessage);
        }
      }

      // Get final response with tool results
      const finalResponse = await ai.chat.completions.create({
        model: process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-3.5-turbo",
        messages: chatSessions[sessionKey],
      });

      const finalContent = finalResponse.choices[0].message.content || "";
      console.log(`✅ Final response generated (${finalContent.length} chars)`);

      // Add final assistant response to chat
      chatSessions[sessionKey].push({
        role: "assistant",
        content: finalContent,
      });

      return finalContent;
    }

    // Return direct response if no tool calls
    return aiMessage.content || "I couldn't process your request.";
  } catch (error) {
    console.error(`❌ Error in askAI:`, error);
    console.error(`❌ Error stack:`, error.stack);
    return `Sorry, I encountered an error: ${error.message}`;
  }
}

/**
 * Detect if the user is requesting flashcards
 */
function detectFlashcardRequest(query: string): boolean {
  const flashcardKeywords = ["flashcard", "flash card", "study card", "quiz me", "test me", "review", "show me some questions", "practice questions"];

  return flashcardKeywords.some((keyword) => query.toLowerCase().includes(keyword));
}

/**
 * Expand a query to include related terms
 */
async function expandQuery(ai: OpenAI, query: string): Promise<string> {
  try {
    const response = await ai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Expand this educational query to include related key terms. Return ONLY the expanded query.",
        },
        { role: "user", content: query },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    return response.choices[0].message.content?.trim() || query;
  } catch (error) {
    console.error(`❌ Query expansion failed:`, error);
    return query;
  }
}

export { askAI };

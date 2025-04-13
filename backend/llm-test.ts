import { OpenAI } from "openai";
import { documentQueryTool, flashcardQueryTool, handleDocumentQuery, handleFlashcardQuery } from "./tools/knowledge-query-tools/query-tool.ts";
import { generateEmbeddings } from "./book-parser/parse.ts";
import dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";

// Load environment variables
dotenv.config();
console.log("🔧 Environment variables loaded");

// Chat history storage
interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface ChatSession {
  chatId: string;
  messages: ChatMessage[];
  classroomId: string;
  documentId: string;
  lastActive: number;
}

// Global chat storage
const chats: Record<string, Record<string, ChatSession>> = {};

// Initialize the API clients
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
console.log("🔑 OpenAI client initialized");

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});
console.log("🔑 DeepSeek client initialized");

/**
 * Create or retrieve a chat session
 */
function getChatSession(username: string, chatId: string, classroomId: string, documentId: string): ChatSession {
  console.log(`🔍 Getting chat session for user: ${username}, chatId: ${chatId}`);

  if (!chats[username]) {
    console.log(`📝 Creating new user record for ${username}`);
    chats[username] = {};
  }

  if (!chats[username][chatId]) {
    console.log(`📝 Creating new chat session ${chatId} for user ${username}`);
    chats[username][chatId] = {
      chatId,
      messages: [],
      classroomId,
      documentId,
      lastActive: Date.now(),
    };
  } else {
    console.log(`📝 Retrieved existing chat session with ${chats[username][chatId].messages.length} message(s)`);
  }

  return chats[username][chatId];
}

/**
 * Add a message to the chat history
 */
function addMessageToChat(session: ChatSession, role: string, content: string, tool_calls?: any[], tool_call_id?: string) {
  console.log(`📝 Adding ${role} message to chat ${session.chatId}`);

  const message: ChatMessage = {
    role,
    content,
    timestamp: Date.now(),
    ...(tool_calls && { tool_calls }),
    ...(tool_call_id && { tool_call_id }),
  };

  session.messages.push(message);
  session.lastActive = Date.now();

  if (role === "user") {
    console.log(`👤 User message: "${content.substring(0, 100)}${content.length > 100 ? "..." : ""}"`);
  } else if (role === "assistant") {
    console.log(`🤖 Assistant message: "${content.substring(0, 100)}${content.length > 100 ? "..." : ""}"`);
    if (tool_calls) {
      console.log(`🛠️ Assistant included ${tool_calls.length} tool call(s)`);
    }
  } else if (role === "tool") {
    console.log(`🔧 Tool response for call ID: ${tool_call_id}`);
    console.log(`🔧 Tool response content (truncated): ${content.substring(0, 150)}${content.length > 150 ? "..." : ""}`);
  }

  return message;
}

/**
 * Format messages for LLM input
 */
function formatMessagesForLLM(messages: ChatMessage[]): any[] {
  console.log(`🔄 Formatting ${messages.length} messages for LLM input`);

  const formattedMessages = messages.map((msg) => {
    if (msg.role === "tool") {
      return {
        role: msg.role,
        tool_call_id: msg.tool_call_id,
        content: msg.content,
      };
    } else {
      return {
        role: msg.role,
        content: msg.content,
        ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      };
    }
  });

  console.log(`🔄 Formatted message roles: ${formattedMessages.map((m) => m.role).join(", ")}`);
  return formattedMessages;
}

/**
 * Extract topics from chat history for flashcard generation
 */
async function extractTopicsFromChat(messages: ChatMessage[]): Promise<string[]> {
  console.log(`🧠 Extracting topics from ${messages.length} chat messages`);

  // Join all user and assistant messages to create context
  const chatContext = messages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  console.log(`📊 Created chat context of ${chatContext.length} characters`);

  try {
    console.log(`🔄 Calling DeepSeek API to extract topics`);
    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are an educational topic extractor. Analyze the chat history and identify the main educational topics being discussed. Return ONLY a JSON array of topic strings. Focus on specific concepts, not general categories.",
        },
        { role: "user", content: chatContext },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    console.log(`📊 Topic extraction raw response: ${content}`);

    if (!content) {
      console.log(`⚠️ No content returned from topic extraction`);
      return [];
    }

    const parsed = JSON.parse(content);
    console.log(`📊 Parsed topic extraction result:`, parsed);

    if (Array.isArray(parsed.topics)) {
      const topics = parsed.topics.slice(0, 3);
      console.log(`📋 Extracted ${topics.length} topics: ${topics.join(", ")}`);
      return topics;
    }

    console.log(`⚠️ No topics array found in response`);
    return [];
  } catch (error) {
    console.error(`❌ Failed to extract topics:`, error);
    return [];
  }
}

/**
 * Expand a user query to be more comprehensive for better search results
 */
async function expandUserQuery(query: string): Promise<string> {
  console.log(`🔍 Expanding user query: "${query}"`);

  try {
    console.log(`🔄 Calling DeepSeek API to expand query`);
    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at expanding search queries. Your task is to take a user's educational query and expand it to include related key terms and concepts to improve search results. Return ONLY the expanded query without any explanations or additional text.",
        },
        { role: "user", content: query },
      ],
      temperature: 0.3,
      max_tokens: 150,
    });

    const expandedQuery = response.choices[0].message.content?.trim() || query;
    console.log(`🔍 Original: "${query}"\n🔎 Expanded: "${expandedQuery}"`);
    return expandedQuery;
  } catch (error) {
    console.error(`❌ Query expansion failed:`, error);
    return query; // Fall back to original query
  }
}

/**
 * Detect if the user is requesting flashcards
 */
function isFlashcardRequest(query: string): boolean {
  const flashcardKeywords = ["flashcard", "flash card", "study card", "quiz me", "test me", "review", "show me some questions", "practice questions"];

  const lowerQuery = query.toLowerCase();
  const isFlashcard = flashcardKeywords.some((keyword) => lowerQuery.includes(keyword));

  console.log(`🔍 Flashcard request detection: ${isFlashcard ? "Yes" : "No"}`);
  if (isFlashcard) {
    console.log(`🔍 Matched flashcard keywords: ${flashcardKeywords.filter((k) => lowerQuery.includes(k)).join(", ")}`);
  }

  return isFlashcard;
}

/**
 * Process a user message using our enhanced workflow
 */
export async function processUserMessage(message: string, username: string, chatId: string, classroomId: string, documentId: string): Promise<string> {
  console.log(`\n===== PROCESSING NEW MESSAGE =====`);
  console.log(`👤 User: ${username}`);
  console.log(`💬 Chat: ${chatId}`);
  console.log(`📚 ClassroomId: ${classroomId}, DocumentId: ${documentId}`);
  console.log(`📝 Message: "${message}"`);

  try {
    // Get or create chat session
    const chatSession = getChatSession(username, chatId, classroomId, documentId);

    // Add user message to chat history
    addMessageToChat(chatSession, "user", message);

    // Create tools array with our document and flashcard tools
    const tools = [documentQueryTool, flashcardQueryTool];
    console.log(`🛠️ Available tools: ${tools.map((t) => t.function.name).join(", ")}`);

    // Determine if this is a flashcard request
    const isFlashcardReq = isFlashcardRequest(message);

    let initialPrompt = message;
    let queryResults = null;

    // If this is a flashcard request, extract topics and query flashcards
    if (isFlashcardReq) {
      console.log(`🃏 Processing flashcard request workflow`);

      // Extract topics from the chat history
      const topics = await extractTopicsFromChat(chatSession.messages);

      if (topics.length > 0) {
        // Use first topic for query
        const mainTopic = topics[0];
        console.log(`🎯 Selected main topic for flashcards: "${mainTopic}"`);

        // Query flashcards
        console.log(`🔄 Querying flashcards for topic: "${mainTopic}"`);
        queryResults = await handleFlashcardQuery({
          topic: mainTopic,
          classroomId,
          documentId,
          username,
          maxResults: 10,
        });
        console.log(`📊 Flashcard query returned:`, queryResults);

        // Add context about the topic to the message
        initialPrompt = `I want to study about ${mainTopic} using flashcards. ${message}`;
        console.log(`🔄 Enhanced prompt: "${initialPrompt}"`);
      } else {
        console.log(`⚠️ No topics extracted, using original message`);
      }
    } else {
      console.log(`📚 Processing standard document query workflow`);

      // For non-flashcard requests, expand the query for better results
      const expandedQuery = await expandUserQuery(message);

      // Query the document database with the expanded query
      console.log(`🔄 Querying document content with expanded query`);
      queryResults = await handleDocumentQuery({
        query: expandedQuery,
        classroomId,
        documentId,
        username,
        topK: 5,
      });
      console.log(`📊 Document query returned ${queryResults?.results?.length || 0} results`);
      console.log(`📊 First result snippet: ${queryResults?.results?.[0]?.content?.substring(0, 100) || "none"}`);

      // Update with expanded query
      initialPrompt = expandedQuery;
    }

    // Initial call to the LLM with our tools
    console.log(`🤖 Making initial LLM call with tools`);
    const formattedMessages = formatMessagesForLLM(chatSession.messages.slice(-10));
    console.log(`📤 Sending ${formattedMessages.length} messages to LLM`);

    const response = await deepseekClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [...formattedMessages, { role: "user", content: initialPrompt }],
      tools: tools.map((tool) => ({
        type: "function" as const,
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      })),
    });

    let aiMessage = response.choices[0].message;
    console.log(`📥 Received LLM response`);
    console.log(`🤖 AI content: "${aiMessage.content?.substring(0, 100) || "empty"}${aiMessage.content?.length > 100 ? "..." : ""}"`);
    console.log(`🛠️ Tool calls: ${aiMessage.tool_calls?.length || 0}`);

    // Add AI response to chat
    const savedMessage = addMessageToChat(chatSession, "assistant", aiMessage.content || "", aiMessage.tool_calls);

    // If the AI wants to call a tool
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      console.log(`🔧 Processing ${aiMessage.tool_calls.length} tool call(s)`);

      // Process each tool call
      for (const toolCall of aiMessage.tool_calls) {
        if (toolCall.type === "function") {
          const { name, arguments: argsString } = toolCall.function;

          console.log(`⚙️ Tool call: ${name}`);
          console.log(`📝 Tool args: ${argsString}`);

          const args = JSON.parse(argsString);
          console.log(`📝 Parsed args:`, args);

          let result;
          if (name === "queryDocumentContent") {
            // Make sure we're using the correct classroom/document IDs
            args.classroomId = classroomId;
            args.documentId = documentId;
            args.username = username;

            console.log(`🔍 Calling document query with args:`, args);
            result = await handleDocumentQuery(args);
          } else if (name === "queryFlashcards") {
            // Make sure we're using the correct classroom/document IDs
            args.classroomId = classroomId;
            args.documentId = documentId;
            args.username = username;

            console.log(`🃏 Calling flashcard query with args:`, args);
            result = await handleFlashcardQuery(args);
          }

          console.log(`✅ Tool "${name}" completed`);
          console.log(`📊 Result summary: ${JSON.stringify(result).substring(0, 150)}...`);

          // Add tool result to chat
          const toolResponse = JSON.stringify(result);
          addMessageToChat(chatSession, "tool", toolResponse, undefined, toolCall.id);
        }
      }

      // Get final response incorporating tool results
      console.log(`🔄 Making final LLM call to incorporate tool results`);
      const finalFormattedMessages = formatMessagesForLLM(chatSession.messages);
      console.log(`📤 Sending ${finalFormattedMessages.length} messages (including tool results) to LLM`);

      const finalResponse = await deepseekClient.chat.completions.create({
        model: "deepseek-chat",
        messages: finalFormattedMessages,
      });

      const finalMessage = finalResponse.choices[0].message.content || "";
      console.log(`📥 Received final LLM response`);
      console.log(`🤖 Final response (truncated): "${finalMessage.substring(0, 150)}${finalMessage.length > 150 ? "..." : ""}"`);

      // Update the AI's message with the final response
      savedMessage.content = finalMessage;
      console.log(`✅ Updated AI message in chat history`);

      return finalMessage;
    } else {
      // If no tools were called
      console.log(`ℹ️ No tools were called, returning direct AI response`);
      return aiMessage.content || "I'm not sure how to respond to that.";
    }
  } catch (error) {
    console.error(`❌ ERROR processing message:`, error);
    console.error(`❌ Error stack:`, error.stack);
    return `Sorry, I encountered an error: ${error.message}`;
  }
}

/**
 * Save chat history to disk
 */
export async function persistChats(): Promise<void> {
  console.log(`💾 Persisting chats to disk...`);
  try {
    const dataDir = path.join(process.cwd(), "data", "chats");
    console.log(`📁 Creating directory: ${dataDir}`);
    await fs.mkdir(dataDir, { recursive: true });

    let userCount = 0;
    let chatCount = 0;

    for (const username in chats) {
      userCount++;
      const userDir = path.join(dataDir, username);
      console.log(`📁 Creating user directory: ${userDir}`);
      await fs.mkdir(userDir, { recursive: true });

      for (const chatId in chats[username]) {
        chatCount++;
        const chatFilePath = path.join(userDir, `${chatId}.json`);
        console.log(`💾 Writing chat file: ${chatFilePath}`);
        await fs.writeFile(chatFilePath, JSON.stringify(chats[username][chatId], null, 2));
      }
    }

    console.log(`✅ Successfully persisted ${chatCount} chats for ${userCount} users`);
  } catch (error) {
    console.error(`❌ Failed to persist chats:`, error);
    console.error(`❌ Error stack:`, error.stack);
  }
}

/**
 * Load chat history from disk
 */
export async function loadChats(): Promise<void> {
  console.log(`📂 Loading chats from disk...`);
  try {
    const dataDir = path.join(process.cwd(), "data", "chats");
    console.log(`🔍 Looking for chat directory: ${dataDir}`);

    try {
      await fs.access(dataDir);
      console.log(`✅ Chat directory exists`);
    } catch {
      console.log(`ℹ️ No chat directory found at ${dataDir}`);
      return;
    }

    const userDirs = await fs.readdir(dataDir);
    console.log(`📂 Found ${userDirs.length} user directories`);

    let totalChatsLoaded = 0;

    for (const username of userDirs) {
      const userDir = path.join(dataDir, username);
      const stats = await fs.stat(userDir);

      if (!stats.isDirectory()) {
        console.log(`⚠️ Skipping non-directory: ${userDir}`);
        continue;
      }

      console.log(`📂 Processing user directory: ${username}`);
      const chatFiles = await fs.readdir(userDir);
      console.log(`📂 Found ${chatFiles.length} chat files for user ${username}`);

      chats[username] = {};

      for (const file of chatFiles) {
        if (!file.endsWith(".json")) {
          console.log(`⚠️ Skipping non-JSON file: ${file}`);
          continue;
        }

        const chatFilePath = path.join(userDir, file);
        console.log(`📂 Loading chat file: ${chatFilePath}`);
        const chatData = await fs.readFile(chatFilePath, "utf8");
        const chatId = file.replace(".json", "");

        try {
          chats[username][chatId] = JSON.parse(chatData);
          console.log(`✅ Loaded chat ${chatId} with ${chats[username][chatId].messages.length} messages`);
          totalChatsLoaded++;
        } catch (e) {
          console.error(`❌ Error parsing chat file ${chatFilePath}:`, e);
        }
      }
    }

    console.log(`✅ Successfully loaded ${totalChatsLoaded} chats`);
  } catch (error) {
    console.error(`❌ Failed to load chats:`, error);
    console.error(`❌ Error stack:`, error.stack);
  }
}

// Example usage function
export async function exampleChat() {
  console.log(`\n===== STARTING EXAMPLE CHAT =====`);
  const username = "student1";
  const chatId = "calculus-study-session";
  const classroomId = "math101";
  const documentId = "calculus_textbook";

  // Start with a regular query
  console.log(`\n----- EXAMPLE QUERY 1: FUNDAMENTAL THEOREM -----`);
  let response = await processUserMessage("Can you explain the fundamental theorem of calculus?", username, chatId, classroomId, documentId);

  console.log(`\n🤖 FINAL RESPONSE:`);
  console.log(response);

  // Then ask for some flashcards
  console.log(`\n----- EXAMPLE QUERY 2: FLASHCARD REQUEST -----`);
  response = await processUserMessage("I'd like some flashcards to help me study this topic", username, chatId, classroomId, documentId);

  console.log(`\n🤖 FINAL RESPONSE (FLASHCARDS):`);
  console.log(response);

  // Finally, ask a follow-up question
  console.log(`\n----- EXAMPLE QUERY 3: FOLLOW-UP QUESTION -----`);
  response = await processUserMessage("Can you explain the relationship between derivatives and integrals?", username, chatId, classroomId, documentId);

  console.log(`\n🤖 FINAL RESPONSE (FOLLOW-UP):`);
  console.log(response);

  // Save chat history
  console.log(`\n----- SAVING CHAT HISTORY -----`);
  await persistChats();

  console.log(`\n===== EXAMPLE CHAT COMPLETED =====`);
}

// Uncomment to run the example
loadChats().then(() => exampleChat());

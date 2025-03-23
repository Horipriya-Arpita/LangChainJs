
// chatService.js
import { config } from "dotenv";
import { ConversationChain } from "langchain/chains";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Load environment variables
config();

// Initialize the chat AI
const chat = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

// Set up the prompt template for the conversation
const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "The following is a friendly conversation between a human and an AI. If the AI does not know the answer to a question, it truthfully says it does not know."
  ),
  new MessagesPlaceholder("history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

// Create the conversation chain
const chain = new ConversationChain({
  memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }),
  prompt: chatPrompt,
  llm: chat,
});

const chatFolder = "./chats"; // Define folder name

// Create the folder if it doesn't exist
if (!fs.existsSync(chatFolder)) {
  fs.mkdirSync(chatFolder);
}

// Function to save chat history to a file
const saveChatHistory = (chatId, conversationHistory) => {
  const filePath = `${chatFolder}/chat_history_${chatId}.json`;
  fs.writeFileSync(filePath, JSON.stringify(conversationHistory, null, 2));
};

// Function to load chat history from a file
const loadChatHistory = (chatId) => {
  const filePath = `${chatFolder}/chat_history_${chatId}.json`;
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return [];
};

// Function to handle the conversation with the AI
const chatWithAI = async (chatId, userInput) => {
  let conversationHistory = loadChatHistory(chatId);

  // Inject history into AI memory
  for (const message of conversationHistory) {
    if (message.role === "human") {
      await chain.memory.saveContext({ input: message.message }, { output: "..." });
    } else if (message.role === "ai") {
      await chain.memory.saveContext({ input: "..." }, { output: message.message });
    }
  }

  // Get the AI's response
  const response = await chain.call({ input: userInput });

  // Add the new message to the conversation history
  conversationHistory.push({ role: "human", message: userInput });
  conversationHistory.push({ role: "ai", message: response.response });

  // Save chat history
  saveChatHistory(chatId, conversationHistory);

  return response.response;
};

export { chatWithAI };

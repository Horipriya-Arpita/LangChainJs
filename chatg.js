import { config } from "dotenv";
config();

import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import readline from "readline";
import fs from "fs";
import { v4 as uuidv4 } from "uuid"; 

import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";


// const chat = new ChatOpenAI({
//     openAIApiKey: process.env.OPENAI_API_KEYY, 
//     temperature: 0 
// });

const chat = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",  // Use Gemini Pro model
  apiKey: process.env.GOOGLE_API_KEY, // Set up your API key
  temperature: 0.7,  // Adjust as needed
});


const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "The following is a friendly conversation between a human and an AI.You If the AI does not know the answer to a question, it truthfully says it does not know."
  ),
  new MessagesPlaceholder("history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

const chain = new ConversationChain({
  memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }),
  prompt: chatPrompt,
  llm: chat,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const chatFolder = "./chats"; // Define folder name

// Create the folder if it doesn't exist
if (!fs.existsSync(chatFolder)) {
  fs.mkdirSync(chatFolder);
}
  
const saveChatHistory = (chatId, conversationHistory) => {

  const filePath = `${chatFolder}/chat_history_${chatId}.json`;
  fs.writeFileSync(filePath, JSON.stringify(conversationHistory, null, 2));
  
};


const loadChatHistory = (chatId) => {

  const filePath = `${chatFolder}/chat_history_${chatId}.json`;

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return [];

};

async function main() {

  let chatId = uuidv4(); // Generate a new chatId by default

  // Check for existing chat sessions

  const existingChats = fs
  .readdirSync(chatFolder)
  .filter(file => file.startsWith("chat_history_") && file.endsWith(".json"));


  if (existingChats.length > 0) {
    console.log("Existing chat sessions:");
    existingChats.forEach((file, index) => console.log(`${index + 1}: ${file}`));

    const choice = await new Promise((resolve) => {
      rl.question("Enter the number of the chat you want to resume or press Enter for a new chat: ", resolve);
    });

    if (choice && !isNaN(choice) && choice >= 1 && choice <= existingChats.length) {
      chatId = existingChats[choice - 1].replace("chat_history_", "").replace(".json", "");
      console.log(`Resuming chat session: ${chatId}`);
    } else {
      console.log(`Starting a new chat session: ${chatId}`);
    }
  } else {
    console.log(`No previous chats found. Starting a new chat session: ${chatId}`);
  }


  let conversationHistory = loadChatHistory(chatId);
  
  //  Inject history into AI memory so it knows past context
  for (const message of conversationHistory) {
    if (message.role === "human") {
      await chain.memory.saveContext({ input: message.message }, { output: "..." }); // Placeholder to prevent errors
    } else if (message.role === "ai") {
      await chain.memory.saveContext({ input: "..." }, { output: message.message }); // Placeholder for missing input
    }
  }
  
  

  console.log("\n[Chat History Successfully Loaded into Memory!]");
  
  console.log(`Chat ID: ${chatId}`);
  console.log("Previous chat history loaded.\n");


  // Simulate a conversation loop
  while (true) {
    const userInput = await new Promise((resolve) => {
      rl.question("You: ", resolve); // Taking user input from the console
    });

    if (userInput.toLowerCase() === "exit") {
      console.log("Goodbye!");
      break; // End the conversation when user types 'exit'
    }

    // Add the human message to the conversation history
    conversationHistory.push({ role: "human", message: userInput });

    // Call the chain to get the AI's response
    const response = await chain.call({
      input: userInput,
    });

    // Add the AI's response to the conversation history
    conversationHistory.push({ role: "ai", message: response.response });

    // Display AI's response
    console.log("AI: " + response.response);
    
    saveChatHistory(chatId, conversationHistory); // Save after each message

  //console.log("\n[Chat History in Memory]:", await chain.memory.loadMemoryVariables({}));
  console.log("-----------------------------------");

  }
}
  
main();
  
  
import express from "express";
import { config } from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";

// Load environment variables
config();

const app = express();
app.use(express.json());

// Initialize the chat AI
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash-exp",
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0.7,
});

// Set up the prompt template for the conversation
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "The following is a friendly conversation between a human and an AI. If the AI does not know the answer to a question, it truthfully says it does not know.",
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

const chain = prompt.pipe(model).pipe(new StringOutputParser());

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history",
  getMessageHistory: async (sessionId) => {
    const chatHistory = new FileSystemChatMessageHistory({
      sessionId,
      userId: "user-id", // You can customize this as per your user management
    });
    return chatHistory;
  },
});

app.get("/", (req, res) => {
  res.send("AI Chat API is running");
});

// Chat endpoint to communicate with the AI
app.post("/chat", async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: "No user input provided" });
  }

  const chatId = req.body.chatId || uuidv4();

  try {
    const aiResponse = await chainWithHistory.invoke(
      { input: userInput },
      { configurable: { sessionId: chatId } }
    );
    res.json({ chatId, aiResponse });
  } catch (error) {
    console.error("Error during AI conversation:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/chat/:chatId/messages", async (req, res) => {
    const { chatId } = req.params;
  
    try {
      const chatHistory = new FileSystemChatMessageHistory({
        sessionId: chatId,
        userId: "user-id",
      });
      const messages = await chatHistory.getMessages();
      res.json({ chatId, messages });
    } catch (error) {
      console.error("Error getting session messages:", error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
import express from "express";
import { config } from "dotenv";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { Calculator } from "@langchain/community/tools/calculator";
import { Tool } from "langchain/tools"; // Import Tool
import axios from "axios"; // Import axios for making HTTP requests
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from 'fs/promises'; // Import fs/promises


config();

const app = express();
app.use(express.json());


class DocumentQATool extends Tool {
  name = "document_qa";
  description = "Answers questions from a provided document.";
  chain = null; // Initialize the chain as null

  async _call(input){
    if (!this.chain) {
      return "Document not loaded. Please load a document first.";
    }
    try {
      const response = await this.chain.call({ query: input });
      return response.text;
    } catch (error) {
      return `Error answering question: ${error.message}`;
    }
  }

  async loadDocument(filePath) {
    try {
      let loader;
      if (filePath.toLowerCase().endsWith(".pdf")) {
        loader = new PDFLoader(filePath);
      } else if (filePath.toLowerCase().endsWith(".txt")) {
        loader = new TextLoader(filePath);
      } else {
        return "Unsupported file type. Please provide a PDF or TXT file.";
      }
      const docs = await loader.load();
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splits = await textSplitter.splitDocuments(docs);
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEYY });
      const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);

      this.chain = RetrievalQAChain.fromLLM(new ChatOpenAI({ openAIApiKey: process.env.OPENAI_API_KEYY, model: "gpt-3.5-turbo-1106" }), vectorStore.asRetriever());
      return "Document loaded successfully.";
    } catch (error) {
      return `Error loading document: ${error.message}`;
    }
  }
}

const documentQATool = new DocumentQATool();


const tools = [

  documentQATool,
];

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant. If the user asks for a doctor list, use the available tool. If the user asks to schedule an appointment, use the schedule_appointment tool.`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);


const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEYY,
  model: "gpt-3.5-turbo-1106",
  temperature: 0.2,
});

const agent = await createOpenAIToolsAgent({
  llm,
  tools,
  prompt,
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
  returnIntermediateSteps: true,
});

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: agentExecutor,
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history",
  getMessageHistory: async (sessionId) => {
    const chatHistory = new FileSystemChatMessageHistory({
      sessionId,
      userId: "user-id2",
    });
    return chatHistory;
  },
});

app.get("/", async (req, res) => {
  
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
    const response = await chainWithHistory.invoke(
      { input: userInput },
      { configurable: { sessionId: chatId } }
    );

    res.json({ chatId, aiResponse: response.output });
  } catch (error) {
    console.error("Error during AI conversation:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Endpoint to get previous session messages
app.get("/chat/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;

  try {
    const chatHistory = new FileSystemChatMessageHistory({
      sessionId: chatId,
      userId: "user-id2",
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
app.listen(port, async () => {
  const loadResult = await documentQATool.loadDocument("Company Profile.txt"); // Replace with your document path
  console.log(loadResult);
  console.log(`Server running on http://localhost:${port}`);
});

import { config } from "dotenv";
config();

import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { Calculator } from "@langchain/community/tools/calculator";
import { Tool } from "langchain/tools"; // Import Tool
import axios from "axios"; // Import axios for making HTTP requests
//import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import * as fs from 'fs/promises'; // Import fs/promises



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


//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
const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful AI assistant."],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),  // ✅ Add agent_scratchpad
  ]);

const llm = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEYY,
    model: "gpt-3.5-turbo-1106",
    temperature: 0,
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
  
  const loadResult = await documentQATool.loadDocument("Company Profile.txt"); // Replace with your document path
  console.log(loadResult);

  const result = await agentExecutor.invoke({
    input: "Where is the Company's global headquarter located?",
    chat_history: [],
  });
  
  console.log(result);

  if (result.intermediateSteps) {
    console.log("\nIntermediate Steps:");
    result.intermediateSteps.forEach((step, index) => {
      console.log(`Step ${index + 1}:`);
      console.log(`  Action: ${step.action.tool}`);
      console.log(`  Input: ${step.action.toolInput}`);
      console.log(`  Observation: ${step.observation}`);
      console.log("---");
    });
  }

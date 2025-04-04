import * as dotenv from "dotenv";
dotenv.config();

import readline from "readline";

import { ChatOpenAI } from "@langchain/openai";
//import { ChatOpenAI } from "@langchain/community/chat_models/openai";

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import { HumanMessage, AIMessage } from "@langchain/core/messages";

import { createOpenAIFunctionsAgent, AgentExecutor } from "langchain/agents";

// Tool imports
//import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { createRetrieverTool } from "langchain/tools/retriever";

// Custom Data Source, Vector Stores
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
//import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";

// Create Retriever
const loader = new CheerioWebBaseLoader(
  "https://www.geeksforgeeks.org/what-is-software-development/"
);
const docs = await loader.load();

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,
  chunkOverlap: 20,
});

const splitDocs = await splitter.splitDocuments(docs);

//const embeddings = new OpenAIEmbeddings();
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocs,
  embeddings
);

const retriever = vectorStore.asRetriever({
  k: 2,
});

// Instantiate the model
const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-3.5-turbo-1106",
    temperature: 0.2,
});

// Prompt Template
const prompt = ChatPromptTemplate.fromMessages([
  ("system", "You are a helpful assistant."),
  new MessagesPlaceholder("chat_history"),
  ("human", "{input}"),
  new MessagesPlaceholder("agent_scratchpad"),
]);

// Tools
//const searchTool = new TavilySearchResults();
const retrieverTool = createRetrieverTool(retriever, {
  name: "lcel_search",
  description:
    "Use this tool when searching for information about software development",
});

const tools = [retrieverTool];

const agent = await createOpenAIFunctionsAgent({
  llm: model,
  prompt,
  tools,
});

// Create the executor
// const agentExecutor = new AgentExecutor({
//   agent,
//   tools,
// });
const agentExecutor = new AgentExecutor({
  agentType: "openai-functions", // ✅ Set agent type explicitly
  llm: model,
  tools,
  verbose: true, // ✅ Helps debug
});


// User Input

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const chat_history = [];

function askQuestion() {
  rl.question("User: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    const response = await agentExecutor.invoke({
      input: input,
      chat_history: chat_history,
    });

    console.log("Agent: ", response.output);

    chat_history.push(new HumanMessage(input));
    chat_history.push(new AIMessage(response.output));

    askQuestion();
  });
}

askQuestion();
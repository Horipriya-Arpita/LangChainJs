
import { config } from "dotenv";
config();

import { AgentExecutor, createOpenAIToolsAgent } from "langchain/agents";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { Tool } from "langchain/tools";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

class WebpageQATool extends Tool {
  name = "webpage_qa";
  description = "Provide informations from a provided webpage URL.";
  chain = null;
  extractedText = "";

  async _call(input) {
    if (!this.chain) {
      return "Webpage not loaded. Please load a webpage first.";
    }
    try {
      const response = await this.chain.call({ query: input });
      return `Answer: ${response.text}\nExtracted Text:\n${this.extractedText}`;
    } catch (error) {
      return `Error answering question: ${error.message}`;
    }
  }

  async loadWebpage(url) {
    try {
      const loader = new CheerioWebBaseLoader(url);
      const docs = await loader.load();
      let extractedText = docs.map((doc) => doc.pageContent).join("\n");
      extractedText = extractedText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      this.extractedText = extractedText;
      //console.log("Extracted Text:", this.extractedText);

      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200, // Increased chunkOverlap
      });
      const splits = await textSplitter.splitDocuments(docs);
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEYY });
      const vectorStore = await MemoryVectorStore.fromDocuments(splits, embeddings);

      this.chain = RetrievalQAChain.fromLLM(new ChatOpenAI({ openAIApiKey: process.env.OPENAI_API_KEYY, model: "gpt-3.5-turbo-1106" }), vectorStore.asRetriever());
      return "Webpage loaded successfully.";
    } catch (error) {
      return `Error loading webpage: ${error.message}`;
    }
  }
}

const webpageQATool = new WebpageQATool();

const tools = [webpageQATool];

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful AI assistant. Use the provided webpage text to answer questions."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEYY,
  model: "gpt-3.5-turbo-1106",
  temperature: 0.5,
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

async function main() {
  const loadWebpageResult = await webpageQATool.loadWebpage("https://js.langchain.com/docs/introduction/");
  console.log(loadWebpageResult);

  const result = await agentExecutor.invoke({
    input: `Give 1 line answer, what is the webpage main topic?`,
    chat_history: [],
  });

  console.log(result.output);

  if (result.intermediateSteps) {
    console.log("\nIntermediate Steps:");
    result.intermediateSteps.forEach((step, index) => {
      console.log(`Step ${index + 1}:`);
      console.log(`  Action: ${step.action.tool}`);
      //console.log(`  Input: ${step.action.toolInput}`);
      //console.log(`  Observation: ${step.observation}`);
      console.log("---");
    });
  }
}

main();
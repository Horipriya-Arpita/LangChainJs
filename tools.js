
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

class DoctorListTool extends Tool {
    name = "doctor_list";
    description = "Fetches a list of doctors from a specified webhook URL.";
  
    async _call(input){
      try {
        const response = await axios.get("https://9f961dc0390d4179baa1213de1265682.api.mockbin.io/"); // Replace with your mockbin URL
        if (response.status === 200 && response.data) {
          return JSON.stringify(response.data); // Return the JSON data as a string
        } else {
          return `Failed to fetch doctor list. Status: ${response.status}`;
        }
      } catch (error) {
        return `Error fetching doctor list: ${error.message}`;
      }
    }
  }


  class DoctorAppointmentTool extends Tool {
    name = "doctor_appointment";
    description = "Sets an appointment with a doctor using provided patient's name and phone number extracted from text.";
  
    async _call(input) {
      try {
        // Use OpenAI (or another NLP service) to extract name and phone
        const extractionResult = await this.extractNameAndPhone(input);
  
        if (!extractionResult || !extractionResult.name || !extractionResult.phone) {
          return "Could not reliably extract name and phone number from the input.";
        }
  
        const { name, phone } = extractionResult;
  
        const response = await axios.post(
          "https://8848abc78e7b41fe932f16177d4c312c.api.mockbin.io/", // Replace with your mockbin POST URL
          { name, phone }
        );
  
        if (response.status === 200) {
          return `Appointment set successfully for ${name} with phone ${phone}.`;
        } else {
          return `Failed to set appointment. Status: ${response.status}`;
        }
      } catch (error) {
        return `Error setting appointment: ${error.message}`;
      }
    }
  
    async extractNameAndPhone(text) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEYY}`, // Replace with your OpenAI API key
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo-1106',
            messages: [
              {
                role: 'user',
                content: `Extract the name and phone number from the following text and return it as JSON: { "name": "string", "phone": "string"}. \nText: ${text}\nJSON:`,
              },
            ],
          }),
        });
  
        if (!response.ok) {
          throw new Error(`OpenAI API error! status: ${response.status}`);
        }
  
        const data = await response.json();
        const jsonString = data.choices[0].message.content.trim();
        return JSON.parse(jsonString);
  
      } catch (error) {
        console.error("Extraction error:", error);
        return null;
      }
    }
  }
  
const tools = [
    //new TavilySearchResults({ maxResults: 1, apiKey: process.env.TAVILY_API_KEY }),
    //new Calculator(),
    //new DoctorListTool(),
    new DoctorAppointmentTool(),
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
  
  const result = await agentExecutor.invoke({
    input: 'My name is Arpita and my phone number is 01726899601',
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

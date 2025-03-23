import express from "express";
import { config } from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { Tool } from "@langchain/core/tools";
import { AgentExecutor, createStructuredChatAgent } from "langchain/agents";

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

// Define the doctor list tool
class DoctorListTool extends Tool {
  name = "doctor_list";
  description = "Useful for when you need to retrieve a list of available doctors.";

  async _call(input) {
    try {
      const response = await axios.get(
        "https://9f961dc0390d4179baa1213de1265682.api.mockbin.io/"
      );
      return JSON.stringify(response.data);
    } catch (error) {
      console.error("Error fetching doctor list:", error);
      return "Could not retrieve doctor list.";
    }
  }
}

// Define the appointment scheduling tool
class ScheduleAppointmentTool extends Tool {
  name = "schedule_appointment";
  description = "Useful for scheduling an appointment with a doctor. Input should be doctor's name and date.";

  async _call(input) {
    try {
      // Simulate scheduling an appointment (replace with actual logic)
      const appointmentDetails = JSON.parse(input);
      const { doctorName, date } = appointmentDetails;
      const result = `Appointment scheduled with ${doctorName} on ${date}.`;
      return result;
    } catch (error) {
      console.error("Error scheduling appointment:", error);
      return "Could not schedule appointment. Please provide doctor's name and date.";
    }
  }
}

const tools = [new DoctorListTool(), new ScheduleAppointmentTool()];

// Set up the prompt template for the conversation
const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant. If the user asks for a doctor list, use the available tool. If the user asks to schedule an appointment, use the schedule_appointment tool.`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

const agent = await createStructuredChatAgent(model, tools, prompt, {
  inputVariables: ["input", "chat_history", "agent_scratchpad"],
});

const agentExecutor = new AgentExecutor({ agent, tools });

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: agentExecutor,
  inputMessagesKey: "input",
  historyMessagesKey: "chat_history",
  getMessageHistory: async (sessionId) => {
    const chatHistory = new FileSystemChatMessageHistory({
      sessionId,
      userId: "user-id",
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
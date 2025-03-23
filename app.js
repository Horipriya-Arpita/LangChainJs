// // // app.js
// // import express from 'express';
// // import { config } from 'dotenv';
// // config();

// // import { chatWithAI } from './chatService'; 

// // const app = express();
// // const port = 3000;

// // // Middleware to parse JSON request bodies
// // app.use(express.json());

// // // Example route to check the server is running
// // app.get('/', (req, res) => {
// //   res.send('AI Chat API is running');
// // });


// // // POST endpoint to handle user input and interact with AI
// // app.post('/chat', async (req, res) => {
// //     try {
// //       const { chatId, userInput } = req.body;
  
// //       if (!userInput) {
// //         return res.status(400).json({ error: 'User input is required' });
// //       }
  
// //       // If no chatId is provided, create a new one
// //       const newChatId = chatId || uuidv4();
  
// //       // Call the chat service to interact with the AI
// //       const aiResponse = await chatWithAI(newChatId, userInput);
  
// //       // Respond with the AI's message and chatId for future interactions
// //       res.json({ chatId: newChatId, aiResponse });
// //     } catch (error) {
// //       console.error('Error during chat interaction:', error);
// //       res.status(500).json({ error: 'Something went wrong' });
// //     }
// //   });

// // // Start the server
// // app.listen(port, () => {
// //   console.log(`Server is running at http://localhost:${port}`);
// // });

// // app.js
// import express from 'express';
// import { config } from 'dotenv';

// import { chatWithAI } from './chatService';
// config();

// const app = express();
// const port = 3000;

// // Middleware to parse JSON request bodies
// app.use(express.json());

// app.get('/', (req, res) => {
//   res.send('AI Chat API is running');
// });

// app.use((req, res, next) => {
//     console.log(`Request received: ${req.method} ${req.url}`);
//     next();
//   });  

// // POST endpoint to handle user input and interact with AI
// app.post('/chat', async (req, res) => {
//   try {
//     const { chatId, userInput } = req.body;

//     if (!userInput) {
//       return res.status(400).json({ error: 'User input is required' });
//     }

//     // If no chatId is provided, create a new one
//     const newChatId = chatId || uuidv4();

//     // Call the chat service to interact with the AI
//     const aiResponse = await chatWithAI(newChatId, userInput);

//     // Respond with the AI's message and chatId for future interactions
//     res.json({ chatId: newChatId, aiResponse });
//   } catch (error) {
//     console.error('Error during chat interaction:', error);
//     res.status(500).json({ error: 'Something went wrong' });
//   }
// });

// // Start the server
// app.listen(port, () => {
//   console.log(`Server is running at http://localhost:${port}`);
// });

// app.js
import express from "express";
import { chatWithAI } from "./chatServiceN.js"; // Import chat service module

import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(express.json()); // Middleware to parse JSON request bodies

app.get('/', (req, res) => {
  res.send('AI Chat API is running');
});

// Chat endpoint to communicate with the AI
app.post("/chat", async (req, res) => {
  const { userInput } = req.body;

  if (!userInput) {
    return res.status(400).json({ error: "No user input provided" });
  }

  const chatId = req.body.chatId || uuidv4(); // If no chatId provided, create a new one

  try {
    const aiResponse = await chatWithAI(chatId, userInput);
    res.json({ chatId, aiResponse });
  } catch (error) {
    console.error("Error during AI conversation:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


import * as dotenv from 'dotenv';
dotenv.config();
import { ChatOpenAI } from "@langchain/openai";


const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEYY,
    modelName: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 100,
    verbose: true,
});


const response = await model.invoke("Hello");

console.log(response);


// const model = new ChatOpenAI({
//     openAIApiKey: "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",

// })

// const model = new ChatOpenAI({})



//const response = await model.batch(["Hello", "How are you?"]);

//console.log(response);

// const response = await model.stream("Write a poem about AI");

// for await (const chunk of response) {
//     console.log(chunk?.content);
// }

// const response = await model.streamLog("Write a poem about AI");

// for await (const chunk of response) {
//     console.log(chunk);
// }
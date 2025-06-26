const axios = require("axios");

console.log(`[GPT] Loading gpt.js from: ${__dirname}`);

const API_KEY = "7eac9dce-b646-4ad1-8148-5b58eddaa2cc";
const BASE_URL = "https://kaiz-apis.gleeze.com/api/gpt-4o";

async function fetchGptResponse(query, userId) {
 const endpoints = [
 `${BASE_URL}?ask=${encodeURIComponent(query)}&uid=${userId}&webSearch=true&apikey=${API_KEY}`,
 `${BASE_URL}?ask=${encodeURIComponent(query)}&uid=${userId}&webSearch=Nepal&apikey=${API_KEY}`,
 `${BASE_URL}?ask=${encodeURIComponent(query)}&uid=${userId}&apikey=${API_KEY}`,
 `${BASE_URL}?ask=${encodeURIComponent(query)}&apikey=${API_KEY}`,
 ];

 for (const [index, apiUrl] of endpoints.entries()) {
 console.log(`[GPT] Attempting endpoint ${index + 1}/${endpoints.length}: ${apiUrl}`);
 try {
 const response = await retryRequest(apiUrl, 3, 1000);
 const data = response.data;
 console.log(`[GPT] API Response from ${apiUrl}: ${JSON.stringify(data, null, 2)}`);
 console.log(`[GPT] Response Headers: ${JSON.stringify(response.headers, null, 2)}`);

 const textResponse = data?.response ||
 data?.data?.response ||
 data?.answer ||
 data?.data?.answer ||
 data?.text ||
 data?.data?.text ||
 data?.result ||
 data?.data?.result ||
 findTextResponse(data);

 if (!textResponse) {
 console.log(`[GPT] No valid response found in API data from ${apiUrl}`);
 continue;
 }

 if (typeof textResponse !== "string" || textResponse.trim() === "") {
 console.log(`[GPT] Invalid response format: ${textResponse}`);
 continue;
 }

 return textResponse;
 } catch (error) {
 console.error(`[GPT] Endpoint ${apiUrl} failed: ${error.message}`);
 if (index === endpoints.length - 1) {
 throw error;
 }
 }
 }
 throw new Error("No valid response found in any endpoint.");
}

function findTextResponse(obj) {
 if (typeof obj !== "object" || obj === null) return null;
 for (const key in obj) {
 const value = obj[key];
 if (typeof value === "string" && value.trim() !== "") {
 return value;
 } else if (typeof value === "object") {
 const nestedResponse = findTextResponse(value);
 if (nestedResponse) return nestedResponse;
 }
 }
 return null;
}

async function retryRequest(url, retries = 3, delay = 1000) {
 for (let i = 0; i < retries; i++) {
 try {
 return await axios.get(url, { timeout: 30000 });
 } catch (error) {
 const status = error.response?.status;
 const message = error.message || "Unknown error";
 console.error(`[GPT] Request to ${url} failed (attempt ${i + 1}/${retries}): ${status} - ${message}`);
 if (status === 429 && i < retries - 1) {
 console.log(`[GPT] Rate limit hit, retrying in ${delay}ms...`);
 await new Promise(resolve => setTimeout(resolve, delay));
 continue;
 }
 throw error;
 }
 }
}

async function handleGptCommand(api, event, args) {
 const { threadID, messageID, senderID } = event;
 const query = args.join(" ").trim() || "Hello";

 try {
 console.log(`[GPT] Command received: query=${query}, senderID=${senderID}, threadID=${threadID}, messageID=${messageID}`);

 // React ⏳
 api.setMessageReaction("⏳", messageID, (err) => {
 if (err) console.error(`[GPT] Reaction ⏳ error: ${err.message}`);
 }, true);

 const responseText = await fetchGptResponse(query, senderID);

 console.log(`[GPT] Sending response: ${responseText.substring(0, 100)}...`);

 await api.sendMessage(
 `GPT-4o says: ${responseText}`,
 threadID,
 (err) => {
 if (err) {
 console.error(`[GPT] Send message error: ${err.message}`);
 api.sendMessage("❌ Failed to send GPT-4o response.", threadID, messageID);
 api.setMessageReaction("❌", messageID, () => {}, true);
 } else {
 api.setMessageReaction("✅", messageID, () => {}, true);
 }
 },
 messageID
 );

 } catch (error) {
 console.error(`[GPT] Error: ${error.message}`);
 const status = error.response?.status;
 let errorMessage;
 if (status === 400) {
 errorMessage = "Bad request. The API key or parameters may be incorrect. Contact kaiz-apis.gleeze.com for support.";
 } else if (status === 403) {
 errorMessage = "Invalid API key. Please verify the key with kaiz-apis.gleeze.com.";
 } else if (status === 404) {
 errorMessage = "API endpoint not found. Contact kaiz-apis.gleeze.com for the correct endpoint.";
 } else if (status === 429) {
 errorMessage = "API rate limit exceeded. Please try again later.";
 } else {
 errorMessage = error.message || "❌ Sorry, couldn’t get a response from GPT-4o. Try again!";
 }
 await api.sendMessage(errorMessage, threadID, messageID);
 api.setMessageReaction("❌", messageID, (err) => {
 if (err) console.error(`[GPT] Reaction ❌ error: ${err.message}`);
 }, true);
 }
}

module.exports = {
 config: {
 name: "gpt",
 version: "1.0.1",
 author: "Lord Itachi",
 countDown: 5,
 role: 0, // Open to all users
 shortDescription: "Ask GPT-4o a question",
 longDescription: "Use this command to get responses from GPT-4o via kaiz-apis.gleeze.com, similar to neko.",
 category: "ai",
 guide: "{pn} <question> (e.g., {pn}gpt What is the capital of Nepal?)"
 },

 onStart: async function ({ api, event, args }) {
 return handleGptCommand(api, event, args);
 },

 onLoad: async function () {
 console.log(`[GPT] Command loaded successfully`);
 }
};
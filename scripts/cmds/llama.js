const axios = require("axios");

console.log(`[LLAMA] Loading llama.js from: ${__dirname}`);

const UID = "100088286122703";

module.exports = {
  config: {
    name: "llama",
    version: "1.0.0",
    author: "Lord Itachi",
    countDown: 5,
    role: 0,
    shortDescription: "AI chat triggered by replying to the bot with Llama",
    longDescription: "Reply to the bot with a message to get an AI response using Llama, or use !llama <prompt> directly.",
    category: "ai",
    guide: "Reply to the bot with your question or prompt (e.g., 'Hii llama'), or use !llama <prompt>."
  },

  onStart: async function () {
    console.log(`[LLAMA] llama.js initialized`);
  },

  onChat: async function ({ api, event, message }) {
    try {
      console.log(`[LLAMA] Chat event: body=${event.body}, messageID=${event.messageID}, threadID=${event.threadID}, hasReply=${!!event.messageReply}`);

      let prompt = null;

      // Check if message is a reply to the bot
      const botID = api.getCurrentUserID();
      console.log(`[LLAMA] Bot ID: ${botID}, Reply: ${JSON.stringify(event.messageReply || {})}`);

      if (event.messageReply && event.messageReply.senderID === botID) {
        prompt = event.body?.trim();
        console.log(`[LLAMA] Detected reply to bot with prompt: ${prompt}`);
      } else if (event.body && event.body.toLowerCase().startsWith("llama ")) {
        // Fallback trigger for testing
        prompt = event.body.slice(6).trim();
        console.log(`[LLAMA] Detected 'llama' keyword with prompt: ${prompt}`);
      } else {
        console.log(`[LLAMA] No reply to bot or 'llama' keyword`);
        return;
      }

      if (!prompt) {
        console.log(`[LLAMA] Empty prompt`);
        await message.reply("Please provide a prompt by replying with text or using 'llama <prompt>'.");
        return;
      }

      console.log(`[LLAMA] Processing prompt: ${prompt}`);

      // React ⏳
      api.setMessageReaction("⏳", event.messageID, (err) => {
        if (err) console.error(`[LLAMA] Reaction ⏳ error: ${err.message}`);
      }, true);

      // Encode prompt
      const encodedPrompt = encodeURIComponent(prompt);
      const apiUrl = `https://dev-priyanshi.onrender.com/api/llama?uid=${UID}&prompt=${encodedPrompt}`;

      // API request
      const response = await retryRequest(apiUrl, 3, 1000);
      console.log(`[LLAMA] API Response: ${JSON.stringify(response.data, null, 2).slice(0, 200)}...`);

      // Extract response
      const aiResponse = response.data?.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                         response.data?.response ||
                         response.data?.data?.response ||
                         findTextResponse(response.data);

      if (!aiResponse || typeof aiResponse !== "string" || aiResponse.trim() === "") {
        throw new Error("No valid response found.");
      }

      console.log(`[LLAMA] Sending response: ${aiResponse}`);

      // Send response
      await message.reply(aiResponse);

      // React ✅
      api.setMessageReaction("✅", event.messageID, (err) => {
        if (err) console.error(`[LLAMA] Reaction ✅ error: ${err.message}`);
      }, true);

    } catch (err) {
      console.error(`[LLAMA] Error: ${err.message}`);
      const errorMessage = err.response?.status === 429
        ? "API rate limit exceeded. Please try again later."
        : `Sorry, I couldn’t process that. Try again!`;
      await message.reply(errorMessage);
      api.setMessageReaction("❌", event.messageID, (err) => {
        if (err) console.error(`[LLAMA] Reaction ❌ error: ${err.message}`);
      }, true);
    }
  }
};

// Helper to find text response
function findTextResponse(obj) {
  if (typeof obj !== "object" || obj === null) return null;
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    } else if (typeof value === "object") {
      const nestedText = findTextResponse(value);
      if (nestedText) return nestedText;
    }
  }
  return null;
}

// Retry request with delay
async function retryRequest(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, { timeout: 30000 });
    } catch (error) {
      const status = error.response?.status;
      const message = error.message || "Unknown error";
      console.error(`[LLAMA] Request to ${url} failed (attempt ${i + 1}/${retries}): ${status} - ${message}`);
      if (status === 429 && i < retries - 1) {
        console.log(`[LLAMA] Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
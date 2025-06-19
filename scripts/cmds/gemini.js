const axios = require("axios");

console.log(`[GEMINI] Loading gemini.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "gemini",
    version: "1.0.1",
    author: "Lord Itachi",
    countDown: 5,
    role: 0,
    shortDescription: "AI chat using Gemini",
    longDescription: "Use the Gemini AI to get responses by typing !gemini <prompt>.",
    category: "ai",
    guide: "!gemini <prompt> (e.g., !gemini Heyy)"
  },

  onStart: async function ({ api, event, message, args }) {
    try {
      console.log(`[GEMINI] Command received: args=${args.join(" ")}, threadID=${event.threadID}, messageID=${event.messageID}`);

      const prompt = args.join(" ").trim();
      if (!prompt) {
        console.log(`[GEMINI] Empty prompt`);
        await message.reply("Please provide a prompt (e.g., !gemini Heyy).");
        return;
      }

      console.log(`[GEMINI] Processing prompt: ${prompt}`);

      // React ⏳
      api.setMessageReaction("⏳", event.messageID, (err) => {
        if (err) console.error(`[GEMINI] Reaction ⏳ error: ${err.message}`);
      }, true);

      // Encode prompt
      const encodedPrompt = encodeURIComponent(prompt);
      const apiUrl = `https://dev-priyanshi.onrender.com/api/gemini?prompt=${encodedPrompt}`;

      // API request
      const response = await retryRequest(apiUrl, 3, 1000);
      console.log(`[GEMINI] API Response: ${JSON.stringify(response.data, null, 2).slice(0, 200)}...`);

      // Validate and extract response
      if (!response.data.status) {
        throw new Error("API returned unsuccessful status.");
      }

      const aiResponse = response.data?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!aiResponse || typeof aiResponse !== "string" || aiResponse.trim() === "") {
        throw new Error("No valid response found.");
      }

      console.log(`[GEMINI] Sending response: ${aiResponse}`);

      // Send response
      await message.reply(aiResponse);

      // React ✅
      api.setMessageReaction("✅", event.messageID, (err) => {
        if (err) console.error(`[GEMINI] Reaction ✅ error: ${err.message}`);
      }, true);

    } catch (err) {
      console.error(`[GEMINI] Error: ${err.message}`);
      const errorMessage = err.response?.status === 429
        ? "API rate limit exceeded. Please try again later."
        : `Sorry, I couldn’t process that. Try again!`;
      await message.reply(errorMessage);
      api.setMessageReaction("❌", event.messageID, (err) => {
        if (err) console.error(`[GEMINI] Reaction ❌ error: ${err.message}`);
      }, true);
    }
  }
};

// Retry request with delay
async function retryRequest(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, { timeout: 30000 });
    } catch (error) {
      const status = error.response?.status;
      const message = error.message || "Unknown error";
      console.error(`[GEMINI] Request to ${url} failed (attempt ${i + 1}/${retries}): ${status} - ${message}`);
      if (status === 429 && i < retries - 1) {
        console.log(`[GEMINI] Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
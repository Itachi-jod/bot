const axios = require("axios");

module.exports = {
  config: {
    name: "pol",
    version: "3.2",
    author: "Lord Itachi",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "🎨 Generate AI images"
    },
    longDescription: {
      en: "Generates images from text using AI without an API key."
    },
    category: "ai",
    guide: {
      en: "{p}flux <prompt>\nExample: {p}flux a cyberpunk samurai in neon city"
    }
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ");
    if (!prompt) {
      return api.sendMessage("❌ Please provide a prompt to generate an image.", event.threadID, event.messageID);
    }

    try {
      // React with ⏳ while processing
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
      const imgRes = await axios.get(imageUrl, { responseType: 'stream' });

      await api.sendMessage({
        body: `🖼️ Here's your AI image for: "${prompt}"`,
        attachment: imgRes.data
      }, event.threadID, event.messageID);

      // ✅ when done
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (err) {
      console.error("Image Gen Error:", err.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("❌ Failed to generate image. Try again later.", event.threadID, event.messageID);
    }
  }
};

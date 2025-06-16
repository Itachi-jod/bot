const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[FLUX] Loading flux.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "flux",
    aliases: ["aiimg", "imagegen"],
    version: "1.1.0",
    author: "Lord Itachi",
    role: 0,
    countDown: 10,
    shortDescription: {
      en: "Generate AI image from text prompt"
    },
    category: "ai",
    guide: {
      en: "{prefix}flux <your prompt>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const prompt = args.join(" ");
    const threadID = event.threadID;
    const messageID = event.messageID;
    const tempFiles = [];

    if (!prompt) {
      return api.sendMessage("❗ Please provide a prompt.\nExample: flux a llama on mars", threadID, messageID);
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/flux?prompt=${encodeURIComponent(prompt)}&apikey=7eac9dce-b646-4ad1-8148-5b58eddaa2cc`;
      console.log(`[FLUX] Fetching from API: ${apiUrl}`);

      const response = await axios.get(apiUrl, { responseType: "arraybuffer" });

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      const imgPath = path.join(cacheDir, `flux_${Date.now()}.png`);
      await fs.outputFile(imgPath, response.data);
      tempFiles.push(imgPath);

      await api.sendMessage({
        attachment: fs.createReadStream(imgPath),
        body: `🖼 Prompt: ${prompt}`
      }, threadID, () => {
        tempFiles.forEach(file => fs.unlink(file).catch(e => console.error(`[FLUX] Error deleting: ${e.message}`)));
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } catch (error) {
      console.error(`[FLUX] Error: ${error.message}`, error.stack);
      api.sendMessage("❌ Failed to generate image. Try again later.", threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  },

  onLoad: async function () {
    try {
      const cacheDir = path.join(__dirname, "cache");
      console.log(`[FLUX] onLoad: Ensuring cache directory at ${cacheDir}`);
      await fs.ensureDir(cacheDir);
    } catch (error) {
      console.error(`[FLUX] Error in onLoad: ${error.message}`);
    }
  }
};

const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

console.log(`[IMGUR] Loading imgur.js from: ${__dirname}`);

const API_KEY = process.env.IMGUR_API_KEY || "7eac9dce-b646-4ad1-8148-5b58eddaa2cc";
const CACHE_DIR = path.join(os.tmpdir(), "imgur_cache");

module.exports = {
  config: {
    name: "imgur",
    aliases: ["imgurupload", "uploadimgur"],
    version: "1.0.1",
    author: "Lord Itachi",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Upload replied image to Imgur and get the URL"
    },
    category: "image",
    guide: {
      en: "{prefix}imgur (reply to an image)"
    }
  },

  onStart: async function ({ api, event }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const tempFiles = [];

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      await fs.ensureDir(CACHE_DIR);

      // Validate reply
      const reply = event.messageReply;
      if (!reply || !reply.attachments || reply.attachments.length === 0) {
        throw new Error("Please reply to an image.");
      }

      const image = reply.attachments[0];
      if (image.type !== "photo") {
        throw new Error("The replied message must be an image.");
      }

      const imageUrl = image.url;
      console.log(`[IMGUR] Image URL: ${imageUrl}`);

      // Fetch image data to validate
      const imageData = await retryRequest(imageUrl, 3, 1000, { responseType: "arraybuffer" });
      if (!imageData.headers["content-type"]?.startsWith("image/")) {
        throw new Error("Invalid response: Not an image.");
      }

      // Save image temporarily
      const fileName = `imgur_${Date.now()}.jpg`;
      const filePath = path.join(CACHE_DIR, fileName);
      await fs.writeFile(filePath, imageData.data);
      tempFiles.push(filePath);

      if (!(await fs.pathExists(filePath))) {
        throw new Error("Failed to save image file.");
      }

      // Upload to Imgur via API
      const encodedImageUrl = encodeURIComponent(imageUrl);
      const imgurApi = `https://kaiz-apis.gleeze.com/api/imgur?url=${encodedImageUrl}&apikey=${API_KEY}`;
      const imgurRes = await retryRequest(imgurApi, 3, 1000);

      if (!imgurRes.data?.uploaded?.image) {
        let errorMessage = "Unknown error";
        if (imgurRes.data?.error) {
          errorMessage = imgurRes.data.error;
        } else if (imgurRes.headers["content-type"]?.includes("application/json")) {
          errorMessage = JSON.stringify(imgurRes.data);
        }
        throw new Error(`Failed to upload to Imgur: ${errorMessage}`);
      }

      const imgurUrl = imgurRes.data.uploaded.image;
      if (!imgurUrl.startsWith("https://i.imgur.com/")) {
        throw new Error("Invalid Imgur URL received.");
      }
      console.log(`[IMGUR] Imgur URL: ${imgurUrl}`);

      // Send only Imgur URL
      await api.sendMessage(imgurUrl, threadID, (err) => {
        if (err) {
          console.error(`[IMGUR] Send message error: ${err.message}`);
          api.sendMessage(`Failed to send Imgur URL: ${err.message}`, threadID, messageID);
          api.setMessageReaction("❌", messageID, () => {}, true);
        } else {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }
        cleanupFiles(tempFiles);
      }, messageID);

    } catch (err) {
      console.error(`[IMGUR] Error: ${err.message}`);
      const errorMessage = err.response?.status === 429
        ? "API rate limit exceeded. Please try again later."
        : `Failed to upload image: ${err.message}`;
      api.sendMessage(errorMessage, threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      cleanupFiles(tempFiles);
    }
  },

  onLoad: async function () {
    try {
      await fs.ensureDir(CACHE_DIR);
      console.log(`[IMGUR] Cache directory ready: ${CACHE_DIR}`);
    } catch (e) {
      console.error(`[IMGUR] Cache setup failed: ${e.message}`);
    }
  }
};

async function retryRequest(url, retries = 3, delay = 1000, options = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, options);
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        console.log(`[IMGUR] Rate limit hit, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

async function cleanupFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file);
    } catch (err) {
      console.error(`[IMGUR] Cleanup error: ${err.message}`);
      setTimeout(() => fs.unlink(file).catch(() => {}), 5000);
    }
  }
      }

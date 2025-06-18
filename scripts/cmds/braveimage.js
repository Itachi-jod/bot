const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

console.log(`[BRAVEIMAGE] Loading braveimage.js from: ${__dirname}`);

const API_KEY = process.env.BRAVEIMAGE_API_KEY || "7eac9dce-b646-4ad1-8148-5b58eddaa2cc";
const CACHE_DIR = path.join(os.tmpdir(), "braveimage_cache");

module.exports = {
  config: {
    name: "braveimage",
    aliases: ["braveimg", "bie"],
    version: "1.0.0",
    author: "Lord Itachi",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Get a random kitten image"
    },
    category: "fun",
    guide: {
      en: "{prefix}braveimage"
    }
  },

  onStart: async function ({ api, event }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const tempFiles = [];

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      await fs.ensureDir(CACHE_DIR);

      let imageUrl = null;
      let source = "Primary API";

      // Try primary API
      try {
        const apiUrl = `https://kaiz-apis.gleeze.com/api/brave-image?search=kitten&limit=1&apikey=${API_KEY}`;
        const response = await retryRequest(apiUrl, 3, 1000);

        console.log(`[BRAVEIMAGE] Primary API Response: ${JSON.stringify(response.data)}`);

        if (!response.data || response.data.status === "error") {
          throw new Error(response.data?.error || JSON.stringify(response.data) || "Unknown error");
        }

        // Extract image URL
        imageUrl = response.data.image || 
                   response.data.url || 
                   response.data.image_url || 
                   response.data.data?.image || 
                   response.data.results?.[0]?.image || 
                   response.data.kitten_image || 
                   findImageUrl(response.data);

        if (!imageUrl) {
          throw new Error("No image URL found in primary API response.");
        }
      } catch (error) {
        console.error(`[BRAVEIMAGE] Primary API failed: ${error.message}`);
        source = "Fallback API (waifu.pics)";

        // Fallback to waifu.pics API
        const fallbackUrl = `https://api.waifu.pics/sfw/neko`;
        const fallbackResponse = await retryRequest(fallbackUrl, 3, 1000);

        console.log(`[BRAVEIMAGE] Fallback API Response: ${JSON.stringify(fallbackResponse.data)}`);

        imageUrl = fallbackResponse.data.url;
        if (!imageUrl) {
          throw new Error("No image URL found in fallback API response.");
        }
      }

      console.log(`[BRAVEIMAGE] Image URL: ${imageUrl}`);

      // Download image
      const imageResponse = await retryRequest(imageUrl, 3, 1000, { responseType: "arraybuffer" });
      if (!imageResponse.headers["content-type"]?.startsWith("image/")) {
        throw new Error("Invalid image response.");
      }

      // Check image size (<10MB)
      if (imageResponse.data.length > 10 * 1024 * 1024) {
        throw new Error("Image size exceeds 10MB limit.");
      }

      // Save image
      const fileName = `braveimage_${Date.now()}.jpg`;
      const filePath = path.join(CACHE_DIR, fileName);
      await fs.writeFile(filePath, imageResponse.data);
      tempFiles.push(filePath);

      if (!(await fs.pathExists(filePath))) {
        throw new Error("Failed to save image.");
      }

      // Send image
      await api.sendMessage({
        body: "Here’s your brave image!",
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        if (err) {
          console.error(`[BRAVEIMAGE] Send message error: ${err.message}`);
          api.sendMessage(`Failed to send brave image: ${err.message}`, threadID, messageID);
          api.setMessageReaction("❌", messageID, () => {}, true);
        } else {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }
        cleanupFiles(tempFiles);
      }, messageID);

    } catch (err) {
      console.error(`[BRAVEIMAGE] Error: ${err.message}`);
      const errorMessage = err.response?.status === 429
        ? "API rate limit exceeded. Please try again later."
        : `Failed to fetch brave image: ${err.message}`;
      api.sendMessage(errorMessage, threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      cleanupFiles(tempFiles);
    }
  },

  onLoad: async function () {
    try {
      await fs.ensureDir(CACHE_DIR);
      console.log(`[BRAVEIMAGE] Cache directory ready: ${CACHE_DIR}`);
    } catch (e) {
      console.error(`[BRAVEIMAGE] Cache setup failed: ${e.message}`);
    }
  }
};

// Helper to find image URL in unknown response
function findImageUrl(obj) {
  if (typeof obj !== "object" || obj === null) return null;
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "string" && value.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return value;
    } else if (typeof value === "object") {
      const nestedUrl = findImageUrl(value);
      if (nestedUrl) return nestedUrl;
    }
  }
  return null;
}

async function retryRequest(url, retries = 3, delay = 1000, options = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, options);
    } catch (error) {
      const status = error.response?.status;
      const message = error.message || "Unknown error";
      console.error(`[BRAVEIMAGE] Request to ${url} failed (attempt ${i + 1}/${retries}): ${status} - ${message}`);
      if (status === 429 && i < retries - 1) {
        console.log(`[BRAVEIMAGE] Rate limit hit, retrying in ${delay}ms...`);
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
      console.error(`[BRAVEIMAGE] Cleanup error: ${err.message}`);
      setTimeout(() => fs.unlink(file).catch(() => {}), 5000);
    }
  }
}

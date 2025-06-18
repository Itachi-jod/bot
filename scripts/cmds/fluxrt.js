const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

console.log(`[FLUXRT] Loading fluxrt.js from: ${__dirname}`);

const API_KEY = process.env.FLUXRT_API_KEY || "7eac9dce-b646-4ad1-8148-5b58eddaa2cc";
const CACHE_DIR = path.join(os.tmpdir(), "fluxrt_cache");

module.exports = {
  config: {
    name: "fluxrt",
    aliases: ["fluxrealtime", "genimage"],
    version: "1.0.1",
    author: "Lord Itachi",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Generate an image based on a prompt"
    },
    category: "fun",
    guide: {
      en: "{prefix}fluxrt <prompt> (e.g., {prefix}fluxrt Super hero)"
    }
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const tempFiles = [];

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      await fs.ensureDir(CACHE_DIR);

      // Get prompt from args, default to "Super hero"
      const prompt = args.join(" ").trim() || "Super hero";
      let imageUrl = null;
      let source = "Primary API";

      // Start timer
      const startTime = process.hrtime();

      // Try primary API
      try {
        const encodedPrompt = encodeURIComponent(prompt);
        const apiUrl = `https://kaiz-apis.gleeze.com/api/flux-realtime?prompt=${encodedPrompt}&stream=5&apikey=${API_KEY}`;
        const response = await retryRequest(apiUrl, 3, 1000);

        console.log(`[FLUXRT] Primary API Response: ${JSON.stringify(response.data)}`);

        if (!response.data || response.data.status === "error") {
          throw new Error(response.data?.error || JSON.stringify(response.data) || "Unknown error");
        }

        // Extract image URL
        imageUrl = response.data.image || 
                   response.data.url || 
                   response.data.image_url || 
                   response.data.data?.image || 
                   response.data.results?.[0]?.image || 
                   response.data.generated_image || 
                   findImageUrl(response.data);

        if (!imageUrl) {
          throw new Error("No image URL found in primary API response.");
        }
      } catch (error) {
        console.error(`[FLUXRT] Primary API failed: ${error.message}`);
        source = "Fallback API (waifu.pics)";

        // Fallback to waifu.pics API
        const fallbackUrl = `https://api.waifu.pics/sfw/shinobu`;
        const fallbackResponse = await retryRequest(fallbackUrl, 3, 1000);

        console.log(`[FLUXRT] Fallback API Response: ${JSON.stringify(fallbackResponse.data)}`);

        imageUrl = fallbackResponse.data.url;
        if (!imageUrl) {
          throw new Error("No image URL found in fallback API response.");
        }
      }

      console.log(`[FLUXRT] Image URL: ${imageUrl}`);

      // Download image
      const imageResponse = await retryRequest(imageUrl, 3, 1000, { responseType: "arraybuffer" });
      if (!imageResponse.headers["content-type"]?.startsWith("image/")) {
        throw new Error("Invalid image response.");
      }

      // Check image size (<10MB)
      if (imageResponse.data.length > 10 * 1024 * 1024) {
        throw new Error("Image size exceeds 10MB limit.");
      }

      // End timer
      const endTime = process.hrtime(startTime);
      const generationTime = (endTime[0] + endTime[1] / 1e9).toFixed(2); // Seconds, 2 decimals

      // Save image
      const fileName = `fluxrt_${Date.now()}.jpg`;
      const filePath = path.join(CACHE_DIR, fileName);
      await fs.writeFile(filePath, imageResponse.data);
      tempFiles.push(filePath);

      if (!(await fs.pathExists(filePath))) {
        throw new Error("Failed to save image.");
      }

      // Send image
      await api.sendMessage({
        body: `Here’s your image (Generated in ${generationTime} seconds)`,
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        if (err) {
          console.error(`[FLUXRT] Send message error: ${err.message}`);
          api.sendMessage(`Failed to send generated image: ${err.message}`, threadID, messageID);
          api.setMessageReaction("❌", messageID, () => {}, true);
        } else {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }
        cleanupFiles(tempFiles);
      }, messageID);

    } catch (err) {
      console.error(`[FLUXRT] Error: ${err.message}`);
      const errorMessage = err.response?.status === 429
        ? "API rate limit exceeded. Please try again later."
        : `Failed to fetch generated image: ${err.message}`;
      api.sendMessage(errorMessage, threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      cleanupFiles(tempFiles);
    }
  },

  onLoad: async function () {
    try {
      await fs.ensureDir(CACHE_DIR);
      console.log(`[FLUXRT] Cache directory ready: ${CACHE_DIR}`);
    } catch (e) {
      console.error(`[FLUXRT] Cache setup failed: ${e.message}`);
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
      console.error(`[FLUXRT] Request to ${url} failed (attempt ${i + 1}/${retries}): ${status} - ${message}`);
      if (status === 429 && i < retries - 1) {
        console.log(`[FLUXRT] Rate limit hit, retrying in ${delay}ms...`);
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
      console.error(`[FLUXRT] Cleanup error: ${err.message}`);
      setTimeout(() => fs.unlink(file).catch(() => {}), 5000);
    }
  }
          }

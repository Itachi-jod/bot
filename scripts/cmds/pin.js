const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[PIN] Loading pin.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "pin",
    aliases: ["pinterest"],
    version: "1.0.9",
    author: "ItachiInx1de",
    role: 0,
    countDown: 10,
    shortDescription: {
      en: "Search images on Pinterest"
    },
    category: "image",
    guide: {
      en: "{prefix}pin <search query> <count>\nExample: {prefix}pin cats -3"
    }
  },

  onStart: async function ({ api, event, args }) {
    const tempFiles = [];

    try {
      if (!args.length) {
        return api.sendMessage(`❌ | Please provide a search query.\nExample: {prefix}pin cats -3`, event.threadID, event.messageID);
      }

      let query = args.join(" ");
      let count = 1;

      // Detect "-<count>" or trailing number
      const dashIndex = query.lastIndexOf("-");
      if (dashIndex !== -1) {
        const possibleNum = parseInt(query.substring(dashIndex + 1).trim());
        if (!isNaN(possibleNum)) {
          count = possibleNum;
          query = query.substring(0, dashIndex).trim();
        }
      } else {
        const lastArg = args[args.length - 1];
        const possibleNum = parseInt(lastArg);
        if (!isNaN(possibleNum)) {
          count = possibleNum;
          query = args.slice(0, -1).join(" ");
        }
      }

      if (count <= 0 || count > 25) {
        return api.sendMessage("❌ | Please specify a number between 1 and 25.", event.threadID, event.messageID);
      }

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);

      // API call
      const apiUrl = `https://pin-api-itachi.vercel.app/api/pinterest?q=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl, { timeout: 30000 });

      // Extract all possible URLs
      const imageUrls = extractImageUrls(response.data);
      if (!imageUrls.length) {
        return api.sendMessage(`❌ | No images found for "${query}".`, event.threadID, event.messageID);
      }

      const imgData = [];
      for (let i = 0; i < Math.min(count, imageUrls.length); i++) {
        const imageUrl = imageUrls[i];
        try {
          const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30000 });
          const extMatch = imageUrl.match(/\.(jpg|jpeg|png|webp)/i);
          const ext = extMatch ? extMatch[0] : ".jpg";
          const imgPath = path.join(cacheDir, `${Date.now()}-${i + 1}${ext}`);
          await fs.outputFile(imgPath, imgResponse.data);
          imgData.push(fs.createReadStream(imgPath));
          tempFiles.push(imgPath);
        } catch (error) {
          console.error(`[PIN] Error downloading ${imageUrl}: ${error.message}`);
        }
      }

      if (!imgData.length) {
        return api.sendMessage(`❌ | Failed to download any images for "${query}".`, event.threadID, event.messageID);
      }

      await api.sendMessage(
        {
          attachment: imgData,
          body: `✅ | Found ${imgData.length} image(s) for "${query}"`,
        },
        event.threadID,
        event.messageID
      );

    } catch (error) {
      console.error(`[PIN] Error: ${error.message}`);
      return api.sendMessage(`❌ | Error: ${error.message}`, event.threadID, event.messageID);
    } finally {
      for (const file of tempFiles) {
        try { await fs.unlink(file); } catch {}
      }
    }
  },

  onLoad: async function () {
    try {
      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
    } catch (error) {
      console.error(`[PIN] onLoad error: ${error.message}`);
    }
  },
};

/**
 * Robust extractor: supports multiple API shapes
 */
function extractImageUrls(data) {
  const urls = new Set();

  function addIfValid(u) {
    if (typeof u === "string" && /^https?:\/\//.test(u)) {
      urls.add(u);
    }
  }

  function walk(obj) {
    if (!obj) return;
    if (Array.isArray(obj)) {
      obj.forEach(walk);
    } else if (typeof obj === "object") {
      // Direct known keys
      if (obj.url) addIfValid(obj.url);
      if (obj.image_url) addIfValid(obj.image_url);

      // Traverse all props
      Object.values(obj).forEach(walk);
    } else if (typeof obj === "string") {
      addIfValid(obj);
    }
  }

  walk(data);
  return Array.from(urls);
  }

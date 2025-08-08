const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[PIN] Loading pin.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "pin",
    aliases: ["pinterest"],
    version: "1.0.7",
    author: "MinatoCodes",
    role: 0,
    countDown: 10,
    shortDescription: {
      en: "Search images on Pinterest"
    },
    category: "image",
    guide: {
      en: "{prefix}pin <search query> <count>\n{prefix}pin <search query> -<count>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const tempFiles = [];

    try {
      if (args.length === 0) {
        return api.sendMessage(`❌ | Please provide a search query.\nExample: {prefix}pin cats -3`, event.threadID, event.messageID);
      }

      let query = args.join(" ");
      let count = 1;

      // Check if user used dash or space format
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

      const apiUrl = `https://pinterest-api-delta.vercel.app/api/pinterest?q=${encodeURIComponent(query)}`;
      const response = await axios.get(apiUrl);
      const imageData = response.data?.images;

      if (!imageData || !Array.isArray(imageData) || imageData.length === 0) {
        return api.sendMessage(`❌ | No images found for "${query}".`, event.threadID, event.messageID);
      }

      const imgData = [];
      for (let i = 0; i < Math.min(count, imageData.length); i++) {
        const imageUrl = imageData[i].image_url;

        try {
          const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const imgPath = path.join(cacheDir, `${Date.now()}-${i + 1}.jpg`);
          await fs.outputFile(imgPath, imgResponse.data);
          imgData.push(fs.createReadStream(imgPath));
          tempFiles.push(imgPath);
        } catch (error) {
          console.error(`[PIN] Error downloading image ${imageUrl}: ${error.message}`);
        }
      }

      if (imgData.length === 0) {
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
        try {
          await fs.unlink(file);
        } catch (err) {
          console.error(`[PIN] File cleanup failed: ${err.message}`);
        }
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

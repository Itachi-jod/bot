const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[PIN] Loading pin.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "pin",
    aliases: ["pinterest"],
    version: "1.0.5",
    author: "kshitiz",
    role: 0,
    countDown: 10,
    shortDescription: {
      en: "Search images on Pinterest"
    },
    category: "image",
    guide: {
      en: "{prefix}pin <search query> -<number of images>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const tempFiles = []; // Track files for cleanup
    try {
      const searchQuery = args.join(" ");
      console.log(`[PIN] Processing query: ${searchQuery}`);

      if (!searchQuery.includes("-")) {
        return api.sendMessage(`Invalid format. Example: {prefix}pin cats -5`, event.threadID, event.messageID);
      }

      const [query, numImages] = searchQuery.split("-").map(str => str.trim());
      const numberOfImages = parseInt(numImages);

      if (isNaN(numberOfImages) || numberOfImages <= 0 || numberOfImages > 25) {
        return api.sendMessage("Please specify a number between 1 and 25.", event.threadID, event.messageID);
      }

      const cacheDir = path.join(__dirname, "cache");
      console.log(`[PIN] Cache directory path: ${cacheDir}`);
      if (typeof cacheDir !== "string") {
        throw new Error(`Cache directory path is not a string: ${cacheDir}`);
      }

      await fs.ensureDir(cacheDir);

      const apiUrl = `https://kaiz-apis.gleeze.com/api/pinterest?search=${encodeURIComponent(query)}&apikey=603049c6-349f-4c96-9f2f-cb97de4a4daa`;
      console.log(`[PIN] Fetching from API: ${apiUrl}`);
      let response;
      try {
        response = await axios.get(apiUrl, {
          headers: {
            Authorization: "603049c6-349f-4c96-9f2f-cb97de4a4daa",
          },
        });
        console.log(`[PIN] API response: ${JSON.stringify(response.data, null, 2).slice(0, 200)}...`);
      } catch (error) {
        console.error(`[PIN] API request failed: ${error.message}`);
        if (error.response) {
          console.error(`[PIN] API status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
          throw new Error(`API request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`API request failed: ${error.message}`);
      }

      const imageData = response.data?.data;
      console.log(`[PIN] Received ${imageData?.length || 0} images from API`);

      if (!imageData || !Array.isArray(imageData) || imageData.length === 0) {
        return api.sendMessage(`No images found for "${query}".`, event.threadID, event.messageID);
      }

      const imgData = [];
      for (let i = 0; i < Math.min(numberOfImages, imageData.length); i++) {
        const imageUrl = imageData[i];
        if (typeof imageUrl !== "string") {
          console.error(`[PIN] Invalid image URL at index ${i}: ${imageUrl}`);
          continue;
        }
        try {
          const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const imgPath = path.join(cacheDir, `${i + 1}.jpg`);
          console.log(`[PIN] Saving image to: ${imgPath}`);
          if (typeof imgPath !== "string") {
            throw new Error(`Image path is not a string: ${imgPath}`);
          }
          await fs.outputFile(imgPath, imgResponse.data);
          imgData.push(fs.createReadStream(imgPath));
          tempFiles.push(imgPath);
        } catch (error) {
          console.error(`[PIN] Error downloading image ${imageUrl}: ${error.message}`);
          continue;
        }
      }

      if (imgData.length === 0) {
        return api.sendMessage(`Failed to download any images for "${query}".`, event.threadID, event.messageID);
      }

      await api.sendMessage(
        {
          attachment: imgData,
          body: `Found ${imgData.length} image(s) for "${query}"`,
        },
        event.threadID,
        event.messageID
      );
    } catch (error) {
      console.error(`[PIN] Error in Pinterest search: ${error.message}`, error.stack);
      return api.sendMessage(
        `Error: ${error.message}. Check bot logs for details or try again later.`,
        event.threadID,
        event.messageID
      );
    } finally {
      // Clean up temporary files
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
          console.log(`[PIN] Deleted temporary file: ${file}`);
        } catch (error) {
          console.error(`[PIN] Error deleting file ${file}: ${error.message}`);
        }
      }
    }
  },

  onLoad: async function () {
    try {
      const cacheDir = path.join(__dirname, "cache");
      console.log(`[PIN] onLoad: Ensuring cache directory at ${cacheDir}`);
      await fs.ensureDir(cacheDir);
    } catch (error) {
      console.error(`[PIN] Error in onLoad: ${error.message}`);
    }
  },
};

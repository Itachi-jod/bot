const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[Ghibli] Loading ghibili.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "anim",
    version: "1.2",
    role: 0,
    author: "MinatoCodes",
    countDown: 5,
    longDescription: "Transform images to Ghibli-style art.",
    category: "image",
    guide: {
      en: "{pn} - Reply to an image to transform it to Ghibli-style art."
    }
  },
  onStart: async function ({ api, event, message }) {
    const tempFiles = []; // Track files for cleanup
    try {
      const cacheDir = path.join(__dirname, "cache");
      console.log(`[Ghibli] Cache directory path: ${cacheDir}`);
      if (typeof cacheDir !== "string") {
        throw new Error(`Cache directory path is not a string: ${cacheDir}`);
      }
      await fs.ensureDir(cacheDir);

      // Check if the user replied to a message with an image
      if (
        !event.messageReply ||
        !event.messageReply.attachments ||
        !event.messageReply.attachments[0] ||
        event.messageReply.attachments[0].type !== "photo"
      ) {
        return api.sendMessage("❌| Please reply to an image to transform it.", event.threadID, event.messageID);
      }

      const imgUrl = encodeURIComponent(event.messageReply.attachments[0].url);
      const apiUrl = `https://kaiz-apis.gleeze.com/api/img2ghibli?imageUrl=${imgUrl}&apikey=7eac9dce-b646-4ad1-8148-5b58eddaa2cc`;
      console.log(`[Ghibli] Fetching from API: ${apiUrl}`);

      // Notify user that processing has started
      const processingMsg = await message.reply("Wait A sec!!!");

      let response;
      try {
        response = await axios.get(apiUrl, {
          headers: {
            Authorization: "7eac9dce-b646-4ad1-8148-5b58eddaa2cc",
          },
        });
        console.log(`[Ghibli] API response: ${JSON.stringify(response.data, null, 2).slice(0, 200)}...`);
      } catch (error) {
        console.error(`[Ghibli] API request failed: ${error.message}`);
        if (error.response) {
          console.error(`[Ghibli] API status: ${error.response.status}, data: ${JSON.stringify(error.response.data)}`);
          throw new Error(`API request failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`API request failed: ${error.message}`);
      }

      const imageUrl = response.data?.url;
      console.log(`[Ghibli] Received image URL: ${imageUrl}`);

      if (!imageUrl || typeof imageUrl !== "string") {
        throw new Error("Invalid API response: No valid image URL found.");
      }

      const imgData = [];
      try {
        const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const imgPath = path.join(cacheDir, "ghibli-image.png");
        console.log(`[Ghibli] Saving image to: ${imgPath}`);
        if (typeof imgPath !== "string") {
          throw new Error(`Image path is not a string: ${imgPath}`);
        }
        await fs.outputFile(imgPath, imgResponse.data);
        imgData.push(fs.createReadStream(imgPath));
        tempFiles.push(imgPath);
      } catch (error) {
        console.error(`[Ghibli] Error downloading image ${imageUrl}: ${error.message}`);
        throw new Error(`Failed to download image: ${error.message}`);
      }

      if (imgData.length === 0) {
        throw new Error("Failed to process the image.");
      }

      await api.sendMessage(
        {
          attachment: imgData,
          body: "✅| Here is your Ghibli-style transformed image:",
        },
        event.threadID,
        event.messageID
      );

      // Remove the processing message
      if (processingMsg.messageID) {
        await message.unsend(processingMsg.messageID);
      }
    } catch (error) {
      console.error(`[Ghibli] Error in image transformation: ${error.message}`, error.stack);
      await message.reply(`❌| Failed to transform your image: ${error.message}. Please try again later.`);
    } finally {
      // Clean up temporary files
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
          console.log(`[Ghibli] Deleted temporary file: ${file}`);
        } catch (error) {
          console.error(`[Ghibli] Error deleting file ${file}: ${error.message}`);
        }
      }
    }
  },
  onLoad: async function () {
    try {
      const cacheDir = path.join(__dirname, "cache");
      console.log(`[Ghibli] onLoad: Ensuring cache directory at ${cacheDir}`);
      await fs.ensureDir(cacheDir);
    } catch (error) {
      console.error(`[Ghibli] Error in onLoad: ${error.message}`);
    }
  },
};

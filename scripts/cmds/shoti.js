const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

console.log(`[SHOTI] Loading shoti.js from: ${__dirname}`);

const API_KEY = process.env.SHOTI_API_KEY || "7eac9dce-b646-4ad1-8148-5b58eddaa2cc";
const CACHE_DIR = path.join(os.tmpdir(), "shoti_cache");

module.exports = {
  config: {
    name: "shoti",
    aliases: ["tiktokshoti", "randomshoti"],
    version: "1.0.2",
    author: "Lord Itachi",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Send a random shoti (TikTok video)"
    },
    category: "fun",
    guide: {
      en: "{prefix}shoti"
    }
  },

  onStart: async function ({ api, event }) {
    const threadID = event.threadID;
    const messageID = event.messageID;
    const tempFiles = [];

    try {
      api.setMessageReaction("⏳", messageID, () => {}, true);
      await fs.ensureDir(CACHE_DIR);

      // Fetch Shoti URL
      const shotiApi = `https://kaiz-apis.gleeze.com/api/shoti?apikey=${API_KEY}`;
      const shotiRes = await retryRequest(shotiApi, 3, 1000);

      if (!shotiRes.data?.shoti?.videoUrl) {
        let errorMessage = "Unknown error";
        if (shotiRes.data?.error) {
          errorMessage = shotiRes.data.error;
        } else if (shotiRes.headers["content-type"]?.includes("application/json")) {
          errorMessage = JSON.stringify(shotiRes.data);
        }
        throw new Error(`Shoti API failed: ${errorMessage}`);
      }

      const { videoUrl, title, username } = shotiRes.data.shoti;
      console.log(`[SHOTI] Video URL: ${videoUrl}`);

      let videoData, finalVideoUrl = videoUrl;

      // Try direct download
      try {
        videoData = await retryRequest(videoUrl, 3, 1000, { responseType: "arraybuffer" });
        if (!videoData.headers["content-type"]?.startsWith("video/")) {
          throw new Error("Invalid response: Not a video");
        }
      } catch (directError) {
        console.log(`[SHOTI] Direct download failed: ${directError.message}, trying fallback API...`);
        // Fallback to dev-priyanshi API
        const downloadApi = `https://dev-priyanshi.onrender.com/api/alldl?url=${encodeURIComponent(videoUrl)}`;
        const dlRes = await retryRequest(downloadApi, 3, 1000);

        const fallbackVideoUrl = dlRes.data.video?.hd || dlRes.data.video?.sd || dlRes.data.video?.nowm;
        if (!fallbackVideoUrl) {
          let errorMessage = "Unknown error";
          if (dlRes.data?.error) {
            errorMessage = dlRes.data.error;
          } else if (dlRes.headers["content-type"]?.includes("application/json")) {
            errorMessage = JSON.stringify(dlRes.data);
          }
          throw new Error(`Download API failed: ${errorMessage}`);
        }

        finalVideoUrl = fallbackVideoUrl;
        videoData = await retryRequest(fallbackVideoUrl, 3, 1000, { responseType: "arraybuffer" });
        if (!videoData.headers["content-type"]?.startsWith("video/")) {
          throw new Error("Invalid response: Not a video from fallback API");
        }
      }

      // Check file size (e.g., <25MB for most chat platforms)
      const fileSize = videoData.data.length;
      if (fileSize > 25 * 1024 * 1024) {
        throw new Error("Video size exceeds 25MB limit");
      }

      // Save video
      const fileName = `shoti_${Date.now()}.mp4`;
      const filePath = path.join(CACHE_DIR, fileName);
      await fs.writeFile(filePath, videoData.data);
      tempFiles.push(filePath);

      if (!(await fs.pathExists(filePath))) {
        throw new Error("Failed to save video file");
      }

      // Send video
      await api.sendMessage({
        body: `🎥 Random Shoti\n📝 Title: ${title || "N/A"}\n👤 Username: ${username || "N/A"}\n🔗 ${finalVideoUrl}`,
        attachment: fs.createReadStream(filePath)
      }, threadID, (err) => {
        if (err) {
          console.error(`[SHOTI] Send message error: ${err.message}`);
          api.sendMessage("❌ Failed to send the video.", threadID, messageID);
          api.setMessageReaction("❌", messageID, () => {}, true);
        } else {
          api.setMessageReaction("✅", messageID, () => {}, true);
        }
        cleanupFiles(tempFiles);
      }, messageID);

    } catch (err) {
      console.error(`[SHOTI] Error: ${err.message}`);
      const errorMessage = err.response?.status === 429
        ? "❌ API rate limit exceeded. Please try again later."
        : `❌ Failed to fetch shoti: ${err.message}`;
      api.sendMessage(errorMessage, threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
      cleanupFiles(tempFiles);
    }
  },

  onLoad: async function () {
    try {
      await fs.ensureDir(CACHE_DIR);
      console.log(`[SHOTI] Cache directory ready: ${CACHE_DIR}`);
    } catch (e) {
      console.error(`[SHOTI] Cache setup failed: ${e.message}`);
    }
  }
};

async function retryRequest(url, retries = 3, delay = 1000, options = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, options);
    } catch (error) {
      if (error.response?.status === 429 && i < retries - 1) {
        console.log(`[SHOTI] Rate limit hit, retrying in ${delay}ms...`);
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
      console.error(`[SHOTI] Cleanup error: ${err.message}`);
      setTimeout(() => fs.unlink(file).catch(() => {}), 5000);
    }
  }
}

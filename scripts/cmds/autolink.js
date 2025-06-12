const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");

module.exports = {
  config: {
    name: "autolink",
    version: "2.1",
    author: "Lord Itachi",
    countDown: 5,
    role: 0,
    shortDescription: "Auto-detect video links and download them",
    longDescription: "Detects video links in chat and downloads the video automatically.",
    category: "media",
    guide: "No need to use command. Just send a video link.",
  },

  onStart: async function () {},

  onChat: async function ({ message, event, api }) {
    try {
      const text = event.body || "";
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      if (!urlMatch) return;

      const url = urlMatch[0];
      const apiUrl = `https://dev-priyanshi.onrender.com/api/alldl?url=${encodeURIComponent(url)}`;

      // React to message with ⏳ while processing
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const res = await axios.get(apiUrl, { timeout: 30000 });
      const videoUrl = res.data?.data?.low;
      const title = res.data?.data?.title || "Unknown Title";

      if (!videoUrl || !videoUrl.startsWith("http")) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return;
      }

      const response = await axios({
        method: "GET",
        url: videoUrl,
        responseType: "stream",
        timeout: 60000,
      });

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const filePath = path.join(cacheDir, `video_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      const fileSizeMB = fs.statSync(filePath).size / (1024 * 1024);
      if (fileSizeMB > 100) {
        fs.unlinkSync(filePath);
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ The video is too large to send (over 100MB).");
      }

      const hostname = parse(url).hostname || "";
      let platform = "Unknown";
      if (hostname.includes("tiktok")) platform = "TikTok";
      else if (hostname.includes("instagram")) platform = "Instagram";
      else if (hostname.includes("facebook")) platform = "Facebook";
      else if (hostname.includes("youtube")) platform = "YouTube";
      else if (hostname.includes("x.com") || hostname.includes("twitter")) platform = "Twitter";

      await api.sendMessage(
        {
          body: `Here's your downloaded video!\n\n Platform: ${platform}\n Title: ${title}`,
          attachment: fs.createReadStream(filePath),
        },
        event.threadID,
        (err) => {
          fs.unlinkSync(filePath);
          if (err) {
            console.error("Send Message Error:", err.message);
            api.setMessageReaction("❌", event.messageID, () => {}, true);
            return message.reply("❌ Failed to send the video.");
          }
          // React ✅ when finished successfully
          api.setMessageReaction("✅", event.messageID, () => {}, true);
        },
        event.messageID
      );
    } catch (err) {
      console.error("AutoLink Error:", err.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  },
};

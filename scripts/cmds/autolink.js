const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { parse } = require("url");

module.exports = {
  config: {
    name: "autolink",
    version: "2.3",
    author: "Lord Itachi + Minato",
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
      const hostname = parse(url).hostname || "";
      let apiUrl;

      // Determine which API to use
      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
        apiUrl = `https://kaiz-apis.gleeze.com/api/yt-down?url=${encodeURIComponent(url)}&apikey=67609e3c-abd9-4261-9b7b-fde637c0ba9d`;
      } else {
        apiUrl = `https://dev-priyanshi.onrender.com/api/alldl?url=${encodeURIComponent(url)}`;
      }

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const res = await axios.get(apiUrl, { timeout: 30000 });

      let videoUrl;

      if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
        const ytData = res.data.response["720p"] || res.data.response["360p"];
        if (!ytData) {
          api.setMessageReaction("❌", event.messageID, () => {}, true);
          return message.reply("❌ No downloadable YouTube video found.");
        }
        videoUrl = ytData.download_url;
      } else {
        videoUrl = res.data?.data?.low;
      }

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

      let platform = "Unknown";
      if (hostname.includes("tiktok")) platform = "TikTok";
      else if (hostname.includes("instagram")) platform = "Instagram";
      else if (hostname.includes("facebook")) platform = "Facebook";
      else if (hostname.includes("youtube") || hostname.includes("youtu.be")) platform = "YouTube";
      else if (hostname.includes("x.com") || hostname.includes("twitter")) platform = "Twitter";

      await api.sendMessage(
        {
          body: `Here's your downloaded video!\n\nPlatform: ${platform}`,
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
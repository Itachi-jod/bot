const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "1.2",
    author: "Denish & Itachi",
    role: 0,
    shortDescription: {
      en: "Displays the uptime of the bot with a random TikTok video."
    },
    longDescription: {
      en: "Shows how long the bot has been running and sends a random TikTok video."
    },
    category: "system",
    guide: {
      en: "{p}uptime"
    }
  },

  onStart: async function ({ api, event }) {
    try {
      // --- Calculate uptime
      const uptime = process.uptime();
      const seconds = Math.floor(uptime % 60);
      const minutes = Math.floor((uptime / 60) % 60);
      const hours = Math.floor((uptime / (60 * 60)) % 24);
      const days = Math.floor(uptime / (60 * 60 * 24));

      const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      // --- Fetch random TikTok video
      const res = await axios.get("https://ttstalk-gamma.vercel.app/api/tikstalk");
      const videoUrl = res.data.video?.play;

      if (!videoUrl) {
        return api.sendMessage(
          `THE BOT IS RUNNING FOR:\n${uptimeString}\n\n❌ Could not fetch TikTok video.`,
          event.threadID
        );
      }

      // --- Download video to cache
      const videoPath = path.join(__dirname, "cache", `tiktok_${Date.now()}.mp4`);
      const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(videoPath, response.data);

      // --- Send message with uptime + TikTok
      api.sendMessage(
        {
          body: `THE BOT IS RUNNING FOR 🤷, 🫶🏻💗\n\n(•_•)??\n\n${uptimeString}`,
          attachment: fs.createReadStream(videoPath)
        },
        event.threadID,
        () => fs.unlinkSync(videoPath) // cleanup after sending
      );
    } catch (err) {
      console.error("Uptime command error:", err);
      api.sendMessage("❌ | Error fetching uptime or TikTok video.", event.threadID);
    }
  }
};

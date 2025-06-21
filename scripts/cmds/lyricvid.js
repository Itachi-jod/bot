const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "lyricsvid",
    aliases: ["lvx"],
    version: "1.0",
    author: "Lord Denish 👑",
    countDown: 3,
    role: 0,
    shortDescription: "Random TikTok lyrics video",
    longDescription: "Fetches a random lyrics video from multiple TikTok usernames using Tikwm API",
    category: "media",
    guide: "{p}lyricsvid or {p}lvx"
  },

  onStart: async function ({ event, api }) {
    const { threadID, messageID } = event;

    const usernames = [
      "song_lyrics207", "core.mewzek", "meowwwww_20", "sa_phal", "anup_raee"
    ];

    api.setMessageReaction("⏳", messageID, () => {}, true);

    const allVideos = [];

    for (const username of usernames) {
      try {
        const res = await axios.post("https://tikwm.com/api/user/posts", {
          unique_id: username,
          count: 5
        }, {
          headers: { "Content-Type": "application/json" }
        });

        const videos = res.data?.data?.videos || [];
        allVideos.push(...videos);

      } catch (err) {
        console.log(`❌ Failed to fetch from @${username}:`, err.message);
      }
    }

    if (allVideos.length === 0) {
      return api.sendMessage("❌ No lyrics videos found from any user.", threadID, messageID);
    }

    const randomVideo = allVideos[Math.floor(Math.random() * allVideos.length)];
    const downloadUrl = randomVideo.play;
    const nickname = randomVideo.author?.nickname || "Unknown";
    const uid = randomVideo.author?.unique_id || "unknown";

    try {
      const tempPath = path.join(__dirname, `${Date.now()}.mp4`);
      const videoRes = await axios.get(downloadUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(tempPath);
      videoRes.data.pipe(writer);
      await new Promise(resolve => writer.on("finish", resolve));

      api.sendMessage({
        body: `🎬 Lyrics Video from @${uid} (${nickname})\n🎶 Powered by DenishBot × Tikwm`,
        attachment: fs.createReadStream(tempPath)
      }, threadID, () => fs.unlinkSync(tempPath), messageID);

    } catch (err) {
      console.error("💥 Error downloading/sending video:", err.message);
      return api.sendMessage("❌ Failed to send lyrics video.", threadID, messageID);
    }
  }
};
const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "animeedit",
    aliases: ["ae", "amv", "shoti", "edit"],
    version: "1.5",
    author: "Lord Denish 👑",
    countDown: 3,
    role: 0,
    shortDescription: "Random anime edit video from all users",
    longDescription: "Fetches one random anime edit video from multiple TikTok usernames using Tikwm",
    category: "media",
    guide: "{p}animeedit or {p}ae or {p}amv or {p}shoti or {p}edit"
  },

  onStart: async function ({ event, api }) {
    const { threadID, messageID } = event;

    // ⏳ React to show it's working
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const usernames = [
      "chuppachip.ae",
      "metakakobi",
      "icatkamv",
      "cy4an_fx",
      "gplkrn.aep",
      "allies.ae",
      "mission.ms",
      "flex__ae",
      "noyasolatip",
      "ry_.004",
      "lucasmacksuel"
    ];

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
        console.log(`❌ Failed to fetch from ${username}:`, err.message);
      }
    }

    if (allVideos.length === 0) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("❌ No anime edit videos found from any user. Try again later.", threadID, messageID);
    }

    const random = allVideos[Math.floor(Math.random() * allVideos.length)];
    const videoUrl = random.play;
    const tempPath = path.join(__dirname, `${Date.now()}.mp4`);

    try {
      const videoRes = await axios.get(videoUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(tempPath);
      videoRes.data.pipe(writer);
      await new Promise(resolve => writer.on("finish", resolve));

      const msg = {
        attachment: fs.createReadStream(tempPath)
      };

      // ✅ React to show success
      api.sendMessage(msg, threadID, () => {
        fs.unlinkSync(tempPath);
        api.setMessageReaction("✅", event.messageID, () => {}, true);
      }, messageID);

    } catch (err) {
      console.error("💥 Error sending video:", err.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return api.sendMessage("❌ Failed to download or send video.", threadID, messageID);
    }
  }
};
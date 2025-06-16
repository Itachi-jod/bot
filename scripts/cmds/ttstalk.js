const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[TTSTALK] Loading ttstalk.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "ttstalk",
    aliases: ["tiktokuser", "tiktalk"],
    version: "1.0.0",
    author: "Lord Itachi",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Fetch TikTok user details"
    },
    category: "media",
    guide: {
      en: "{prefix}ttstalk <username>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const username = args.join("").replace("@", "");
    const threadID = event.threadID;
    const messageID = event.messageID;

    if (!username) {
      return api.sendMessage("❗ Please provide a TikTok username.\nExample: ttstalk oni__kage", threadID, messageID);
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/tikstalk?username=${encodeURIComponent(username)}&apikey=7eac9dce-b646-4ad1-8148-5b58eddaa2cc`;
      console.log(`[TTSTALK] Fetching from API: ${apiUrl}`);

      const res = await axios.get(apiUrl);
      const data = res.data;

      if (!data || !data.username) {
        throw new Error("User not found or data missing.");
      }

      const avatarRes = await axios.get(data.avatarLarger, { responseType: "arraybuffer" });
      const avatarPath = path.join(__dirname, "cache", `avatar_${Date.now()}.jpg`);
      await fs.ensureDir(path.dirname(avatarPath));
      await fs.writeFile(avatarPath, avatarRes.data);

      const infoText = 
`👤 TikTok Profile
• Username: ${data.username}
• Nickname: ${data.nickname}
• Bio: ${data.signature || "None"}
• Followers: ${data.followerCount.toLocaleString()}
• Following: ${data.followingCount.toLocaleString()}
• Total Likes: ${data.heartCount.toLocaleString()}
• Videos: ${data.videoCount}
• User ID: ${data.id}`;

      await api.sendMessage({
        body: infoText,
        attachment: fs.createReadStream(avatarPath)
      }, threadID, () => {
        fs.unlink(avatarPath).catch(e => console.error(`[TTSTALK] Error deleting file: ${e.message}`));
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } catch (err) {
      console.error(`[TTSTALK] Error: ${err.message}`);
      api.sendMessage("❌ Failed to fetch TikTok user. Try again later.", threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  },

  onLoad: async function () {
    try {
      const cacheDir = path.join(__dirname, "cache");
      console.log(`[TTSTALK] onLoad: Ensuring cache directory at ${cacheDir}`);
      await fs.ensureDir(cacheDir);
    } catch (err) {
      console.error(`[TTSTALK] Error in onLoad: ${err.message}`);
    }
  }
};

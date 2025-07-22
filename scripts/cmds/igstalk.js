const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

console.log(`[IGSTALK] Loading igstalk.js from: ${__dirname}`);

module.exports = {
  config: {
    name: "igstalk",
    aliases: ["iguser", "iglookup"],
    version: "1.0.0",
    author: "MinatoCodes",
    role: 0,
    countDown: 5,
    shortDescription: {
      en: "Fetch Instagram user details"
    },
    category: "media",
    guide: {
      en: "{prefix}igstalk <username>"
    }
  },

  onStart: async function ({ api, event, args }) {
    const username = args.join("").replace("@", "");
    const threadID = event.threadID;
    const messageID = event.messageID;

    if (!username) {
      return api.sendMessage("❗ Please provide an Instagram username.\nExample: igstalk hey___minato", threadID, messageID);
    }

    api.setMessageReaction("⏳", messageID, () => {}, true);

    try {
      const apiUrl = `https://min-stalk.vercel.app/api/igstalk?username=${encodeURIComponent(username)}`;
      console.log(`[IGSTALK] Fetching from API: ${apiUrl}`);

      const res = await axios.get(apiUrl);
      const data = res.data;

      if (!data.success || !data.data || !data.data.username) {
        throw new Error("User not found or data missing.");
      }

      const user = data.data;

      const avatarRes = await axios.get(user.profilePicHD, { responseType: "arraybuffer" });
      const avatarPath = path.join(__dirname, "cache", `avatar_${Date.now()}.jpg`);
      await fs.ensureDir(path.dirname(avatarPath));
      await fs.writeFile(avatarPath, avatarRes.data);

      const infoText = 
`👤 Instagram Profile
• Username: ${user.username}
• UID: ${user.uid}
• Bio: ${user.biography || "None"}
• Followers: ${user.followers.toLocaleString()}
• Following: ${user.following.toLocaleString()}
• Posts: ${user.posts}`;

      await api.sendMessage({
        body: infoText,
        attachment: fs.createReadStream(avatarPath)
      }, threadID, () => {
        fs.unlink(avatarPath).catch(e => console.error(`[IGSTALK] Error deleting file: ${e.message}`));
        api.setMessageReaction("✅", messageID, () => {}, true);
      }, messageID);

    } catch (err) {
      console.error(`[IGSTALK] Error: ${err.message}`);
      api.sendMessage("❌ Failed to fetch Instagram user. Try again later.", threadID, messageID);
      api.setMessageReaction("❌", messageID, () => {}, true);
    }
  },

  onLoad: async function () {
    try {
      const cacheDir = path.join(__dirname, "cache");
      console.log(`[IGSTALK] onLoad: Ensuring cache directory at ${cacheDir}`);
      await fs.ensureDir(cacheDir);
    } catch (err) {
      console.error(`[IGSTALK] Error in onLoad: ${err.message}`);
    }
  }
};

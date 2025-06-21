const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
 threadStates: {},

 config: {
 name: "anistatus",
 aliases: ["as"],
 version: "1.0",
 author: "MinatoCodes",
 countDown: 15,
 role: 0,
 shortDescription: "anime status video from tiktok",
 longDescription: "anime status video from tiktok",
 category: "media",
 guide: {
 en: "{p}{n}",
 },
 },

 onStart: async function ({ api, event }) {
 const threadID = event.threadID;
 const messageID = event.messageID;
 const cacheDir = path.join(__dirname, "cache");

 try {
 if (!this.threadStates[threadID]) this.threadStates[threadID] = {};

 await fs.ensureDir(cacheDir);
 api.setMessageReaction("🤍", messageID, () => {}, true);

 const apiUrl = "https://ani-status-itachi.vercel.app/api/status"; // fixed missing protocol
 const response = await axios.get(apiUrl);

 const videoUrl = response.data?.video?.play;

 if (response.data.success && videoUrl) {
 const filePath = path.join(cacheDir, `anistatus_${Date.now()}.mp4`);
 await this.downloadVideo(videoUrl, filePath);

 if (fs.existsSync(filePath)) {
 await api.sendMessage({
 body: "Random anime status video.",
 attachment: fs.createReadStream(filePath),
 }, threadID, () => fs.unlink(filePath), messageID);
 } else {
 return api.sendMessage("⚠️ Failed to download video.", threadID, messageID);
 }
 } else {
 return api.sendMessage("⚠️ Failed to fetch video URL from API.", threadID, messageID);
 }

 } catch (err) {
 console.error(`[ANISTATUS] Error: ${err.message}`);
 return api.sendMessage("❌ An error occurred while processing command.", event.threadID, event.messageID);
 }
 },

 downloadVideo: async function (url, filePath) {
 try {
 const response = await axios.get(url, { responseType: "arraybuffer" });
 await fs.writeFile(filePath, Buffer.from(response.data));
 } catch (err) {
 console.error(`[ANISTATUS] Download error: ${err.message}`);
 throw err;
 }
 }
};
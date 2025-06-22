const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
 config: {
 name: "shoti2",
 aliases: ["shoti", "tiktokgirl", "so"],
 version: "2.2",
 author: "💫 Lord Denish 👑 | fb.com/share/1BXQiRBRBr/",
 countDown: 3,
 role: 0,
 shortDescription: "Random TikTok shoti (AE) video",
 longDescription: "Fetches random TikTok shoti from 15 usernames using Tikwm API",
 category: "media",
 guide: "{p}shoti2 (or use aliases)"
 },

 onStart: async function ({ event, api }) {
 const { threadID, messageID } = event;

 api.setMessageReaction("⏳", messageID, () => {}, true);
 const startTime = Date.now();

 const usernames = [
 "pinaybeautys", "ulzzangclub", "girl_indonesia0", "kripaverse", "rina55544",
 "beautifulgirlcollections", "yourmommyy__", "_sophiya1", "svn9o.__.ww",
 "hninphyusin2004", "sune_.0", "hvcqi", "mama_diorr", "allesandraniebres"
 ];

 try {
 const results = await Promise.allSettled(usernames.map(username =>
 axios.post("https://tikwm.com/api/user/posts", {
 unique_id: username,
 count: 5
 }, {
 headers: { "Content-Type": "application/json" }
 })
 ));

 const allVideos = [];
 results.forEach(res => {
 if (res.status === "fulfilled" && res.value.data?.data?.videos?.length) {
 allVideos.push(...res.value.data.data.videos);
 }
 });

 if (!allVideos.length) {
 return api.sendMessage("❌ No videos found. Please try again later.", threadID, messageID);
 }

 const random = allVideos[Math.floor(Math.random() * allVideos.length)];
 const videoUrl = random.play;

 const tempPath = path.join(__dirname, `${Date.now()}.mp4`);
 const videoRes = await axios.get(videoUrl, { responseType: "stream" });
 const writer = fs.createWriteStream(tempPath);
 videoRes.data.pipe(writer);
 await new Promise(resolve => writer.on("finish", resolve));

 const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);

 api.sendMessage({
 body: `📥 Downloaded and sent in ${timeTaken}s`,
 attachment: fs.createReadStream(tempPath)
 }, threadID, () => fs.unlinkSync(tempPath), messageID);

 } catch (err) {
 console.error("💥 Error:", err.message);
 return api.sendMessage("❌ Error while fetching TikTok video.", threadID, messageID);
 }
 }
};
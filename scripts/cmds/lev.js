const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
 threadStates: {},

 config: {
 name: 'lv',
 aliases: ['lyv'],
 version: '1.0',
 author: 'MinatoCodes',
 countDown: 15,
 role: 0,
 shortDescription: 'Lyrical video from lyrics edit vibe',
 longDescription: 'Lyrical video from lyrics edit vibe',
 category: 'media',
 guide: {
 en: '{p}{n}',
 }
 },

 onStart: async function ({ api, event }) {
 const threadID = event.threadID;

 if (!this.threadStates[threadID]) {
 this.threadStates[threadID] = {};
 }

 try {
 api.setMessageReaction("⏰", event.messageID, (err) => {}, true); 

 const apiUrl = "https://ttstalk-gamma.vercel.app/api/tikstalk"; 
 const response = await axios.get(apiUrl);

 if (response.data.success && response.data.video && response.data.video.play) {
 const videoUrl = response.data.video.play;
 console.log(`Downloadable Video URL: ${videoUrl}`);

 const cacheFilePath = __dirname + `/cache/${Date.now()}.mp4`;
 await this.downloadVideo(videoUrl, cacheFilePath);

 if (fs.existsSync(cacheFilePath)) {
 await api.sendMessage({
 body: "Random lyrical video.",
 attachment: fs.createReadStream(cacheFilePath),
 }, threadID, event.messageID);

 fs.unlinkSync(cacheFilePath);
 } else {
 api.sendMessage("Error downloading the video.", threadID);
 }
 } else {
 api.sendMessage("Error fetching video URL from API.", threadID);
 }
 } catch (err) {
 console.error(err);
 api.sendMessage("An error occurred while processing command.", threadID);
 }
 },

 downloadVideo: async function (url, cacheFilePath) {
 try {
 const response = await axios({
 method: "GET",
 url: url,
 responseType: "arraybuffer"
 });

 fs.writeFileSync(cacheFilePath, Buffer.from(response.data));
 } catch (err) {
 console.error(err);
 throw err; // Re-throw to handle in onStart
 }
 },
};
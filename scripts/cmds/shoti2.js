const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "shoti2",
    version: "2.0",
    author: "Lord Denish 👑",
    countDown: 3,
    role: 0,
    shortDescription: "Random shoti from multiple TikTok usernames",
    longDescription: "Fetches random TikTok shoti video from 15 usernames via Tikwm",
    category: "media",
    guide: "{p}shoti2"
  },

  onStart: async function ({ event, api }) {
    const { threadID, messageID, messageReply } = event;

    // React to the command message
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const usernames = [
      "pinaybeautys", "ulzzangclub", "girl_indonesia0", "kripaverse", "rina55544",
      "beautifulgirlcollections", "yourmommyy__", "_sophiya1", "svn9o.__.ww",
      "hninphyusin2004", "sune_.0", "hvcqi", "mama_diorr", "allesandraniebres"
    ];

    api.sendMessage("📦 | Fetching videos from TikTok accounts, please wait...", threadID, messageID);

    try {
      // Fetch all user posts concurrently
      const results = await Promise.allSettled(usernames.map(username =>
        axios.post("https://tikwm.com/api/user/posts", {
          unique_id: username,
          count: 5
        }, {
          headers: { "Content-Type": "application/json" }
        })
      ));

      // Extract successful results
      const allVideos = [];
      results.forEach(res => {
        if (res.status === "fulfilled" && res.value.data?.data?.videos?.length) {
          allVideos.push(...res.value.data.data.videos);
        }
      });

      if (!allVideos.length) {
        return api.sendMessage("❌ No videos found. Please try again later.", threadID, messageID);
      }

      // Pick a random video
      const random = allVideos[Math.floor(Math.random() * allVideos.length)];
      const videoUrl = random.play;
      const nickname = random.author?.nickname || "Unknown";
      const uid = random.author?.unique_id || "unknown";

      // Download and send the video
      const tempPath = path.join(__dirname, `${Date.now()}.mp4`);
      const videoRes = await axios.get(videoUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(tempPath);
      videoRes.data.pipe(writer);
      await new Promise(resolve => writer.on("finish", resolve));

      api.sendMessage({
        body: `🎬 Shoti from @${uid} (${nickname})\n🔥 Via Tikwm & DenishBot`,
        attachment: fs.createReadStream(tempPath)
      }, threadID, () => fs.unlinkSync(tempPath), messageID);

    } catch (err) {
      console.error("💥 Error:", err.message);
      return api.sendMessage("❌ Something went wrong while processing your request.", threadID, messageID);
    }
  }
};
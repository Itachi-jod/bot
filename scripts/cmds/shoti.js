const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "shoti",
    aliases: [],
    author: "Asmit Adk",
    version: "2.0",
    cooldowns: 10,
    role: 0,
    shortDescription: "Get random shoti video",
    longDescription: "Get random shoti video",
    category: "fun",
    guide: "{p}shoti",
  },

  onStart: async function ({ api, event, message }) {
    api.setMessageReaction("⏰", event.messageID, (err) => {}, true);

    try {
      const response = await axios.get("https://shoti-api-by-asmit.vercel.app/shoti/video");
      const data = response.data.data;

      // Video URL
      const videoUrl = data.content.replace(/\\/g, "/");

      // Download video stream
      const videoResponse = await axios.get(videoUrl, { responseType: "stream" });

      // Prepare temp file path
      const tempVideoPath = path.join(__dirname, "cache", `${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempVideoPath);

      videoResponse.data.pipe(writer);

      writer.on("finish", async () => {
        const stream = fs.createReadStream(tempVideoPath);

        // Prepare user info string
        const userInfo = data.user?.nickname
          ? `${data.user.nickname} (${data.user.username || "unknown"})`
          : data.user?.username || "Unknown User";

        const title = data.title || "No title";

        await message.reply({
          body: `Title: ${title}\nUser: ${userInfo}`,
          attachment: stream,
        });

        api.setMessageReaction("✅", event.messageID, (err) => {}, true);

        // Clean up temp file
        fs.unlink(tempVideoPath, (err) => {
          if (err) console.error(err);
          console.log(`Deleted ${tempVideoPath}`);
        });
      });

      writer.on("error", (err) => {
        console.error(err);
        message.reply("Error writing the video file.");
      });
    } catch (error) {
      console.error(error);
      message.reply("Sorry, an error occurred while processing your request.");
    }
  },
};
